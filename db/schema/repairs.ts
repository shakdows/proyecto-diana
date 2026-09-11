import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { auditColumns, citext, createdAt, id, updatedAt } from './_shared';
import {
  jobStatusEnum,
  qualityItemResultEnum,
  qualityResultEnum,
  repairItemStatusEnum,
  timeSessionKindEnum,
} from './enums';
import { profiles } from './core';
import { serviceOrders } from './orders';
import { quotationItems } from './quotations';

/** Motivos de pausa: catálogo administrable (§31). */
export const pauseReasons = pgTable(
  'pause_reasons',
  {
    id: id(),
    code: citext('code').notNull(),
    label: text('label').notNull(),
    /** ¿El tiempo cuenta como productivo en los indicadores de §47? */
    countsAsProductive: boolean('counts_as_productive').notNull().default(false),
    /**
     * La espera depende de un tercero. Mientras esté abierta, la ETA es
     * indeterminada y el semáforo pasa a gris: decir «4:25 PM» sería inventar.
     */
    blocksEta: boolean('blocks_eta').notNull().default(false),
    position: integer('position').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    ...auditColumns(),
  },
  (t) => [uniqueIndex('pause_reasons_code_key').on(t.code)],
);

export const repairJobs = pgTable(
  'repair_jobs',
  {
    id: id(),
    serviceOrderId: uuid('service_order_id')
      .notNull()
      .references(() => serviceOrders.id, { onDelete: 'cascade' }),
    technicianProfileId: uuid('technician_profile_id').references(() => profiles.id, {
      onDelete: 'set null',
    }),
    /** Confirmado por el técnico antes de iniciar (§32). */
    estimatedMinutes: integer('estimated_minutes'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    finalNotes: text('final_notes'),
    testsPerformed: text('tests_performed'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [uniqueIndex('repair_jobs_order_key').on(t.serviceOrderId)],
);

/**
 * Trabajos a ejecutar.
 *
 * Solo se crean para ítems APROBADOS por el cliente (§24). Un CHECK en la
 * migración 0003 lo hace cumplir: nunca se inicia la reparación de un ítem
 * rechazado.
 */
export const repairJobItems = pgTable(
  'repair_job_items',
  {
    id: id(),
    repairJobId: uuid('repair_job_id')
      .notNull()
      .references(() => repairJobs.id, { onDelete: 'cascade' }),
    quotationItemId: uuid('quotation_item_id')
      .notNull()
      .references(() => quotationItems.id, { onDelete: 'restrict' }),
    status: repairItemStatusEnum('status').notNull().default('pendiente'),
    estimatedMinutes: integer('estimated_minutes'),
    partsInstalled: numeric('parts_installed', { precision: 12, scale: 3 })
      .notNull()
      .default('0'),
    partsRemoved: numeric('parts_removed', { precision: 12, scale: 3 }).notNull().default('0'),
    notes: text('notes'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('repair_job_items_unique').on(t.repairJobId, t.quotationItemId),
    index('repair_job_items_job_idx').on(t.repairJobId),
  ],
);

/**
 * LA ÚNICA VERDAD DEL TIEMPO (resolución de I-6).
 *
 * El estado `REPARACION_PAUSADA` es DERIVADO: la orden está pausada si y solo
 * si existe una sesión abierta de tipo `pausa`. Bruto, pausas y efectivo se
 * calculan siempre desde aquí, nunca desde el estado.
 *
 * Las marcas las pone `now()` de PostgreSQL, no el reloj de la tablet: si
 * dependieran del dispositivo, el indicador de productividad de §47 sería
 * manipulable cambiando la hora.
 */
export const repairTimeSessions = pgTable(
  'repair_time_sessions',
  {
    id: id(),
    repairJobId: uuid('repair_job_id')
      .notNull()
      .references(() => repairJobs.id, { onDelete: 'cascade' }),
    technicianProfileId: uuid('technician_profile_id').references(() => profiles.id, {
      onDelete: 'set null',
    }),
    kind: timeSessionKindEnum('kind').notNull(),
    pauseReasonId: uuid('pause_reason_id').references(() => pauseReasons.id, {
      onDelete: 'restrict',
    }),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    notes: text('notes'),
    createdAt: createdAt(),
  },
  (t) => [
    index('repair_time_sessions_job_idx').on(t.repairJobId, t.startedAt),
    index('repair_time_sessions_technician_idx').on(
      t.technicianProfileId,
      t.startedAt.desc(),
    ),
    // Parcial: la sesión abierta. Se consulta en cada carga del tablero.
    index('repair_time_sessions_open_idx')
      .on(t.repairJobId)
      .where(sql`${t.endedAt} is null`),
  ],
);

export const qualityControls = pgTable(
  'quality_controls',
  {
    id: id(),
    serviceOrderId: uuid('service_order_id')
      .notNull()
      .references(() => serviceOrders.id, { onDelete: 'cascade' }),
    inspectorProfileId: uuid('inspector_profile_id').references(() => profiles.id, {
      onDelete: 'set null',
    }),
    /** Numera los reintentos: una orden puede rebotar varias veces. */
    round: integer('round').notNull().default(1),
    result: qualityResultEnum('result'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    notes: text('notes'),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('quality_controls_round_key').on(t.serviceOrderId, t.round)],
);

export const qualityControlItems = pgTable(
  'quality_control_items',
  {
    id: id(),
    qualityControlId: uuid('quality_control_id')
      .notNull()
      .references(() => qualityControls.id, { onDelete: 'cascade' }),
    checkCode: citext('check_code').notNull(),
    label: text('label').notNull(),
    result: qualityItemResultEnum('result').notNull(),
    finding: text('finding'),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('quality_control_items_unique').on(t.qualityControlId, t.checkCode)],
);

export const washingJobs = pgTable(
  'washing_jobs',
  {
    id: id(),
    serviceOrderId: uuid('service_order_id')
      .notNull()
      .references(() => serviceOrders.id, { onDelete: 'cascade' }),
    status: jobStatusEnum('status').notNull().default('pendiente'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    operatorProfileId: uuid('operator_profile_id').references(() => profiles.id, {
      onDelete: 'set null',
    }),
    notes: text('notes'),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('washing_jobs_order_key').on(t.serviceOrderId)],
);

export const alignmentJobs = pgTable(
  'alignment_jobs',
  {
    id: id(),
    serviceOrderId: uuid('service_order_id')
      .notNull()
      .references(() => serviceOrders.id, { onDelete: 'cascade' }),
    status: jobStatusEnum('status').notNull().default('pendiente'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    operatorProfileId: uuid('operator_profile_id').references(() => profiles.id, {
      onDelete: 'set null',
    }),
    notes: text('notes'),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('alignment_jobs_order_key').on(t.serviceOrderId)],
);
