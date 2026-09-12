/**
 * El centro de operaciones.
 *
 * Dos decisiones que no pueden vivir en la plantilla:
 *
 *   1. Qué se hace con cada problema. Una flecha genérica igual para los cinco
 *      casos obliga a entrar para descubrir qué toca. «Esperando repuestos»
 *      lleva a la orden de compra y «esperando al cliente» al teléfono del
 *      cliente: son sitios distintos y el botón debe decirlo.
 *   2. Qué sale hoy. Es una consulta sobre el estado real, no una lista aparte.
 *
 * Dominio PURO.
 */

import type { AttentionKind, BoardRow } from '@/features/demo/board';
import { stageOf } from './stages';

export interface AttentionAction {
  readonly label: string;
  /** Adónde lleva, a partir del identificador de la orden. */
  readonly href: (orderId: string) => string;
}

/**
 * Qué se hace con cada clase de problema.
 *
 * El destino es el sitio donde se RESUELVE, no la ficha genérica: quien pulsa
 * «Ver repuestos» quiere la línea de piezas, no leer otra vez que el vehículo
 * está esperando piezas.
 */
const ACTIONS: Readonly<Record<AttentionKind, AttentionAction>> = {
  pausada: { label: 'Resolver', href: (id) => `/ordenes/${id}` },
  retrasada: { label: 'Revisar', href: (id) => `/ordenes/${id}` },
  repuestos: { label: 'Ver repuestos', href: (id) => `/ordenes/${id}/repuestos` },
  riesgo: { label: 'Revisar ETA', href: (id) => `/ordenes/${id}` },
  cliente: { label: 'Contactar', href: (id) => `/ordenes/${id}/cotizacion` },
};

/** Las clases de aviso, para recorrerlas en las pruebas sin escribirlas otra vez. */
export const ATTENTION_KINDS = Object.keys(ACTIONS) as readonly AttentionKind[];

export function actionFor(kind: AttentionKind): AttentionAction {
  return ACTIONS[kind];
}

export interface Delivery {
  readonly id: string;
  readonly plate: string;
  readonly vehicle: string;
  readonly at: Date;
  /** Verde cuando ya está listo; azul mientras siga en el taller. */
  readonly ready: boolean;
}

/**
 * Lo que sale pronto, lo antes primero.
 *
 * Sale de las MISMAS filas que el resto de la pantalla: una lista de entregas
 * calculada aparte acabaría prometiendo un vehículo que la lista de atención
 * da por parado.
 *
 * Una orden sin hora comprometida no aparece. No es un olvido: sin promesa no
 * hay nada que anunciar, y colarla con una hora inventada es peor que no
 * enseñarla.
 */
export function upcomingDeliveries(
  rows: readonly BoardRow[],
  now: Date,
  limit = 4,
): readonly Delivery[] {
  return rows
    .filter((row) => row.promisedAt !== null && stageOf(row.order.status) !== null)
    .filter((row) => (row.promisedAt as Date).getTime() >= now.getTime())
    .sort((a, b) => (a.promisedAt as Date).getTime() - (b.promisedAt as Date).getTime())
    .slice(0, limit)
    .map((row) => ({
      id: row.order.id,
      plate: row.order.plate,
      vehicle: row.order.vehicle,
      at: row.promisedAt as Date,
      ready: stageOf(row.order.status) === 'listos',
    }));
}
