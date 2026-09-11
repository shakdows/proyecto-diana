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
import { citext, createdAt, id, inet, updatedAt } from './_shared';
import {
  authorizationChannelEnum,
  authorizationItemStatusEnum,
  diagnosticPriorityEnum,
  quotationStatusEnum,
} from './enums';
import { profiles } from './core';
import { serviceOrders } from './orders';
import { diagnosticItems } from './diagnostics';
import { partsCatalog } from './parts';

/**
 * Cotización VERSIONADA (§61).
 *
 * Una cotización emitida es INMUTABLE: si aparece un trabajo adicional no se
 * edita la V1, se crea la V2. Un disparador rechaza el UPDATE (migración 0003).
 */
export const quotations = pgTable(
  'quotations',
  {
    id: id(),
    serviceOrderId: uuid('service_order_id')
      .notNull()
      .references(() => serviceOrders.id, { onDelete: 'cascade' }),
    version: integer('version').notNull().default(1),
    code: citext('code').notNull(),
    status: quotationStatusEnum('status').notNull().default('borrador'),
    currency: text('currency').notNull().default('PEN'),
    /** Tasa vigente al emitir. Ver nota en `quotation_items`. */
    taxRate: numeric('tax_rate', { precision: 5, scale: 4 }).notNull().default('0.1800'),
    subtotal: numeric('subtotal', { precision: 14, scale: 2 }).notNull().default('0'),
    discountTotal: numeric('discount_total', { precision: 14, scale: 2 }).notNull().default('0'),
    taxTotal: numeric('tax_total', { precision: 14, scale: 2 }).notNull().default('0'),
    total: numeric('total', { precision: 14, scale: 2 }).notNull().default('0'),
    notes: text('notes'),
    issuedAt: timestamp('issued_at', { withTimezone: true }),
    issuedBy: uuid('issued_by').references(() => profiles.id, { onDelete: 'set null' }),
    supersededBy: uuid('superseded_by'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('quotations_order_version_key').on(t.serviceOrderId, t.version),
    uniqueIndex('quotations_code_key').on(t.code),
    // Parcial: la versión vigente de cada orden, que es lo que se consulta.
    index('quotations_issued_idx')
      .on(t.serviceOrderId)
      .where(sql`${t.status} = 'emitida'`),
  ],
);

export const quotationItems = pgTable(
  'quotation_items',
  {
    id: id(),
    quotationId: uuid('quotation_id')
      .notNull()
      .references(() => quotations.id, { onDelete: 'cascade' }),
    diagnosticItemId: uuid('diagnostic_item_id').references(() => diagnosticItems.id, {
      onDelete: 'set null',
    }),
    lineNumber: integer('line_number').notNull(),
    description: text('description').notNull(),
    priority: diagnosticPriorityEnum('priority').notNull().default('medio'),
    laborMinutes: integer('labor_minutes').notNull().default(0),
    laborUnitPrice: numeric('labor_unit_price', { precision: 14, scale: 2 })
      .notNull()
      .default('0'),
    partsAmount: numeric('parts_amount', { precision: 14, scale: 2 }).notNull().default('0'),
    quantity: numeric('quantity', { precision: 12, scale: 3 }).notNull().default('1'),
    unitPrice: numeric('unit_price', { precision: 14, scale: 2 }).notNull().default('0'),
    discountAmount: numeric('discount_amount', { precision: 14, scale: 2 })
      .notNull()
      .default('0'),
    /**
     * Tasa de impuesto POR LÍNEA.
     *
     * Un cambio futuro de IGV no debe reescribir lo que ya se emitió y el
     * cliente tiene en la mano.
     */
    taxRate: numeric('tax_rate', { precision: 5, scale: 4 }).notNull().default('0.1800'),
    lineTotal: numeric('line_total', { precision: 14, scale: 2 }).notNull().default('0'),
    /** Costo interno: requiere `quotations:read_cost`. Nunca va al portal. */
    internalCost: numeric('internal_cost', { precision: 14, scale: 2 }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('quotation_items_line_key').on(t.quotationId, t.lineNumber),
    index('quotation_items_quotation_idx').on(t.quotationId, t.lineNumber),
  ],
);

/** Une trabajo ↔ repuesto. Base del cálculo de cantidad requerida (§10). */
export const quotationItemParts = pgTable(
  'quotation_item_parts',
  {
    id: id(),
    quotationItemId: uuid('quotation_item_id')
      .notNull()
      .references(() => quotationItems.id, { onDelete: 'cascade' }),
    partId: uuid('part_id').references(() => partsCatalog.id, { onDelete: 'restrict' }),
    description: text('description').notNull(),
    quantity: numeric('quantity', { precision: 12, scale: 3 }).notNull().default('1'),
    isOriginal: boolean('is_original').notNull().default(true),
    unitCost: numeric('unit_cost', { precision: 14, scale: 2 }),
    createdAt: createdAt(),
  },
  (t) => [index('quotation_item_parts_item_idx').on(t.quotationItemId)],
);

/**
 * Enlace firmado del portal del cliente.
 *
 * Se guarda SOLO el hash del token: quien lea la tabla no puede reconstruir el
 * enlace. Ver docs/09 §9.3.
 */
export const authorizationLinks = pgTable(
  'authorization_links',
  {
    id: id(),
    quotationId: uuid('quotation_id')
      .notNull()
      .references(() => quotations.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    maxViews: integer('max_views').notNull().default(50),
    viewCount: integer('view_count').notNull().default(0),
    firstViewedAt: timestamp('first_viewed_at', { withTimezone: true }),
    lastViewedAt: timestamp('last_viewed_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdBy: uuid('created_by').references(() => profiles.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('authorization_links_token_key').on(t.tokenHash),
    index('authorization_links_quotation_idx').on(t.quotationId),
  ],
);

export const customerAuthorizations = pgTable(
  'customer_authorizations',
  {
    id: id(),
    quotationId: uuid('quotation_id')
      .notNull()
      .references(() => quotations.id, { onDelete: 'cascade' }),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
    channel: authorizationChannelEnum('channel').notNull().default('portal'),
    /** Quién la registró, cuando no la pulsó el cliente (§9.7). */
    registeredBy: uuid('registered_by').references(() => profiles.id, { onDelete: 'set null' }),
    signatureId: uuid('signature_id'),
    otpVerified: boolean('otp_verified').notNull().default(false),
    ip: inet('ip'),
    userAgent: text('user_agent'),
    approvedTotal: numeric('approved_total', { precision: 14, scale: 2 }).notNull().default('0'),
    rejectedTotal: numeric('rejected_total', { precision: 14, scale: 2 }).notNull().default('0'),
    receiptDocumentId: uuid('receipt_document_id'),
    createdAt: createdAt(),
  },
  // Única por cotización: el segundo intento devuelve el comprobante existente.
  (t) => [uniqueIndex('customer_authorizations_quotation_key').on(t.quotationId)],
);

export const authorizationItems = pgTable(
  'authorization_items',
  {
    id: id(),
    authorizationId: uuid('authorization_id')
      .notNull()
      .references(() => customerAuthorizations.id, { onDelete: 'cascade' }),
    quotationItemId: uuid('quotation_item_id')
      .notNull()
      .references(() => quotationItems.id, { onDelete: 'cascade' }),
    status: authorizationItemStatusEnum('status').notNull().default('pendiente'),
    /**
     * Nota del cliente. NO puede cambiar importes ni cantidades (I-2): eso
     * convertiría el portal en un formulario donde el cliente fija el precio.
     */
    customerNote: text('customer_note'),
    /** Un asesor marca la observación como atendida antes de ejecutar. */
    acknowledgedBy: uuid('acknowledged_by').references(() => profiles.id, {
      onDelete: 'set null',
    }),
    acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }),
    decidedAt: timestamp('decided_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('authorization_items_unique').on(t.authorizationId, t.quotationItemId),
    index('authorization_items_authorization_idx').on(t.authorizationId),
    index('authorization_items_quotation_item_idx').on(t.quotationItemId),
  ],
);

export const authorizationOtps = pgTable(
  'authorization_otps',
  {
    id: id(),
    linkId: uuid('link_id')
      .notNull()
      .references(() => authorizationLinks.id, { onDelete: 'cascade' }),
    codeHash: text('code_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    attempts: integer('attempts').notNull().default(0),
    consumedAt: timestamp('consumed_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index('authorization_otps_link_idx').on(t.linkId)],
);
