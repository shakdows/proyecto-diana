import { ROLE_PERMISSIONS, type Permission, type RoleCode } from './permissions';

/**
 * ⚠️ FASE 1 — SESIÓN SIMULADA.
 *
 * La autenticación real (Supabase Auth, `profiles`, `role_permissions`,
 * `user_corporate_clients`) es la FASE 3. Hasta entonces esta función devuelve
 * un usuario fijo para que la navegación sea recorrible y los permisos del
 * menú se puedan comprobar de verdad.
 *
 * La Fase 3 sustituye el cuerpo de `getSessionUser()` sin cambiar su firma:
 * todo lo que la consume —menú, páginas, `availableActions`— seguirá igual.
 *
 * NO se usa en ninguna decisión de seguridad real: en la Fase 3 la frontera
 * pasa a ser RLS, y `requireSessionUser()` / `assertPermission()` se apoyan en
 * el JWT, no en esto.
 */

export interface SessionUser {
  readonly profileId: string;
  readonly fullName: string;
  readonly role: RoleCode;
  readonly permissions: readonly Permission[];
  /** Vacío + `scope:all_corporate_clients` = alcance total. */
  readonly corporateClientIds: readonly string[];
  readonly isDemo: true;
}

const DEMO_ROLE: RoleCode = 'asesor';

export function getSessionUser(): SessionUser {
  return {
    profileId: 'demo-asesor',
    fullName: 'Andrea López',
    role: DEMO_ROLE,
    permissions: ROLE_PERMISSIONS[DEMO_ROLE],
    corporateClientIds: [],
    isDemo: true,
  };
}
