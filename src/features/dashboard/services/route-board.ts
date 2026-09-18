/**
 * La ruta del trabajo: los nueve cuadros del tablero, en orden.
 *
 * ── Por qué existe ─────────────────────────────────────────────────────────
 *
 * El tablero abría siete módulos ordenados por frecuencia de uso —clientes
 * primero porque es lo que más se busca—, y eso está bien para quien ya sabe
 * el recorrido. Para quien no, no dice nada: registras un cliente, recibes el
 * vehículo… y de ahí en adelante hay que adivinar cuál de las siete tarjetas
 * es la siguiente. El sistema conoce el recorrido entero y no lo enseñaba en
 * ninguna parte.
 *
 * Aquí está, de izquierda a derecha y de arriba abajo, con el cuadro en el que
 * está el vehículo marcado y lo que falta para pasar al siguiente.
 *
 * ── Nueve cuadros y no treinta y cuatro estados ────────────────────────────
 *
 * La máquina de estados tiene treinta y cuatro, y son los correctos para
 * decidir qué se puede hacer. Para MIRAR el recorrido son demasiados: nadie
 * necesita distinguir «compra autorizada» de «orden de compra generada» desde
 * la portada. Los cuadros agrupan; el detalle exacto sigue estando en la
 * orden.
 *
 * Dominio PURO: sin React, sin imágenes cargadas, sin rutas de Next.
 */

import { isAdvancing } from '@/features/orders/services/advance';
import { stepFor, type WorkfileStep } from '@/features/orders/services/workfile';
import type { OrderStatus } from '@/features/orders/services/order-status';
import type { OrderAction } from '@/features/orders/services/state-machine';
import type { Permission, RoleCode } from '@/lib/auth/permissions';

export const ROUTE_STEP_IDS = [
  'cliente',
  'recepcion',
  'orden',
  'diagnostico',
  'cotizacion',
  'repuestos',
  'reparacion',
  'calidad',
  'entrega',
] as const;

export type RouteStepId = (typeof ROUTE_STEP_IDS)[number];

export interface RouteStep {
  readonly id: RouteStepId;
  /** Lo que se lee en el cuadro. */
  readonly title: string;
  /** Qué se hace ahí, en una línea. */
  readonly hint: string;
  readonly photo: string;
  /**
   * `true` cuando la fotografía YA trae dentro su rótulo —icono, nombre y
   * flecha—, como las siete del tablero. Sobre esas no se dibuja nada encima:
   * saldrían dos nombres y dos flechas en la misma tarjeta.
   */
  readonly labelInPhoto: boolean;
  /** A dónde se va cuando NO hay una orden abierta que seguir. */
  readonly fallbackHref: string;
}

export const ROUTE_STEPS: readonly RouteStep[] = [
  {
    id: 'cliente',
    title: 'Cliente',
    hint: 'Registra al cliente y su vehículo',
    photo: '/assets/admin/clientes.webp',
    labelInPhoto: true,
    fallbackHref: '/clientes',
  },
  {
    id: 'recepcion',
    title: 'Recepción',
    hint: 'Recibe el vehículo, revísalo y fírmalo',
    photo: '/assets/admin/recepcion.webp',
    labelInPhoto: true,
    fallbackHref: '/recepcion',
  },
  {
    id: 'orden',
    title: 'Orden de trabajo',
    hint: 'Tipo de servicio y técnico asignado',
    photo: '/assets/admin/ordenes.webp',
    labelInPhoto: true,
    fallbackHref: '/ordenes',
  },
  {
    id: 'diagnostico',
    title: 'Diagnóstico',
    hint: 'El técnico revisa y anota lo que encuentra',
    photo: '/fondos/tecnico.webp',
    labelInPhoto: false,
    fallbackHref: '/taller/diagnostico',
  },
  {
    id: 'cotizacion',
    title: 'Cotización',
    hint: 'Precios y decisión del cliente',
    photo: '/fondos/asesora.webp',
    labelInPhoto: false,
    fallbackHref: '/ordenes',
  },
  {
    id: 'repuestos',
    title: 'Repuestos',
    hint: 'Se piden, se autorizan y llegan',
    photo: '/assets/admin/compras.webp',
    labelInPhoto: true,
    fallbackHref: '/compras',
  },
  {
    id: 'reparacion',
    title: 'Reparación',
    hint: 'El trabajo aprobado, en la bahía',
    photo: '/assets/admin/taller.webp',
    labelInPhoto: true,
    fallbackHref: '/taller',
  },
  {
    id: 'calidad',
    title: 'Control de calidad',
    hint: 'Lo revisa quien no lo reparó',
    photo: '/fondos/hero-vehiculo.webp',
    labelInPhoto: false,
    fallbackHref: '/calidad',
  },
  {
    id: 'entrega',
    title: 'Entrega',
    hint: 'Acta firmada y el vehículo sale',
    photo: '/fondos/concesionario.webp',
    labelInPhoto: false,
    fallbackHref: '/entregas',
  },
];

export function routeStep(id: RouteStepId): RouteStep {
  const found = ROUTE_STEPS.find((s) => s.id === id);
  if (found === undefined) throw new Error(`Paso desconocido: ${id}`);
  return found;
}

/** El número que se pinta en el cuadro. Uno-indexado, como se cuenta. */
export function stepNumber(id: RouteStepId): number {
  return ROUTE_STEP_IDS.indexOf(id) + 1;
}

/** El trabajo ya terminó: no hay cuadro «actual», están todos hechos. */
export const TERMINADO = 'terminado';

export type RoutePosition = RouteStepId | typeof TERMINADO;

/**
 * Los once pasos del expediente, agrupados en los cuadros del tablero.
 *
 * Se deriva de `stepFor`, que es el que ya sabe qué pide cada estado, en vez
 * de repetir aquí el reparto de los treinta y cuatro estados. Así, el día que
 * un estado cambie de tramo, cambia en un sitio.
 */
const POR_PASO: Readonly<Record<WorkfileStep, RouteStepId>> = {
  servicio: 'orden',
  tecnico: 'orden',
  hallazgos: 'diagnostico',
  precios: 'cotizacion',
  decision: 'cotizacion',
  repuestos: 'repuestos',
  tiempo: 'reparacion',
  trabajos: 'reparacion',
  calidad: 'calidad',
  etapas: 'entrega',
  entrega: 'entrega',
};

/**
 * En qué cuadro está una orden.
 *
 * Los estados que el expediente no cubre se resuelven aquí: los del principio
 * son recepción, los del final son el trabajo terminado, y los de servicios
 * finales —lavado, alineamiento— son el tramo de entrega, porque desde la
 * portada eso es lo que significan: el vehículo ya está reparado y lo que
 * queda es sacarlo.
 */
export function stepForStatus(status: OrderStatus): RoutePosition {
  const paso = stepFor(status);
  if (paso !== null) return POR_PASO[paso];

  switch (status) {
    case 'DRAFT':
    case 'RECEPCIONADO':
      return 'recepcion';
    case 'REPARACION_TERMINADA':
      return 'calidad';
    case 'PENDIENTE_LAVADO':
    case 'EN_LAVADO':
    case 'PENDIENTE_ALINEAMIENTO':
    case 'EN_ALINEAMIENTO':
      return 'entrega';
    default:
      /* ENTREGADO, CERRADO y CANCELADO: no queda cuadro por delante. */
      return TERMINADO;
  }
}

export type StepState = 'hecho' | 'actual' | 'pendiente';

/**
 * Cómo se pinta un cuadro.
 *
 * `position === null` es «todavía no hay ningún vehículo en marcha»: el
 * primer cuadro es el actual y los demás esperan. No se marca nada como hecho
 * porque no se ha hecho nada, y pintar en verde lo que nadie tocó es la misma
 * mentira que evita el checklist de la recepción.
 */
export function stateOf(step: RouteStepId, position: RoutePosition | null): StepState {
  if (position === null) return step === 'cliente' ? 'actual' : 'pendiente';
  if (position === TERMINADO) return 'hecho';
  const i = ROUTE_STEP_IDS.indexOf(step);
  const actual = ROUTE_STEP_IDS.indexOf(position);
  if (i < actual) return 'hecho';
  return i === actual ? 'actual' : 'pendiente';
}

export const STATE_LABELS: Readonly<Record<StepState, string>> = {
  hecho: 'Hecho',
  actual: 'Aquí vas',
  pendiente: 'Después',
};

/** Cuántos cuadros quedan atrás. Para «vas por el 4 de 9». */
export function progressOf(position: RoutePosition | null): { readonly done: number; readonly total: number } {
  const total = ROUTE_STEP_IDS.length;
  if (position === null) return { done: 0, total };
  if (position === TERMINADO) return { done: total, total };
  return { done: ROUTE_STEP_IDS.indexOf(position), total };
}

/* ------------------------------------------------------------------ *
 * Quién trabaja cada cuadro
 * ------------------------------------------------------------------ */

/**
 * El permiso que se ejerce en un cuadro, cuando no sale de una transición.
 *
 * Solo el primero: registrar al cliente no mueve ninguna orden —todavía no
 * hay orden—, así que no hay transición de la que deducirlo.
 */
const PERMISO_PROPIO: Partial<Record<RouteStepId, Permission>> = {
  cliente: 'customers:write',
};

/**
 * Los puestos que trabajan un cuadro.
 *
 * ── Derivado, no escrito a mano ────────────────────────────────────────────
 *
 * Sale de la MISMA tabla que gobierna la orden: se buscan las acciones que
 * hacen avanzar desde los estados de ese cuadro, se mira qué permiso exigen y
 * qué puestos lo tienen. Escribir a mano «calidad la trabaja el inspector»
 * habría creado una segunda verdad que se queda vieja en cuanto alguien toque
 * los permisos de un rol.
 *
 * `super_admin` y `admin` se omiten a propósito, por la misma razón que en
 * `ownerPhrase`: tienen casi todos los permisos, aparecerían en los nueve
 * cuadros y no informarían de nada. Lo que hace falta saber es a quién ir a
 * buscar.
 */
export function rolesOf(
  step: RouteStepId,
  transitions: readonly {
    readonly from: OrderStatus;
    readonly action: OrderAction;
    readonly permission: Permission | null;
  }[],
  rolePermissions: Readonly<Record<RoleCode, readonly Permission[]>>,
  statuses: readonly OrderStatus[],
): readonly RoleCode[] {
  const propio = PERMISO_PROPIO[step];
  const permisos = new Set<Permission>(propio === undefined ? [] : [propio]);

  const suyos = new Set<OrderStatus>(statuses.filter((s) => stepForStatus(s) === step));
  for (const t of transitions) {
    if (!suyos.has(t.from)) continue;
    if (t.permission === null) continue;
    if (!isAdvancing(t.action)) continue;
    permisos.add(t.permission);
  }

  return (Object.keys(rolePermissions) as RoleCode[]).filter((role) => {
    if (role === 'super_admin' || role === 'admin') return false;
    /* `cliente_corporativo` mira desde fuera: no trabaja ningún cuadro. */
    if (role === 'cliente_corporativo') return false;
    return rolePermissions[role].some((p) => permisos.has(p));
  });
}

/** «Asesor de servicio · Técnico». Vacío cuando no lo trabaja nadie más. */
export function rolesPhrase(
  roles: readonly RoleCode[],
  label: (role: RoleCode) => string,
): string {
  if (roles.length === 0) return 'Administración';
  return roles.map(label).join(' · ');
}
