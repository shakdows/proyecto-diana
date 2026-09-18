/**
 * La historia del vehículo: cuánto duró cada tramo, de entrada a salida.
 *
 * ── Por qué no basta con la lista de pasos ─────────────────────────────────
 *
 * El historial ya decía QUÉ se hizo, QUIÉN y CUÁNDO. Lo que no decía es lo
 * único que se pregunta después: «¿por qué este vehículo lleva dos días?».
 * Para responder eso hacen falta las DURACIONES —cuánto estuvo esperando en
 * cada estado— y el tramo más lento, que casi nunca es el que se sospecha.
 *
 * ── Medido, no declarado ───────────────────────────────────────────────────
 *
 * Todas las cifras de aquí salen de las marcas de tiempo de las transiciones
 * que ya ocurrieron. Nadie las escribe: no hay ningún campo donde alguien
 * ponga cuánto tardó. Es la diferencia entre un parte de tiempos y un informe
 * de horas, y es la razón de que esto sirva para discutir con un cliente.
 *
 * Dominio PURO: sin React, sin almacenamiento, sin `Date.now()` escondido.
 */

import { TERMINAL_STATUSES, type OrderStatus } from './order-status';
import type { AppliedTransition } from './advance';
import type { OrderAction } from './state-machine';

export interface TimelineEntry {
  readonly action: OrderAction;
  readonly from: OrderStatus;
  readonly to: OrderStatus;
  readonly at: number;
  readonly by: string;
  readonly byName: string;
  /** Cuánto estuvo la orden en `from` ANTES de este paso. */
  readonly waitedMs: number;
}

export interface Timeline {
  /** En el orden en que ocurrieron. La pantalla decide si los invierte. */
  readonly entries: readonly TimelineEntry[];
  /** Desde que entró el vehículo hasta ahora, o hasta que salió. */
  readonly totalMs: number;
  /** Lo que lleva parada en el estado actual. Cero si ya salió. */
  readonly currentMs: number;
  /** `true` cuando la orden llegó a un estado del que no sale. */
  readonly closed: boolean;
  /** El tramo más largo. `null` si todavía no hay ninguno. */
  readonly slowest: TimelineEntry | null;
}

/**
 * Arma la historia.
 *
 * `openedAt` es cuando entró el vehículo —el cierre del acta de recepción—, y
 * no la primera transición: entre una cosa y otra puede haber horas, y son
 * horas del taller que el cliente también cuenta.
 */
export function buildTimeline(
  openedAt: number,
  history: readonly AppliedTransition[],
  now: number,
): Timeline {
  const entries: TimelineEntry[] = [];
  let cursor = openedAt;

  for (const step of history) {
    entries.push({
      action: step.action,
      from: step.from,
      to: step.to,
      at: step.at,
      by: step.by,
      byName: step.byName,
      /* Nunca negativo: un reloj que va hacia atrás —cambio de huso, dos
         dispositivos -— no puede producir «esperó -3 min». */
      waitedMs: Math.max(0, step.at - cursor),
    });
    cursor = step.at;
  }

  const ultimo = entries.at(-1) ?? null;
  const closed = ultimo !== null && TERMINAL_STATUSES.has(ultimo.to);
  const fin = closed && ultimo !== null ? ultimo.at : now;

  const slowest = entries.reduce<TimelineEntry | null>(
    (peor, e) => (peor === null || e.waitedMs > peor.waitedMs ? e : peor),
    null,
  );

  return {
    entries,
    totalMs: Math.max(0, fin - openedAt),
    currentMs: closed ? 0 : Math.max(0, now - cursor),
    closed,
    slowest,
  };
}

const MINUTO = 60_000;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

/**
 * «2 d 4 h», «3 h 20 min», «45 min».
 *
 * Dos unidades como mucho: «2 d 4 h 13 min 9 s» no se lee, y para decidir si
 * un vehículo lleva demasiado dentro los segundos no aportan nada.
 */
export function durationPhrase(ms: number): string {
  if (ms < MINUTO) return 'menos de 1 min';

  if (ms < HORA) {
    const min = Math.floor(ms / MINUTO);
    return `${String(min)} min`;
  }

  if (ms < DIA) {
    const horas = Math.floor(ms / HORA);
    const min = Math.floor((ms % HORA) / MINUTO);
    return min === 0 ? `${String(horas)} h` : `${String(horas)} h ${String(min)} min`;
  }

  const dias = Math.floor(ms / DIA);
  const horas = Math.floor((ms % DIA) / HORA);
  return horas === 0 ? `${String(dias)} d` : `${String(dias)} d ${String(horas)} h`;
}

/** «5 pasos en 3 h 20 min» — el resumen de una línea. */
export function timelinePhrase(t: Timeline): string {
  const pasos = t.entries.length;
  const cuenta = pasos === 1 ? '1 paso' : `${String(pasos)} pasos`;
  return `${cuenta} en ${durationPhrase(t.totalMs)}`;
}
