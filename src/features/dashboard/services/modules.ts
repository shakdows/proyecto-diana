/**
 * Los módulos del tablero del administrador.
 *
 * El tablero no supervisa: ABRE. Quien entra aquí ya sabe a dónde va, y lo
 * único que necesita es llegar en un clic. Por eso no hay cifras, ni avisos,
 * ni distintivos —eso vive en `/tablero/operacion` y dentro de cada módulo—.
 *
 * Cada entrada apunta a una fotografía que YA trae el icono, el nombre y la
 * flecha dibujados dentro. La pantalla no los repite en HTML: la fotografía
 * entera es el botón.
 *
 * Dominio PURO: sin Next.js, sin componentes.
 */

import type { Permission } from '@/lib/auth/permissions';

export interface AdminModule {
  readonly id: string;
  /** Solo para el nombre accesible del enlace: el visible va en la imagen. */
  readonly label: string;
  readonly href: string;
  readonly permission: Permission;
  /**
   * Cuánto ocupa en la rejilla de doce columnas.
   *
   * Cuatro arriba y tres abajo, como la referencia. No es decoración: con
   * siete módulos, cualquier reparto uniforme deja una tarjeta huérfana en la
   * última fila, y una tarjeta sola a un cuarto de ancho se lee como un error.
   */
  readonly span: 3 | 4;
}

/**
 * En el orden del recorrido del vehículo, no alfabético: entra, se abre la
 * orden, se identifica al cliente, se repara. Después lo que sostiene al
 * taller —compras, informes, configuración—.
 */
export const ADMIN_MODULES: readonly AdminModule[] = [
  { id: 'recepcion', label: 'Recepción', href: '/recepcion', permission: 'receptions:read', span: 3 },
  { id: 'ordenes', label: 'Órdenes', href: '/ordenes', permission: 'orders:read', span: 3 },
  { id: 'clientes', label: 'Clientes', href: '/clientes', permission: 'customers:read', span: 3 },
  { id: 'taller', label: 'Taller', href: '/taller', permission: 'repairs:read', span: 3 },
  { id: 'compras', label: 'Compras', href: '/compras', permission: 'purchases:read', span: 4 },
  { id: 'reportes', label: 'Reportes', href: '/informes', permission: 'reports:read', span: 4 },
  { id: 'configuracion', label: 'Configuración', href: '/admin', permission: 'settings:manage', span: 4 },
];

/** La fotografía de un módulo. El identificador ES el nombre del archivo. */
export function moduleImage(id: string): string {
  return `/assets/admin/${id}.webp`;
}

/**
 * Los que este usuario puede abrir.
 *
 * Filtra por permiso, no por rol, y no está aquí por seguridad: ocultar una
 * tarjeta no protege nada. Está para no ofrecer una puerta cerrada, que es lo
 * que enseña a desconfiar de las que sí funcionan. La frontera real es RLS en
 * la base de datos (docs/05-roles-y-permisos.md §5.3).
 */
export function visibleModules(
  modules: readonly AdminModule[],
  granted: readonly Permission[],
): readonly AdminModule[] {
  const set = new Set(granted);
  return modules.filter((m) => set.has(m.permission));
}
