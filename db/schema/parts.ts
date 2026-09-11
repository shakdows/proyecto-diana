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
  diagnosticPriorityEnum,
  partsRequestStatusEnum,
  purchaseOrderStatusEnum,
} from './enums';
import { profiles } from './core';
import { serviceOrders } from './orders';

export const partsCatalog = pgTable(
  'parts_catalog',
  {
    id: id(),
    code: citext('code').notNull(),
    description: text('description').notNull(),
    brand: text('brand'),
    unit: text('unit').notNull().default('unidad'),
    isOriginal: boolean('is_original').notNull().default(true),
    stockQty: numeric('stock_qty', { precision: 12, scale: 3 }).notNull().default('0'),
    isActive: boolean('is_active').notNull().default(true),
    isDemo: boolean('is_demo').notNull().default(false),
    ...auditColumns(),
  },
  (t) => [uniqueIndex('parts_catalog_code_key').on(t.code)],
);

/**
 * Solicitud de repuestos.
 *
 * Tiene ciclo de vida PROPIO y no mueve el estado de la orden (§3.6): §26
 * permite «solicitar corrección», y si cada ida y vuelta moviera la orden
 * ensuciaría la línea de tiempo del vehículo.
 */
export const partsRequests = pgTable(
  'parts_requests',
  {
    id: id(),
    serviceOrderId: uuid('service_order_id')
      .notNull()
      .references(() => serviceOrders.id, { onDelete: 'cascade' }),
    code: citext('code').notNull(),
    status: partsRequestStatusEnum('status').notNull().default('borrador'),
    requestedBy: uuid('requested_by').references(() => profiles.id, { onDelete: 'set null' }),
    requestedAt: timestamp('requested_at', { withTimezone: true }),
    reviewedBy: uuid('reviewed_by').references(() => profiles.id, { onDelete: 'set null' }),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    reviewNote: text('review_note'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('parts_requests_code_key').on(t.code),
    index('parts_requests_order_idx').on(t.serviceOrderId),
    index('parts_requests_pending_idx')
      .on(t.status)
      .where(sql`${t.status} = 'pendiente'`),
  ],
);

export const partsRequestItems = pgTable(
  'parts_request_items',
  {
    id: id(),
    partsRequestId: uuid('parts_request_id')
      .notNull()
      .references(() => partsRequests.id, { onDelete: 'cascade' }),
    partId: uuid('part_id').references(() => partsCatalog.id, { onDelete: 'restrict' }),
    quotationItemPartId: uuid('quotation_item_part_id'),
    description: text('description').notNull(),
    brand: text('brand'),
    /** Derivada de los ítems APROBADOS. Ver `v_required_parts` (migración 0004). */
    quantityRequired: numeric('quantity_required', { precision: 12, scale: 3 }).notNull(),
    quantityInStock: numeric('quantity_in_stock', { precision: 12, scale: 3 })
      .notNull()
      .default('0'),
    unit: text('unit').notNull().default('unidad'),
    isOriginal: boolean('is_original').notNull().default(true),
    alternativeOf: uuid('alternative_of'),
    priority: diagnosticPriorityEnum('priority').notNull().default('medio'),
    notes: text('notes'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('parts_request_items_request_idx').on(t.partsRequestId)],
);

export const suppliers = pgTable(
  'suppliers',
  {
    id: id(),
    code: citext('code').notNull(),
    name: text('name').notNull(),
    taxId: text('tax_id'),
    contactName: text('contact_name'),
    phone: text('phone'),
    email: citext('email'),
    paymentTerms: text('payment_terms'),
    rating: integer('rating'),
    isActive: boolean('is_active').notNull().default(true),
    isDemo: boolean('is_demo').notNull().default(false),
    ...auditColumns(),
  },
  (t) => [uniqueIndex('suppliers_code_key').on(t.code)],
);

export const supplierQuotes = pgTable(
  'supplier_quotes',
  {
    id: id(),
    partsRequestId: uuid('parts_request_id')
      .notNull()
      .references(() => partsRequests.id, { onDelete: 'cascade' }),
    supplierId: uuid('supplier_id')
      .notNull()
      .references(() => suppliers.id, { onDelete: 'restrict' }),
    code: citext('code'),
    quotedAt: timestamp('quoted_at', { withTimezone: true }).notNull().defaultNow(),
    validUntil: timestamp('valid_until', { withTimezone: true }),
    currency: text('currency').notNull().default('PEN'),
    total: numeric('total', { precision: 14, scale: 2 }).notNull().default('0'),
    leadTimeDays: integer('lead_time_days'),
    warrantyMonths: integer('warranty_months'),
    paymentTerms: text('payment_terms'),
    notes: text('notes'),
    createdBy: uuid('created_by').references(() => profiles.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('supplier_quotes_unique').on(t.partsRequestId, t.supplierId),
    index('supplier_quotes_request_idx').on(t.partsRequestId),
  ],
);

/**
 * Selección POR LÍNEA, no por proveedor (§10.5).
 *
 * Si un proveedor tiene las pastillas más baratas y otro entrega el filtro
 * mañana en vez de el jueves, se compra a los dos.
 */
export const supplierQuoteItems = pgTable(
  'supplier_quote_items',
  {
    id: id(),
    supplierQuoteId: uuid('supplier_quote_id')
      .notNull()
      .references(() => supplierQuotes.id, { onDelete: 'cascade' }),
    partsRequestItemId: uuid('parts_request_item_id')
      .notNull()
      .references(() => partsRequestItems.id, { onDelete: 'cascade' }),
    brand: text('brand'),
    unitPrice: numeric('unit_price', { precision: 14, scale: 2 }).notNull(),
    quantityAvailable: numeric('quantity_available', { precision: 12, scale: 3 }).notNull(),
    leadTimeDays: integer('lead_time_days'),
    isSelected: boolean('is_selected').notNull().default(false),
    notes: text('notes'),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('supplier_quote_items_unique').on(t.supplierQuoteId, t.partsRequestItemId),
    index('supplier_quote_items_request_item_idx').on(t.partsRequestItemId),
    index('supplier_quote_items_selected_idx')
      .on(t.partsRequestItemId)
      .where(sql`${t.isSelected}`),
  ],
);

export const purchaseOrders = pgTable(
  'purchase_orders',
  {
    id: id(),
    /** `OC-2026-000045`. Lo genera un DEFAULT con secuencia. */
    code: citext('code').notNull(),
    serviceOrderId: uuid('service_order_id')
      .notNull()
      .references(() => serviceOrders.id, { onDelete: 'restrict' }),
    supplierId: uuid('supplier_id')
      .notNull()
      .references(() => suppliers.id, { onDelete: 'restrict' }),
    partsRequestId: uuid('parts_request_id').references(() => partsRequests.id, {
      onDelete: 'set null',
    }),
    status: purchaseOrderStatusEnum('status').notNull().default('emitida'),
    /** Quien autoriza NO es quien compra: separación de funciones. */
    authorizedBy: uuid('authorized_by').references(() => profiles.id, { onDelete: 'set null' }),
    authorizedAt: timestamp('authorized_at', { withTimezone: true }),
    currency: text('currency').notNull().default('PEN'),
    total: numeric('total', { precision: 14, scale: 2 }).notNull().default('0'),
    expectedAt: timestamp('expected_at', { withTimezone: true }),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    notes: text('notes'),
    createdBy: uuid('created_by').references(() => profiles.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    uniqueIndex('purchase_orders_code_key').on(t.code),
    index('purchase_orders_order_idx').on(t.serviceOrderId),
    index('purchase_orders_supplier_idx').on(t.supplierId),
    // Parcial: las OC vivas, que es lo que mira el tablero de compras.
    index('purchase_orders_open_idx')
      .on(t.status, t.expectedAt)
      .where(sql`${t.status} in ('emitida','enviada','parcial')`),
  ],
);

export const purchaseOrderItems = pgTable(
  'purchase_order_items',
  {
    id: id(),
    purchaseOrderId: uuid('purchase_order_id')
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: 'cascade' }),
    partsRequestItemId: uuid('parts_request_item_id').references(() => partsRequestItems.id, {
      onDelete: 'restrict',
    }),
    partId: uuid('part_id').references(() => partsCatalog.id, { onDelete: 'restrict' }),
    description: text('description').notNull(),
    quantityOrdered: numeric('quantity_ordered', { precision: 12, scale: 3 }).notNull(),
    unitPrice: numeric('unit_price', { precision: 14, scale: 2 }).notNull(),
    lineTotal: numeric('line_total', { precision: 14, scale: 2 }).notNull().default('0'),
    createdAt: createdAt(),
  },
  (t) => [
    index('purchase_order_items_order_idx').on(t.purchaseOrderId),
    index('purchase_order_items_request_item_idx').on(t.partsRequestItemId),
  ],
);

export const purchaseReceipts = pgTable(
  'purchase_receipts',
  {
    id: id(),
    purchaseOrderId: uuid('purchase_order_id')
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: 'cascade' }),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
    receivedBy: uuid('received_by').references(() => profiles.id, { onDelete: 'set null' }),
    documentNumber: text('document_number'),
    notes: text('notes'),
    createdAt: createdAt(),
  },
  (t) => [index('purchase_receipts_order_idx').on(t.purchaseOrderId, t.receivedAt)],
);

/**
 * LA ÚNICA VERDAD de la cobertura.
 *
 * La cantidad recibida nunca es un contador que se incrementa: es siempre una
 * suma sobre estas filas. Un contador acumulado se desincroniza en cuanto se
 * corrige una recepción; una suma, no. Una corrección es una fila con cantidad
 * negativa y motivo, nunca un UPDATE.
 */
export const purchaseReceiptItems = pgTable(
  'purchase_receipt_items',
  {
    id: id(),
    purchaseReceiptId: uuid('purchase_receipt_id')
      .notNull()
      .references(() => purchaseReceipts.id, { onDelete: 'cascade' }),
    purchaseOrderItemId: uuid('purchase_order_item_id')
      .notNull()
      .references(() => purchaseOrderItems.id, { onDelete: 'cascade' }),
    quantityReceived: numeric('quantity_received', { precision: 12, scale: 3 })
      .notNull()
      .default('0'),
    quantityRejected: numeric('quantity_rejected', { precision: 12, scale: 3 })
      .notNull()
      .default('0'),
    rejectReason: text('reject_reason'),
    createdAt: createdAt(),
  },
  (t) => [index('purchase_receipt_items_po_item_idx').on(t.purchaseOrderItemId)],
);
