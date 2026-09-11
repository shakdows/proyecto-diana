import type { Permission } from './permissions';

/**
 * Mapa de navegación.
 *
 * Ocultar un enlace es COMODIDAD, no control de acceso: cada página vuelve a
 * comprobar el permiso, y RLS lo comprueba otra vez en la base de datos
 * (docs/05-roles-y-permisos.md §5.3).
 */

export interface NavItem {
  readonly href: string;
  readonly label: string;
  readonly icon: NavIcon;
  readonly permission: Permission;
  /** Fase que entrega la pantalla completa. */
  readonly phase: number;
}

export interface NavGroup {
  readonly label: string;
  readonly items: readonly NavItem[];
}

export const NAV_ICONS = [
  'tablero',
  'recepcion',
  'ordenes',
  'buscar',
  'taller',
  'calidad',
  'lavado',
  'alineamiento',
  'compras',
  'vehiculos',
  'clientes',
  'encuestas',
  'panel',
  'seguimiento',
  'informes',
  'admin',
  'auditoria',
] as const;

export type NavIcon = (typeof NAV_ICONS)[number];

/**
 * Navegación plana, en el orden del recorrido del vehículo.
 *
 * Sin encabezados de grupo: el menú de un rol concreto son diez o doce
 * entradas, y a esa escala los títulos de sección añaden ruido en vez de
 * estructura. La única separación es la que importa —operación arriba,
 * sistema abajo—, y se dibuja con una línea.
 *
 * «Buscar» no está: la búsqueda universal vive en la barra superior con su
 * atajo. Repetirla en el menú gastaría una fila en algo que ya está a la
 * vista y a una pulsación de teclado. La ruta sigue existiendo.
 */
export const NAVIGATION: readonly NavGroup[] = [
  {
    label: 'Operación',
    items: [
      { href: '/tablero', label: 'Tablero', icon: 'tablero', permission: 'dashboard:control_tower', phase: 14 },
      { href: '/recepcion', label: 'Recepción', icon: 'recepcion', permission: 'receptions:read', phase: 5 },
      { href: '/ordenes', label: 'Órdenes', icon: 'ordenes', permission: 'orders:read', phase: 7 },
      { href: '/taller', label: 'Taller', icon: 'taller', permission: 'repairs:read', phase: 12 },
      { href: '/calidad', label: 'Calidad', icon: 'calidad', permission: 'quality:read', phase: 13 },
      { href: '/lavado', label: 'Lavado', icon: 'lavado', permission: 'washing:execute', phase: 13 },
      { href: '/alineamiento', label: 'Alineamiento', icon: 'alineamiento', permission: 'alignment:execute', phase: 13 },
      { href: '/compras', label: 'Compras', icon: 'compras', permission: 'purchases:read', phase: 11 },
      { href: '/clientes', label: 'Clientes', icon: 'clientes', permission: 'customers:read', phase: 4 },
      { href: '/vehiculos', label: 'Vehículos', icon: 'vehiculos', permission: 'vehicles:read', phase: 4 },
      { href: '/encuestas', label: 'Encuestas', icon: 'encuestas', permission: 'surveys:read', phase: 15 },
      { href: '/panel', label: 'Panel', icon: 'panel', permission: 'dashboard:read', phase: 15 },
      { href: '/seguimiento', label: 'Seguimiento', icon: 'seguimiento', permission: 'followups:read', phase: 15 },
      { href: '/informes', label: 'Reportes', icon: 'informes', permission: 'reports:read', phase: 16 },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { href: '/admin', label: 'Configuración', icon: 'admin', permission: 'settings:manage', phase: 3 },
      { href: '/admin/auditoria', label: 'Auditoría', icon: 'auditoria', permission: 'audit:read', phase: 16 },
    ],
  },
];

/** Filtra el menú por los permisos efectivos del usuario. */
export function visibleNavigation(granted: readonly Permission[]): readonly NavGroup[] {
  const set = new Set<Permission>(granted);
  return NAVIGATION.map((group) => ({
    label: group.label,
    items: group.items.filter((item) => set.has(item.permission)),
  })).filter((group) => group.items.length > 0);
}

/** Primera pantalla tras iniciar sesión, según lo que el usuario pueda ver. */
export function homeRouteFor(granted: readonly Permission[]): string {
  const groups = visibleNavigation(granted);
  return groups[0]?.items[0]?.href ?? '/sin-acceso';
}
