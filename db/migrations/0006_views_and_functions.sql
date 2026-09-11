-- Vistas y funciones de agregación.

-- ── 1 · Cantidad requerida de cada repuesto (§10.1, resolución de I-4) ───────
/*
 * La cantidad requerida es Σ de las cantidades de los ítems que el cliente
 * APROBÓ. Un repuesto cuyos consumidores estén todos rechazados tiene
 * requerido 0 y la solicitud de compra lo excluye.
 *
 * `security_invoker`: la vista no eleva privilegios.
 */
create or replace view public.v_required_parts
with (security_invoker = true) as
select
  q.service_order_id,
  qi.quotation_id,
  qip.part_id,
  qip.description,
  sum(qip.quantity) as quantity_required
from quotation_item_parts qip
join quotation_items qi        on qi.id = qip.quotation_item_id
join quotations q              on q.id  = qi.quotation_id
join authorization_items ai    on ai.quotation_item_id = qi.id
where ai.status in ('aprobado', 'aprobado_con_observacion')
  and q.status in ('emitida', 'sustituida')
group by q.service_order_id, qi.quotation_id, qip.part_id, qip.description;
--> statement-breakpoint

/*
 * Cobertura: lo recibido es SIEMPRE una suma sobre las filas de recepción,
 * nunca un contador acumulado. Un contador se desincroniza en cuanto se
 * corrige una recepción; una suma, no.
 */
create or replace view public.v_parts_coverage
with (security_invoker = true) as
with required as (
  select pri.parts_request_id,
         pr.service_order_id,
         pri.id as parts_request_item_id,
         pri.description,
         pri.quantity_required
  from parts_request_items pri
  join parts_requests pr on pr.id = pri.parts_request_id
),
received as (
  select poi.parts_request_item_id,
         coalesce(sum(pri2.quantity_received), 0) as quantity_received
  from purchase_order_items poi
  left join purchase_receipt_items pri2 on pri2.purchase_order_item_id = poi.id
  where poi.parts_request_item_id is not null
  group by poi.parts_request_item_id
)
select
  r.service_order_id,
  r.parts_request_id,
  r.parts_request_item_id,
  r.description,
  r.quantity_required,
  coalesce(rc.quantity_received, 0) as quantity_received,
  case
    when r.quantity_required <= 0 then 1::numeric
    else least(1::numeric, coalesce(rc.quantity_received, 0) / r.quantity_required)
  end as ratio,
  coalesce(rc.quantity_received, 0) >= r.quantity_required as complete
from required r
left join received rc on rc.parts_request_item_id = r.parts_request_item_id;
--> statement-breakpoint

-- ── 2 · Avance de la orden, en SQL (§11.4) ──────────────────────────────────
/*
 * Réplica de `src/features/repairs/services/progress.ts`.
 *
 * Es el ÚNICO punto de duplicación consciente del sistema. Existe porque traer
 * 200 órdenes con sus sesiones de tiempo, ítems y recepciones para calcular en
 * JavaScript sería recorrer decenas de miles de filas dentro de la función
 * serverless en cada carga del tablero.
 *
 * `db/tests/03-progreso.sql` ejecuta los mismos casos contra las dos
 * implementaciones y compara. La duplicación está permitida; la divergencia
 * silenciosa, no.
 */
create or replace function public.fn_milestone_rank(p_status order_status)
returns int
language sql
immutable
as $$
  select case p_status
    when 'DRAFT' then 0
    when 'RECEPCIONADO' then 1
    when 'CHECKLIST_COMPLETADO' then 2
    when 'PENDIENTE_DIAGNOSTICO' then 3
    when 'EN_DIAGNOSTICO' then 4
    when 'DIAGNOSTICO_COMPLETADO' then 5
    when 'COTIZACION_EN_PREPARACION' then 6
    when 'COTIZACION_ENVIADA' then 7
    when 'ESPERANDO_CLIENTE' then 8
    when 'APROBACION_PARCIAL' then 9
    when 'APROBADO' then 9
    when 'SOLICITUD_REPUESTOS' then 10
    when 'REPUESTOS_EN_COTIZACION' then 11
    when 'COMPRA_PENDIENTE_AUTORIZACION' then 12
    when 'COMPRA_AUTORIZADA' then 13
    when 'ORDEN_COMPRA_GENERADA' then 14
    when 'ESPERANDO_REPUESTOS' then 15
    when 'REPUESTOS_PARCIALES' then 16
    when 'REPUESTOS_COMPLETOS' then 17
    when 'LISTO_PARA_REPARACION' then 18
    when 'EN_REPARACION' then 19
    when 'REPARACION_PAUSADA' then 19
    when 'OBSERVADO_CONTROL_CALIDAD' then 19
    when 'REPARACION_TERMINADA' then 20
    when 'CONTROL_CALIDAD' then 21
    when 'CONTROL_CALIDAD_APROBADO' then 22
    when 'PENDIENTE_LAVADO' then 23
    when 'EN_LAVADO' then 23
    when 'PENDIENTE_ALINEAMIENTO' then 23
    when 'EN_ALINEAMIENTO' then 23
    when 'LISTO_PARA_ENTREGA' then 24
    when 'ENTREGADO' then 25
    when 'CERRADO' then 26
    when 'CANCELADO' then 0
  end
$$;
--> statement-breakpoint

create or replace function public.fn_order_progress(p_order_ids uuid[] default null)
returns table (
  service_order_id  uuid,
  percent           numeric,
  effective_minutes numeric,
  paused_minutes    numeric,
  estimated_minutes numeric,
  remaining_minutes numeric,
  parts_ratio       numeric,
  parts_complete    boolean
)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
with base as (
  select so.id, so.status, public.fn_milestone_rank(so.status) as rank,
         coalesce(array_length(so.final_stages, 1), 0) as final_total
  from service_orders so
  where p_order_ids is null or so.id = any(p_order_ids)
),
checklist as (
  select r.service_order_id,
         count(*) filter (where d.is_required)                     as required,
         count(*) filter (where d.is_required and ci.id is not null) as resolved
  from vehicle_receptions r
  join vehicle_checklists c on c.reception_id = r.id
  cross join checklist_item_defs d
  left join checklist_items ci on ci.checklist_id = c.id and ci.item_def_id = d.id
  where d.is_active
  group by r.service_order_id
),
quote as (
  select q.service_order_id,
         count(qi.id)                                              as lines,
         count(ai.id) filter (where ai.status <> 'pendiente')       as decided
  from quotations q
  join quotation_items qi on qi.quotation_id = q.id
  left join authorization_items ai on ai.quotation_item_id = qi.id
  where q.status in ('emitida', 'sustituida')
  group by q.service_order_id
),
parts as (
  select service_order_id,
         sum(quantity_required)                                     as required,
         sum(least(quantity_received, quantity_required))           as received,
         bool_and(complete)                                         as complete
  from v_parts_coverage
  group by service_order_id
),
jobs as (
  select rj.service_order_id,
         rj.estimated_minutes,
         count(rji.id)                                              as total,
         count(rji.id) filter (where rji.status = 'hecho')          as done
  from repair_jobs rj
  left join repair_job_items rji on rji.repair_job_id = rj.id
  group by rj.service_order_id, rj.estimated_minutes
),
times as (
  select rj.service_order_id,
         coalesce(sum(extract(epoch from (coalesce(s.ended_at, now()) - s.started_at)) / 60.0)
                  filter (where s.kind = 'trabajo'), 0) as effective,
         coalesce(sum(extract(epoch from (coalesce(s.ended_at, now()) - s.started_at)) / 60.0)
                  filter (where s.kind = 'pausa'), 0)   as paused
  from repair_jobs rj
  left join repair_time_sessions s on s.repair_job_id = rj.id
  group by rj.service_order_id
),
finals as (
  select so.id as service_order_id,
         (select count(*) from washing_jobs w
           where w.service_order_id = so.id and w.status = 'terminado')
       + (select count(*) from alignment_jobs a
           where a.service_order_id = so.id and a.status = 'terminado') as done
  from service_orders so
  where p_order_ids is null or so.id = any(p_order_ids)
),
calc as (
  select
    b.id,
    b.status,
    b.rank,
    b.final_total,
    coalesce(f.done, 0)                                           as final_done,
    coalesce(c.required, 0)                                       as cl_required,
    coalesce(c.resolved, 0)                                       as cl_resolved,
    coalesce(q.lines, 0)                                          as q_lines,
    coalesce(q.decided, 0)                                        as q_decided,
    coalesce(p.required, 0)                                       as p_required,
    case when coalesce(p.required, 0) <= 0 then 1::numeric
         else coalesce(p.received, 0) / p.required end            as p_ratio,
    coalesce(p.complete, true)                                    as p_complete,
    coalesce(j.total, 0)                                          as j_total,
    coalesce(j.done, 0)                                           as j_done,
    coalesce(j.estimated_minutes, 0)::numeric                     as est,
    round(coalesce(t.effective, 0)::numeric, 1)                   as eff,
    round(coalesce(t.paused, 0)::numeric, 1)                      as pau
  from base b
  left join checklist c on c.service_order_id = b.id
  left join quote q     on q.service_order_id = b.id
  left join parts p     on p.service_order_id = b.id
  left join jobs j      on j.service_order_id = b.id
  left join times t     on t.service_order_id = b.id
  left join finals f    on f.service_order_id = b.id
),
stages as (
  select
    c.*,
    -- Recepción
    case when c.rank >= 2 then 1
         when c.status = 'RECEPCIONADO' then
           case when c.cl_required > 0
                then least(1, c.cl_resolved::numeric / c.cl_required) else 0.5 end
         else 0 end as s_recepcion,
    -- Diagnóstico
    case when c.rank >= 5 then 1
         when c.status = 'EN_DIAGNOSTICO' then 0.5
         else 0 end as s_diagnostico,
    -- Autorización
    case when c.rank >= 9 then 1
         when c.rank >= 7 and c.q_lines > 0
           then least(1, c.q_decided::numeric / c.q_lines)
         else 0 end as s_autorizacion,
    -- Repuestos
    case when c.rank >= 17 then 1
         when c.p_required = 0 and c.rank >= 9 then 1
         when c.rank >= 10 then least(1, greatest(0, c.p_ratio))
         else 0 end as s_repuestos,
    -- Reparación: 0,7 trabajo hecho + 0,3 esfuerzo consumido
    case when c.rank >= 20 then 1
         when c.rank >= 19 then
           round(least(1,
             0.7 * (case when c.j_total > 0 then least(1, c.j_done::numeric / c.j_total) else 0 end)
           + 0.3 * (case when c.est > 0 then least(1, c.eff / c.est) else 0 end)
           ), 6)
         else 0 end as s_reparacion,
    -- Calidad
    case when c.rank >= 22 then 1
         when c.status = 'CONTROL_CALIDAD' then 0.5
         else 0 end as s_calidad,
    -- Servicios finales
    case when c.rank >= 24 then 1
         when c.final_total = 0 then (case when c.rank >= 22 then 1 else 0 end)
         when c.rank >= 23 then least(1, c.final_done::numeric / c.final_total)
         else 0 end as s_finales,
    -- Entrega
    case when c.rank >= 25 then 1 else 0 end as s_entrega
  from calc c
)
select
  s.id,
  case
    when s.status in ('ENTREGADO', 'CERRADO') then 100::numeric
    else round(
      round(5  * s_recepcion   * 100 / 100.0, 2) +
      round(15 * s_diagnostico * 100 / 100.0, 2) +
      round(10 * s_autorizacion* 100 / 100.0, 2) +
      round(15 * s_repuestos   * 100 / 100.0, 2) +
      round(40 * s_reparacion  * 100 / 100.0, 2) +
      round(5  * s_calidad     * 100 / 100.0, 2) +
      round(7  * s_finales     * 100 / 100.0, 2) +
      round(3  * s_entrega     * 100 / 100.0, 2)
    , 1)
  end,
  s.eff,
  s.pau,
  s.est,
  greatest(0, s.est - s.eff),
  round(s.p_ratio, 4),
  s.p_complete
from stages s;
$$;
--> statement-breakpoint

-- ── 3 · Portal del cliente (resolución de I-1) ───────────────────────────────
/*
 * El rol `anon` NO tiene SELECT sobre ninguna tabla. Lee exclusivamente por
 * estas funciones, que verifican el token y devuelven SOLO la proyección apta
 * para el cliente: sin costos internos, sin proveedores, sin notas privadas
 * del técnico, sin márgenes (§65).
 *
 * Lo que no se selecciona no puede filtrarse por un error de renderizado.
 */
create or replace function public.portal_resolve_link(p_token text)
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select al.id
  from authorization_links al
  where al.token_hash = encode(digest(p_token, 'sha256'), 'hex')
    and al.revoked_at is null
    and al.expires_at > now()
    and al.view_count < al.max_views
$$;
--> statement-breakpoint

create or replace function public.portal_get_quotation(p_token text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  v_link_id uuid;
  v_result  jsonb;
begin
  v_link_id := public.portal_resolve_link(p_token);

  -- Inexistente, caducado, revocado y agotado responden IGUAL: distinguirlos
  -- permitiría enumerar enlaces válidos.
  if v_link_id is null then
    raise exception 'No se encontró la cotización solicitada.' using errcode = 'P0002';
  end if;

  update authorization_links
     set view_count = view_count + 1,
         first_viewed_at = coalesce(first_viewed_at, now()),
         last_viewed_at = now()
   where id = v_link_id;

  select jsonb_build_object(
    'quotation', jsonb_build_object(
      'code', q.code,
      'version', q.version,
      'currency', q.currency,
      'total', q.total,
      'issued_at', q.issued_at
    ),
    'vehicle', jsonb_build_object(
      'plate', v.plate,
      'brand', v.brand,
      'model', v.model,
      'model_year', v.model_year
    ),
    'order', jsonb_build_object('code', so.code),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', qi.id,
        'line_number', qi.line_number,
        'description', qi.description,
        'priority', qi.priority,
        'quantity', qi.quantity,
        'line_total', qi.line_total,
        'evidence', coalesce((
          select jsonb_agg(jsonb_build_object('path', ef.thumbnail_path, 'kind', ef.kind))
          from evidence_files ef
          where ef.diagnostic_item_id = qi.diagnostic_item_id
            and ef.is_client_visible
            and ef.deleted_at is null
        ), '[]'::jsonb),
        'status', coalesce(ai.status::text, 'pendiente')
      ) order by qi.line_number)
      from quotation_items qi
      left join customer_authorizations ca on ca.quotation_id = q.id
      left join authorization_items ai
             on ai.quotation_item_id = qi.id and ai.authorization_id = ca.id
      where qi.quotation_id = q.id
    ), '[]'::jsonb)
  )
  into v_result
  from authorization_links al
  join quotations q      on q.id  = al.quotation_id
  join service_orders so on so.id = q.service_order_id
  join vehicles v        on v.id  = so.vehicle_id
  where al.id = v_link_id;

  return v_result;
end;
$$;
--> statement-breakpoint

-- Solo estas dos funciones son ejecutables por el visitante anónimo.
revoke execute on function public.portal_resolve_link(text) from anon, authenticated;
--> statement-breakpoint
grant execute on function public.portal_get_quotation(text) to anon;
