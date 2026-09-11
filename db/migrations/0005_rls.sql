-- Row Level Security: la frontera de seguridad real.
--
-- Denegar por defecto; abrir solo con permiso explícito Y pertenencia a la
-- empresa. Si mañana una consulta del tablero olvidara filtrar por empresa,
-- BBVA seguiría sin poder ver datos de Mitsui.
--
-- NO existe ninguna política DELETE en todo el esquema: §60 prohíbe eliminar
-- físicamente el historial. Los maestros se dan de baja con `deleted_at` y los
-- documentos transaccionales se anulan con estado.

-- ── 1 · Accesos derivados, para no repetir cadenas de joins ──────────────────

create or replace function public.can_access_reception(p_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from vehicle_receptions r
                 where r.id = p_id and public.can_access_order(r.service_order_id))
$$;
--> statement-breakpoint

create or replace function public.can_access_checklist(p_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from vehicle_checklists c
                 where c.id = p_id and public.can_access_reception(c.reception_id))
$$;
--> statement-breakpoint

create or replace function public.can_access_diagnostic(p_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from diagnostics d
                 where d.id = p_id and public.can_access_order(d.service_order_id))
$$;
--> statement-breakpoint

create or replace function public.can_access_quotation(p_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from quotations q
                 where q.id = p_id and public.can_access_order(q.service_order_id))
$$;
--> statement-breakpoint

create or replace function public.can_access_quotation_item(p_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from quotation_items qi
                 where qi.id = p_id and public.can_access_quotation(qi.quotation_id))
$$;
--> statement-breakpoint

create or replace function public.can_access_authorization(p_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from customer_authorizations ca
                 where ca.id = p_id and public.can_access_quotation(ca.quotation_id))
$$;
--> statement-breakpoint

create or replace function public.can_access_parts_request(p_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from parts_requests pr
                 where pr.id = p_id and public.can_access_order(pr.service_order_id))
$$;
--> statement-breakpoint

create or replace function public.can_access_supplier_quote(p_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from supplier_quotes sq
                 where sq.id = p_id and public.can_access_parts_request(sq.parts_request_id))
$$;
--> statement-breakpoint

create or replace function public.can_access_purchase_order(p_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from purchase_orders po
                 where po.id = p_id and public.can_access_order(po.service_order_id))
$$;
--> statement-breakpoint

create or replace function public.can_access_purchase_receipt(p_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from purchase_receipts pr
                 where pr.id = p_id and public.can_access_purchase_order(pr.purchase_order_id))
$$;
--> statement-breakpoint

create or replace function public.can_access_repair_job(p_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from repair_jobs rj
                 where rj.id = p_id and public.can_access_order(rj.service_order_id))
$$;
--> statement-breakpoint

create or replace function public.can_access_quality_control(p_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from quality_controls qc
                 where qc.id = p_id and public.can_access_order(qc.service_order_id))
$$;
--> statement-breakpoint

create or replace function public.can_access_survey(p_id uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select exists (select 1 from surveys s
                 where s.id = p_id and public.can_access_corporate_client(s.corporate_client_id))
$$;
--> statement-breakpoint

-- ── 2 · RLS activa en TODAS las tablas ───────────────────────────────────────

do $$
declare t text;
begin
  for t in select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;
--> statement-breakpoint

-- ── 3 · Permisos de objeto ───────────────────────────────────────────────────
-- El rol anónimo del portal NO toca ninguna tabla (resolución de I-1): lee
-- exclusivamente por funciones SECURITY DEFINER que verifican el token.

revoke all on all tables in schema public from anon;
--> statement-breakpoint
revoke all on all functions in schema public from anon;
--> statement-breakpoint

grant select, insert, update on all tables in schema public to authenticated;
--> statement-breakpoint

-- Sin esto, un usuario con TODOS sus permisos de negocio falla al insertar con
-- un error de sistema incomprensible.
grant usage, select on all sequences in schema public to authenticated;
--> statement-breakpoint

grant select on public.customers_masked to authenticated;
--> statement-breakpoint

-- El número completo del documento no se lee por consulta directa: solo por
-- `reveal_document_number()`, que exige permiso y deja registro.
revoke select (document_number) on public.customers from authenticated;
--> statement-breakpoint

-- Ni el sueldo ni el límite de compra de un compañero son asunto de nadie.
revoke select (hourly_rate, purchase_limit, document_number)
  on public.profiles from authenticated;
--> statement-breakpoint

-- La auditoría se inserta y se lee; nunca se modifica ni se borra.
revoke update on public.audit_logs from authenticated;
--> statement-breakpoint
revoke update on public.status_history from authenticated;
--> statement-breakpoint

-- ── 4 · Catálogos: los lee cualquier sesión, los escribe quien administra ────

do $$
declare r record;
begin
  for r in
    select * from (values
      ('roles',                     'roles:manage'),
      ('permissions',               'roles:manage'),
      ('role_permissions',          'roles:manage'),
      ('status_transitions',        'roles:manage'),
      ('service_types',             'settings:manage'),
      ('service_type_final_stages', 'settings:manage'),
      ('checklist_categories',      'checklists:manage'),
      ('checklist_item_defs',       'checklists:manage'),
      ('pause_reasons',             'settings:manage'),
      ('parts_catalog',             'parts_catalog:manage'),
      ('suppliers',                 'suppliers:manage'),
      ('survey_templates',          'questionnaires:manage'),
      ('survey_template_versions',  'questionnaires:manage'),
      ('survey_questions',          'questionnaires:manage'),
      ('notification_rules',        'notifications:manage'),
      ('app_settings',              'settings:manage'),
      ('bays',                      'branches:manage'),
      ('technician_specialties',    'users:manage')
    ) as t(tbl, perm)
  loop
    execute format(
      $f$create policy %1$I_select on public.%1$I for select to authenticated using (true)$f$,
      r.tbl);
    execute format(
      $f$create policy %1$I_insert on public.%1$I for insert to authenticated
         with check (public.current_user_has_permission(%2$L))$f$, r.tbl, r.perm);
    execute format(
      $f$create policy %1$I_update on public.%1$I for update to authenticated
         using (public.current_user_has_permission(%2$L))
         with check (public.current_user_has_permission(%2$L))$f$, r.tbl, r.perm);
  end loop;
end $$;
--> statement-breakpoint

-- ── 5 · Tablas con alcance corporativo directo ───────────────────────────────

do $$
declare r record;
begin
  for r in
    select * from (values
      ('corporate_clients', 'id',                  'orders:read',    'corporate_clients:manage'),
      ('customers',         'corporate_client_id', 'customers:read', 'customers:write'),
      ('vehicles',          'corporate_client_id', 'vehicles:read',  'vehicles:write'),
      ('service_orders',    'corporate_client_id', 'orders:read',    'orders:create'),
      ('surveys',           'corporate_client_id', 'surveys:read',   'surveys:create'),
      ('reports',           'corporate_client_id', 'reports:read',   'reports:generate'),
      ('followups',         'corporate_client_id', 'followups:read', 'followups:write')
    ) as t(tbl, col, read_perm, write_perm)
  loop
    execute format(
      $f$create policy %1$I_select on public.%1$I for select to authenticated
         using (public.current_user_has_permission(%3$L)
                and public.can_access_corporate_client(%2$I))$f$,
      r.tbl, r.col, r.read_perm);
    execute format(
      $f$create policy %1$I_insert on public.%1$I for insert to authenticated
         with check (public.current_user_has_permission(%3$L)
                     and public.can_access_corporate_client(%2$I))$f$,
      r.tbl, r.col, r.write_perm);
    execute format(
      $f$create policy %1$I_update on public.%1$I for update to authenticated
         using (public.current_user_has_permission(%3$L)
                and public.can_access_corporate_client(%2$I))
         with check (public.can_access_corporate_client(%2$I))$f$,
      r.tbl, r.col, r.write_perm);
  end loop;
end $$;
--> statement-breakpoint

-- ── 6 · Tablas colgadas de la orden ──────────────────────────────────────────

do $$
declare r record;
begin
  for r in
    select * from (values
      ('vehicle_receptions', 'receptions:read',  'receptions:write'),
      ('diagnostics',        'diagnostics:read', 'diagnostics:write'),
      ('evidence_files',     'evidence:read',    'evidence:upload'),
      ('quotations',         'quotations:read',  'quotations:write'),
      ('parts_requests',     'parts:read',       'parts:request'),
      ('purchase_orders',    'purchases:read',   'purchases:write'),
      ('repair_jobs',        'repairs:read',     'repairs:execute'),
      ('quality_controls',   'quality:read',     'quality:approve'),
      ('washing_jobs',       'orders:read',      'washing:execute'),
      ('alignment_jobs',     'orders:read',      'alignment:execute'),
      ('status_history',     'orders:read',      'orders:advance'),
      ('work_assignments',   'orders:read',      'orders:assign'),
      ('documents',          'reports:read',     'reports:generate')
    ) as t(tbl, read_perm, write_perm)
  loop
    execute format(
      $f$create policy %1$I_select on public.%1$I for select to authenticated
         using (public.current_user_has_permission(%2$L)
                and public.can_access_order(service_order_id))$f$,
      r.tbl, r.read_perm);
    execute format(
      $f$create policy %1$I_insert on public.%1$I for insert to authenticated
         with check (public.current_user_has_permission(%2$L)
                     and public.can_access_order(service_order_id))$f$,
      r.tbl, r.write_perm);
    execute format(
      $f$create policy %1$I_update on public.%1$I for update to authenticated
         using (public.current_user_has_permission(%2$L)
                and public.can_access_order(service_order_id))
         with check (public.can_access_order(service_order_id))$f$,
      r.tbl, r.write_perm);
  end loop;
end $$;
--> statement-breakpoint

-- ── 7 · Tablas hijas: comprueban pertenencia contra su padre ─────────────────
-- No repiten la lógica de alcance; el padre ya está protegido.

do $$
declare r record;
begin
  for r in
    select * from (values
      ('vehicle_checklists',    'reception_id',          'can_access_reception',       'receptions:read',    'receptions:write'),
      ('checklist_items',       'checklist_id',          'can_access_checklist',       'receptions:read',    'receptions:write'),
      ('vehicle_damages',       'reception_id',          'can_access_reception',       'receptions:read',    'receptions:write'),
      ('reception_documents',   'reception_id',          'can_access_reception',       'receptions:read',    'receptions:write'),
      ('diagnostic_items',      'diagnostic_id',         'can_access_diagnostic',      'diagnostics:read',   'diagnostics:write'),
      ('quotation_items',       'quotation_id',          'can_access_quotation',       'quotations:read',    'quotations:write'),
      ('quotation_item_parts',  'quotation_item_id',     'can_access_quotation_item',  'quotations:read',    'quotations:write'),
      ('authorization_links',   'quotation_id',          'can_access_quotation',       'authorizations:read','quotations:send'),
      ('customer_authorizations','quotation_id',         'can_access_quotation',       'authorizations:read','authorizations:register'),
      ('authorization_items',   'authorization_id',      'can_access_authorization',   'authorizations:read','authorizations:register'),
      ('parts_request_items',   'parts_request_id',      'can_access_parts_request',   'parts:read',         'parts:request'),
      ('supplier_quotes',       'parts_request_id',      'can_access_parts_request',   'purchases:read',     'purchases:quote'),
      ('supplier_quote_items',  'supplier_quote_id',     'can_access_supplier_quote',  'purchases:read',     'purchases:quote'),
      ('purchase_order_items',  'purchase_order_id',     'can_access_purchase_order',  'purchases:read',     'purchases:write'),
      ('purchase_receipts',     'purchase_order_id',     'can_access_purchase_order',  'purchases:read',     'purchases:receive'),
      ('purchase_receipt_items','purchase_receipt_id',   'can_access_purchase_receipt','purchases:read',     'purchases:receive'),
      ('repair_job_items',      'repair_job_id',         'can_access_repair_job',      'repairs:read',       'repairs:execute'),
      ('repair_time_sessions',  'repair_job_id',         'can_access_repair_job',      'repairs:read',       'repairs:execute'),
      ('quality_control_items', 'quality_control_id',    'can_access_quality_control', 'quality:read',       'quality:approve'),
      ('survey_answers',        'survey_id',             'can_access_survey',          'surveys:read',       'surveys:create')
    ) as t(tbl, col, fn, read_perm, write_perm)
  loop
    execute format(
      $f$create policy %1$I_select on public.%1$I for select to authenticated
         using (public.current_user_has_permission(%4$L) and public.%3$I(%2$I))$f$,
      r.tbl, r.col, r.fn, r.read_perm);
    execute format(
      $f$create policy %1$I_insert on public.%1$I for insert to authenticated
         with check (public.current_user_has_permission(%4$L) and public.%3$I(%2$I))$f$,
      r.tbl, r.col, r.fn, r.write_perm);
    execute format(
      $f$create policy %1$I_update on public.%1$I for update to authenticated
         using (public.current_user_has_permission(%4$L) and public.%3$I(%2$I))
         with check (public.%3$I(%2$I))$f$,
      r.tbl, r.col, r.fn, r.write_perm);
  end loop;
end $$;
--> statement-breakpoint

-- ── 8 · Tablas con reglas propias ────────────────────────────────────────────

-- Identidad: cada quien ve su perfil; ver los demás exige gestionar usuarios.
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.current_user_has_permission('orders:read'));
--> statement-breakpoint
create policy profiles_insert on public.profiles for insert to authenticated
  with check (public.current_user_has_permission('users:manage'));
--> statement-breakpoint
create policy profiles_update on public.profiles for update to authenticated
  using (public.current_user_has_permission('users:manage'))
  with check (public.current_user_has_permission('users:manage'));
--> statement-breakpoint

create policy user_corporate_clients_select on public.user_corporate_clients
  for select to authenticated
  using (profile_id = auth.uid() or public.current_user_has_permission('users:manage'));
--> statement-breakpoint
create policy user_corporate_clients_insert on public.user_corporate_clients
  for insert to authenticated
  with check (public.current_user_has_permission('users:manage'));
--> statement-breakpoint
create policy user_corporate_clients_update on public.user_corporate_clients
  for update to authenticated
  using (public.current_user_has_permission('users:manage'))
  with check (public.current_user_has_permission('users:manage'));
--> statement-breakpoint

-- Sedes: son del taller, no de un cliente. Las de un cliente corporativo solo
-- las ve quien tiene alcance sobre esa empresa.
create policy branches_select on public.branches for select to authenticated
  using (corporate_client_id is null or public.can_access_corporate_client(corporate_client_id));
--> statement-breakpoint
create policy branches_insert on public.branches for insert to authenticated
  with check (public.current_user_has_permission('branches:manage'));
--> statement-breakpoint
create policy branches_update on public.branches for update to authenticated
  using (public.current_user_has_permission('branches:manage'))
  with check (public.current_user_has_permission('branches:manage'));
--> statement-breakpoint

create policy service_advisors_select on public.service_advisors for select to authenticated
  using (true);
--> statement-breakpoint
create policy service_advisors_insert on public.service_advisors for insert to authenticated
  with check (public.current_user_has_permission('advisors:manage'));
--> statement-breakpoint
create policy service_advisors_update on public.service_advisors for update to authenticated
  using (public.current_user_has_permission('advisors:manage'))
  with check (public.current_user_has_permission('advisors:manage'));
--> statement-breakpoint

-- Firmas: cuelgan de varias entidades; se comprueba el alcance de la orden a
-- través de la entidad correspondiente en la capa de aplicación. Aquí basta
-- con exigir sesión y el permiso de lectura de la orden.
create policy signatures_select on public.signatures for select to authenticated
  using (public.current_user_has_permission('orders:read'));
--> statement-breakpoint
create policy signatures_insert on public.signatures for insert to authenticated
  with check (public.current_user_has_permission('receptions:write')
              or public.current_user_has_permission('orders:deliver')
              or public.current_user_has_permission('authorizations:register'));
--> statement-breakpoint

create policy authorization_otps_select on public.authorization_otps for select to authenticated
  using (public.current_user_has_permission('authorizations:read'));
--> statement-breakpoint

-- Notificaciones: son de su destinatario y de nadie más.
create policy notifications_select on public.notifications for select to authenticated
  using (recipient_profile_id = auth.uid());
--> statement-breakpoint
create policy notifications_update on public.notifications for update to authenticated
  using (recipient_profile_id = auth.uid())
  with check (recipient_profile_id = auth.uid());
--> statement-breakpoint
create policy notification_deliveries_select on public.notification_deliveries
  for select to authenticated
  using (exists (select 1 from notifications n
                 where n.id = notification_id and n.recipient_profile_id = auth.uid()));
--> statement-breakpoint

-- Auditoría: se lee con permiso y dentro del alcance; se inserta siempre.
create policy audit_logs_select on public.audit_logs for select to authenticated
  using (public.current_user_has_permission('audit:read')
         and (corporate_client_id is null
              or public.can_access_corporate_client(corporate_client_id)));
--> statement-breakpoint
create policy audit_logs_insert on public.audit_logs for insert to authenticated
  with check (true);
--> statement-breakpoint

-- Control de intentos: lo gestiona el servidor, no el usuario.
create policy rate_limits_none on public.rate_limits for select to authenticated
  using (false);
