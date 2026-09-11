import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

/**
 * Drizzle es la fuente de verdad del ESQUEMA: genera migraciones SQL
 * versionadas que se revisan en el pull request y se aplican en CI.
 *
 * El acceso a datos en runtime NO pasa por aquí: va por `@supabase/ssr`, para
 * que cada consulta viaje con el JWT del usuario y quede sujeta a RLS.
 */
export default defineConfig({
  schema: './db/schema/index.ts',
  out: './db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  // Solo se gestiona el esquema de la aplicación: `auth` y `storage`
  // pertenecen a Supabase y no deben migrarse desde aquí.
  schemaFilter: ['public'],
  verbose: true,
  strict: true,
});
