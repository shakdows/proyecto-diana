-- Lo que Drizzle no puede expresar: clave foránea hacia la plataforma,
-- secuencias de código legible y restricciones de integridad del negocio.

-- ── 1 · El perfil ES el usuario de Supabase ──────────────────────────────────
alter table profiles
  add constraint profiles_id_auth_users_fk
  foreign key (id) references auth.users (id) on delete cascade;
--> statement-breakpoint

-- ── 2 · Códigos legibles generados por la BASE, no por la aplicación ─────────
-- Con órdenes simultáneas, generar el correlativo en la aplicación produce
-- duplicados. Una secuencia no.
create sequence if not exists service_order_code_seq;
--> statement-breakpoint
create sequence if not exists purchase_order_code_seq;
--> statement-breakpoint
create sequence if not exists quotation_code_seq;
--> statement-breakpoint
create sequence if not exists parts_request_code_seq;
--> statement-breakpoint
create sequence if not exists survey_code_seq;
--> statement-breakpoint

create or replace function public.next_code(prefix text, seq regclass)
returns text
language sql
volatile
as $$
  select prefix || '-' || to_char(now(), 'YYYY') || '-' ||
         lpad(nextval(seq)::text, 6, '0')
$$;
--> statement-breakpoint

alter table service_orders
  alter column code set default public.next_code('OS', 'service_order_code_seq');
--> statement-breakpoint
alter table purchase_orders
  alter column code set default public.next_code('OC', 'purchase_order_code_seq');
--> statement-breakpoint
alter table parts_requests
  alter column code set default public.next_code('SR', 'parts_request_code_seq');
--> statement-breakpoint
alter table surveys
  alter column code set default public.next_code('ENC', 'survey_code_seq');
--> statement-breakpoint

-- ── 3 · La placa se guarda normalizada ───────────────────────────────────────
-- Mayúsculas, sin guiones ni espacios: la búsqueda por placa es una comparación
-- exacta por índice, no una función sobre la columna.
alter table vehicles
  add constraint vehicles_plate_normalized
  check (plate = upper(regexp_replace(plate, '[^A-Za-z0-9]', '', 'g')));
--> statement-breakpoint

create unique index vehicles_plate_key
  on vehicles (plate) where deleted_at is null;
--> statement-breakpoint

-- Búsqueda por nombre de cliente (§57), con trigramas.
create index customers_name_trgm_idx on customers
  using gin (
    lower(coalesce(first_name, '') || ' ' || coalesce(last_name, '') || ' ' ||
          coalesce(business_name, '')) gin_trgm_ops
  );
--> statement-breakpoint

-- ── 4 · Una evidencia SIEMPRE cuelga de exactamente un ancla ─────────────────
-- En un sistema donde las fotos son prueba frente al cliente, una evidencia
-- huérfana es un problema legal, no un detalle técnico.
alter table evidence_files
  add constraint evidence_files_one_anchor
  check (
    (reception_id         is not null)::int +
    (damage_id            is not null)::int +
    (diagnostic_item_id   is not null)::int +
    (repair_job_item_id   is not null)::int +
    (quality_control_id   is not null)::int +
    (purchase_receipt_id  is not null)::int = 1
  );
--> statement-breakpoint

alter table evidence_files
  add constraint evidence_files_repair_item_fk
  foreign key (repair_job_item_id) references repair_job_items (id) on delete cascade;
--> statement-breakpoint
alter table evidence_files
  add constraint evidence_files_quality_fk
  foreign key (quality_control_id) references quality_controls (id) on delete cascade;
--> statement-breakpoint
alter table evidence_files
  add constraint evidence_files_purchase_receipt_fk
  foreign key (purchase_receipt_id) references purchase_receipts (id) on delete cascade;
--> statement-breakpoint

-- ── 5 · Reglas de negocio de §60, en la base ─────────────────────────────────
-- No se puede recibir más de lo comprado sin ampliar la orden de compra.
alter table purchase_receipt_items
  add constraint purchase_receipt_items_non_negative
  check (quantity_received >= 0 or quantity_rejected >= 0);
--> statement-breakpoint

-- La cantidad requerida nunca es negativa.
alter table parts_request_items
  add constraint parts_request_items_qty_positive
  check (quantity_required >= 0);
--> statement-breakpoint

-- Una sesión de tiempo cerrada no puede terminar antes de empezar.
alter table repair_time_sessions
  add constraint repair_time_sessions_order
  check (ended_at is null or ended_at >= started_at);
--> statement-breakpoint

-- Una pausa exige motivo; un tramo de trabajo no lo lleva.
alter table repair_time_sessions
  add constraint repair_time_sessions_pause_reason
  check (
    (kind = 'pausa'   and pause_reason_id is not null) or
    (kind = 'trabajo' and pause_reason_id is null)
  );
--> statement-breakpoint

-- Solo puede haber UNA sesión abierta por trabajo: el cronómetro es uno.
create unique index repair_time_sessions_single_open
  on repair_time_sessions (repair_job_id) where ended_at is null;
--> statement-breakpoint

-- La versión de cotización es correlativa y positiva.
alter table quotations
  add constraint quotations_version_positive check (version >= 1);
--> statement-breakpoint

alter table quotations
  add constraint quotations_superseded_fk
  foreign key (superseded_by) references quotations (id) on delete set null;
--> statement-breakpoint

alter table customer_authorizations
  add constraint customer_authorizations_signature_fk
  foreign key (signature_id) references signatures (id) on delete set null;
--> statement-breakpoint

alter table customer_authorizations
  add constraint customer_authorizations_receipt_fk
  foreign key (receipt_document_id) references documents (id) on delete set null;
--> statement-breakpoint

alter table parts_request_items
  add constraint parts_request_items_alternative_fk
  foreign key (alternative_of) references parts_request_items (id) on delete set null;
--> statement-breakpoint

alter table parts_request_items
  add constraint parts_request_items_qip_fk
  foreign key (quotation_item_part_id) references quotation_item_parts (id) on delete set null;
--> statement-breakpoint

alter table service_types
  add constraint service_types_parent_fk
  foreign key (parent_id) references service_types (id) on delete restrict;
