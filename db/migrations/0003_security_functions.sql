-- Funciones de seguridad.
--
-- Todas SECURITY DEFINER con `search_path` fijado: sin eso, un usuario podría
-- crear un esquema temporal con una tabla `profiles` falsa y la función
-- resolvería permisos contra ella.

-- ── Permisos efectivos ───────────────────────────────────────────────────────

create or replace function public.has_permission(p_uid uuid, p_code text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from profiles pr
    join role_permissions rp on rp.role_id = pr.role_id
    join permissions p       on p.id = rp.permission_id
    where pr.id = p_uid
      and pr.is_active
      and pr.deleted_at is null
      and p.code = p_code::citext
  )
$$;
--> statement-breakpoint

create or replace function public.current_user_has_permission(p_code text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.has_permission(auth.uid(), p_code)
$$;
--> statement-breakpoint

-- ── Alcance corporativo ──────────────────────────────────────────────────────

create or replace function public.current_user_corporate_ids()
returns uuid[]
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(array_agg(ucc.corporate_client_id), '{}'::uuid[])
  from user_corporate_clients ucc
  where ucc.profile_id = auth.uid()
$$;
--> statement-breakpoint

/*
 * El eje del aislamiento entre empresas.
 *
 * Comprueba `scope:all_corporate_clients` O pertenencia en
 * `user_corporate_clients`. Los dos son caminos distintos a propósito: el
 * alcance decide SOBRE QUÉ EMPRESAS trabaja un usuario, y es independiente de
 * si puede abrir la comparativa entre empresas
 * (`dashboard:read_all_clients`). Atarlos deja al técnico sin ver un solo
 * vehículo.
 *
 * Una fila SIN cliente corporativo (cliente propio del taller) solo es visible
 * para quien tiene alcance total: un usuario de BBVA no debe verla.
 */
create or replace function public.can_access_corporate_client(p_corporate_client_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    case
      when public.current_user_has_permission('scope:all_corporate_clients') then true
      when p_corporate_client_id is null then false
      else exists (
        select 1
        from user_corporate_clients ucc
        where ucc.profile_id = auth.uid()
          and ucc.corporate_client_id = p_corporate_client_id
      )
    end
$$;
--> statement-breakpoint

/* Atajo para las tablas hijas de una orden: un solo `exists` por fila. */
create or replace function public.can_access_order(p_service_order_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from service_orders so
    where so.id = p_service_order_id
      and public.can_access_corporate_client(so.corporate_client_id)
  )
$$;
--> statement-breakpoint

-- ── Datos personales (§52) ───────────────────────────────────────────────────

/*
 * Lo que consumen TODAS las pantallas.
 *
 * `security_invoker = true`: la vista no eleva privilegios, aplica las
 * políticas RLS del usuario que consulta.
 */
create or replace view public.customers_masked
with (security_invoker = true) as
select
  c.id,
  c.corporate_client_id,
  c.document_type,
  '•••••' || coalesce(c.document_last3, '') as document_masked,
  c.document_last3,
  c.first_name,
  c.last_name,
  c.business_name,
  c.email,
  c.phone,
  c.contact_name,
  c.is_demo,
  c.created_at,
  c.updated_at,
  c.deleted_at
from customers c;
--> statement-breakpoint

/*
 * Ver un DNI sin enmascarar es un EVENTO AUDITABLE, no una consulta más.
 *
 * La auditoría se escribe antes de devolver, en la misma transacción: si el
 * registro falla, la revelación falla. En todo lo demás la auditoría acompaña
 * a la operación; aquí la condiciona.
 */
create or replace function public.reveal_document_number(p_customer_id uuid)
returns text
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_number text;
  v_corporate uuid;
begin
  if not public.current_user_has_permission('customers:read_pii') then
    raise exception 'No tienes permiso para ver documentos de identidad.'
      using errcode = '42501';
  end if;

  select c.document_number, c.corporate_client_id
    into v_number, v_corporate
  from customers c
  where c.id = p_customer_id and c.deleted_at is null;

  -- Inexistente y fuera de alcance responden igual: distinguirlos permitiría
  -- averiguar qué clientes existen en otra empresa probando identificadores.
  if v_number is null or not public.can_access_corporate_client(v_corporate) then
    raise exception 'No se encontró el cliente solicitado.' using errcode = 'P0002';
  end if;

  insert into audit_logs (
    actor_profile_id, actor_kind, entity, entity_id, action, corporate_client_id
  ) values (
    auth.uid(), 'usuario', 'customers', p_customer_id, 'documento_revelado', v_corporate
  );

  return v_number;
end;
$$;
--> statement-breakpoint

-- ── Utilidades ───────────────────────────────────────────────────────────────

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
