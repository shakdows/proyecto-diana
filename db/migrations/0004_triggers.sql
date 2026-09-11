-- Disparadores.
--
-- Existen porque los scripts de corrección y las migraciones también son
-- código, y también se equivocan. Son la única forma de que la línea de tiempo
-- del vehículo esté completa POR CONSTRUCCIÓN y de que una cotización emitida
-- no se pueda editar ni desde `psql`.

-- ── 1 · Guarda de la máquina de estados + línea de tiempo (§34) ──────────────
/*
 * La acción viaja en `diana.transition_action`, una variable de sesión que fija
 * la Server Action dentro de la misma transacción:
 *
 *   select set_config('diana.transition_action', 'iniciar_trabajo', true);
 *   update service_orders set status = 'EN_REPARACION' where id = ...;
 *
 * Un UPDATE de estado sin acción declarada se rechaza. No es una molestia
 * burocrática: es lo que impide que un script deje la orden en un estado al
 * que no se puede llegar, y que la línea de tiempo tenga huecos.
 */
create or replace function public.service_orders_status_guard()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_action order_action;
  v_actor  uuid;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  v_action := nullif(current_setting('diana.transition_action', true), '')::order_action;

  if v_action is null then
    raise exception
      'Cambio de estado sin acción declarada (% -> %). Fija diana.transition_action.',
      old.status, new.status
      using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from status_transitions st
    where st.from_status = old.status
      and st.action      = v_action
      and st.to_status   = new.status
  ) then
    raise exception 'Transición inválida: % --%--> %', old.status, v_action, new.status
      using errcode = 'P0001';
  end if;

  v_actor := auth.uid();

  insert into status_history (
    service_order_id, from_status, to_status, action,
    actor_profile_id, actor_kind, comment
  ) values (
    new.id, old.status, new.status, v_action,
    v_actor,
    case when v_actor is null then 'sistema'::actor_kind else 'usuario'::actor_kind end,
    nullif(current_setting('diana.transition_comment', true), '')
  );

  return new;
end;
$$;
--> statement-breakpoint

create trigger service_orders_status_guard
  before update of status on service_orders
  for each row execute function public.service_orders_status_guard();
--> statement-breakpoint

/* La apertura de la orden también entra en la línea de tiempo. */
create or replace function public.service_orders_status_seed()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into status_history (service_order_id, from_status, to_status, actor_profile_id, actor_kind)
  values (
    new.id, null, new.status, auth.uid(),
    case when auth.uid() is null then 'sistema'::actor_kind else 'usuario'::actor_kind end
  );
  return new;
end;
$$;
--> statement-breakpoint

create trigger service_orders_status_seed
  after insert on service_orders
  for each row execute function public.service_orders_status_seed();
--> statement-breakpoint

-- ── 2 · Una cotización emitida es inmutable (§61) ────────────────────────────
/*
 * Si aparece un trabajo adicional no se edita la V1: se crea la V2.
 *
 * Solo se permite cambiar el estado a `sustituida` o `anulada` y apuntar a la
 * versión que la reemplaza. Todo lo demás se rechaza.
 */
create or replace function public.quotations_immutable()
returns trigger
language plpgsql
as $$
begin
  if old.status = 'emitida' then
    if new.status not in ('sustituida', 'anulada') and new.status = old.status then
      raise exception
        'Una cotización emitida no se edita: emite una versión nueva (§61).'
        using errcode = 'P0001';
    end if;

    if (new.subtotal, new.total, new.tax_total, new.discount_total, new.version)
       is distinct from
       (old.subtotal, old.total, old.tax_total, old.discount_total, old.version)
    then
      raise exception 'No se pueden cambiar los importes de una cotización emitida.'
        using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;
--> statement-breakpoint

create trigger quotations_immutable
  before update on quotations
  for each row execute function public.quotations_immutable();
--> statement-breakpoint

create or replace function public.quotation_items_immutable()
returns trigger
language plpgsql
as $$
declare
  v_status quotation_status;
begin
  select q.status into v_status
  from quotations q
  where q.id = coalesce(new.quotation_id, old.quotation_id);

  if v_status = 'emitida' then
    raise exception
      'Una cotización emitida no se edita: emite una versión nueva (§61).'
      using errcode = 'P0001';
  end if;

  return coalesce(new, old);
end;
$$;
--> statement-breakpoint

create trigger quotation_items_immutable
  before insert or update or delete on quotation_items
  for each row execute function public.quotation_items_immutable();
--> statement-breakpoint

-- ── 3 · Nunca se repara un ítem que el cliente rechazó (§60) ─────────────────
create or replace function public.repair_job_items_only_approved()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1
    from authorization_items ai
    where ai.quotation_item_id = new.quotation_item_id
      and ai.status in ('aprobado', 'aprobado_con_observacion')
  ) then
    raise exception 'No se puede ejecutar un trabajo que el cliente no aprobó (§60).'
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;
--> statement-breakpoint

create trigger repair_job_items_only_approved
  before insert on repair_job_items
  for each row execute function public.repair_job_items_only_approved();
--> statement-breakpoint

-- ── 4 · La auditoría solo se inserta ─────────────────────────────────────────
create or replace function public.audit_logs_append_only()
returns trigger
language plpgsql
as $$
begin
  raise exception 'La auditoría es de solo inserción.' using errcode = '42501';
end;
$$;
--> statement-breakpoint

create trigger audit_logs_append_only
  before update or delete on audit_logs
  for each statement execute function public.audit_logs_append_only();
--> statement-breakpoint

create trigger status_history_append_only
  before update or delete on status_history
  for each statement execute function public.audit_logs_append_only();
--> statement-breakpoint

-- ── 5 · `updated_at` automático ─────────────────────────────────────────────
do $$
declare
  t text;
begin
  foreach t in array array[
    'roles','corporate_clients','branches','bays','profiles','app_settings',
    'customers','vehicles','service_advisors','service_types','service_orders',
    'vehicle_receptions','checklist_categories','checklist_item_defs',
    'diagnostics','diagnostic_items','quotations','quotation_items',
    'parts_catalog','parts_requests','parts_request_items','suppliers',
    'purchase_orders','pause_reasons','repair_jobs','repair_job_items',
    'notification_rules','survey_templates','surveys','followups'
  ]
  loop
    execute format(
      'create trigger %I_touch before update on %I
         for each row execute function public.touch_updated_at()',
      t, t
    );
  end loop;
end $$;
