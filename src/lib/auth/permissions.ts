/**
 * Catálogo de permisos y matriz de roles.
 *
 * ⚠️ SEMILLA, NO FUENTE DE VERDAD.
 *
 * Este archivo se carga en `permissions` y `role_permissions` al inicializar la
 * base de datos (Fase 2). A partir de ahí la fuente de verdad es la tabla: un
 * administrador ajusta permisos sin desplegar código.
 *
 * Se mantiene aquí para que el seed sea reproducible y para que el tipo
 * `Permission` exista en tiempo de compilación.
 *
 * Documentación: `docs/05-roles-y-permisos.md`
 */

export const PERMISSIONS = [
  // Alcance — decide SOBRE QUÉ empresas y sedes trabaja el usuario.
  'scope:all_corporate_clients',
  'scope:all_branches',

  // Órdenes de servicio
  'orders:read',
  'orders:create',
  'orders:assign',
  'orders:advance',
  'orders:deliver',
  'orders:close',
  'orders:close_empty',
  'orders:cancel',

  // Recepción y checklist
  'receptions:read',
  'receptions:write',

  // Diagnóstico
  'diagnostics:read',
  'diagnostics:write',

  // Evidencias
  'evidence:read',
  'evidence:upload',
  'evidence:delete',

  // Cotización
  'quotations:read',
  'quotations:read_cost',
  'quotations:write',
  'quotations:send',
  'quotations:void',

  // Autorización del cliente
  'authorizations:read',
  'authorizations:register',
  'authorizations:revoke_link',

  // Repuestos
  'parts:read',
  'parts:request',
  'parts:authorize_quote',

  // Compras
  'purchases:read',
  'purchases:quote',
  'purchases:authorize',
  'purchases:write',
  'purchases:receive',
  'purchases:override_scope',

  // Reparación
  'repairs:read',
  'repairs:execute',
  'repairs:reassign',

  // Calidad y servicios finales
  'quality:read',
  'quality:approve',
  'washing:execute',
  'alignment:execute',

  // Personas y vehículos
  'customers:read',
  'customers:write',
  'customers:read_pii',
  'vehicles:search',
  'vehicles:read',
  'vehicles:write',

  // Tableros y analítica
  'dashboard:read',
  'dashboard:control_tower',
  'dashboard:read_all_clients',
  'analytics:read',
  'analytics:technician',

  // Satisfacción
  'surveys:create',
  'surveys:read',
  'surveys:read_comments',
  'surveys:void',
  'followups:read',
  'followups:write',

  // Informes
  'reports:generate',
  'reports:read',

  // Administración
  'corporate_clients:manage',
  'branches:manage',
  'advisors:manage',
  'suppliers:manage',
  'parts_catalog:manage',
  'checklists:manage',
  'questionnaires:manage',
  'notifications:manage',
  'users:manage',
  'roles:manage',
  'settings:manage',
  'audit:read',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const ROLES = [
  'super_admin',
  'admin',
  'asesor',
  'tecnico',
  'planchado_pintura',
  'compras',
  'calidad',
  'lavado',
  'alineamiento',
  'analista',
  'cliente_corporativo',
] as const;

export type RoleCode = (typeof ROLES)[number];

export const ROLE_LABELS: Readonly<Record<RoleCode, string>> = {
  super_admin: 'Super administrador',
  admin: 'Administrador',
  asesor: 'Asesor de servicio',
  tecnico: 'Técnico / mecánico',
  planchado_pintura: 'Planchado y pintura',
  compras: 'Compras',
  calidad: 'Control de calidad',
  lavado: 'Lavado',
  alineamiento: 'Alineamiento',
  analista: 'Analista',
  cliente_corporativo: 'Cliente corporativo',
};

/** Permisos del técnico, compartidos con planchado y pintura. */
const TECHNICIAN_PERMISSIONS = [
  'scope:all_corporate_clients',
  'orders:read',
  'receptions:read',
  'diagnostics:read',
  'diagnostics:write',
  'evidence:read',
  'evidence:upload',
  'quotations:read',
  'authorizations:read',
  'parts:read',
  'parts:request',
  'purchases:read',
  'repairs:read',
  'repairs:execute',
  'quality:read',
  'customers:read',
  'vehicles:search',
  'vehicles:read',
  'dashboard:read',
  'analytics:technician',
] as const satisfies readonly Permission[];

export const ROLE_PERMISSIONS: Readonly<Record<RoleCode, readonly Permission[]>> = {
  super_admin: PERMISSIONS,

  // Todo menos gestionar roles: cambiar la matriz de permisos es del super.
  admin: PERMISSIONS.filter((p) => p !== 'roles:manage'),

  asesor: [
    'scope:all_corporate_clients',
    'orders:read',
    'orders:create',
    'orders:assign',
    'orders:advance',
    'orders:deliver',
    'orders:close',
    'orders:close_empty',
    'orders:cancel',
    'receptions:read',
    'receptions:write',
    'diagnostics:read',
    'evidence:read',
    'evidence:upload',
    'quotations:read',
    'quotations:read_cost',
    'quotations:write',
    'quotations:send',
    'quotations:void',
    'authorizations:read',
    'authorizations:register',
    'authorizations:revoke_link',
    'parts:read',
    'parts:authorize_quote',
    'purchases:read',
    'purchases:authorize',
    'repairs:read',
    'repairs:reassign',
    'quality:read',
    'customers:read',
    'customers:write',
    'customers:read_pii',
    'vehicles:search',
    'vehicles:read',
    'vehicles:write',
    'dashboard:read',
    'dashboard:control_tower',
    'analytics:read',
    'analytics:technician',
    'surveys:create',
    'surveys:read',
    'surveys:read_comments',
    'followups:read',
    'followups:write',
    'reports:generate',
    'reports:read',
  ],

  tecnico: TECHNICIAN_PERMISSIONS,
  planchado_pintura: TECHNICIAN_PERMISSIONS,

  // Compras cotiza, compra y recibe, pero NO autoriza su propio gasto.
  // Separación de funciones: es la única defensa real contra el fraude
  // de compras en un taller. Ver docs/05-roles-y-permisos.md §5.3.
  compras: [
    'scope:all_corporate_clients',
    'scope:all_branches',
    'orders:read',
    'diagnostics:read',
    'evidence:read',
    'evidence:upload',
    'quotations:read',
    'quotations:read_cost',
    'parts:read',
    'purchases:read',
    'purchases:quote',
    'purchases:write',
    'purchases:receive',
    'vehicles:search',
    'vehicles:read',
    'dashboard:read',
    'dashboard:control_tower',
    'analytics:read',
    'reports:generate',
    'reports:read',
    'suppliers:manage',
    'parts_catalog:manage',
  ],

  calidad: [
    'scope:all_corporate_clients',
    'orders:read',
    'orders:advance',
    'receptions:read',
    'diagnostics:read',
    'evidence:read',
    'evidence:upload',
    'quotations:read',
    'repairs:read',
    'quality:read',
    'quality:approve',
    'customers:read',
    'vehicles:search',
    'vehicles:read',
    'dashboard:read',
    'dashboard:control_tower',
  ],

  lavado: [
    'scope:all_corporate_clients',
    'orders:read',
    'evidence:upload',
    'washing:execute',
    'vehicles:search',
    'vehicles:read',
    'dashboard:read',
  ],

  alineamiento: [
    'scope:all_corporate_clients',
    'orders:read',
    'evidence:upload',
    'alignment:execute',
    'vehicles:search',
    'vehicles:read',
    'dashboard:read',
  ],

  analista: [
    'scope:all_corporate_clients',
    'scope:all_branches',
    'orders:read',
    'receptions:read',
    'diagnostics:read',
    'evidence:read',
    'quotations:read',
    'quotations:read_cost',
    'authorizations:read',
    'parts:read',
    'purchases:read',
    'repairs:read',
    'quality:read',
    'customers:read',
    'vehicles:search',
    'vehicles:read',
    'dashboard:read',
    'dashboard:control_tower',
    'dashboard:read_all_clients',
    'analytics:read',
    'analytics:technician',
    'surveys:read',
    'surveys:read_comments',
    'followups:read',
    'reports:generate',
    'reports:read',
  ],

  // Externo. SIN `scope:all_corporate_clients`: RLS lo limita a las empresas
  // de `user_corporate_clients`. Y sin `quotations:read_cost`, porque §65
  // prohíbe mostrarle costos internos y márgenes.
  cliente_corporativo: [
    'orders:read',
    'receptions:read',
    'diagnostics:read',
    'evidence:read',
    'quotations:read',
    'authorizations:read',
    'repairs:read',
    'quality:read',
    'customers:read',
    'vehicles:search',
    'vehicles:read',
    'dashboard:read',
    'analytics:read',
    'surveys:read',
    'surveys:read_comments',
    'followups:read',
    'reports:generate',
    'reports:read',
  ],
};

const PERMISSION_SET: ReadonlySet<string> = new Set(PERMISSIONS);

export function isPermission(value: string): value is Permission {
  return PERMISSION_SET.has(value);
}

/**
 * Comprobación en memoria contra los permisos efectivos ya resueltos.
 *
 * No sustituye a RLS: es la primera defensa, no la definitiva. La base de datos
 * vuelve a comprobarlo en cada consulta.
 */
export function hasPermission(
  granted: Iterable<Permission>,
  required: Permission,
): boolean {
  for (const permission of granted) {
    if (permission === required) return true;
  }
  return false;
}

export function permissionsForRole(role: RoleCode): readonly Permission[] {
  return ROLE_PERMISSIONS[role];
}
