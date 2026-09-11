import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { auditColumns, citext, createdAt, id, inet, updatedAt } from './_shared';
import { actorKindEnum, settingScopeEnum, technicianSpecialtyEnum } from './enums';

/**
 * Núcleo: identidad, multiempresa, configuración y auditoría.
 *
 * `user_corporate_clients` es el eje del aislamiento: todas las políticas RLS
 * la consultan. Ver docs/04-modelo-de-datos.md §4.11.
 */

/**
 * `auth.users` la gestiona Supabase y NO se declara aquí.
 *
 * Declararla en Drizzle hacía que la migración generada emitiera
 * `CREATE TABLE "auth"."users"`, que en Supabase falla porque la tabla ya
 * existe. La clave foránea `profiles.id → auth.users.id` se añade en la
 * migración 0002, escrita a mano, que es donde vive todo lo que pertenece a
 * la plataforma y no al esquema de la aplicación.
 */

export const roles = pgTable('roles', {
  id: id(),
  code: citext('code').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  /** Impide borrar los roles base del sistema. */
  isSystem: boolean('is_system').notNull().default(false),
  ...auditColumns(),
});

export const permissions = pgTable('permissions', {
  id: id(),
  /** Formato `recurso:acción`. */
  code: citext('code').notNull().unique(),
  resource: text('resource').notNull(),
  action: text('action').notNull(),
  description: text('description'),
  createdAt: createdAt(),
});

/** Fuente de verdad de los permisos en runtime. */
export const rolePermissions = pgTable(
  'role_permissions',
  {
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    permissionId: uuid('permission_id')
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.roleId, t.permissionId] }),
    index('role_permissions_permission_idx').on(t.permissionId),
  ],
);

export const corporateClients = pgTable(
  'corporate_clients',
  {
    id: id(),
    code: citext('code').notNull(),
    name: text('name').notNull(),
    legalName: text('legal_name'),
    taxId: text('tax_id'),
    /** Ruta en Storage, para la portada del informe corporativo. */
    logoPath: text('logo_path'),
    brandColor: text('brand_color'),
    isActive: boolean('is_active').notNull().default(true),
    isDemo: boolean('is_demo').notNull().default(false),
    ...auditColumns(),
  },
  (t) => [uniqueIndex('corporate_clients_code_key').on(t.code)],
);

export const branches = pgTable(
  'branches',
  {
    id: id(),
    /** Nullable: una sede propia no pertenece a un cliente corporativo. */
    corporateClientId: uuid('corporate_client_id').references(() => corporateClients.id, {
      onDelete: 'restrict',
    }),
    code: citext('code').notNull(),
    name: text('name').notNull(),
    city: text('city'),
    address: text('address'),
    /** El servidor corre en UTC; el taller no. Ver docs/16 §16.5. */
    timezone: text('timezone').notNull().default('America/Lima'),
    isActive: boolean('is_active').notNull().default(true),
    isDemo: boolean('is_demo').notNull().default(false),
    ...auditColumns(),
  },
  (t) => [uniqueIndex('branches_code_key').on(t.code)],
);

/** Bahías o espacios de trabajo (§14). */
export const bays = pgTable(
  'bays',
  {
    id: id(),
    branchId: uuid('branch_id')
      .notNull()
      .references(() => branches.id, { onDelete: 'cascade' }),
    code: citext('code').notNull(),
    name: text('name').notNull(),
    type: text('type'),
    isActive: boolean('is_active').notNull().default(true),
    ...auditColumns(),
  },
  (t) => [uniqueIndex('bays_branch_code_key').on(t.branchId, t.code)],
);

export const profiles = pgTable(
  'profiles',
  {
    /**
     * Mismo id que `auth.users`: la sesión y el perfil son la misma persona.
     * La FK la añade la migración 0002.
     */
    id: uuid('id').primaryKey(),
    roleId: uuid('role_id')
      .notNull()
      .references(() => roles.id, { onDelete: 'restrict' }),
    branchId: uuid('branch_id').references(() => branches.id, { onDelete: 'set null' }),
    fullName: text('full_name').notNull(),
    email: citext('email'),
    phone: text('phone'),
    documentNumber: text('document_number'),
    /** Costo/hora para los indicadores de productividad (§48). */
    hourlyRate: numeric('hourly_rate', { precision: 12, scale: 2 }),
    /** Límite de autorización de compra (§28). */
    purchaseLimit: numeric('purchase_limit', { precision: 14, scale: 2 }),
    /** `false` corta el acceso en la siguiente renovación de token. */
    isActive: boolean('is_active').notNull().default(true),
    isDemo: boolean('is_demo').notNull().default(false),
    ...auditColumns(),
  },
  (t) => [index('profiles_role_idx').on(t.roleId), index('profiles_branch_idx').on(t.branchId)],
);

/** El eje del aislamiento entre empresas. */
export const userCorporateClients = pgTable(
  'user_corporate_clients',
  {
    profileId: uuid('profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    corporateClientId: uuid('corporate_client_id')
      .notNull()
      .references(() => corporateClients.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
  },
  (t) => [
    primaryKey({ columns: [t.profileId, t.corporateClientId] }),
    index('user_corporate_clients_client_idx').on(t.corporateClientId),
  ],
);

/** Permite filtrar quién puede ejecutar una orden (§14, I-8). */
export const technicianSpecialties = pgTable(
  'technician_specialties',
  {
    profileId: uuid('profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'cascade' }),
    specialty: technicianSpecialtyEnum('specialty').notNull(),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.profileId, t.specialty] })],
);

/**
 * Configuración del negocio.
 *
 * Nombre del sistema, IGV, moneda, umbrales de satisfacción, pesos del avance
 * y tolerancias del semáforo. Las constantes del código son SEMILLAS de esta
 * tabla; la fuente de verdad es la fila.
 */
export const appSettings = pgTable(
  'app_settings',
  {
    key: citext('key').primaryKey(),
    value: jsonb('value').notNull(),
    scope: settingScopeEnum('scope').notNull().default('global'),
    corporateClientId: uuid('corporate_client_id').references(() => corporateClients.id, {
      onDelete: 'cascade',
    }),
    description: text('description'),
    updatedBy: uuid('updated_by').references(() => profiles.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index('app_settings_scope_idx').on(t.scope, t.corporateClientId)],
);

/**
 * Auditoría. Solo se inserta: sin políticas UPDATE ni DELETE, ni siquiera para
 * el super administrador (docs/13 §13.4).
 */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: id(),
    /** Nulo en acciones del portal del cliente y del sistema. */
    actorProfileId: uuid('actor_profile_id').references(() => profiles.id, {
      onDelete: 'set null',
    }),
    actorKind: actorKindEnum('actor_kind').notNull().default('usuario'),
    entity: text('entity').notNull(),
    entityId: uuid('entity_id'),
    action: text('action').notNull(),
    /** Solo los campos que cambiaron, no la fila entera. */
    before: jsonb('before'),
    after: jsonb('after'),
    reason: text('reason'),
    ip: inet('ip'),
    userAgent: text('user_agent'),
    /** Desnormalizados: permiten «todo lo ocurrido en OS-154» y aplicar RLS sin joins. */
    serviceOrderId: uuid('service_order_id'),
    corporateClientId: uuid('corporate_client_id').references(() => corporateClients.id, {
      onDelete: 'set null',
    }),
    createdAt: createdAt(),
  },
  (t) => [
    index('audit_logs_entity_idx').on(t.entity, t.entityId, t.createdAt.desc()),
    index('audit_logs_order_idx').on(t.serviceOrderId, t.createdAt.desc()),
    index('audit_logs_actor_idx').on(t.actorProfileId, t.createdAt.desc()),
  ],
);

/** Control de intentos de acceso y del portal del cliente (§66). */
export const rateLimits = pgTable(
  'rate_limits',
  {
    id: id(),
    bucket: text('bucket').notNull(),
    subject: text('subject').notNull(),
    attempts: numeric('attempts', { precision: 10, scale: 0 }).notNull().default('1'),
    windowStartedAt: timestamp('window_started_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    blockedUntil: timestamp('blocked_until', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('rate_limits_bucket_subject_key').on(t.bucket, t.subject),
    index('rate_limits_blocked_idx')
      .on(t.blockedUntil)
      .where(sql`${t.blockedUntil} is not null`),
  ],
);
