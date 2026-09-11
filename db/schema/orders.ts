import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { auditColumns, citext, createdAt, id } from './_shared';
import {
  actorKindEnum,
  assignmentRoleEnum,
  finalStageEnum,
  orderActionEnum,
  orderPriorityEnum,
  orderStatusEnum,
} from './enums';
import { bays, branches, corporateClients, profiles } from './core';
import { customers, vehicles } from './people';

export const serviceTypes = pgTable(
  'service_types',
  {
    id: id(),
    code: citext('code').notNull(),
    name: text('name').notNull(),
    /** Modela «planchado y pintura → seguro / garantía / cortesía» (§13). */
    parentId: uuid('parent_id'),
    position: integer('position').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    ...auditColumns(),
  },
  (t) => [uniqueIndex('service_types_code_key').on(t.code)],
);

/** Configura la secuencia final de §37 sin tocar código. */
export const serviceTypeFinalStages = pgTable(
  'service_type_final_stages',
  {
    serviceTypeId: uuid('service_type_id')
      .notNull()
      .references(() => serviceTypes.id, { onDelete: 'cascade' }),
    stage: finalStageEnum('stage').notNull(),
    position: integer('position').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.serviceTypeId, t.stage] })],
);

/**
 * El grafo de la máquina de estados, EN TABLA.
 *
 * Lo lee el disparador que valida en la base. Se siembra desde
 * `allTransitions()` del dominio, de modo que código y base no pueden
 * discrepar. Ver docs/03-maquina-de-estados.md §3.7.
 */
export const statusTransitions = pgTable(
  'status_transitions',
  {
    fromStatus: orderStatusEnum('from_status').notNull(),
    action: orderActionEnum('action').notNull(),
    /**
     * Destino. Una acción con desenlace dinámico —`registrar_decision`,
     * `terminar_lavado`— aporta varias filas, una por destino posible, y el
     * disparador valida la TERNA completa.
     */
    toStatus: orderStatusEnum('to_status').notNull(),
    requiredPermission: citext('required_permission'),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.fromStatus, t.action, t.toStatus] })],
);

export const serviceOrders = pgTable(
  'service_orders',
  {
    id: id(),
    /** `OS-2026-000154`. Lo genera un DEFAULT con secuencia, no la aplicación. */
    code: citext('code').notNull(),
    corporateClientId: uuid('corporate_client_id').references(() => corporateClients.id, {
      onDelete: 'restrict',
    }),
    customerId: uuid('customer_id')
      .notNull()
      .references(() => customers.id, { onDelete: 'restrict' }),
    vehicleId: uuid('vehicle_id')
      .notNull()
      .references(() => vehicles.id, { onDelete: 'restrict' }),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'restrict' }),
    serviceTypeId: uuid('service_type_id').references(() => serviceTypes.id, {
      onDelete: 'restrict',
    }),
    advisorProfileId: uuid('advisor_profile_id').references(() => profiles.id, {
      onDelete: 'set null',
    }),
    status: orderStatusEnum('status').notNull().default('DRAFT'),
    priority: orderPriorityEnum('priority').notNull().default('normal'),
    mileageIn: integer('mileage_in'),
    customerRequest: text('customer_request'),
    openedAt: timestamp('opened_at', { withTimezone: true }).notNull().defaultNow(),
    /** Hora prometida al cliente. Alimenta el semáforo (§44). */
    promisedAt: timestamp('promised_at', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    /** Etapas finales pendientes, en orden. Resuelto al aprobar calidad. */
    finalStages: finalStageEnum('final_stages').array().notNull().default(sql`'{}'::final_stage[]`),
    cancelReason: text('cancel_reason'),
    /** Aviso de retraso emitido: evita repetir la alerta (§64). */
    delayAlertedAt: timestamp('delay_alerted_at', { withTimezone: true }),
    isDemo: boolean('is_demo').notNull().default(false),
    ...auditColumns(),
  },
  (t) => [
    uniqueIndex('service_orders_code_key').on(t.code),
    index('service_orders_branch_status_idx').on(t.branchId, t.status, t.openedAt.desc()),
    index('service_orders_corporate_idx').on(t.corporateClientId, t.openedAt.desc()),
    index('service_orders_advisor_idx').on(t.advisorProfileId, t.status),
    index('service_orders_vehicle_idx').on(t.vehicleId, t.openedAt.desc()),
    index('service_orders_customer_idx').on(t.customerId, t.openedAt.desc()),
    // Índices PARCIALES: un taller tiene decenas de órdenes vivas y decenas de
    // miles cerradas. Indexar solo las vivas hace que el tablero consulte un
    // índice pequeño que cabe en memoria.
    index('service_orders_open_idx')
      .on(t.status)
      .where(sql`${t.status} not in ('CERRADO','CANCELADO')`),
    index('service_orders_promised_idx')
      .on(t.promisedAt)
      .where(sql`${t.deliveredAt} is null`),
  ],
);

/**
 * Línea de tiempo del vehículo (§34).
 *
 * La escribe un DISPARADOR, nunca la aplicación: así está completa por
 * construcción y no depende de que alguien se acordara de registrarla.
 */
export const statusHistory = pgTable(
  'status_history',
  {
    id: id(),
    serviceOrderId: uuid('service_order_id')
      .notNull()
      .references(() => serviceOrders.id, { onDelete: 'cascade' }),
    fromStatus: orderStatusEnum('from_status'),
    toStatus: orderStatusEnum('to_status').notNull(),
    action: orderActionEnum('action'),
    actorProfileId: uuid('actor_profile_id').references(() => profiles.id, {
      onDelete: 'set null',
    }),
    actorKind: actorKindEnum('actor_kind').notNull().default('usuario'),
    area: text('area'),
    comment: text('comment'),
    createdAt: createdAt(),
  },
  (t) => [index('status_history_order_idx').on(t.serviceOrderId, t.createdAt)],
);

export const workAssignments = pgTable(
  'work_assignments',
  {
    id: id(),
    serviceOrderId: uuid('service_order_id')
      .notNull()
      .references(() => serviceOrders.id, { onDelete: 'cascade' }),
    profileId: uuid('profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'restrict' }),
    roleInOrder: assignmentRoleEnum('role_in_order').notNull(),
    bayId: uuid('bay_id').references(() => bays.id, { onDelete: 'set null' }),
    assignedBy: uuid('assigned_by').references(() => profiles.id, { onDelete: 'set null' }),
    assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
    estimatedMinutes: integer('estimated_minutes'),
    releasedAt: timestamp('released_at', { withTimezone: true }),
    notes: text('notes'),
    createdAt: createdAt(),
  },
  (t) => [
    index('work_assignments_order_idx').on(t.serviceOrderId),
    // Parcial: «qué tiene cada técnico abierto ahora mismo».
    index('work_assignments_active_idx')
      .on(t.profileId)
      .where(sql`${t.releasedAt} is null`),
  ],
);
