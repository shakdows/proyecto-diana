import type { Permission, RoleCode } from './permissions';

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
  /**
   * Cómo se llama la pantalla para ciertos puestos.
   *
   * No es cosmética: para el jefe de taller `/taller` es «el taller», una
   * sección que supervisa; para el técnico es SU lista de trabajos del día, y
   * llamarla «Taller» le hace buscar dentro lo que ya es todo el contenido.
   * La ruta y el permiso no cambian.
   */
  readonly labelByRole?: Partial<Readonly<Record<RoleCode, string>>>;
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
      {
        href: '/taller',
        label: 'Taller',
        icon: 'taller',
        permission: 'repairs:read',
        phase: 12,
        labelByRole: { tecnico: 'Mi jornada', planchado_pintura: 'Mi jornada' },
      },
      /* Lavado y alineamiento solo los ve quien los ejecuta: su permiso es
         `:execute`, que el asesor no tiene. Por eso no ensucian su menú y a la
         vez el operario de lavado no se queda sin ninguna entrada. */
      { href: '/lavado', label: 'Lavado', icon: 'lavado', permission: 'washing:execute', phase: 13 },
      { href: '/alineamiento', label: 'Alineamiento', icon: 'alineamiento', permission: 'alignment:execute', phase: 13 },
      { href: '/compras', label: 'Compras', icon: 'compras', permission: 'purchases:read', phase: 11 },
      { href: '/clientes', label: 'Clientes', icon: 'clientes', permission: 'customers:read', phase: 4 },
      { href: '/encuestas', label: 'Encuestas', icon: 'encuestas', permission: 'surveys:read', phase: 15 },
      { href: '/informes', label: 'Informes', icon: 'informes', permission: 'reports:read', phase: 16 },
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

/**
 * Filtra el menú por los permisos efectivos del usuario.
 *
 * `role` solo cambia CÓMO se llama una entrada, nunca cuáles se ven: quien
 * decide eso son los permisos, y por debajo RLS. Es opcional porque `/` llama
 * a esto sin saber el rol.
 */
export function visibleNavigation(
  granted: readonly Permission[],
  role?: RoleCode,
): readonly NavGroup[] {
  const set = new Set<Permission>(granted);
  return NAVIGATION.map((group) => ({
    label: group.label,
    items: group.items
      .filter((item) => set.has(item.permission))
      .map((item) => {
        const alias = role === undefined ? undefined : item.labelByRole?.[role];
        return alias === undefined ? item : { ...item, label: alias };
      }),
  })).filter((group) => group.items.length > 0);
}

/**
 * Pantalla de entrada declarada para cada puesto.
 *
 * No se deduce del menú: el operario de calidad trabaja en `/calidad` y el
 * analista en `/panel`, y ninguna de las dos está en el menú base —la de
 * calidad la abre el asesor desde la orden, y el panel desde Reportes—.
 * Deducirla del primer elemento visible mandaba al de calidad al tablero,
 * que no es su trabajo.
 */
const HOME_BY_ROLE: Readonly<Record<RoleCode, string>> = {
  super_admin: '/tablero',
  admin: '/tablero',
  /* El asesor NO aterriza en el tablero. No dirige el taller: recibe
     vehículos y atiende clientes, y nueve indicadores entre él y el botón que
     necesita son nueve cosas que leer para nada. El tablero sigue a un clic. */
  asesor: '/inicio',
  tecnico: '/taller',
  planchado_pintura: '/taller',
  compras: '/compras',
  calidad: '/calidad',
  lavado: '/lavado',
  alineamiento: '/alineamiento',
  analista: '/panel',
  cliente_corporativo: '/ordenes',
};

export function homeRouteForRole(role: RoleCode): string {
  return HOME_BY_ROLE[role];
}

/**
 * Respaldo cuando solo se conocen los permisos: la primera pantalla que el
 * usuario puede ver. Sigue existiendo porque `/` lo usa sin saber el rol.
 */
export function homeRouteFor(granted: readonly Permission[]): string {
  const groups = visibleNavigation(granted);
  return groups[0]?.items[0]?.href ?? '/sin-acceso';
}
