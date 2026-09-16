import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { connect } from '../db/client';
import { ROLES, type RoleCode } from '../src/lib/auth/permissions';

/**
 * Da de alta a una persona: cuenta de acceso + ficha en `profiles`.
 *
 *   npm run db:user -- correo@romeromotors.com "Andrea López" asesor [CLAVE]
 *
 * ── Por qué son DOS cosas y no una ─────────────────────────────────────────
 *
 * La cuenta de Supabase Auth dice QUIÉN eres; la fila de `profiles` dice QUÉ
 * puedes hacer. Están separadas a propósito: dar de baja a alguien es marcar
 * su perfil como inactivo —queda el rastro de lo que hizo— y no borrar la
 * cuenta, que se llevaría por delante la integridad del historial.
 *
 * Si falta el perfil, la aplicación NO cae al modo demostración: enseña la
 * sesión sin ningún permiso. Es lo que de verdad puede hacer esa cuenta, y
 * RLS le negaría todo de todas formas.
 *
 * ── Qué hace falta para ejecutarlo ─────────────────────────────────────────
 *
 * · `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY` para crear la
 *   cuenta (la API de administración es la única forma soportada, y exige la
 *   clave de servicio).
 * · `DATABASE_URL` para escribir el perfil.
 *
 * La clave de servicio IGNORA RLS. Vive aquí, en un script que se ejecuta a
 * mano, y no puede aparecer en ningún módulo que el runtime importe.
 */

function salir(mensaje: string): never {
  process.stderr.write(`\n✗ ${mensaje}\n\n`);
  process.stderr.write(
    'Uso: npm run db:user -- <correo> "<nombre completo>" <rol> [contraseña]\n' +
      `Roles: ${ROLES.join(', ')}\n\n`,
  );
  process.exit(1);
}

/** Contraseña temporal legible: se dicta por teléfono y se cambia al entrar. */
function claveTemporal(): string {
  const letras = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // sin I ni O: se confunden con 1 y 0
  const numeros = '23456789';
  const parte = (fuente: string, n: number): string =>
    Array.from({ length: n }, () => fuente[Math.floor(Math.random() * fuente.length)]).join('');
  return `Diana-${parte(letras, 4)}-${parte(numeros, 4)}`;
}

function isRole(value: string): value is RoleCode {
  return (ROLES as readonly string[]).includes(value);
}

async function main(): Promise<void> {
  const [email, fullName, role, clave] = process.argv.slice(2);

  if (email === undefined || !email.includes('@')) salir('Falta el correo, o no parece un correo.');
  if (fullName === undefined || fullName.trim() === '') salir('Falta el nombre completo.');
  if (role === undefined || !isRole(role)) salir(`Rol desconocido: «${role ?? ''}».`);

  const url = process.env['NEXT_PUBLIC_SUPABASE_URL'];
  const serviceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];
  if (url === undefined || serviceKey === undefined) {
    salir('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el entorno.');
  }

  const password = clave ?? claveTemporal();
  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  /* `email_confirm: true`: el taller no tiene servidor de correo montado, y
     una cuenta que espera un enlace de confirmación que nunca llega es una
     cuenta que no sirve. */
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error !== null) salir(`Supabase rechazó la cuenta: ${error.message}`);

  const uid = data.user?.id;
  if (uid === undefined) salir('Supabase no devolvió el identificador de la cuenta.');

  const sql = connect();
  try {
    const filas = await sql<{ id: string }[]>`
      insert into profiles (id, role_id, branch_id, full_name, email, is_active)
      select ${uid}::uuid, r.id, b.id, ${fullName.trim()}, ${email}, true
      from roles r
      left join branches b on b.code = 'LIMA-01'
      where r.code = ${role}
      on conflict (id) do update
        set role_id = excluded.role_id, full_name = excluded.full_name,
            email = excluded.email, is_active = true, updated_at = now()
      returning id
    `;
    if (filas.length === 0) {
      salir(`El rol «${role}» no está en la tabla. ¿Sembraste el catálogo? (npm run db:seed:catalog)`);
    }
  } finally {
    await sql.end();
  }

  process.stdout.write(
    `\n✓ ${fullName.trim()} · ${role}\n` +
      `  correo      ${email}\n` +
      `  contraseña  ${password}\n\n` +
      '  Es temporal: dísela en persona o por teléfono, nunca por el mismo\n' +
      '  canal por el que mandas el enlace, y que la cambie al entrar.\n\n',
  );
}

main().catch((error: unknown) => {
  process.stderr.write(`\n✗ Falló el alta:\n${String(error)}\n`);
  process.exitCode = 1;
});
