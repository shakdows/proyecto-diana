import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { citext, createdAt, id, updatedAt } from './_shared';
import { diagnosticPriorityEnum, evidenceKindEnum, evidenceStatusEnum } from './enums';
import { corporateClients, profiles } from './core';
import { serviceOrders } from './orders';
import { vehicleDamages, vehicleReceptions } from './receptions';

export const diagnostics = pgTable(
  'diagnostics',
  {
    id: id(),
    serviceOrderId: uuid('service_order_id')
      .notNull()
      .references(() => serviceOrders.id, { onDelete: 'cascade' }),
    technicianProfileId: uuid('technician_profile_id').references(() => profiles.id, {
      onDelete: 'set null',
    }),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    generalNotes: text('general_notes'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('diagnostics_order_key').on(t.serviceOrderId)],
);

export const diagnosticItems = pgTable(
  'diagnostic_items',
  {
    id: id(),
    diagnosticId: uuid('diagnostic_id')
      .notNull()
      .references(() => diagnostics.id, { onDelete: 'cascade' }),
    /** `001`, `002`… legible para el cliente. */
    itemNumber: citext('item_number').notNull(),
    /** Sistema afectado: frenos, suspensión, motor… */
    system: text('system').notNull(),
    finding: text('finding').notNull(),
    recommendedWork: text('recommended_work').notNull(),
    priority: diagnosticPriorityEnum('priority').notNull().default('medio'),
    estimatedMinutes: integer('estimated_minutes'),
    requiresParts: boolean('requires_parts').notNull().default(false),
    /** Nota interna del técnico: NUNCA se muestra al cliente (§65). */
    internalNotes: text('internal_notes'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('diagnostic_items_number_key').on(t.diagnosticId, t.itemNumber),
    index('diagnostic_items_diagnostic_idx').on(t.diagnosticId),
  ],
);

/**
 * Evidencias.
 *
 * NO es una relación polimórfica genérica (`entity` + `entity_id`): PostgreSQL
 * no puede imponer integridad referencial sobre eso, y en un sistema donde las
 * fotos son prueba frente al cliente una evidencia huérfana es un problema
 * legal, no un detalle técnico.
 *
 * En su lugar hay una FK real y nulable por tipo de anclaje, con un CHECK que
 * obliga a que exactamente una esté presente (ver migración 0002).
 *
 * `service_order_id` va SIEMPRE presente y desnormalizado: la política RLS es
 * una comparación directa sin joins, y la galería de la orden es una sola
 * consulta por índice.
 */
export const evidenceFiles = pgTable(
  'evidence_files',
  {
    id: id(),
    serviceOrderId: uuid('service_order_id')
      .notNull()
      .references(() => serviceOrders.id, { onDelete: 'cascade' }),
    corporateClientId: uuid('corporate_client_id').references(() => corporateClients.id, {
      onDelete: 'set null',
    }),

    // Anclajes: exactamente uno no nulo.
    receptionId: uuid('reception_id').references(() => vehicleReceptions.id, {
      onDelete: 'cascade',
    }),
    damageId: uuid('damage_id').references(() => vehicleDamages.id, { onDelete: 'cascade' }),
    diagnosticItemId: uuid('diagnostic_item_id').references(() => diagnosticItems.id, {
      onDelete: 'cascade',
    }),
    repairJobItemId: uuid('repair_job_item_id'),
    qualityControlId: uuid('quality_control_id'),
    purchaseReceiptId: uuid('purchase_receipt_id'),

    kind: evidenceKindEnum('kind').notNull(),
    storagePath: text('storage_path').notNull(),
    thumbnailPath: text('thumbnail_path'),
    mimeType: text('mime_type').notNull(),
    sizeBytes: integer('size_bytes'),
    width: integer('width'),
    height: integer('height'),
    durationSeconds: integer('duration_seconds'),
    checksumSha256: text('checksum_sha256'),
    caption: text('caption'),
    /** Hace cumplir §65: solo lo marcado llega al portal del cliente. */
    isClientVisible: boolean('is_client_visible').notNull().default(false),
    status: evidenceStatusEnum('status').notNull().default('pendiente'),
    uploadedBy: uuid('uploaded_by').references(() => profiles.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (t) => [
    index('evidence_files_order_idx').on(t.serviceOrderId, t.createdAt.desc()),
    index('evidence_files_diagnostic_item_idx').on(t.diagnosticItemId),
    index('evidence_files_damage_idx').on(t.damageId),
    index('evidence_files_repair_item_idx').on(t.repairJobItemId),
    // Parcial: subidas incompletas de más de 24 h, para la tarea de limpieza.
    index('evidence_files_pending_idx')
      .on(t.createdAt)
      .where(sql`${t.status} = 'pendiente'`),
  ],
);
