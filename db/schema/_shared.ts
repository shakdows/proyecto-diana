import { customType, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * Tipos y columnas compartidas por todo el esquema.
 *
 * Convenciones (docs/04-modelo-de-datos.md):
 *  · `id uuid` con `gen_random_uuid()`
 *  · `created_at` / `updated_at` con zona horaria — el servidor corre en UTC
 *  · maestros con `deleted_at` (borrado lógico); documentos transaccionales
 *    inmutables, que se anulan con estado
 *  · importes `numeric(14,2)`, cantidades `numeric(12,3)`, nunca `float`
 */

/** Texto insensible a mayúsculas: códigos, placas, correos. */
export const citext = customType<{ data: string; driverData: string }>({
  dataType() {
    return 'citext';
  },
});

/** Dirección IP. Se registra en auditoría y autorizaciones del portal. */
export const inet = customType<{ data: string; driverData: string }>({
  dataType() {
    return 'inet';
  },
});

export const id = () => uuid('id').primaryKey().defaultRandom();

export const createdAt = () =>
  timestamp('created_at', { withTimezone: true }).notNull().defaultNow();

export const updatedAt = () => timestamp('updated_at', { withTimezone: true });

export const deletedAt = () => timestamp('deleted_at', { withTimezone: true });

/** Marcas de tiempo de un maestro con borrado lógico. */
export const auditColumns = () => ({
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  deletedAt: deletedAt(),
});
