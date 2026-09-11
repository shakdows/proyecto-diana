-- ═════════════════════════════════════════════════════════════════════════════
-- PRUEBA 3 · El portal del cliente (resolución de I-1)
--
-- El rol `anon` es la única superficie expuesta a internet sin autenticación.
-- Se comprueba que NO puede leer ninguna tabla y que solo alcanza los datos a
-- través de la función que verifica el token.
-- ═════════════════════════════════════════════════════════════════════════════

\set ON_ERROR_STOP on

do $$
declare
  v_ok    boolean;
  v_count int;
begin
  set local role anon;

  -- ── 3.1 · El rol anónimo no lee NINGUNA tabla ─────────────────────────────
  for v_ok in
    select false from (values ('service_orders'), ('customers'), ('quotations'),
                              ('quotation_items'), ('vehicles'), ('evidence_files')) as t(x)
  loop
    null;
  end loop;

  v_ok := false;
  begin
    select count(*) into v_count from service_orders;
  exception when insufficient_privilege then
    v_ok := true;
  end;
  if not v_ok then
    raise exception 'FALLO 3.1: el rol anónimo pudo leer service_orders';
  end if;
  raise notice '3.1 ✓ anon no puede leer service_orders';

  v_ok := false;
  begin
    select count(*) into v_count from customers;
  exception when insufficient_privilege then
    v_ok := true;
  end;
  if not v_ok then
    raise exception 'FALLO 3.1: el rol anónimo pudo leer customers';
  end if;
  raise notice '3.1 ✓ anon no puede leer customers';

  v_ok := false;
  begin
    select count(*) into v_count from quotation_items;
  exception when insufficient_privilege then
    v_ok := true;
  end;
  if not v_ok then
    raise exception 'FALLO 3.1: el rol anónimo pudo leer quotation_items';
  end if;
  raise notice '3.1 ✓ anon no puede leer quotation_items';

  -- ── 3.2 · Un token inválido responde igual que uno inexistente ────────────
  v_ok := false;
  begin
    perform public.portal_get_quotation('token-que-no-existe');
  exception when others then
    v_ok := true;
  end;
  if not v_ok then
    raise exception 'FALLO 3.2: un token inválido devolvió datos';
  end if;
  raise notice '3.2 ✓ token inválido rechazado';

  -- ── 3.3 · La función de resolución interna NO es ejecutable por anon ──────
  v_ok := false;
  begin
    perform public.portal_resolve_link('x');
  exception when insufficient_privilege then
    v_ok := true;
  end;
  if not v_ok then
    raise exception 'FALLO 3.3: anon pudo ejecutar portal_resolve_link';
  end if;
  raise notice '3.3 ✓ anon no puede ejecutar la resolución interna del token';

  -- ── 3.4 · El revelado de DNI tampoco es alcanzable por anon ──────────────
  v_ok := false;
  begin
    perform public.reveal_document_number(gen_random_uuid());
  exception when insufficient_privilege then
    v_ok := true;
  end;
  if not v_ok then
    raise exception 'FALLO 3.4: anon pudo ejecutar reveal_document_number';
  end if;
  raise notice '3.4 ✓ anon no puede ejecutar reveal_document_number';

  reset role;
  raise notice '✓ PRUEBA 3 SUPERADA · el portal anónimo no toca ninguna tabla';
end $$;

-- ═════════════════════════════════════════════════════════════════════════════
-- PRUEBA 4 · Con un token VÁLIDO, el portal devuelve datos… y solo los aptos
--
-- §65 prohíbe mostrar al cliente costos internos, proveedores, márgenes y
-- notas privadas del técnico. La exclusión no la decide el frontend: la
-- función SQL no selecciona esas columnas. Lo que no se selecciona no puede
-- filtrarse por un error de renderizado.
-- ═════════════════════════════════════════════════════════════════════════════

do $$
declare
  v_quote   uuid;
  v_payload jsonb;
  v_text    text;
  v_items   int;
  v_views   int;
begin
  select q.id into v_quote
  from quotations q
  join service_orders so on so.id = q.service_order_id
  where so.code = 'OS-2026-000001' and q.version = 1;

  -- Enlace con un token conocido, para poder probar el camino feliz.
  -- Idempotente: la verificación debe poder ejecutarse las veces que haga falta.
  insert into authorization_links (quotation_id, token_hash, expires_at)
  values (v_quote, encode(digest('TOKEN-DE-PRUEBA', 'sha256'), 'hex'), now() + interval '1 day')
  on conflict (token_hash) do update
    set expires_at = excluded.expires_at, revoked_at = null, view_count = 0;

  set local role anon;
  v_payload := public.portal_get_quotation('TOKEN-DE-PRUEBA');
  reset role;

  if v_payload is null then
    raise exception 'FALLO 4.1: el portal no devolvió datos con un token válido';
  end if;

  v_items := jsonb_array_length(v_payload -> 'items');
  raise notice '4.1 ✓ el portal devuelve la cotización con % ítems', v_items;
  if v_items <> 4 then
    raise exception 'FALLO 4.1: se esperaban 4 ítems, llegaron %', v_items;
  end if;

  -- Lo que el cliente SÍ debe ver.
  if v_payload -> 'vehicle' ->> 'plate' is null then
    raise exception 'FALLO 4.2: falta la placa del vehículo';
  end if;
  raise notice '4.2 ✓ incluye vehículo, orden y totales por ítem';

  -- Lo que NUNCA debe salir.
  v_text := v_payload::text;
  if v_text ilike '%internal_cost%' or v_text ilike '%unit_cost%'
     or v_text ilike '%supplier%' or v_text ilike '%internal_notes%'
     or v_text ilike '%proveedor%' then
    raise exception 'FALLO 4.3: el portal filtró información interna';
  end if;
  raise notice '4.3 ✓ no filtra costos internos, proveedores ni notas del técnico';

  -- El contador de aperturas se incrementa: un enlace reenviado eternamente
  -- es una fuga, y `max_views` la corta.
  select view_count into v_views from authorization_links
  where token_hash = encode(digest('TOKEN-DE-PRUEBA', 'sha256'), 'hex');
  if v_views < 1 then
    raise exception 'FALLO 4.4: no se registró la apertura del enlace';
  end if;
  raise notice '4.4 ✓ la apertura queda registrada (view_count = %)', v_views;

  raise notice '✓ PRUEBA 4 SUPERADA · el portal entrega solo la proyección apta para el cliente';
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3.5 · `anon` no tiene permiso de objeto sobre NINGUNA tabla ni vista.
--
-- Las pruebas anteriores comprueban que `anon` no PUEDE LEER filas. Esta
-- comprueba algo distinto y anterior: que no tiene el permiso siquiera. La
-- diferencia importó de verdad: `v_required_parts` y `v_parts_coverage` se
-- crean en 0006, después del `revoke` de 0005, y heredaban la concesión por
-- defecto de Supabase sobre `public`. No filtraban filas porque son
-- `security_invoker` y `anon` no tiene políticas, pero depender de la segunda
-- línea cuando la primera debería existir es exactamente lo que esta prueba
-- impide.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  v_objetos text;
  v_total   int;
begin
  select count(*), coalesce(string_agg(distinct table_name, ', ' order by table_name), '')
    into v_total, v_objetos
  from information_schema.role_table_grants
  where table_schema = 'public' and grantee = 'anon';

  if v_total > 0 then
    raise exception 'FALLO 3.5: anon conserva permisos sobre: %', v_objetos;
  end if;

  raise notice '3.5 ✓ anon no tiene permiso de objeto sobre ninguna tabla ni vista';
end $$;
