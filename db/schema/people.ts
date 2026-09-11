import { sql } from 'drizzle-orm';
import { boolean, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { auditColumns, citext, id } from './_shared';
import { documentTypeEnum } from './enums';
import { branches, corporateClients, profiles } from './core';

/**
 * Personas y vehículos.
 *
 * El documento de identidad se guarda en TRES formas (docs/04 §4.9):
 *  · `document_number` — completo, con REVOKE SELECT a `authenticated`
 *  · `document_last3`  — columna generada, es lo que ve la interfaz
 *  · `document_hash`   — HMAC-SHA256, permite buscar por DNI sin leer el DNI
 */
export const customers = pgTable(
  'customers',
  {
    id: id(),
    corporateClientId: uuid('corporate_client_id').references(() => corporateClients.id, {
      onDelete: 'restrict',
    }),
    documentType: documentTypeEnum('document_type').notNull(),
    /** Acceso restringido: ver `reveal_document_number()`. */
    documentNumber: text('document_number').notNull(),
    /** Columna GENERADA: los últimos tres caracteres. Lo único que ve la interfaz. */
    documentLast3: text('document_last3').generatedAlwaysAs(
      sql`right(document_number, 3)`,
    ),
    /** HMAC-SHA256 con DOCUMENT_HASH_SECRET. Lo calcula la aplicación. */
    documentHash: text('document_hash').notNull(),
    firstName: text('first_name'),
    lastName: text('last_name'),
    /** Razón social cuando el documento es RUC. */
    businessName: text('business_name'),
    email: citext('email'),
    phone: text('phone'),
    contactName: text('contact_name'),
    isDemo: boolean('is_demo').notNull().default(false),
    ...auditColumns(),
  },
  (t) => [
    uniqueIndex('customers_document_key').on(t.documentType, t.documentNumber),
    index('customers_document_hash_idx').on(t.documentHash),
    index('customers_phone_idx').on(t.phone),
    index('customers_corporate_idx').on(t.corporateClientId),
  ],
);

export const vehicles = pgTable(
  'vehicles',
  {
    id: id(),
    corporateClientId: uuid('corporate_client_id').references(() => corporateClients.id, {
      onDelete: 'restrict',
    }),
    primaryCustomerId: uuid('primary_customer_id').references(() => customers.id, {
      onDelete: 'restrict',
    }),
    /** Normalizada: mayúsculas, sin guiones ni espacios. Índice único. */
    plate: citext('plate').notNull(),
    brand: text('brand').notNull(),
    model: text('model').notNull(),
    version: text('version'),
    modelYear: integer('model_year'),
    color: text('color'),
    vin: citext('vin'),
    engineNumber: text('engine_number'),
    vehicleType: text('vehicle_type'),
    lastMileage: integer('last_mileage'),
    lastServiceAt: timestamp('last_service_at', { withTimezone: true }),
    isDemo: boolean('is_demo').notNull().default(false),
    ...auditColumns(),
  },
  (t) => [
    index('vehicles_vin_idx').on(t.vin),
    index('vehicles_customer_idx').on(t.primaryCustomerId),
    index('vehicles_corporate_idx').on(t.corporateClientId),
  ],
);

/**
 * Asesores históricos sin usuario del sistema.
 *
 * En la especificación de satisfacción el asesor era un dato de catálogo; aquí
 * opera el sistema y es un `profiles`. Esta tabla conserva los históricos.
 */
export const serviceAdvisors = pgTable(
  'service_advisors',
  {
    id: id(),
    branchId: uuid('branch_id').references(() => branches.id, { onDelete: 'restrict' }),
    profileId: uuid('profile_id').references(() => profiles.id, { onDelete: 'set null' }),
    fullName: text('full_name').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    isDemo: boolean('is_demo').notNull().default(false),
    ...auditColumns(),
  },
  (t) => [index('service_advisors_branch_idx').on(t.branchId)],
);
