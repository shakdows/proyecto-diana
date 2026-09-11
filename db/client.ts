import 'dotenv/config';
import postgres from 'postgres';

/**
 * Conexión directa a PostgreSQL.
 *
 * ⚠️ SOLO para `scripts/` y `db/`: migraciones, seeds y pruebas.
 *
 * La aplicación NO usa esto en runtime: consulta por `@supabase/ssr`, para que
 * cada consulta viaje con el JWT del usuario y quede sujeta a RLS. Esta
 * conexión entra como propietario y se salta las políticas, que es justo lo
 * que no debe ocurrir nunca desde una petición de usuario.
 */
export function connect(url = process.env['DATABASE_URL']): postgres.Sql {
  if (url === undefined || url === '') {
    throw new Error(
      'Falta DATABASE_URL. Cópiala de .env.example a .env.local, o exporta la variable.',
    );
  }
  return postgres(url, { max: 1, onnotice: () => {} });
}
