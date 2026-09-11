CREATE TYPE "public"."actor_kind" AS ENUM('usuario', 'portal_cliente', 'sistema');--> statement-breakpoint
CREATE TYPE "public"."assignment_role" AS ENUM('diagnostico', 'reparacion', 'planchado', 'pintura');--> statement-breakpoint
CREATE TYPE "public"."authorization_channel" AS ENUM('portal', 'telefono', 'presencial', 'whatsapp');--> statement-breakpoint
CREATE TYPE "public"."authorization_item_status" AS ENUM('pendiente', 'aprobado', 'rechazado', 'aprobado_con_observacion');--> statement-breakpoint
CREATE TYPE "public"."body_zone" AS ENUM('frontal', 'posterior', 'lateral_izquierdo', 'lateral_derecho', 'techo', 'interior');--> statement-breakpoint
CREATE TYPE "public"."checklist_input_type" AS ENUM('estado', 'estado_cantidad', 'estado_medida');--> statement-breakpoint
CREATE TYPE "public"."checklist_status" AS ENUM('ok', 'no_conforme', 'no_aplica');--> statement-breakpoint
CREATE TYPE "public"."damage_type" AS ENUM('golpe', 'rayon', 'picado', 'abolladura', 'otro');--> statement-breakpoint
CREATE TYPE "public"."delivery_status" AS ENUM('pendiente', 'enviado', 'fallido', 'omitido');--> statement-breakpoint
CREATE TYPE "public"."diagnostic_priority" AS ENUM('critico', 'alto', 'medio', 'bajo', 'recomendacion');--> statement-breakpoint
CREATE TYPE "public"."document_kind" AS ENUM('checklist_recepcion', 'orden_servicio', 'diagnostico', 'cotizacion', 'autorizacion', 'orden_compra', 'reporte_repuestos', 'reporte_trabajo', 'acta_entrega', 'informe_satisfaccion');--> statement-breakpoint
CREATE TYPE "public"."document_type" AS ENUM('DNI', 'CE', 'RUC', 'PAS');--> statement-breakpoint
CREATE TYPE "public"."evidence_kind" AS ENUM('foto', 'video', 'documento');--> statement-breakpoint
CREATE TYPE "public"."evidence_status" AS ENUM('pendiente', 'listo');--> statement-breakpoint
CREATE TYPE "public"."final_stage" AS ENUM('lavado', 'alineamiento');--> statement-breakpoint
CREATE TYPE "public"."followup_status" AS ENUM('pendiente', 'en_proceso', 'resuelto', 'no_contactado');--> statement-breakpoint
CREATE TYPE "public"."fuel_level" AS ENUM('vacio', 'un_cuarto', 'medio', 'tres_cuartos', 'lleno');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('pendiente', 'en_proceso', 'terminado');--> statement-breakpoint
CREATE TYPE "public"."level_reading" AS ENUM('bajo', 'normal', 'alto');--> statement-breakpoint
CREATE TYPE "public"."metric_role" AS ENUM('csat', 'nps', 'none');--> statement-breakpoint
CREATE TYPE "public"."notification_channel" AS ENUM('in_app', 'email', 'whatsapp', 'sms');--> statement-breakpoint
CREATE TYPE "public"."nps_category" AS ENUM('detractor', 'pasivo', 'promotor');--> statement-breakpoint
CREATE TYPE "public"."order_action" AS ENUM('registrar_recepcion', 'completar_checklist', 'enviar_a_diagnostico', 'iniciar_diagnostico', 'completar_diagnostico', 'preparar_cotizacion', 'enviar_cotizacion', 'cliente_abrio_enlace', 'registrar_decision', 'cerrar_sin_trabajos', 'solicitar_repuestos', 'sin_repuestos', 'autorizar_cotizar', 'enviar_a_autorizacion', 'autorizar_compra', 'rechazar_compra', 'generar_orden_compra', 'confirmar_envio', 'recepcion_parcial', 'recepcion_completa', 'liberar_para_reparacion', 'iniciar_trabajo', 'pausar', 'reanudar', 'ampliar_cotizacion', 'terminar_reparacion', 'enviar_a_calidad', 'aprobar_calidad', 'observar_calidad', 'retomar_reparacion', 'enviar_a_lavado', 'enviar_a_alineamiento', 'finalizar_directo', 'iniciar_lavado', 'terminar_lavado', 'iniciar_alineamiento', 'terminar_alineamiento', 'entregar', 'cerrar', 'cancelar');--> statement-breakpoint
CREATE TYPE "public"."order_priority" AS ENUM('urgente', 'alta', 'normal', 'baja');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('DRAFT', 'RECEPCIONADO', 'CHECKLIST_COMPLETADO', 'PENDIENTE_DIAGNOSTICO', 'EN_DIAGNOSTICO', 'DIAGNOSTICO_COMPLETADO', 'COTIZACION_EN_PREPARACION', 'COTIZACION_ENVIADA', 'ESPERANDO_CLIENTE', 'APROBACION_PARCIAL', 'APROBADO', 'SOLICITUD_REPUESTOS', 'REPUESTOS_EN_COTIZACION', 'COMPRA_PENDIENTE_AUTORIZACION', 'COMPRA_AUTORIZADA', 'ORDEN_COMPRA_GENERADA', 'ESPERANDO_REPUESTOS', 'REPUESTOS_PARCIALES', 'REPUESTOS_COMPLETOS', 'LISTO_PARA_REPARACION', 'EN_REPARACION', 'REPARACION_PAUSADA', 'REPARACION_TERMINADA', 'CONTROL_CALIDAD', 'OBSERVADO_CONTROL_CALIDAD', 'CONTROL_CALIDAD_APROBADO', 'PENDIENTE_LAVADO', 'EN_LAVADO', 'PENDIENTE_ALINEAMIENTO', 'EN_ALINEAMIENTO', 'LISTO_PARA_ENTREGA', 'ENTREGADO', 'CERRADO', 'CANCELADO');--> statement-breakpoint
CREATE TYPE "public"."parts_request_status" AS ENUM('borrador', 'pendiente', 'autorizada', 'rechazada', 'en_correccion');--> statement-breakpoint
CREATE TYPE "public"."purchase_order_status" AS ENUM('emitida', 'enviada', 'parcial', 'completa', 'anulada');--> statement-breakpoint
CREATE TYPE "public"."quality_item_result" AS ENUM('conforme', 'no_conforme', 'no_aplica');--> statement-breakpoint
CREATE TYPE "public"."quality_result" AS ENUM('aprobado', 'observado');--> statement-breakpoint
CREATE TYPE "public"."quotation_status" AS ENUM('borrador', 'emitida', 'sustituida', 'anulada');--> statement-breakpoint
CREATE TYPE "public"."reception_document_type" AS ENUM('tarjeta_propiedad', 'revision_tecnica', 'soat', 'polarizado', 'otro');--> statement-breakpoint
CREATE TYPE "public"."repair_item_status" AS ENUM('pendiente', 'en_proceso', 'hecho', 'bloqueado');--> statement-breakpoint
CREATE TYPE "public"."satisfaction_level" AS ENUM('insatisfecho', 'regular', 'satisfecho', 'muy_satisfecho');--> statement-breakpoint
CREATE TYPE "public"."setting_scope" AS ENUM('global', 'corporate_client');--> statement-breakpoint
CREATE TYPE "public"."signer_kind" AS ENUM('cliente', 'asesor', 'inspector');--> statement-breakpoint
CREATE TYPE "public"."survey_question_type" AS ENUM('scale_1_5', 'scale_0_10', 'yes_no', 'single_choice', 'multiple_choice', 'free_text');--> statement-breakpoint
CREATE TYPE "public"."survey_status" AS ENUM('completed', 'voided');--> statement-breakpoint
CREATE TYPE "public"."technician_specialty" AS ENUM('mecanica', 'planchado', 'pintura', 'electricidad', 'alineamiento');--> statement-breakpoint
CREATE TYPE "public"."time_session_kind" AS ENUM('trabajo', 'pausa');--> statement-breakpoint
CREATE TABLE "app_settings" (
	"key" "citext" PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"scope" "setting_scope" DEFAULT 'global' NOT NULL,
	"corporate_client_id" uuid,
	"description" text,
	"updated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_profile_id" uuid,
	"actor_kind" "actor_kind" DEFAULT 'usuario' NOT NULL,
	"entity" text NOT NULL,
	"entity_id" uuid,
	"action" text NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"reason" text,
	"ip" "inet",
	"user_agent" text,
	"service_order_id" uuid,
	"corporate_client_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid NOT NULL,
	"code" "citext" NOT NULL,
	"name" text NOT NULL,
	"type" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "branches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"corporate_client_id" uuid,
	"code" "citext" NOT NULL,
	"name" text NOT NULL,
	"city" text,
	"address" text,
	"timezone" text DEFAULT 'America/Lima' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "corporate_clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" "citext" NOT NULL,
	"name" text NOT NULL,
	"legal_name" text,
	"tax_id" text,
	"logo_path" text,
	"brand_color" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" "citext" NOT NULL,
	"resource" text NOT NULL,
	"action" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "permissions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"role_id" uuid NOT NULL,
	"branch_id" uuid,
	"full_name" text NOT NULL,
	"email" "citext",
	"phone" text,
	"document_number" text,
	"hourly_rate" numeric(12, 2),
	"purchase_limit" numeric(14, 2),
	"is_active" boolean DEFAULT true NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bucket" text NOT NULL,
	"subject" text NOT NULL,
	"attempts" numeric(10, 0) DEFAULT '1' NOT NULL,
	"window_started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"blocked_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "role_permissions_role_id_permission_id_pk" PRIMARY KEY("role_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" "citext" NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"is_system" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "roles_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "technician_specialties" (
	"profile_id" uuid NOT NULL,
	"specialty" "technician_specialty" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "technician_specialties_profile_id_specialty_pk" PRIMARY KEY("profile_id","specialty")
);
--> statement-breakpoint
CREATE TABLE "user_corporate_clients" (
	"profile_id" uuid NOT NULL,
	"corporate_client_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_corporate_clients_profile_id_corporate_client_id_pk" PRIMARY KEY("profile_id","corporate_client_id")
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"corporate_client_id" uuid,
	"document_type" "document_type" NOT NULL,
	"document_number" text NOT NULL,
	"document_last3" text GENERATED ALWAYS AS (right(document_number, 3)) STORED,
	"document_hash" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"business_name" text,
	"email" "citext",
	"phone" text,
	"contact_name" text,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "service_advisors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"branch_id" uuid,
	"profile_id" uuid,
	"full_name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"corporate_client_id" uuid,
	"primary_customer_id" uuid,
	"plate" "citext" NOT NULL,
	"brand" text NOT NULL,
	"model" text NOT NULL,
	"version" text,
	"model_year" integer,
	"color" text,
	"vin" "citext",
	"engine_number" text,
	"vehicle_type" text,
	"last_mileage" integer,
	"last_service_at" timestamp with time zone,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "service_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" "citext" NOT NULL,
	"corporate_client_id" uuid,
	"customer_id" uuid NOT NULL,
	"vehicle_id" uuid NOT NULL,
	"branch_id" uuid NOT NULL,
	"service_type_id" uuid,
	"advisor_profile_id" uuid,
	"status" "order_status" DEFAULT 'DRAFT' NOT NULL,
	"priority" "order_priority" DEFAULT 'normal' NOT NULL,
	"mileage_in" integer,
	"customer_request" text,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"promised_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"closed_at" timestamp with time zone,
	"final_stages" "final_stage"[] DEFAULT '{}'::final_stage[] NOT NULL,
	"cancel_reason" text,
	"delay_alerted_at" timestamp with time zone,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "service_type_final_stages" (
	"service_type_id" uuid NOT NULL,
	"stage" "final_stage" NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "service_type_final_stages_service_type_id_stage_pk" PRIMARY KEY("service_type_id","stage")
);
--> statement-breakpoint
CREATE TABLE "service_types" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" "citext" NOT NULL,
	"name" text NOT NULL,
	"parent_id" uuid,
	"position" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_order_id" uuid NOT NULL,
	"from_status" "order_status",
	"to_status" "order_status" NOT NULL,
	"action" "order_action",
	"actor_profile_id" uuid,
	"actor_kind" "actor_kind" DEFAULT 'usuario' NOT NULL,
	"area" text,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "status_transitions" (
	"from_status" "order_status" NOT NULL,
	"action" "order_action" NOT NULL,
	"to_status" "order_status" NOT NULL,
	"required_permission" "citext",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "status_transitions_from_status_action_to_status_pk" PRIMARY KEY("from_status","action","to_status")
);
--> statement-breakpoint
CREATE TABLE "work_assignments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_order_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"role_in_order" "assignment_role" NOT NULL,
	"bay_id" uuid,
	"assigned_by" uuid,
	"assigned_at" timestamp with time zone DEFAULT now() NOT NULL,
	"estimated_minutes" integer,
	"released_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checklist_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" "citext" NOT NULL,
	"name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "checklist_item_defs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"code" "citext" NOT NULL,
	"label" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"input_type" "checklist_input_type" DEFAULT 'estado' NOT NULL,
	"unit" text,
	"is_required" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "checklist_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"checklist_id" uuid NOT NULL,
	"item_def_id" uuid NOT NULL,
	"status" "checklist_status" NOT NULL,
	"quantity" integer,
	"measure_value" numeric(8, 2),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reception_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reception_id" uuid NOT NULL,
	"document_type" "reception_document_type" NOT NULL,
	"received" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signatures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"signer_kind" "signer_kind" NOT NULL,
	"signer_name" text NOT NULL,
	"signer_document" text,
	"image_path" text NOT NULL,
	"signed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip" "inet",
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicle_checklists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reception_id" uuid NOT NULL,
	"completed_by" uuid,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicle_damages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reception_id" uuid NOT NULL,
	"damage_type" "damage_type" NOT NULL,
	"body_zone" "body_zone" NOT NULL,
	"side" text,
	"pos_x" numeric(5, 4),
	"pos_y" numeric(5, 4),
	"severity" "diagnostic_priority",
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vehicle_receptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_order_id" uuid NOT NULL,
	"received_by" uuid,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"mileage" integer,
	"fuel_level" "fuel_level",
	"oil_level" "level_reading",
	"coolant_level" "level_reading",
	"tread_front_left" numeric(4, 1),
	"tread_front_right" numeric(4, 1),
	"tread_rear_left" numeric(4, 1),
	"tread_rear_right" numeric(4, 1),
	"tread_spare" numeric(4, 1),
	"customer_request" text,
	"observations" text,
	"completed_at" timestamp with time zone,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "diagnostic_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"diagnostic_id" uuid NOT NULL,
	"item_number" "citext" NOT NULL,
	"system" text NOT NULL,
	"finding" text NOT NULL,
	"recommended_work" text NOT NULL,
	"priority" "diagnostic_priority" DEFAULT 'medio' NOT NULL,
	"estimated_minutes" integer,
	"requires_parts" boolean DEFAULT false NOT NULL,
	"internal_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "diagnostics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_order_id" uuid NOT NULL,
	"technician_profile_id" uuid,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"general_notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "evidence_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_order_id" uuid NOT NULL,
	"corporate_client_id" uuid,
	"reception_id" uuid,
	"damage_id" uuid,
	"diagnostic_item_id" uuid,
	"repair_job_item_id" uuid,
	"quality_control_id" uuid,
	"purchase_receipt_id" uuid,
	"kind" "evidence_kind" NOT NULL,
	"storage_path" text NOT NULL,
	"thumbnail_path" text,
	"mime_type" text NOT NULL,
	"size_bytes" integer,
	"width" integer,
	"height" integer,
	"duration_seconds" integer,
	"checksum_sha256" text,
	"caption" text,
	"is_client_visible" boolean DEFAULT false NOT NULL,
	"status" "evidence_status" DEFAULT 'pendiente' NOT NULL,
	"uploaded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "authorization_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"authorization_id" uuid NOT NULL,
	"quotation_item_id" uuid NOT NULL,
	"status" "authorization_item_status" DEFAULT 'pendiente' NOT NULL,
	"customer_note" text,
	"acknowledged_by" uuid,
	"acknowledged_at" timestamp with time zone,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "authorization_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quotation_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"max_views" integer DEFAULT 50 NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"first_viewed_at" timestamp with time zone,
	"last_viewed_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "authorization_otps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"link_id" uuid NOT NULL,
	"code_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_authorizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quotation_id" uuid NOT NULL,
	"decided_at" timestamp with time zone,
	"channel" "authorization_channel" DEFAULT 'portal' NOT NULL,
	"registered_by" uuid,
	"signature_id" uuid,
	"otp_verified" boolean DEFAULT false NOT NULL,
	"ip" "inet",
	"user_agent" text,
	"approved_total" numeric(14, 2) DEFAULT '0' NOT NULL,
	"rejected_total" numeric(14, 2) DEFAULT '0' NOT NULL,
	"receipt_document_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotation_item_parts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quotation_item_id" uuid NOT NULL,
	"part_id" uuid,
	"description" text NOT NULL,
	"quantity" numeric(12, 3) DEFAULT '1' NOT NULL,
	"is_original" boolean DEFAULT true NOT NULL,
	"unit_cost" numeric(14, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotation_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quotation_id" uuid NOT NULL,
	"diagnostic_item_id" uuid,
	"line_number" integer NOT NULL,
	"description" text NOT NULL,
	"priority" "diagnostic_priority" DEFAULT 'medio' NOT NULL,
	"labor_minutes" integer DEFAULT 0 NOT NULL,
	"labor_unit_price" numeric(14, 2) DEFAULT '0' NOT NULL,
	"parts_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"quantity" numeric(12, 3) DEFAULT '1' NOT NULL,
	"unit_price" numeric(14, 2) DEFAULT '0' NOT NULL,
	"discount_amount" numeric(14, 2) DEFAULT '0' NOT NULL,
	"tax_rate" numeric(5, 4) DEFAULT '0.1800' NOT NULL,
	"line_total" numeric(14, 2) DEFAULT '0' NOT NULL,
	"internal_cost" numeric(14, 2),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "quotations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_order_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"code" "citext" NOT NULL,
	"status" "quotation_status" DEFAULT 'borrador' NOT NULL,
	"currency" text DEFAULT 'PEN' NOT NULL,
	"tax_rate" numeric(5, 4) DEFAULT '0.1800' NOT NULL,
	"subtotal" numeric(14, 2) DEFAULT '0' NOT NULL,
	"discount_total" numeric(14, 2) DEFAULT '0' NOT NULL,
	"tax_total" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total" numeric(14, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"issued_at" timestamp with time zone,
	"issued_by" uuid,
	"superseded_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "parts_catalog" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" "citext" NOT NULL,
	"description" text NOT NULL,
	"brand" text,
	"unit" text DEFAULT 'unidad' NOT NULL,
	"is_original" boolean DEFAULT true NOT NULL,
	"stock_qty" numeric(12, 3) DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "parts_request_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parts_request_id" uuid NOT NULL,
	"part_id" uuid,
	"quotation_item_part_id" uuid,
	"description" text NOT NULL,
	"brand" text,
	"quantity_required" numeric(12, 3) NOT NULL,
	"quantity_in_stock" numeric(12, 3) DEFAULT '0' NOT NULL,
	"unit" text DEFAULT 'unidad' NOT NULL,
	"is_original" boolean DEFAULT true NOT NULL,
	"alternative_of" uuid,
	"priority" "diagnostic_priority" DEFAULT 'medio' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "parts_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_order_id" uuid NOT NULL,
	"code" "citext" NOT NULL,
	"status" "parts_request_status" DEFAULT 'borrador' NOT NULL,
	"requested_by" uuid,
	"requested_at" timestamp with time zone,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"review_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "purchase_order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purchase_order_id" uuid NOT NULL,
	"parts_request_item_id" uuid,
	"part_id" uuid,
	"description" text NOT NULL,
	"quantity_ordered" numeric(12, 3) NOT NULL,
	"unit_price" numeric(14, 2) NOT NULL,
	"line_total" numeric(14, 2) DEFAULT '0' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" "citext" NOT NULL,
	"service_order_id" uuid NOT NULL,
	"supplier_id" uuid NOT NULL,
	"parts_request_id" uuid,
	"status" "purchase_order_status" DEFAULT 'emitida' NOT NULL,
	"authorized_by" uuid,
	"authorized_at" timestamp with time zone,
	"currency" text DEFAULT 'PEN' NOT NULL,
	"total" numeric(14, 2) DEFAULT '0' NOT NULL,
	"expected_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "purchase_receipt_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purchase_receipt_id" uuid NOT NULL,
	"purchase_order_item_id" uuid NOT NULL,
	"quantity_received" numeric(12, 3) DEFAULT '0' NOT NULL,
	"quantity_rejected" numeric(12, 3) DEFAULT '0' NOT NULL,
	"reject_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purchase_order_id" uuid NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"received_by" uuid,
	"document_number" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_quote_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_quote_id" uuid NOT NULL,
	"parts_request_item_id" uuid NOT NULL,
	"brand" text,
	"unit_price" numeric(14, 2) NOT NULL,
	"quantity_available" numeric(12, 3) NOT NULL,
	"lead_time_days" integer,
	"is_selected" boolean DEFAULT false NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"parts_request_id" uuid NOT NULL,
	"supplier_id" uuid NOT NULL,
	"code" "citext",
	"quoted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"valid_until" timestamp with time zone,
	"currency" text DEFAULT 'PEN' NOT NULL,
	"total" numeric(14, 2) DEFAULT '0' NOT NULL,
	"lead_time_days" integer,
	"warranty_months" integer,
	"payment_terms" text,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" "citext" NOT NULL,
	"name" text NOT NULL,
	"tax_id" text,
	"contact_name" text,
	"phone" text,
	"email" "citext",
	"payment_terms" text,
	"rating" integer,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "alignment_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_order_id" uuid NOT NULL,
	"status" "job_status" DEFAULT 'pendiente' NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"operator_profile_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pause_reasons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" "citext" NOT NULL,
	"label" text NOT NULL,
	"counts_as_productive" boolean DEFAULT false NOT NULL,
	"blocks_eta" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "quality_control_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quality_control_id" uuid NOT NULL,
	"check_code" "citext" NOT NULL,
	"label" text NOT NULL,
	"result" "quality_item_result" NOT NULL,
	"finding" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quality_controls" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_order_id" uuid NOT NULL,
	"inspector_profile_id" uuid,
	"round" integer DEFAULT 1 NOT NULL,
	"result" "quality_result",
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "repair_job_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repair_job_id" uuid NOT NULL,
	"quotation_item_id" uuid NOT NULL,
	"status" "repair_item_status" DEFAULT 'pendiente' NOT NULL,
	"estimated_minutes" integer,
	"parts_installed" numeric(12, 3) DEFAULT '0' NOT NULL,
	"parts_removed" numeric(12, 3) DEFAULT '0' NOT NULL,
	"notes" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "repair_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_order_id" uuid NOT NULL,
	"technician_profile_id" uuid,
	"estimated_minutes" integer,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"final_notes" text,
	"tests_performed" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "repair_time_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"repair_job_id" uuid NOT NULL,
	"technician_profile_id" uuid,
	"kind" time_session_kind NOT NULL,
	"pause_reason_id" uuid,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ended_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "washing_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_order_id" uuid NOT NULL,
	"status" "job_status" DEFAULT 'pendiente' NOT NULL,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"operator_profile_id" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_order_id" uuid,
	"corporate_client_id" uuid,
	"doc_type" "document_kind" NOT NULL,
	"code" "citext",
	"storage_path" text NOT NULL,
	"params" jsonb,
	"generated_by" uuid,
	"generated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notification_id" uuid NOT NULL,
	"channel" "notification_channel" NOT NULL,
	"status" "delivery_status" DEFAULT 'pendiente' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"provider_message_id" text,
	"error" text,
	"next_attempt_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_code" "citext" NOT NULL,
	"role_id" uuid,
	"recipient_kind" text,
	"channels" "notification_channel"[] DEFAULT '{in_app}'::notification_channel[] NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"recipient_profile_id" uuid NOT NULL,
	"corporate_client_id" uuid,
	"service_order_id" uuid,
	"event_code" "citext" NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"payload" jsonb,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "followups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"survey_id" uuid NOT NULL,
	"corporate_client_id" uuid,
	"assigned_to" uuid,
	"status" "followup_status" DEFAULT 'pendiente' NOT NULL,
	"resolution" text,
	"closed_at" timestamp with time zone,
	"closed_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"corporate_client_id" uuid,
	"report_type" "citext" NOT NULL,
	"params" jsonb,
	"storage_path" text,
	"generated_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "survey_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"survey_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"value_numeric" numeric(6, 2),
	"value_text" text,
	"value_options" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "survey_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_version_id" uuid NOT NULL,
	"code" "citext" NOT NULL,
	"text" text NOT NULL,
	"type" "survey_question_type" NOT NULL,
	"options" jsonb,
	"position" integer NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"weight" numeric(5, 2) DEFAULT '1.00' NOT NULL,
	"metric_role" "metric_role" DEFAULT 'none' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "survey_template_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"published_at" timestamp with time zone,
	"is_current" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "survey_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" "citext" NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "surveys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" "citext" NOT NULL,
	"service_order_id" uuid,
	"template_version_id" uuid NOT NULL,
	"corporate_client_id" uuid,
	"customer_id" uuid,
	"vehicle_id" uuid,
	"branch_id" uuid,
	"service_advisor_id" uuid,
	"service_type_id" uuid,
	"mileage" integer,
	"created_by" uuid,
	"status" "survey_status" DEFAULT 'completed' NOT NULL,
	"csat_score" numeric(5, 2),
	"nps_score" integer,
	"nps_category" "nps_category",
	"satisfaction_index" numeric(5, 2),
	"satisfaction_level" "satisfaction_level",
	"requires_follow_up" boolean DEFAULT false NOT NULL,
	"comments" text,
	"answered_at" timestamp with time zone DEFAULT now() NOT NULL,
	"voided_at" timestamp with time zone,
	"void_reason" text,
	"is_demo" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "app_settings" ADD CONSTRAINT "app_settings_corporate_client_id_corporate_clients_id_fk" FOREIGN KEY ("corporate_client_id") REFERENCES "public"."corporate_clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_settings" ADD CONSTRAINT "app_settings_updated_by_profiles_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_profile_id_profiles_id_fk" FOREIGN KEY ("actor_profile_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_corporate_client_id_corporate_clients_id_fk" FOREIGN KEY ("corporate_client_id") REFERENCES "public"."corporate_clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bays" ADD CONSTRAINT "bays_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "branches" ADD CONSTRAINT "branches_corporate_client_id_corporate_clients_id_fk" FOREIGN KEY ("corporate_client_id") REFERENCES "public"."corporate_clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "technician_specialties" ADD CONSTRAINT "technician_specialties_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_corporate_clients" ADD CONSTRAINT "user_corporate_clients_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_corporate_clients" ADD CONSTRAINT "user_corporate_clients_corporate_client_id_corporate_clients_id_fk" FOREIGN KEY ("corporate_client_id") REFERENCES "public"."corporate_clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_corporate_client_id_corporate_clients_id_fk" FOREIGN KEY ("corporate_client_id") REFERENCES "public"."corporate_clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_advisors" ADD CONSTRAINT "service_advisors_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_advisors" ADD CONSTRAINT "service_advisors_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_corporate_client_id_corporate_clients_id_fk" FOREIGN KEY ("corporate_client_id") REFERENCES "public"."corporate_clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_primary_customer_id_customers_id_fk" FOREIGN KEY ("primary_customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_corporate_client_id_corporate_clients_id_fk" FOREIGN KEY ("corporate_client_id") REFERENCES "public"."corporate_clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_service_type_id_service_types_id_fk" FOREIGN KEY ("service_type_id") REFERENCES "public"."service_types"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_orders" ADD CONSTRAINT "service_orders_advisor_profile_id_profiles_id_fk" FOREIGN KEY ("advisor_profile_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_type_final_stages" ADD CONSTRAINT "service_type_final_stages_service_type_id_service_types_id_fk" FOREIGN KEY ("service_type_id") REFERENCES "public"."service_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_history" ADD CONSTRAINT "status_history_service_order_id_service_orders_id_fk" FOREIGN KEY ("service_order_id") REFERENCES "public"."service_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "status_history" ADD CONSTRAINT "status_history_actor_profile_id_profiles_id_fk" FOREIGN KEY ("actor_profile_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_assignments" ADD CONSTRAINT "work_assignments_service_order_id_service_orders_id_fk" FOREIGN KEY ("service_order_id") REFERENCES "public"."service_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_assignments" ADD CONSTRAINT "work_assignments_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_assignments" ADD CONSTRAINT "work_assignments_bay_id_bays_id_fk" FOREIGN KEY ("bay_id") REFERENCES "public"."bays"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "work_assignments" ADD CONSTRAINT "work_assignments_assigned_by_profiles_id_fk" FOREIGN KEY ("assigned_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_item_defs" ADD CONSTRAINT "checklist_item_defs_category_id_checklist_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."checklist_categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_checklist_id_vehicle_checklists_id_fk" FOREIGN KEY ("checklist_id") REFERENCES "public"."vehicle_checklists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_item_def_id_checklist_item_defs_id_fk" FOREIGN KEY ("item_def_id") REFERENCES "public"."checklist_item_defs"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reception_documents" ADD CONSTRAINT "reception_documents_reception_id_vehicle_receptions_id_fk" FOREIGN KEY ("reception_id") REFERENCES "public"."vehicle_receptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_checklists" ADD CONSTRAINT "vehicle_checklists_reception_id_vehicle_receptions_id_fk" FOREIGN KEY ("reception_id") REFERENCES "public"."vehicle_receptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_checklists" ADD CONSTRAINT "vehicle_checklists_completed_by_profiles_id_fk" FOREIGN KEY ("completed_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_damages" ADD CONSTRAINT "vehicle_damages_reception_id_vehicle_receptions_id_fk" FOREIGN KEY ("reception_id") REFERENCES "public"."vehicle_receptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_receptions" ADD CONSTRAINT "vehicle_receptions_service_order_id_service_orders_id_fk" FOREIGN KEY ("service_order_id") REFERENCES "public"."service_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vehicle_receptions" ADD CONSTRAINT "vehicle_receptions_received_by_profiles_id_fk" FOREIGN KEY ("received_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diagnostic_items" ADD CONSTRAINT "diagnostic_items_diagnostic_id_diagnostics_id_fk" FOREIGN KEY ("diagnostic_id") REFERENCES "public"."diagnostics"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diagnostics" ADD CONSTRAINT "diagnostics_service_order_id_service_orders_id_fk" FOREIGN KEY ("service_order_id") REFERENCES "public"."service_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "diagnostics" ADD CONSTRAINT "diagnostics_technician_profile_id_profiles_id_fk" FOREIGN KEY ("technician_profile_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_files" ADD CONSTRAINT "evidence_files_service_order_id_service_orders_id_fk" FOREIGN KEY ("service_order_id") REFERENCES "public"."service_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_files" ADD CONSTRAINT "evidence_files_corporate_client_id_corporate_clients_id_fk" FOREIGN KEY ("corporate_client_id") REFERENCES "public"."corporate_clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_files" ADD CONSTRAINT "evidence_files_reception_id_vehicle_receptions_id_fk" FOREIGN KEY ("reception_id") REFERENCES "public"."vehicle_receptions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_files" ADD CONSTRAINT "evidence_files_damage_id_vehicle_damages_id_fk" FOREIGN KEY ("damage_id") REFERENCES "public"."vehicle_damages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_files" ADD CONSTRAINT "evidence_files_diagnostic_item_id_diagnostic_items_id_fk" FOREIGN KEY ("diagnostic_item_id") REFERENCES "public"."diagnostic_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence_files" ADD CONSTRAINT "evidence_files_uploaded_by_profiles_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authorization_items" ADD CONSTRAINT "authorization_items_authorization_id_customer_authorizations_id_fk" FOREIGN KEY ("authorization_id") REFERENCES "public"."customer_authorizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authorization_items" ADD CONSTRAINT "authorization_items_quotation_item_id_quotation_items_id_fk" FOREIGN KEY ("quotation_item_id") REFERENCES "public"."quotation_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authorization_items" ADD CONSTRAINT "authorization_items_acknowledged_by_profiles_id_fk" FOREIGN KEY ("acknowledged_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authorization_links" ADD CONSTRAINT "authorization_links_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authorization_links" ADD CONSTRAINT "authorization_links_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "authorization_otps" ADD CONSTRAINT "authorization_otps_link_id_authorization_links_id_fk" FOREIGN KEY ("link_id") REFERENCES "public"."authorization_links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_authorizations" ADD CONSTRAINT "customer_authorizations_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_authorizations" ADD CONSTRAINT "customer_authorizations_registered_by_profiles_id_fk" FOREIGN KEY ("registered_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_item_parts" ADD CONSTRAINT "quotation_item_parts_quotation_item_id_quotation_items_id_fk" FOREIGN KEY ("quotation_item_id") REFERENCES "public"."quotation_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_item_parts" ADD CONSTRAINT "quotation_item_parts_part_id_parts_catalog_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts_catalog"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotation_items" ADD CONSTRAINT "quotation_items_diagnostic_item_id_diagnostic_items_id_fk" FOREIGN KEY ("diagnostic_item_id") REFERENCES "public"."diagnostic_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_service_order_id_service_orders_id_fk" FOREIGN KEY ("service_order_id") REFERENCES "public"."service_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_issued_by_profiles_id_fk" FOREIGN KEY ("issued_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parts_request_items" ADD CONSTRAINT "parts_request_items_parts_request_id_parts_requests_id_fk" FOREIGN KEY ("parts_request_id") REFERENCES "public"."parts_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parts_request_items" ADD CONSTRAINT "parts_request_items_part_id_parts_catalog_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts_catalog"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parts_requests" ADD CONSTRAINT "parts_requests_service_order_id_service_orders_id_fk" FOREIGN KEY ("service_order_id") REFERENCES "public"."service_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parts_requests" ADD CONSTRAINT "parts_requests_requested_by_profiles_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "parts_requests" ADD CONSTRAINT "parts_requests_reviewed_by_profiles_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_parts_request_item_id_parts_request_items_id_fk" FOREIGN KEY ("parts_request_item_id") REFERENCES "public"."parts_request_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "purchase_order_items_part_id_parts_catalog_id_fk" FOREIGN KEY ("part_id") REFERENCES "public"."parts_catalog"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_service_order_id_service_orders_id_fk" FOREIGN KEY ("service_order_id") REFERENCES "public"."service_orders"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_parts_request_id_parts_requests_id_fk" FOREIGN KEY ("parts_request_id") REFERENCES "public"."parts_requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_authorized_by_profiles_id_fk" FOREIGN KEY ("authorized_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_receipt_items" ADD CONSTRAINT "purchase_receipt_items_purchase_receipt_id_purchase_receipts_id_fk" FOREIGN KEY ("purchase_receipt_id") REFERENCES "public"."purchase_receipts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_receipt_items" ADD CONSTRAINT "purchase_receipt_items_purchase_order_item_id_purchase_order_items_id_fk" FOREIGN KEY ("purchase_order_item_id") REFERENCES "public"."purchase_order_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_receipts" ADD CONSTRAINT "purchase_receipts_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_receipts" ADD CONSTRAINT "purchase_receipts_received_by_profiles_id_fk" FOREIGN KEY ("received_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_quote_items" ADD CONSTRAINT "supplier_quote_items_supplier_quote_id_supplier_quotes_id_fk" FOREIGN KEY ("supplier_quote_id") REFERENCES "public"."supplier_quotes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_quote_items" ADD CONSTRAINT "supplier_quote_items_parts_request_item_id_parts_request_items_id_fk" FOREIGN KEY ("parts_request_item_id") REFERENCES "public"."parts_request_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_quotes" ADD CONSTRAINT "supplier_quotes_parts_request_id_parts_requests_id_fk" FOREIGN KEY ("parts_request_id") REFERENCES "public"."parts_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_quotes" ADD CONSTRAINT "supplier_quotes_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_quotes" ADD CONSTRAINT "supplier_quotes_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alignment_jobs" ADD CONSTRAINT "alignment_jobs_service_order_id_service_orders_id_fk" FOREIGN KEY ("service_order_id") REFERENCES "public"."service_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alignment_jobs" ADD CONSTRAINT "alignment_jobs_operator_profile_id_profiles_id_fk" FOREIGN KEY ("operator_profile_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_control_items" ADD CONSTRAINT "quality_control_items_quality_control_id_quality_controls_id_fk" FOREIGN KEY ("quality_control_id") REFERENCES "public"."quality_controls"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_controls" ADD CONSTRAINT "quality_controls_service_order_id_service_orders_id_fk" FOREIGN KEY ("service_order_id") REFERENCES "public"."service_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quality_controls" ADD CONSTRAINT "quality_controls_inspector_profile_id_profiles_id_fk" FOREIGN KEY ("inspector_profile_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_job_items" ADD CONSTRAINT "repair_job_items_repair_job_id_repair_jobs_id_fk" FOREIGN KEY ("repair_job_id") REFERENCES "public"."repair_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_job_items" ADD CONSTRAINT "repair_job_items_quotation_item_id_quotation_items_id_fk" FOREIGN KEY ("quotation_item_id") REFERENCES "public"."quotation_items"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_jobs" ADD CONSTRAINT "repair_jobs_service_order_id_service_orders_id_fk" FOREIGN KEY ("service_order_id") REFERENCES "public"."service_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_jobs" ADD CONSTRAINT "repair_jobs_technician_profile_id_profiles_id_fk" FOREIGN KEY ("technician_profile_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_time_sessions" ADD CONSTRAINT "repair_time_sessions_repair_job_id_repair_jobs_id_fk" FOREIGN KEY ("repair_job_id") REFERENCES "public"."repair_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_time_sessions" ADD CONSTRAINT "repair_time_sessions_technician_profile_id_profiles_id_fk" FOREIGN KEY ("technician_profile_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "repair_time_sessions" ADD CONSTRAINT "repair_time_sessions_pause_reason_id_pause_reasons_id_fk" FOREIGN KEY ("pause_reason_id") REFERENCES "public"."pause_reasons"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "washing_jobs" ADD CONSTRAINT "washing_jobs_service_order_id_service_orders_id_fk" FOREIGN KEY ("service_order_id") REFERENCES "public"."service_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "washing_jobs" ADD CONSTRAINT "washing_jobs_operator_profile_id_profiles_id_fk" FOREIGN KEY ("operator_profile_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_service_order_id_service_orders_id_fk" FOREIGN KEY ("service_order_id") REFERENCES "public"."service_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_corporate_client_id_corporate_clients_id_fk" FOREIGN KEY ("corporate_client_id") REFERENCES "public"."corporate_clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "documents" ADD CONSTRAINT "documents_generated_by_profiles_id_fk" FOREIGN KEY ("generated_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_notification_id_notifications_id_fk" FOREIGN KEY ("notification_id") REFERENCES "public"."notifications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_rules" ADD CONSTRAINT "notification_rules_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_profile_id_profiles_id_fk" FOREIGN KEY ("recipient_profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_corporate_client_id_corporate_clients_id_fk" FOREIGN KEY ("corporate_client_id") REFERENCES "public"."corporate_clients"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_service_order_id_service_orders_id_fk" FOREIGN KEY ("service_order_id") REFERENCES "public"."service_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "followups" ADD CONSTRAINT "followups_survey_id_surveys_id_fk" FOREIGN KEY ("survey_id") REFERENCES "public"."surveys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "followups" ADD CONSTRAINT "followups_corporate_client_id_corporate_clients_id_fk" FOREIGN KEY ("corporate_client_id") REFERENCES "public"."corporate_clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "followups" ADD CONSTRAINT "followups_assigned_to_profiles_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "followups" ADD CONSTRAINT "followups_closed_by_profiles_id_fk" FOREIGN KEY ("closed_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_corporate_client_id_corporate_clients_id_fk" FOREIGN KEY ("corporate_client_id") REFERENCES "public"."corporate_clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_generated_by_profiles_id_fk" FOREIGN KEY ("generated_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_answers" ADD CONSTRAINT "survey_answers_survey_id_surveys_id_fk" FOREIGN KEY ("survey_id") REFERENCES "public"."surveys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_answers" ADD CONSTRAINT "survey_answers_question_id_survey_questions_id_fk" FOREIGN KEY ("question_id") REFERENCES "public"."survey_questions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_questions" ADD CONSTRAINT "survey_questions_template_version_id_survey_template_versions_id_fk" FOREIGN KEY ("template_version_id") REFERENCES "public"."survey_template_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "survey_template_versions" ADD CONSTRAINT "survey_template_versions_template_id_survey_templates_id_fk" FOREIGN KEY ("template_id") REFERENCES "public"."survey_templates"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_service_order_id_service_orders_id_fk" FOREIGN KEY ("service_order_id") REFERENCES "public"."service_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_template_version_id_survey_template_versions_id_fk" FOREIGN KEY ("template_version_id") REFERENCES "public"."survey_template_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_corporate_client_id_corporate_clients_id_fk" FOREIGN KEY ("corporate_client_id") REFERENCES "public"."corporate_clients"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_branch_id_branches_id_fk" FOREIGN KEY ("branch_id") REFERENCES "public"."branches"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_service_advisor_id_service_advisors_id_fk" FOREIGN KEY ("service_advisor_id") REFERENCES "public"."service_advisors"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_service_type_id_service_types_id_fk" FOREIGN KEY ("service_type_id") REFERENCES "public"."service_types"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "app_settings_scope_idx" ON "app_settings" USING btree ("scope","corporate_client_id");--> statement-breakpoint
CREATE INDEX "audit_logs_entity_idx" ON "audit_logs" USING btree ("entity","entity_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "audit_logs_order_idx" ON "audit_logs" USING btree ("service_order_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "audit_logs_actor_idx" ON "audit_logs" USING btree ("actor_profile_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "bays_branch_code_key" ON "bays" USING btree ("branch_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "branches_code_key" ON "branches" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "corporate_clients_code_key" ON "corporate_clients" USING btree ("code");--> statement-breakpoint
CREATE INDEX "profiles_role_idx" ON "profiles" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "profiles_branch_idx" ON "profiles" USING btree ("branch_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rate_limits_bucket_subject_key" ON "rate_limits" USING btree ("bucket","subject");--> statement-breakpoint
CREATE INDEX "rate_limits_blocked_idx" ON "rate_limits" USING btree ("blocked_until") WHERE "rate_limits"."blocked_until" is not null;--> statement-breakpoint
CREATE INDEX "role_permissions_permission_idx" ON "role_permissions" USING btree ("permission_id");--> statement-breakpoint
CREATE INDEX "user_corporate_clients_client_idx" ON "user_corporate_clients" USING btree ("corporate_client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "customers_document_key" ON "customers" USING btree ("document_type","document_number");--> statement-breakpoint
CREATE INDEX "customers_document_hash_idx" ON "customers" USING btree ("document_hash");--> statement-breakpoint
CREATE INDEX "customers_phone_idx" ON "customers" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "customers_corporate_idx" ON "customers" USING btree ("corporate_client_id");--> statement-breakpoint
CREATE INDEX "service_advisors_branch_idx" ON "service_advisors" USING btree ("branch_id");--> statement-breakpoint
CREATE INDEX "vehicles_vin_idx" ON "vehicles" USING btree ("vin");--> statement-breakpoint
CREATE INDEX "vehicles_customer_idx" ON "vehicles" USING btree ("primary_customer_id");--> statement-breakpoint
CREATE INDEX "vehicles_corporate_idx" ON "vehicles" USING btree ("corporate_client_id");--> statement-breakpoint
CREATE UNIQUE INDEX "service_orders_code_key" ON "service_orders" USING btree ("code");--> statement-breakpoint
CREATE INDEX "service_orders_branch_status_idx" ON "service_orders" USING btree ("branch_id","status","opened_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "service_orders_corporate_idx" ON "service_orders" USING btree ("corporate_client_id","opened_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "service_orders_advisor_idx" ON "service_orders" USING btree ("advisor_profile_id","status");--> statement-breakpoint
CREATE INDEX "service_orders_vehicle_idx" ON "service_orders" USING btree ("vehicle_id","opened_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "service_orders_customer_idx" ON "service_orders" USING btree ("customer_id","opened_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "service_orders_open_idx" ON "service_orders" USING btree ("status") WHERE "service_orders"."status" not in ('CERRADO','CANCELADO');--> statement-breakpoint
CREATE INDEX "service_orders_promised_idx" ON "service_orders" USING btree ("promised_at") WHERE "service_orders"."delivered_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "service_types_code_key" ON "service_types" USING btree ("code");--> statement-breakpoint
CREATE INDEX "status_history_order_idx" ON "status_history" USING btree ("service_order_id","created_at");--> statement-breakpoint
CREATE INDEX "work_assignments_order_idx" ON "work_assignments" USING btree ("service_order_id");--> statement-breakpoint
CREATE INDEX "work_assignments_active_idx" ON "work_assignments" USING btree ("profile_id") WHERE "work_assignments"."released_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "checklist_categories_code_key" ON "checklist_categories" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "checklist_item_defs_code_key" ON "checklist_item_defs" USING btree ("code");--> statement-breakpoint
CREATE INDEX "checklist_item_defs_category_idx" ON "checklist_item_defs" USING btree ("category_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "checklist_items_unique" ON "checklist_items" USING btree ("checklist_id","item_def_id");--> statement-breakpoint
CREATE UNIQUE INDEX "reception_documents_unique" ON "reception_documents" USING btree ("reception_id","document_type");--> statement-breakpoint
CREATE INDEX "signatures_entity_idx" ON "signatures" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicle_checklists_reception_key" ON "vehicle_checklists" USING btree ("reception_id");--> statement-breakpoint
CREATE INDEX "vehicle_damages_reception_idx" ON "vehicle_damages" USING btree ("reception_id");--> statement-breakpoint
CREATE UNIQUE INDEX "vehicle_receptions_order_key" ON "vehicle_receptions" USING btree ("service_order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "diagnostic_items_number_key" ON "diagnostic_items" USING btree ("diagnostic_id","item_number");--> statement-breakpoint
CREATE INDEX "diagnostic_items_diagnostic_idx" ON "diagnostic_items" USING btree ("diagnostic_id");--> statement-breakpoint
CREATE UNIQUE INDEX "diagnostics_order_key" ON "diagnostics" USING btree ("service_order_id");--> statement-breakpoint
CREATE INDEX "evidence_files_order_idx" ON "evidence_files" USING btree ("service_order_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "evidence_files_diagnostic_item_idx" ON "evidence_files" USING btree ("diagnostic_item_id");--> statement-breakpoint
CREATE INDEX "evidence_files_damage_idx" ON "evidence_files" USING btree ("damage_id");--> statement-breakpoint
CREATE INDEX "evidence_files_repair_item_idx" ON "evidence_files" USING btree ("repair_job_item_id");--> statement-breakpoint
CREATE INDEX "evidence_files_pending_idx" ON "evidence_files" USING btree ("created_at") WHERE "evidence_files"."status" = 'pendiente';--> statement-breakpoint
CREATE UNIQUE INDEX "authorization_items_unique" ON "authorization_items" USING btree ("authorization_id","quotation_item_id");--> statement-breakpoint
CREATE INDEX "authorization_items_authorization_idx" ON "authorization_items" USING btree ("authorization_id");--> statement-breakpoint
CREATE INDEX "authorization_items_quotation_item_idx" ON "authorization_items" USING btree ("quotation_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "authorization_links_token_key" ON "authorization_links" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "authorization_links_quotation_idx" ON "authorization_links" USING btree ("quotation_id");--> statement-breakpoint
CREATE INDEX "authorization_otps_link_idx" ON "authorization_otps" USING btree ("link_id");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_authorizations_quotation_key" ON "customer_authorizations" USING btree ("quotation_id");--> statement-breakpoint
CREATE INDEX "quotation_item_parts_item_idx" ON "quotation_item_parts" USING btree ("quotation_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "quotation_items_line_key" ON "quotation_items" USING btree ("quotation_id","line_number");--> statement-breakpoint
CREATE INDEX "quotation_items_quotation_idx" ON "quotation_items" USING btree ("quotation_id","line_number");--> statement-breakpoint
CREATE UNIQUE INDEX "quotations_order_version_key" ON "quotations" USING btree ("service_order_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "quotations_code_key" ON "quotations" USING btree ("code");--> statement-breakpoint
CREATE INDEX "quotations_issued_idx" ON "quotations" USING btree ("service_order_id") WHERE "quotations"."status" = 'emitida';--> statement-breakpoint
CREATE UNIQUE INDEX "parts_catalog_code_key" ON "parts_catalog" USING btree ("code");--> statement-breakpoint
CREATE INDEX "parts_request_items_request_idx" ON "parts_request_items" USING btree ("parts_request_id");--> statement-breakpoint
CREATE UNIQUE INDEX "parts_requests_code_key" ON "parts_requests" USING btree ("code");--> statement-breakpoint
CREATE INDEX "parts_requests_order_idx" ON "parts_requests" USING btree ("service_order_id");--> statement-breakpoint
CREATE INDEX "parts_requests_pending_idx" ON "parts_requests" USING btree ("status") WHERE "parts_requests"."status" = 'pendiente';--> statement-breakpoint
CREATE INDEX "purchase_order_items_order_idx" ON "purchase_order_items" USING btree ("purchase_order_id");--> statement-breakpoint
CREATE INDEX "purchase_order_items_request_item_idx" ON "purchase_order_items" USING btree ("parts_request_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "purchase_orders_code_key" ON "purchase_orders" USING btree ("code");--> statement-breakpoint
CREATE INDEX "purchase_orders_order_idx" ON "purchase_orders" USING btree ("service_order_id");--> statement-breakpoint
CREATE INDEX "purchase_orders_supplier_idx" ON "purchase_orders" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "purchase_orders_open_idx" ON "purchase_orders" USING btree ("status","expected_at") WHERE "purchase_orders"."status" in ('emitida','enviada','parcial');--> statement-breakpoint
CREATE INDEX "purchase_receipt_items_po_item_idx" ON "purchase_receipt_items" USING btree ("purchase_order_item_id");--> statement-breakpoint
CREATE INDEX "purchase_receipts_order_idx" ON "purchase_receipts" USING btree ("purchase_order_id","received_at");--> statement-breakpoint
CREATE UNIQUE INDEX "supplier_quote_items_unique" ON "supplier_quote_items" USING btree ("supplier_quote_id","parts_request_item_id");--> statement-breakpoint
CREATE INDEX "supplier_quote_items_request_item_idx" ON "supplier_quote_items" USING btree ("parts_request_item_id");--> statement-breakpoint
CREATE INDEX "supplier_quote_items_selected_idx" ON "supplier_quote_items" USING btree ("parts_request_item_id") WHERE "supplier_quote_items"."is_selected";--> statement-breakpoint
CREATE UNIQUE INDEX "supplier_quotes_unique" ON "supplier_quotes" USING btree ("parts_request_id","supplier_id");--> statement-breakpoint
CREATE INDEX "supplier_quotes_request_idx" ON "supplier_quotes" USING btree ("parts_request_id");--> statement-breakpoint
CREATE UNIQUE INDEX "suppliers_code_key" ON "suppliers" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "alignment_jobs_order_key" ON "alignment_jobs" USING btree ("service_order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pause_reasons_code_key" ON "pause_reasons" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "quality_control_items_unique" ON "quality_control_items" USING btree ("quality_control_id","check_code");--> statement-breakpoint
CREATE UNIQUE INDEX "quality_controls_round_key" ON "quality_controls" USING btree ("service_order_id","round");--> statement-breakpoint
CREATE UNIQUE INDEX "repair_job_items_unique" ON "repair_job_items" USING btree ("repair_job_id","quotation_item_id");--> statement-breakpoint
CREATE INDEX "repair_job_items_job_idx" ON "repair_job_items" USING btree ("repair_job_id");--> statement-breakpoint
CREATE UNIQUE INDEX "repair_jobs_order_key" ON "repair_jobs" USING btree ("service_order_id");--> statement-breakpoint
CREATE INDEX "repair_time_sessions_job_idx" ON "repair_time_sessions" USING btree ("repair_job_id","started_at");--> statement-breakpoint
CREATE INDEX "repair_time_sessions_technician_idx" ON "repair_time_sessions" USING btree ("technician_profile_id","started_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "repair_time_sessions_open_idx" ON "repair_time_sessions" USING btree ("repair_job_id") WHERE "repair_time_sessions"."ended_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "washing_jobs_order_key" ON "washing_jobs" USING btree ("service_order_id");--> statement-breakpoint
CREATE INDEX "documents_order_idx" ON "documents" USING btree ("service_order_id","generated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "documents_type_idx" ON "documents" USING btree ("doc_type","generated_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "notification_deliveries_unique" ON "notification_deliveries" USING btree ("notification_id","channel");--> statement-breakpoint
CREATE INDEX "notification_deliveries_pending_idx" ON "notification_deliveries" USING btree ("next_attempt_at") WHERE "notification_deliveries"."status" = 'pendiente';--> statement-breakpoint
CREATE INDEX "notification_rules_event_idx" ON "notification_rules" USING btree ("event_code");--> statement-breakpoint
CREATE INDEX "notifications_unread_idx" ON "notifications" USING btree ("recipient_profile_id","created_at" DESC NULLS LAST) WHERE "notifications"."read_at" is null;--> statement-breakpoint
CREATE INDEX "notifications_order_idx" ON "notifications" USING btree ("service_order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "followups_survey_key" ON "followups" USING btree ("survey_id");--> statement-breakpoint
CREATE INDEX "followups_status_idx" ON "followups" USING btree ("status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "reports_corporate_idx" ON "reports" USING btree ("corporate_client_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "survey_answers_unique" ON "survey_answers" USING btree ("survey_id","question_id");--> statement-breakpoint
CREATE INDEX "survey_answers_survey_idx" ON "survey_answers" USING btree ("survey_id");--> statement-breakpoint
CREATE INDEX "survey_answers_question_idx" ON "survey_answers" USING btree ("question_id","value_numeric");--> statement-breakpoint
CREATE UNIQUE INDEX "survey_questions_unique" ON "survey_questions" USING btree ("template_version_id","code");--> statement-breakpoint
CREATE INDEX "survey_questions_version_idx" ON "survey_questions" USING btree ("template_version_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "survey_template_versions_unique" ON "survey_template_versions" USING btree ("template_id","version");--> statement-breakpoint
CREATE UNIQUE INDEX "survey_template_versions_current_key" ON "survey_template_versions" USING btree ("template_id") WHERE "survey_template_versions"."is_current";--> statement-breakpoint
CREATE UNIQUE INDEX "survey_templates_code_key" ON "survey_templates" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX "surveys_code_key" ON "surveys" USING btree ("code");--> statement-breakpoint
CREATE INDEX "surveys_corporate_idx" ON "surveys" USING btree ("corporate_client_id","answered_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "surveys_answered_idx" ON "surveys" USING btree ("answered_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "surveys_vehicle_idx" ON "surveys" USING btree ("vehicle_id","answered_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "surveys_order_idx" ON "surveys" USING btree ("service_order_id");--> statement-breakpoint
CREATE INDEX "surveys_followup_idx" ON "surveys" USING btree ("corporate_client_id","answered_at" DESC NULLS LAST) WHERE "surveys"."requires_follow_up";