-- Amplía `fn_order_progress` para que devuelva también las ENTRADAS del
-- cálculo, no solo el resultado.
--
-- Motivo: la fórmula del avance existe en dos sitios —TypeScript para el
-- detalle de una orden, SQL para el tablero— y es el único punto de
-- duplicación consciente del sistema. `scripts/verify-db.ts` compara ambas.
-- Para que esa comparación pruebe algo, las dos implementaciones deben partir
-- de los MISMOS números; si cada una consultara por su cuenta, la prueba
-- mediría dos consultas además de dos fórmulas y no distinguiría el fallo.

drop function if exists public.fn_order_progress(uuid[]);
--> statement-breakpoint

create or replace function public.fn_order_progress(p_order_ids uuid[] default null)
returns table (
  service_order_id   uuid,
  percent            numeric,
  effective_minutes  numeric,
  paused_minutes     numeric,
  estimated_minutes  numeric,
  remaining_minutes  numeric,
  parts_ratio        numeric,
  parts_complete     boolean,
  -- Las ENTRADAS del cálculo se devuelven junto al resultado.
  -- Así la prueba de paridad puede alimentar la implementación en TypeScript
  -- con exactamente lo que vio SQL, y comparar solo las FÓRMULAS. Sin esto, la
  -- comparación mediría también dos consultas distintas y no probaría nada.
  status             order_status,
  checklist_required int,
  checklist_resolved int,
  quotation_lines    int,
  decided_items      int,
  required_parts     numeric,
  jobs_total         int,
  jobs_done          int,
  final_total        int,
  final_done         int
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
  s.p_complete,
  s.status,
  s.cl_required::int,
  s.cl_resolved::int,
  s.q_lines::int,
  s.q_decided::int,
  s.p_required,
  s.j_total::int,
  s.j_done::int,
  s.final_total::int,
  s.final_done::int
from stages s;
$$;
