-- ============================================================================
-- Row Level Security.
--
-- Esta es la frontera de seguridad real del sistema. Aunque una consulta de la
-- aplicación olvidara filtrar por empresa, un usuario de BBVA no obtendría ni
-- una fila de Mitsui: la base de datos no se la entrega.
--
-- Principio aplicado en todas las tablas: denegar por defecto, y abrir solo
-- mediante permiso explícito y pertenencia a la empresa.
-- ============================================================================

-- Activar RLS en todo el esquema de negocio. Sin políticas, nadie ve nada.
ALTER TABLE "corporate_clients"        ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "branches"                 ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "service_advisors"         ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "service_types"            ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "customers"                ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "vehicles"                 ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "survey_templates"         ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "survey_template_versions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "survey_questions"         ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "surveys"                  ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "survey_answers"           ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "profiles"                 ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "roles"                    ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "permissions"              ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "role_permissions"         ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_corporate_clients"   ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "app_settings"             ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "reports"                  ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "audit_logs"               ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

-- El número de documento completo no se expone ni siquiera al rol autenticado:
-- solo se obtiene por `reveal_document_number()`, que verifica permiso y audita.
REVOKE SELECT (document_number, document_hash) ON "customers" FROM authenticated;
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Empresas
-- ---------------------------------------------------------------------------
CREATE POLICY "corporate_clients_select" ON "corporate_clients" FOR SELECT TO authenticated
USING (public.can_access_corporate_client(id));
--> statement-breakpoint

CREATE POLICY "corporate_clients_write" ON "corporate_clients" FOR ALL TO authenticated
USING (public.current_user_has_permission('corporate_clients:manage'))
WITH CHECK (public.current_user_has_permission('corporate_clients:manage'));
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Sedes y asesores
-- ---------------------------------------------------------------------------
CREATE POLICY "branches_select" ON "branches" FOR SELECT TO authenticated
USING (corporate_client_id IS NULL OR public.can_access_corporate_client(corporate_client_id));
--> statement-breakpoint

CREATE POLICY "branches_write" ON "branches" FOR ALL TO authenticated
USING (public.current_user_has_permission('branches:manage'))
WITH CHECK (public.current_user_has_permission('branches:manage'));
--> statement-breakpoint

CREATE POLICY "service_advisors_select" ON "service_advisors" FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM branches b
    WHERE b.id = branch_id
      AND (b.corporate_client_id IS NULL OR public.can_access_corporate_client(b.corporate_client_id))
  )
);
--> statement-breakpoint

CREATE POLICY "service_advisors_write" ON "service_advisors" FOR ALL TO authenticated
USING (public.current_user_has_permission('advisors:manage'))
WITH CHECK (public.current_user_has_permission('advisors:manage'));
--> statement-breakpoint

-- Catálogo compartido: legible por cualquier sesión válida.
CREATE POLICY "service_types_select" ON "service_types" FOR SELECT TO authenticated USING (true);
--> statement-breakpoint

CREATE POLICY "service_types_write" ON "service_types" FOR ALL TO authenticated
USING (public.current_user_has_permission('settings:manage'))
WITH CHECK (public.current_user_has_permission('settings:manage'));
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Clientes y vehículos
-- ---------------------------------------------------------------------------
CREATE POLICY "customers_select" ON "customers" FOR SELECT TO authenticated
USING (
  public.current_user_has_permission('customers:read')
  AND public.can_access_corporate_client(corporate_client_id)
);
--> statement-breakpoint

CREATE POLICY "customers_write" ON "customers" FOR ALL TO authenticated
USING (
  public.current_user_has_permission('customers:write')
  AND public.can_access_corporate_client(corporate_client_id)
)
WITH CHECK (
  public.current_user_has_permission('customers:write')
  AND public.can_access_corporate_client(corporate_client_id)
);
--> statement-breakpoint

CREATE POLICY "vehicles_select" ON "vehicles" FOR SELECT TO authenticated
USING (
  public.current_user_has_permission('vehicles:read')
  AND public.can_access_corporate_client(corporate_client_id)
);
--> statement-breakpoint

CREATE POLICY "vehicles_write" ON "vehicles" FOR ALL TO authenticated
USING (
  public.current_user_has_permission('vehicles:write')
  AND public.can_access_corporate_client(corporate_client_id)
)
WITH CHECK (
  public.current_user_has_permission('vehicles:write')
  AND public.can_access_corporate_client(corporate_client_id)
);
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Cuestionario: legible por quien pueda responder o analizar; editable solo por
-- quien administra cuestionarios.
-- ---------------------------------------------------------------------------
CREATE POLICY "survey_templates_select" ON "survey_templates" FOR SELECT TO authenticated USING (true);
--> statement-breakpoint
CREATE POLICY "survey_templates_write" ON "survey_templates" FOR ALL TO authenticated
USING (public.current_user_has_permission('questionnaires:manage'))
WITH CHECK (public.current_user_has_permission('questionnaires:manage'));
--> statement-breakpoint

CREATE POLICY "survey_template_versions_select" ON "survey_template_versions" FOR SELECT TO authenticated USING (true);
--> statement-breakpoint
CREATE POLICY "survey_template_versions_write" ON "survey_template_versions" FOR ALL TO authenticated
USING (public.current_user_has_permission('questionnaires:manage'))
WITH CHECK (public.current_user_has_permission('questionnaires:manage'));
--> statement-breakpoint

CREATE POLICY "survey_questions_select" ON "survey_questions" FOR SELECT TO authenticated USING (true);
--> statement-breakpoint
CREATE POLICY "survey_questions_write" ON "survey_questions" FOR ALL TO authenticated
USING (public.current_user_has_permission('questionnaires:manage'))
WITH CHECK (public.current_user_has_permission('questionnaires:manage'));
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Encuestas: la tabla más sensible del sistema.
-- ---------------------------------------------------------------------------
CREATE POLICY "surveys_select" ON "surveys" FOR SELECT TO authenticated
USING (
  public.current_user_has_permission('surveys:read')
  AND public.can_access_corporate_client(corporate_client_id)
);
--> statement-breakpoint

CREATE POLICY "surveys_insert" ON "surveys" FOR INSERT TO authenticated
WITH CHECK (
  public.current_user_has_permission('surveys:create')
  AND public.can_access_corporate_client(corporate_client_id)
);
--> statement-breakpoint

-- No existe DELETE: una encuesta no se borra jamás. Solo se anula o se marca
-- para seguimiento, y ambas cosas son UPDATE.
CREATE POLICY "surveys_update" ON "surveys" FOR UPDATE TO authenticated
USING (
  (public.current_user_has_permission('surveys:void')
   OR public.current_user_has_permission('followups:write'))
  AND public.can_access_corporate_client(corporate_client_id)
)
WITH CHECK (public.can_access_corporate_client(corporate_client_id));
--> statement-breakpoint

CREATE POLICY "survey_answers_select" ON "survey_answers" FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM surveys s
    WHERE s.id = survey_id
      AND public.current_user_has_permission('surveys:read')
      AND public.can_access_corporate_client(s.corporate_client_id)
  )
);
--> statement-breakpoint

CREATE POLICY "survey_answers_insert" ON "survey_answers" FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM surveys s
    WHERE s.id = survey_id
      AND public.current_user_has_permission('surveys:create')
      AND public.can_access_corporate_client(s.corporate_client_id)
  )
);
--> statement-breakpoint

-- Una respuesta enviada es inmutable: no hay política de UPDATE ni de DELETE.

-- ---------------------------------------------------------------------------
-- Seguridad y configuración
-- ---------------------------------------------------------------------------
CREATE POLICY "profiles_select_self" ON "profiles" FOR SELECT TO authenticated
USING (id = auth.uid() OR public.current_user_has_permission('users:manage'));
--> statement-breakpoint

CREATE POLICY "profiles_update_self" ON "profiles" FOR UPDATE TO authenticated
USING (id = auth.uid() OR public.current_user_has_permission('users:manage'))
WITH CHECK (id = auth.uid() OR public.current_user_has_permission('users:manage'));
--> statement-breakpoint

CREATE POLICY "profiles_insert_admin" ON "profiles" FOR INSERT TO authenticated
WITH CHECK (public.current_user_has_permission('users:manage'));
--> statement-breakpoint

CREATE POLICY "roles_select" ON "roles" FOR SELECT TO authenticated USING (true);
--> statement-breakpoint
CREATE POLICY "roles_write" ON "roles" FOR ALL TO authenticated
USING (public.current_user_has_permission('roles:manage'))
WITH CHECK (public.current_user_has_permission('roles:manage'));
--> statement-breakpoint

CREATE POLICY "permissions_select" ON "permissions" FOR SELECT TO authenticated USING (true);
--> statement-breakpoint
CREATE POLICY "permissions_write" ON "permissions" FOR ALL TO authenticated
USING (public.current_user_has_permission('roles:manage'))
WITH CHECK (public.current_user_has_permission('roles:manage'));
--> statement-breakpoint

CREATE POLICY "role_permissions_select" ON "role_permissions" FOR SELECT TO authenticated USING (true);
--> statement-breakpoint
CREATE POLICY "role_permissions_write" ON "role_permissions" FOR ALL TO authenticated
USING (public.current_user_has_permission('roles:manage'))
WITH CHECK (public.current_user_has_permission('roles:manage'));
--> statement-breakpoint

-- Un usuario ve a qué empresas pertenece; asignarlas exige gestionar usuarios.
CREATE POLICY "user_corporate_clients_select" ON "user_corporate_clients" FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.current_user_has_permission('users:manage'));
--> statement-breakpoint

CREATE POLICY "user_corporate_clients_write" ON "user_corporate_clients" FOR ALL TO authenticated
USING (public.current_user_has_permission('users:manage'))
WITH CHECK (public.current_user_has_permission('users:manage'));
--> statement-breakpoint

CREATE POLICY "app_settings_select" ON "app_settings" FOR SELECT TO authenticated
USING (scope = 'global' OR public.can_access_corporate_client(corporate_client_id));
--> statement-breakpoint

CREATE POLICY "app_settings_write" ON "app_settings" FOR ALL TO authenticated
USING (public.current_user_has_permission('settings:manage'))
WITH CHECK (public.current_user_has_permission('settings:manage'));
--> statement-breakpoint

-- ---------------------------------------------------------------------------
-- Informes y auditoría
-- ---------------------------------------------------------------------------
CREATE POLICY "reports_select" ON "reports" FOR SELECT TO authenticated
USING (
  public.current_user_has_permission('reports:read')
  AND public.can_access_corporate_client(corporate_client_id)
);
--> statement-breakpoint

CREATE POLICY "reports_insert" ON "reports" FOR INSERT TO authenticated
WITH CHECK (
  public.current_user_has_permission('reports:generate')
  AND public.can_access_corporate_client(corporate_client_id)
);
--> statement-breakpoint

-- La auditoría se lee con permiso y no se modifica nunca desde la aplicación:
-- solo la escriben funciones SECURITY DEFINER y el servicio del sistema.
CREATE POLICY "audit_logs_select" ON "audit_logs" FOR SELECT TO authenticated
USING (public.current_user_has_permission('audit:read'));
