/**
 * Las prioridades de hoy.
 *
 * `attentionItems` ya decide QUÉ pide acción y en qué orden. Lo que falta para
 * poder pintarlo en una lista es la segunda línea: el «cuándo» que convierte
 * «Entrega retrasada» en algo accionable —a qué hora se prometió, desde cuándo
 * está parada—.
 *
 * Está aquí y no en la plantilla por la regla que nos costó dos defectos
 * encontrar: cada subtítulo se calcula del MISMO hecho que su titular. Una
 * línea de detalle escrita a mano acaba diciendo «ninguno listo todavía»
 * debajo de un «1».
 *
 * Dominio PURO.
 */

import type { AttentionItem } from '@/features/demo/board';
import { DEFAULT_LOCALE, DEFAULT_TIME_ZONE } from '@/lib/utils/format';

export interface Priority {
  readonly id: string;
  readonly href: string;
  readonly vehicle: string;
  readonly plate: string;
  /** Qué pasa: «Entrega retrasada», «Esperando repuestos». */
  readonly headline: string;
  /** Cuándo: «Promesa: hoy 10:00 a. m.», «Desde ayer». */
  readonly detail: string;
  readonly severity: 'crit' | 'warn' | 'wait';
}

function dayKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: DEFAULT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/** Días de calendario entre dos instantes, en la zona del taller. */
function daysApart(from: Date, to: Date): number {
  const a = Date.parse(`${dayKey(from)}T00:00:00Z`);
  const b = Date.parse(`${dayKey(to)}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
}

/**
 * «hoy», «ayer», «hace 3 días».
 *
 * Días de CALENDARIO, no múltiplos de 24 horas: algo de anteayer a las once
 * de la noche es «hace 2 días» aunque hayan pasado 26 horas, que es como lo
 * cuenta quien trabaja en el taller.
 */
export function dayWord(date: Date, now: Date): string {
  const days = daysApart(date, now);
  if (days <= 0) return days < 0 ? 'mañana' : 'hoy';
  if (days === 1) return 'ayer';
  return `hace ${days} días`;
}

function hour(date: Date): string {
  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    timeZone: DEFAULT_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

/**
 * La segunda línea de cada prioridad.
 *
 * Una orden con promesa se explica por su promesa: es la cifra por la que el
 * taller responde. Una sin promesa —una cotización sin respuesta— se explica
 * por cuánto lleva así, porque no hay nada más concreto que decir.
 */
export function priorityDetail(item: AttentionItem, now: Date): string {
  if (item.kind === 'pausada') return `Parada desde hace ${item.elapsed}`;

  const { promisedAt } = item.row;
  if (promisedAt !== null) return `Promesa: ${dayWord(promisedAt, now)} ${hour(promisedAt)}`;

  return `Desde ${dayWord(item.row.openedAt, now)}`;
}

/**
 * Las primeras, ya ordenadas por gravedad por `attentionItems`.
 *
 * El límite existe porque la tarjeta enseña cuatro filas y el resto vive en
 * el centro de operaciones. Cortar por abajo es seguro justo porque la lista
 * llega ordenada: lo que se queda fuera es siempre lo menos grave.
 */
export function topPriorities(
  items: readonly AttentionItem[],
  now: Date,
  limit = 4,
): readonly Priority[] {
  return items.slice(0, limit).map((item) => ({
    id: item.row.order.id,
    href: `/ordenes/${item.row.order.id}`,
    vehicle: item.row.order.vehicle,
    plate: item.row.order.plate,
    headline: item.reason,
    detail: priorityDetail(item, now),
    severity: item.severity,
  }));
}
