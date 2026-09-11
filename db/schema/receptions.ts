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
import { auditColumns, citext, createdAt, id, inet } from './_shared';
import {
  bodyZoneEnum,
  checklistInputTypeEnum,
  checklistStatusEnum,
  damageTypeEnum,
  diagnosticPriorityEnum,
  fuelLevelEnum,
  levelReadingEnum,
  receptionDocumentTypeEnum,
  signerKindEnum,
} from './enums';
import { profiles } from './core';
import { serviceOrders } from './orders';

/** Catálogo del checklist: administrable, no cableado (§6). */
export const checklistCategories = pgTable(
  'checklist_categories',
  {
    id: id(),
    code: citext('code').notNull(),
    name: text('name').notNull(),
    position: integer('position').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    ...auditColumns(),
  },
  (t) => [uniqueIndex('checklist_categories_code_key').on(t.code)],
);

export const checklistItemDefs = pgTable(
  'checklist_item_defs',
  {
    id: id(),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => checklistCategories.id, { onDelete: 'cascade' }),
    code: citext('code').notNull(),
    label: text('label').notNull(),
    position: integer('position').notNull().default(0),
    /**
     * Resolución de I-9: la hoja física registra cantidad en unos ítems
     * (conos, triángulos) y medición en otros. Un único campo de tres valores
     * perdería esa información.
     */
    inputType: checklistInputTypeEnum('input_type').notNull().default('estado'),
    unit: text('unit'),
    isRequired: boolean('is_required').notNull().default(true),
    isActive: boolean('is_active').notNull().default(true),
    ...auditColumns(),
  },
  (t) => [
    uniqueIndex('checklist_item_defs_code_key').on(t.code),
    index('checklist_item_defs_category_idx').on(t.categoryId, t.position),
  ],
);

export const vehicleReceptions = pgTable(
  'vehicle_receptions',
  {
    id: id(),
    serviceOrderId: uuid('service_order_id')
      .notNull()
      .references(() => serviceOrders.id, { onDelete: 'cascade' }),
    receivedBy: uuid('received_by').references(() => profiles.id, { onDelete: 'set null' }),
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull().defaultNow(),
    mileage: integer('mileage'),
    fuelLevel: fuelLevelEnum('fuel_level'),
    oilLevel: levelReadingEnum('oil_level'),
    coolantLevel: levelReadingEnum('coolant_level'),
    // Profundidad de cocada en milímetros (§7).
    treadFrontLeft: numeric('tread_front_left', { precision: 4, scale: 1 }),
    treadFrontRight: numeric('tread_front_right', { precision: 4, scale: 1 }),
    treadRearLeft: numeric('tread_rear_left', { precision: 4, scale: 1 }),
    treadRearRight: numeric('tread_rear_right', { precision: 4, scale: 1 }),
    treadSpare: numeric('tread_spare', { precision: 4, scale: 1 }),
    customerRequest: text('customer_request'),
    observations: text('observations'),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    isDemo: boolean('is_demo').notNull().default(false),
    ...auditColumns(),
  },
  (t) => [uniqueIndex('vehicle_receptions_order_key').on(t.serviceOrderId)],
);

export const vehicleChecklists = pgTable(
  'vehicle_checklists',
  {
    id: id(),
    receptionId: uuid('reception_id')
      .notNull()
      .references(() => vehicleReceptions.id, { onDelete: 'cascade' }),
    completedBy: uuid('completed_by').references(() => profiles.id, { onDelete: 'set null' }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('vehicle_checklists_reception_key').on(t.receptionId)],
);

export const checklistItems = pgTable(
  'checklist_items',
  {
    id: id(),
    checklistId: uuid('checklist_id')
      .notNull()
      .references(() => vehicleChecklists.id, { onDelete: 'cascade' }),
    itemDefId: uuid('item_def_id')
      .notNull()
      .references(() => checklistItemDefs.id, { onDelete: 'restrict' }),
    status: checklistStatusEnum('status').notNull(),
    quantity: integer('quantity'),
    measureValue: numeric('measure_value', { precision: 8, scale: 2 }),
    notes: text('notes'),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('checklist_items_unique').on(t.checklistId, t.itemDefId)],
);

export const vehicleDamages = pgTable(
  'vehicle_damages',
  {
    id: id(),
    receptionId: uuid('reception_id')
      .notNull()
      .references(() => vehicleReceptions.id, { onDelete: 'cascade' }),
    damageType: damageTypeEnum('damage_type').notNull(),
    bodyZone: bodyZoneEnum('body_zone').notNull(),
    side: text('side'),
    /**
     * Posición RELATIVA (0–1) sobre el diagrama, no píxeles: así el diagrama
     * puede rediseñarse sin invalidar los daños históricos.
     */
    posX: numeric('pos_x', { precision: 5, scale: 4 }),
    posY: numeric('pos_y', { precision: 5, scale: 4 }),
    severity: diagnosticPriorityEnum('severity'),
    description: text('description'),
    createdAt: createdAt(),
  },
  (t) => [index('vehicle_damages_reception_idx').on(t.receptionId)],
);

export const receptionDocuments = pgTable(
  'reception_documents',
  {
    id: id(),
    receptionId: uuid('reception_id')
      .notNull()
      .references(() => vehicleReceptions.id, { onDelete: 'cascade' }),
    documentType: receptionDocumentTypeEnum('document_type').notNull(),
    received: boolean('received').notNull().default(false),
    notes: text('notes'),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('reception_documents_unique').on(t.receptionId, t.documentType)],
);

/** Reutilizada por recepción, autorización del cliente y acta de entrega. */
export const signatures = pgTable(
  'signatures',
  {
    id: id(),
    entity: text('entity').notNull(),
    entityId: uuid('entity_id').notNull(),
    signerKind: signerKindEnum('signer_kind').notNull(),
    signerName: text('signer_name').notNull(),
    signerDocument: text('signer_document'),
    /** Imagen de la firma en Storage, bucket privado. */
    imagePath: text('image_path').notNull(),
    signedAt: timestamp('signed_at', { withTimezone: true }).notNull().defaultNow(),
    ip: inet('ip'),
    createdAt: createdAt(),
  },
  (t) => [index('signatures_entity_idx').on(t.entity, t.entityId)],
);
