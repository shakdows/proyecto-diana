import { cookies } from 'next/headers';
import { createClient, supabaseConfigured } from '@/lib/supabase/server';
import {
  ROLE_PERMISSIONS,
  isPermission,
  type Permission,
  type RoleCode,
} from './permissions';
import { DEMO_PEOPLE, demoProfileId } from './demo-people';

/**
 * Quién está usando el sistema.
 *
 * ── Dos caminos, y el orden importa ────────────────────────────────────────
 *
 * 1. Si hay SESIÓN REAL de Supabase, el usuario sale de la base: su fila en
 *    `profiles`, su rol y los permisos que ese rol tiene en
 *    `role_permissions`. Esa es la única fuente que cuenta, porque es la
 *    misma que lee RLS. Lo que devuelva esta función sirve para PINTAR la
 *    interfaz; lo que se puede leer y escribir de verdad lo decide la base.
 *
 * 2. Si Supabase no está configurado —o no hay sesión—, se cae al modo
 *    demostración: el rol se elige en la pantalla de entrada y vive en una
 *    cookie.
 *
 * Esa caída es deliberada y tiene fecha de caducidad. Mientras las variables
 * de entorno no estén puestas, la aplicación sigue siendo recorrible en vez
 * de quedarse en blanco; en cuanto lo estén, la puerta es la de verdad. Lo
 * que NO hace es mezclar: con sesión real nunca se leen los permisos de la
 * cookie.
 *
 * ⚠️ El modo demostración NO ES SEGURIDAD: la cookie se edita desde el
 * navegador en diez segundos. No hace falta que lo sea, porque detrás no hay
 * datos reales —con Supabase configurado, RLS deniega todo a quien no tenga
 * sesión, diga lo que diga la cookie—.
 */

export const DEMO_ROLE_COOKIE = 'diana_demo_role';

export interface SessionUser {
  readonly profileId: string;
  readonly fullName: string;
  readonly role: RoleCode;
  readonly permissions: readonly Permission[];
  /** Vacío + `scope:all_corporate_clients` = alcance total. */
  readonly corporateClientIds: readonly string[];
  /** `true` mientras se entra eligiendo puesto en vez de con credenciales. */
  readonly isDemo: boolean;
  readonly email: string | null;
}

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
    profileId: demoProfileId(role),
    fullName: DEMO_PEOPLE[role],
    role,
    permissions: ROLE_PERMISSIONS[role],
    corporateClientIds: [],
    isDemo: true,
    email: null,
  };
}

/**
 * La fila que devuelve la consulta del perfil.
 *
 * Se declara a mano porque Supabase tipa los `select` anidados como
 * `unknown` sin los tipos generados del esquema, y prefiero una forma
 * explícita que un `any` disfrazado.
 */
interface ProfileRow {
  readonly id: string;
  readonly full_name: string;
  readonly email: string | null;
  readonly roles: { readonly code: string } | null;
}

export async function getSessionUser(): Promise<SessionUser> {
  const store = await cookies();
  const demo = (): SessionUser =>
    userForRole(roleFromCookieValue(store.get(DEMO_ROLE_COOKIE)?.value));

  if (!supabaseConfigured()) return demo();

  const supabase = await createClient();
  if (supabase === null) return demo();

  /*
   * `getUser()`, no `getSession()`: el segundo se cree la cookie; el primero
   * la verifica contra Supabase. Quien decide quién eres no puede ser un dato
   * que el navegador escribe.
   */
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (uid === undefined) return demo();

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email, roles(code)')
    .eq('id', uid)
    .is('deleted_at', null)
    .eq('is_active', true)
    .maybeSingle<ProfileRow>();

  /*
   * Hay sesión pero no perfil: alguien creó la cuenta en Supabase Auth y no
   * le dio de alta la ficha. NO se cae a la demostración —eso le daría
   * permisos de asesor a una cuenta sin perfil—: se devuelve un usuario sin
   * ningún permiso, que es lo que de verdad puede hacer. RLS ya le negaría
   * todo de todas formas; esto hace que la interfaz cuente la misma historia.
   */
  if (profile === null) {
    return {
      profileId: uid,
      fullName: auth.user?.email ?? 'Cuenta sin perfil',
      role: DEFAULT_ROLE,
      permissions: [],
      corporateClientIds: [],
      isDemo: false,
      email: auth.user?.email ?? null,
    };
  }

  const code = profile.roles?.code ?? '';
  const role: RoleCode = isRoleCode(code) ? code : DEFAULT_ROLE;

  /*
   * Los permisos se leen de la BASE, no de `ROLE_PERMISSIONS`. La matriz del
   * código sembró la tabla, pero a partir de ahí un administrador puede
   * cambiarla sin desplegar: si la interfaz siguiera leyendo la constante,
   * enseñaría permisos que la base ya no concede —o escondería los que sí—.
   */
  const { data: rows } = await supabase
    .from('role_permissions')
    .select('roles!inner(code), permissions!inner(code)')
    .eq('roles.code', code);

  const permissions = readPermissions(rows);

  const { data: scopes } = await supabase
    .from('user_corporate_clients')
    .select('corporate_client_id')
    .eq('profile_id', uid);

  return {
    profileId: profile.id,
    fullName: profile.full_name,
    role,
    /* Si la tabla no devolvió nada, se cae a la matriz del código: un fallo
       de lectura no puede dejar al usuario sin interfaz. RLS sigue mandando. */
    permissions: permissions.length > 0 ? permissions : ROLE_PERMISSIONS[role],
    corporateClientIds: readScopes(scopes),
    isDemo: false,
    email: profile.email,
  };
}

function readPermissions(rows: unknown): readonly Permission[] {
  if (!Array.isArray(rows)) return [];
  const out: Permission[] = [];
  for (const row of rows) {
    if (typeof row !== 'object' || row === null) continue;
    const p = (row as { permissions?: { code?: unknown } }).permissions;
    const code = p?.code;
    if (typeof code === 'string' && isPermission(code)) out.push(code);
  }
  return out;
}

function readScopes(rows: unknown): readonly string[] {
  if (!Array.isArray(rows)) return [];
  const out: string[] = [];
  for (const row of rows) {
    if (typeof row !== 'object' || row === null) continue;
    const id = (row as { corporate_client_id?: unknown }).corporate_client_id;
    if (typeof id === 'string') out.push(id);
  }
  return out;
}
