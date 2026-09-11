-- ═════════════════════════════════════════════════════════════════════════════
-- PRUEBA 2 · Las reglas de §60 se hacen cumplir en la BASE, no solo en la app
--
-- Cada bloque intenta hacer algo prohibido y exige que PostgreSQL lo rechace.
-- Si alguna de estas operaciones pasara, la regla sería una intención y no una
-- garantía.
-- ═════════════════════════════════════════════════════════════════════════════

\set ON_ERROR_STOP on

do $$
declare
  v_order   uuid;
  v_quote   uuid;
  v_item    uuid;
  v_job     uuid;
  v_ok      boolean;
begin
  select id into v_order from service_orders where code = 'OS-2026-000001';
  select id into v_quote from quotations where service_order_id = v_order and version = 1;
  select id into v_job   from repair_jobs where service_order_id = v_order;

  -- ── 2.1 · Un cambio de estado sin acción declarada se rechaza ──────────────
  v_ok := false;
  begin
    perform set_config('diana.transition_action', '', true);
    update service_orders set status = 'DRAFT' where id = v_order;
  exception when others then
    v_ok := true;
    raise notice '2.1 ✓ rechazado cambio de estado sin acción declarada';
  end;
  if not v_ok then
    raise exception 'FALLO 2.1: se permitió cambiar el estado sin declarar la acción';
  end if;

  -- ── 2.2 · Una transición fuera del grafo se rechaza ────────────────────────
  v_ok := false;
  begin
    perform set_config('diana.transition_action', 'iniciar_trabajo', true);
    update service_orders set status = 'EN_REPARACION' where id = v_order;
  exception when others then
    v_ok := true;
    raise notice '2.2 ✓ rechazada transición inválida CERRADO --iniciar_trabajo--> EN_REPARACION';
  end;
  if not v_ok then
    raise exception 'FALLO 2.2: se permitió una transición que no existe en el grafo';
  end if;

  -- ── 2.3 · Una cotización emitida no se edita (§61) ─────────────────────────
  v_ok := false;
  begin
    update quotations set total = 99999.00 where id = v_quote;
  exception when others then
    v_ok := true;
    raise notice '2.3 ✓ rechazada la edición de importes de una cotización emitida';
  end;
  if not v_ok then
    raise exception 'FALLO 2.3: se pudo modificar el total de una cotización emitida';
  end if;

  v_ok := false;
  begin
    update quotation_items set unit_price = 1.00
     where quotation_id = v_quote and line_number = 1;
  exception when others then
    v_ok := true;
    raise notice '2.3 ✓ rechazada la edición de una línea de cotización emitida';
  end;
  if not v_ok then
    raise exception 'FALLO 2.3: se pudo modificar una línea de una cotización emitida';
  end if;

  -- ── 2.4 · No se repara un ítem que el cliente RECHAZÓ (§60) ────────────────
  -- La línea 2 (discos delanteros) fue rechazada por el cliente.
  select qi.id into v_item
  from quotation_items qi
  where qi.quotation_id = v_quote and qi.line_number = 2;

  v_ok := false;
  begin
    insert into repair_job_items (repair_job_id, quotation_item_id, status)
    values (v_job, v_item, 'pendiente');
  exception when others then
    v_ok := true;
    raise notice '2.4 ✓ rechazado ejecutar un trabajo que el cliente no aprobó';
  end;
  if not v_ok then
    raise exception 'FALLO 2.4: se pudo crear trabajo para un ítem rechazado';
  end if;

  -- ── 2.5 · La auditoría es de solo inserción ───────────────────────────────
  v_ok := false;
  begin
    update audit_logs set action = 'manipulado' where true;
  exception when others then
    v_ok := true;
    raise notice '2.5 ✓ rechazada la modificación de la auditoría';
  end;
  if not v_ok then
    raise exception 'FALLO 2.5: se pudo modificar audit_logs';
  end if;

  v_ok := false;
  begin
    delete from status_history where service_order_id = v_order;
  exception when others then
    v_ok := true;
    raise notice '2.5 ✓ rechazado el borrado de la línea de tiempo';
  end;
  if not v_ok then
    raise exception 'FALLO 2.5: se pudo borrar status_history';
  end if;

  -- ── 2.6 · Solo puede haber UNA sesión de tiempo abierta por trabajo ────────
  v_ok := false;
  begin
    insert into repair_time_sessions (repair_job_id, kind, started_at, ended_at)
    values (v_job, 'trabajo', now(), null);
    insert into repair_time_sessions (repair_job_id, kind, started_at, ended_at)
    values (v_job, 'trabajo', now(), null);
  exception when others then
    v_ok := true;
    raise notice '2.6 ✓ rechazada una segunda sesión de tiempo abierta';
  end;
  if not v_ok then
    raise exception 'FALLO 2.6: se permitieron dos cronómetros abiertos a la vez';
  end if;

  -- ── 2.7 · Una pausa exige motivo ──────────────────────────────────────────
  v_ok := false;
  begin
    insert into repair_time_sessions (repair_job_id, kind, pause_reason_id, started_at)
    values (v_job, 'pausa', null, now());
  exception when others then
    v_ok := true;
    raise notice '2.7 ✓ rechazada una pausa sin motivo';
  end;
  if not v_ok then
    raise exception 'FALLO 2.7: se permitió una pausa sin motivo';
  end if;

  -- ── 2.8 · La placa se guarda normalizada ──────────────────────────────────
  v_ok := false;
  begin
    insert into vehicles (plate, brand, model) values ('abc-999', 'X', 'Y');
  exception when others then
    v_ok := true;
    raise notice '2.8 ✓ rechazada una placa sin normalizar';
  end;
  if not v_ok then
    raise exception 'FALLO 2.8: se aceptó una placa con guiones y minúsculas';
  end if;

  -- ── 2.9 · Una evidencia cuelga de exactamente un ancla ────────────────────
  v_ok := false;
  begin
    insert into evidence_files (service_order_id, kind, storage_path, mime_type)
    values (v_order, 'foto', 'x.jpg', 'image/jpeg');
  exception when others then
    v_ok := true;
    raise notice '2.9 ✓ rechazada una evidencia sin ancla';
  end;
  if not v_ok then
    raise exception 'FALLO 2.9: se aceptó una evidencia huérfana';
  end if;

  raise notice '✓ PRUEBA 2 SUPERADA · las reglas de negocio se hacen cumplir en la base';
end $$;
