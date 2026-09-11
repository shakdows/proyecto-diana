import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { auditColumns, citext, createdAt, id } from './_shared';
import {
  deliveryStatusEnum,
  documentTypeCatalogEnum,
  notificationChannelEnum,
} from './enums';
import { corporateClients, profiles, roles } from './core';
import { serviceOrders } from './orders';

/** Quién recibe qué, administrable. No está en el código (§12.2). */
export const notificationRules = pgTable(
  'notification_rules',
  {
    id: id(),
    eventCode: citext('event_code').notNull(),
    roleId: uuid('role_id').references(() => roles.id, { onDelete: 'cascade' }),
    /** `asesor_de_la_orden`, `tecnico_asignado`… cuando no es un rol fijo. */
    recipientKind: text('recipient_kind'),
    channels: notificationChannelEnum('channels')
      .array()
      .notNull()
      .default(sql`'{in_app}'::notification_channel[]`),
    isActive: boolean('is_active').notNull().default(true),
    ...auditColumns(),
  },
  (t) => [index('notification_rules_event_idx').on(t.eventCode)],
);

export const notifications = pgTable(
  'notifications',
  {
    id: id(),
    recipientProfileId: uuid('recipient_profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    corporateClientId: uuid('corporate_client_id').references(() => corporateClients.id, {
      onDelete: 'set null',
    }),
    serviceOrderId: uuid('service_order_id').references(() => serviceOrders.id, {
      onDelete: 'cascade',
    }),
    eventCode: citext('event_code').notNull(),
    title: text('title').notNull(),
    body: text('body'),
    payload: jsonb('payload'),
    readAt: timestamp('read_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    // Parcial: las no leídas de cada usuario, que es lo que pinta la campana.
    index('notifications_unread_idx')
      .on(t.recipientProfileId, t.createdAt.desc())
      .where(sql`${t.readAt} is null`),
    index('notifications_order_idx').on(t.serviceOrderId),
  ],
);

/**
 * Patrón OUTBOX.
 *
 * La notificación se escribe en la MISMA transacción que el cambio de estado;
 * el envío por canales externos ocurre después y puede fallar y reintentarse
 * sin tocar el dominio. Consecuencia: el centro de notificaciones interno
 * nunca pierde un evento aunque el proveedor de WhatsApp esté caído.
 */
export const notificationDeliveries = pgTable(
  'notification_deliveries',
  {
    id: id(),
    notificationId: uuid('notification_id')
      .notNull()
      .references(() => notifications.id, { onDelete: 'cascade' }),
    channel: notificationChannelEnum('channel').notNull(),
    status: deliveryStatusEnum('status').notNull().default('pendiente'),
    attempts: integer('attempts').notNull().default(0),
    providerMessageId: text('provider_message_id'),
    error: text('error'),
    nextAttemptAt: timestamp('next_attempt_at', { withTimezone: true }),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('notification_deliveries_unique').on(t.notificationId, t.channel),
    // Parcial: la cola pendiente del despachador.
    index('notification_deliveries_pending_idx')
      .on(t.nextAttemptAt)
      .where(sql`${t.status} = 'pendiente'`),
  ],
);

/** Los nueve documentos de §51, más el informe corporativo. */
export const documents = pgTable(
  'documents',
  {
    id: id(),
    serviceOrderId: uuid('service_order_id').references(() => serviceOrders.id, {
      onDelete: 'cascade',
    }),
    corporateClientId: uuid('corporate_client_id').references(() => corporateClients.id, {
      onDelete: 'set null',
    }),
    docType: documentTypeCatalogEnum('doc_type').notNull(),
    code: citext('code'),
    storagePath: text('storage_path').notNull(),
    /** Filtros con los que se generó: el PDF es reproducible. */
    params: jsonb('params'),
    generatedBy: uuid('generated_by').references(() => profiles.id, { onDelete: 'set null' }),
    generatedAt: timestamp('generated_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
  },
  (t) => [
    index('documents_order_idx').on(t.serviceOrderId, t.generatedAt.desc()),
    index('documents_type_idx').on(t.docType, t.generatedAt.desc()),
  ],
);
