import { cookies } from 'next/headers';
import { ROLE_PERMISSIONS, type Permission, type RoleCode } from './permissions';

/**
 * ⚠️ FASE 1 — SESIÓN DE DEMOSTRACIÓN.
 *
 * La autenticación real (Supabase Auth, `profiles`, `role_permissions`,
 * `user_corporate_clients`) es la FASE 3. Hasta entonces el rol se elige en la
 * pantalla de entrada y se guarda en una cookie, para poder recorrer el
 * sistema con los ojos de cada puesto.
 *
 * ESTO NO ES SEGURIDAD Y NO PRETENDE SERLO. Cualquiera puede editar la cookie
 * desde el navegador y escribir `admin`. Da igual: no hay datos reales
 * detrás, y en la Fase 3 la frontera pasa a ser RLS en la base de datos, que
 * decide qué filas existen para cada usuario a partir del JWT —no de lo que
 * diga el cliente—. Ocultar botones nunca fue control de acceso
 * (docs/05-roles-y-permisos.md §5.3).
 *
 * La Fase 3 sustituye el cuerpo de `getSessionUser()` sin cambiar su firma.
 */

export const DEMO_ROLE_COOKIE = 'diana_demo_role';

export interface SessionUser {
  readonly profileId: string;
  readonly fullName: string;
  readonly role: RoleCode;
  readonly permissions: readonly Permission[];
  /** Vacío + `scope:all_corporate_clients` = alcance total. */
  readonly corporateClientIds: readonly string[];
  readonly isDemo: true;
}

/** Quién es cada rol en la demostración. Nombres, no «Usuario 1». */
const DEMO_PEOPLE: Readonly<Record<RoleCode, string>> = {
  super_admin: 'Andrea López',
  admin: 'Ricardo Salazar',
  asesor: 'Andrea López',
  tecnico: 'Carlos Mendoza',
  planchado_pintura: 'Luis Ramírez',
  compras: 'Patricia Vega',
  calidad: 'Rosa Huamán',
  lavado: 'Miguel Ccahuana',
  alineamiento: 'Miguel Ccahuana',
  analista: 'Diego Salas',
  cliente_corporativo: 'Juan Pérez',
};

const DEFAULT_ROLE: RoleCode = 'asesor';

function isRoleCode(value: string): value is RoleCode {
  return Object.hasOwn(ROLE_PERMISSIONS, value);
}

export function roleFromCookieValue(value: string | undefined): RoleCode {
  if (value !== undefined && isRoleCode(value)) return value;
  return DEFAULT_ROLE;
}

export function userForRole(role: RoleCode): SessionUser {
  return {
    profileId: `demo-${role}`,
    fullName: DEMO_PEOPLE[role],
    role,
    permissions: ROLE_PERMISSIONS[role],
    corporateClientIds: [],
    isDemo: true,
  };
}

export async function getSessionUser(): Promise<SessionUser> {
  const store = await cookies();
  return userForRole(roleFromCookieValue(store.get(DEMO_ROLE_COOKIE)?.value));
}
