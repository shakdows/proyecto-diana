-- ═════════════════════════════════════════════════════════════════════════════
-- PRUEBA 1 · Aislamiento entre clientes corporativos
--
-- La propiedad que hay que poder afirmar sin dudar:
--   si un usuario de BBVA manipula la URL para pedir datos de Mitsui, la
--   consulta devuelve CERO filas. No un error revelador, no datos ajenos: cero.
--
-- Las cantidades esperadas se calculan de la propia base SIN RLS y luego se
-- comparan con lo que cada usuario ve CON RLS. No hay números escritos a mano:
-- añadir órdenes al seed no puede volver la prueba obsoleta ni, peor, hacerla
-- pasar por casualidad.
-- ═════════════════════════════════════════════════════════════════════════════

\set ON_ERROR_STOP on

do $$
declare
  v_bbva       uuid;
  v_mitsui     uuid;
  v_analista   uuid;
  v_id_bbva    uuid;
  v_id_mitsui  uuid;
  v_esperado   int;
  v_visto      int;
  v_total      int;
begin
  select id into v_bbva      from auth.users where email = 'bbva@diana.test';
  select id into v_mitsui    from auth.users where email = 'mitsui@diana.test';
  select id into v_analista  from auth.users where email = 'analista@diana.test';
  select id into v_id_bbva   from corporate_clients where code = 'BBVA';
  select id into v_id_mitsui from corporate_clients where code = 'MITSUI';

  select count(*) into v_total from service_orders;
  raise notice 'Órdenes en la base (sin RLS): %', v_total;

  -- ══ Usuario de BBVA ════════════════════════════════════════════════════════
  select count(*) into v_esperado
  from service_orders where corporate_client_id = v_id_bbva;

  perform set_config('request.jwt.claims', json_build_object('sub', v_bbva)::text, true);
  set local role authenticated;

  select count(*) into v_visto from service_orders;
  raise notice 'Usuario BBVA ve % órdenes (sus % propias)', v_visto, v_esperado;
  if v_visto <> v_esperado then
    raise exception 'FALLO: BBVA debería ver % órdenes, ve %', v_esperado, v_visto;
  end if;

  -- El caso del enunciado: fuerza el filtro a otra empresa.
  select count(*) into v_visto
  from service_orders where corporate_client_id = v_id_mitsui;
  raise notice 'Usuario BBVA filtrando por Mitsui ve % órdenes', v_visto;
  if v_visto <> 0 then
    raise exception 'FALLO CRÍTICO: BBVA ve % filas de Mitsui', v_visto;
  end if;

  -- Tampoco a través de las tablas hijas: ni una línea de cotización ajena.
  select count(*) into v_visto
  from quotation_items qi
  join quotations q on q.id = qi.quotation_id
  join service_orders so on so.id = q.service_order_id
  where so.corporate_client_id is distinct from v_id_bbva;
  raise notice 'Usuario BBVA ve % líneas de cotización AJENAS', v_visto;
  if v_visto <> 0 then
    raise exception 'FALLO CRÍTICO: BBVA ve % líneas de cotización ajenas', v_visto;
  end if;

  -- Y sí ve las suyas: el aislamiento no puede lograrse a base de no mostrar nada.
  select count(*) into v_visto from quotation_items;
  raise notice 'Usuario BBVA ve % líneas de cotización propias', v_visto;
  if v_visto = 0 then
    raise exception 'FALLO: BBVA no ve ni sus propias líneas de cotización';
  end if;

  -- Evidencias y línea de tiempo, que cuelgan de la orden.
  select count(*) into v_visto
  from evidence_files ef
  join service_orders so on so.id = ef.service_order_id
  where so.corporate_client_id is distinct from v_id_bbva;
  if v_visto <> 0 then
    raise exception 'FALLO CRÍTICO: BBVA ve % evidencias ajenas', v_visto;
  end if;
  raise notice 'Usuario BBVA ve 0 evidencias ajenas';

  select count(*) into v_visto
  from status_history sh
  join service_orders so on so.id = sh.service_order_id
  where so.corporate_client_id is distinct from v_id_bbva;
  if v_visto <> 0 then
    raise exception 'FALLO CRÍTICO: BBVA ve % eventos de la línea de tiempo ajenos', v_visto;
  end if;
  raise notice 'Usuario BBVA ve 0 eventos de trazabilidad ajenos';

  -- Los clientes del taller (sin empresa) tampoco son suyos.
  select count(*) into v_visto from customers where corporate_client_id is null;
  if v_visto <> 0 then
    raise exception 'FALLO: BBVA ve % clientes propios del taller', v_visto;
  end if;
  raise notice 'Usuario BBVA ve 0 clientes propios del taller';

  reset role;

  -- ══ Usuario de Mitsui ══════════════════════════════════════════════════════
  select count(*) into v_esperado
  from service_orders where corporate_client_id = v_id_mitsui;

  perform set_config('request.jwt.claims', json_build_object('sub', v_mitsui)::text, true);
  set local role authenticated;

  select count(*) into v_visto from service_orders;
  raise notice 'Usuario Mitsui ve % órdenes (sus % propias)', v_visto, v_esperado;
  if v_visto <> v_esperado then
    raise exception 'FALLO: Mitsui debería ver % órdenes, ve %', v_esperado, v_visto;
  end if;

  select count(*) into v_visto
  from service_orders where corporate_client_id = v_id_bbva;
  if v_visto <> 0 then
    raise exception 'FALLO CRÍTICO: Mitsui ve % filas de BBVA', v_visto;
  end if;
  raise notice 'Usuario Mitsui filtrando por BBVA ve 0 órdenes';

  reset role;

  -- ══ Analista interno (scope:all_corporate_clients) ═════════════════════════
  perform set_config('request.jwt.claims', json_build_object('sub', v_analista)::text, true);
  set local role authenticated;

  select count(*) into v_visto from service_orders;
  raise notice 'Analista interno ve % órdenes', v_visto;
  if v_visto <> v_total then
    raise exception 'FALLO: el analista debería ver las % órdenes, ve %', v_total, v_visto;
  end if;

  reset role;

  raise notice '✓ PRUEBA 1 SUPERADA · el aislamiento entre empresas se cumple';
end $$;
