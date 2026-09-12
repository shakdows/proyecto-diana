/**
 * El lanzador del tablero.
 *
 * Una rejilla de accesos grandes, cada uno a su módulo, con el número de
 * cosas que esperan dentro.
 *
 * ── Por qué el color NO es decorativo ───────────────────────────────────────
 *
 * Diez cuadrados de diez colores distintos son diez colores que no significan
 * nada, y el ojo deja de leerlos a los dos días. Aquí el color identifica al
 * módulo —se aprende una vez y después se llega por color, sin leer— y dos de
 * ellos además avisan:
 *
 *   azul     · el trabajo del día: recibir, atender, reparar
 *   ámbar    · abastecimiento, que depende de terceros
 *   verde    · la cartera de clientes
 *   grafito  · consulta, histórico y administración
 *   rojo     · SOLO en los dos que pueden ir mal —el centro de operaciones y
 *              las encuestas—, y solo mientras su cuenta sea mayor que cero.
 *
 * Así, una pantalla con dos cuadrados rojos se lee antes de saber leer, y el
 * resto de la rejilla no compite con ellos por la atención.
 */

import type { NavIcon } from '@/lib/auth/navigation';
import type { Permission } from '@/lib/auth/permissions';

export type LauncherTone = 'brand' | 'warn' | 'crit' | 'ok' | 'graphite';

export interface LauncherApp {
  readonly id: string;
  readonly label: string;
  /** Qué se hace ahí, en cinco palabras. Va bajo el título, no en un tooltip. */
  readonly description: string;
  readonly href: string;
  /* Atado al tipo real de iconos: un nombre mal escrito es un error de
     compilación y no un hueco en la rejilla. */
  readonly icon: NavIcon;
  readonly tone: LauncherTone;
  readonly permission: Permission;
  /** Cuántas cosas esperan dentro. `0` no dibuja distintivo. */
  readonly badge: number;
}

export interface LauncherCounts {
  readonly atencion: number;
  readonly ordenes: number;
  readonly recepcionesHoy: number;
  readonly enTaller: number;
  readonly comprasPendientes: number;
  readonly encuestasPorLlamar: number;
  readonly clientes: number;
}

/**
 * Los accesos, en el orden en que se usan a lo largo del día.
 *
 * No es alfabético ni por importancia abstracta: un vehículo entra, se
 * diagnostica, se compran piezas, se repara, se entrega, y después se
 * pregunta al cliente. Quien mira la rejilla sigue ese mismo camino con el
 * dedo.
 */
export function buildLauncher(counts: LauncherCounts): readonly LauncherApp[] {
  return [
    {
      id: 'operacion',
      label: 'Centro de operaciones',
      description: 'Vista general del negocio',
      href: '/tablero/operacion',
      icon: 'tablero',
      tone: counts.atencion > 0 ? 'crit' : 'brand',
      permission: 'dashboard:control_tower',
      badge: counts.atencion,
    },
    {
      id: 'recepcion',
      label: 'Recepción',
      description: 'Registra nuevos vehículos',
      href: '/recepcion',
      icon: 'recepcion',
      tone: 'brand',
      permission: 'receptions:read',
      badge: counts.recepcionesHoy,
    },
    {
      id: 'ordenes',
      label: 'Órdenes',
      description: 'Gestiona servicios',
      href: '/ordenes',
      icon: 'ordenes',
      tone: 'brand',
      permission: 'orders:read',
      badge: counts.ordenes,
    },
    {
      id: 'taller',
      label: 'Taller',
      description: 'Controla el trabajo en taller',
      href: '/taller',
      icon: 'taller',
      tone: 'brand',
      permission: 'repairs:read',
      badge: counts.enTaller,
    },
    {
      id: 'compras',
      label: 'Compras',
      description: 'Repuestos y suministros',
      href: '/compras',
      icon: 'compras',
      tone: 'warn',
      permission: 'purchases:read',
      badge: counts.comprasPendientes,
    },
    {
      id: 'clientes',
      label: 'Clientes',
      description: 'Administra tu base de clientes',
      href: '/clientes',
      icon: 'clientes',
      tone: 'ok',
      permission: 'customers:read',
      badge: 0,
    },
    {
      id: 'encuestas',
      label: 'Encuestas',
      description: 'Conoce la satisfacción',
      href: '/encuestas',
      icon: 'encuestas',
      tone: counts.encuestasPorLlamar > 0 ? 'crit' : 'graphite',
      permission: 'surveys:read',
      badge: counts.encuestasPorLlamar,
    },
    {
      id: 'informes',
      label: 'Informes',
      description: 'Analiza el desempeño',
      href: '/informes',
      icon: 'informes',
      tone: 'graphite',
      permission: 'reports:read',
      badge: 0,
    },
    {
      id: 'configuracion',
      label: 'Configuración',
      description: 'Personaliza el sistema',
      href: '/admin',
      icon: 'admin',
      tone: 'graphite',
      permission: 'settings:manage',
      badge: 0,
    },
    {
      id: 'auditoria',
      label: 'Auditoría',
      description: 'Traza y controla',
      href: '/admin/auditoria',
      icon: 'auditoria',
      tone: 'graphite',
      permission: 'audit:read',
      badge: 0,
    },
  ];
}

/**
 * Lo que este usuario puede abrir.
 *
 * Filtra por permiso, no por rol. Un acceso que lleva a una pantalla donde no
 * puedes entrar es peor que no tener el acceso: enseña a desconfiar de los que
 * sí funcionan.
 */
export function visibleApps(
  apps: readonly LauncherApp[],
  granted: readonly Permission[],
): readonly LauncherApp[] {
  const set = new Set(granted);
  return apps.filter((a) => set.has(a.permission));
}

/** Cuántas cosas esperan en total, para el resumen de arriba. */
export function pendingTotal(apps: readonly LauncherApp[]): number {
  return apps.reduce((n, a) => n + a.badge, 0);
}
