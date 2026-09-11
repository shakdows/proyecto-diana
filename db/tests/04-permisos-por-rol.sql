-- ═════════════════════════════════════════════════════════════════════════════
-- PRUEBA 5 · La matriz de permisos, tal como quedó en la base
--
-- La semilla del código se cargó en `role_permissions`; a partir de ahí la
-- fuente de verdad es la tabla. Esto comprueba que lo que quedó en la base es
-- lo que la documentación afirma, especialmente en los cuatro casos donde es
-- fácil equivocarse.
-- ═════════════════════════════════════════════════════════════════════════════

\set ON_ERROR_STOP on

do $$
declare
  r          record;
  v_uid      uuid;
  v_has      boolean;
  v_count    int;
begin
  -- ── 5.1 · La trampa del alcance ───────────────────────────────────────────
  -- `scope:all_corporate_clients` decide SOBRE QUÉ empresas trabaja alguien;
  -- `dashboard:read_all_clients` decide si ve la comparativa entre empresas.
  -- Atarlos deja al técnico sin ver un solo vehículo.
  for r in
    select code from roles where code in ('tecnico', 'asesor', 'compras', 'calidad', 'analista')
  loop
    select exists (
      select 1 from role_permissions rp
      join roles ro on ro.id = rp.role_id
      join permissions p on p.id = rp.permission_id
      where ro.code = r.code and p.code = 'scope:all_corporate_clients'
    ) into v_has;
    if not v_has then
      raise exception 'FALLO 5.1: el rol % no tiene alcance sobre las empresas', r.code;
    end if;
  end loop;
  raise notice '5.1 ✓ el personal interno tiene alcance sobre todas las empresas';

  select exists (
    select 1 from role_permissions rp
    join roles ro on ro.id = rp.role_id
    join permissions p on p.id = rp.permission_id
    where ro.code = 'tecnico' and p.code = 'dashboard:read_all_clients'
  ) into v_has;
  if v_has then
    raise exception 'FALLO 5.1: el técnico no debería ver la comparativa entre empresas';
  end if;
  raise notice '5.1 ✓ el técnico NO ve la comparativa entre empresas';

  -- ── 5.2 · Separación de funciones en compras ──────────────────────────────
  select exists (
    select 1 from role_permissions rp
    join roles ro on ro.id = rp.role_id
    join permissions p on p.id = rp.permission_id
    where ro.code = 'compras' and p.code = 'purchases:authorize'
  ) into v_has;
  if v_has then
    raise exception 'FALLO 5.2: compras puede autorizar su propia compra';
  end if;
  raise notice '5.2 ✓ compras cotiza, compra y recibe, pero NO autoriza el gasto';

  select exists (
    select 1 from role_permissions rp
    join roles ro on ro.id = rp.role_id
    join permissions p on p.id = rp.permission_id
    where ro.code = 'asesor' and p.code = 'purchases:authorize'
  ) into v_has;
  if not v_has then
    raise exception 'FALLO 5.2: nadie podría autorizar la compra';
  end if;
  raise notice '5.2 ✓ el asesor sí autoriza la compra';

  -- ── 5.3 · El cliente corporativo ──────────────────────────────────────────
  for r in
    select unnest(array['scope:all_corporate_clients','dashboard:read_all_clients',
                        'quotations:read_cost','customers:read_pii','audit:read']) as code
  loop
    select exists (
      select 1 from role_permissions rp
      join roles ro on ro.id = rp.role_id
      join permissions p on p.id = rp.permission_id
      where ro.code = 'cliente_corporativo' and p.code = r.code::citext
    ) into v_has;
    if v_has then
      raise exception 'FALLO 5.3: el cliente corporativo tiene %', r.code;
    end if;
  end loop;
  raise notice '5.3 ✓ el cliente corporativo no ve costos, márgenes, PII ni otras empresas';

  -- ── 5.4 · Solo el super administrador gestiona roles ───────────────────────
  select count(*) into v_count
  from role_permissions rp
  join roles ro on ro.id = rp.role_id
  join permissions p on p.id = rp.permission_id
  where p.code = 'roles:manage';
  if v_count <> 1 then
    raise exception 'FALLO 5.4: % roles pueden gestionar permisos, debería ser 1', v_count;
  end if;
  raise notice '5.4 ✓ solo el super administrador gestiona roles y permisos';

  -- ── 5.5 · `has_permission()` responde igual que la tabla ──────────────────
  select id into v_uid from auth.users where email = 'compras@diana.test';
  if public.has_permission(v_uid, 'purchases:authorize') then
    raise exception 'FALLO 5.5: has_permission concede a compras la autorización';
  end if;
  if not public.has_permission(v_uid, 'purchases:receive') then
    raise exception 'FALLO 5.5: has_permission niega a compras la recepción';
  end if;
  raise notice '5.5 ✓ has_permission() coincide con la matriz';

  -- ── 5.6 · Un usuario desactivado pierde TODOS sus permisos ────────────────
  select id into v_uid from auth.users where email = 'asesor@diana.test';
  update profiles set is_active = false where id = v_uid;
  if public.has_permission(v_uid, 'orders:read') then
    raise exception 'FALLO 5.6: un usuario desactivado conserva permisos';
  end if;
  update profiles set is_active = true where id = v_uid;
  raise notice '5.6 ✓ un usuario desactivado pierde el acceso de inmediato';

  raise notice '✓ PRUEBA 5 SUPERADA · la matriz de permisos en la base es la documentada';
end $$;
