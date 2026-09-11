/**
 * Servicios finales: lavado y alineamiento.
 *
 * Las dos estaciones comparten forma —una cola, un vehículo en proceso, marcas
 * de inicio y fin— pero NO son intercambiables en el orden. Tres reglas:
 *
 * 1. No entra nada que calidad no haya aprobado. Lavar un vehículo que va a
 *    volver al taller es lavarlo dos veces.
 * 2. El alineamiento va ANTES del lavado: su prueba en pista ensucia el
 *    vehículo, y el cliente lo recibe recién lavado, no recién rodado.
 * 3. Un operario atiende un vehículo a la vez. Permitir dos «en proceso»
 *    hace que el primero se quede olvidado en la bahía con el cronómetro
 *    corriendo.
 *
 * Módulo puro: sin React y sin base de datos.
 */

import type { OrderStatus } from '@/features/orders/services/order-status';

export type ServiceKind = 'alineamiento' | 'lavado';

/** El alineamiento primero: su prueba en pista ensucia el vehículo. */
export const SERVICE_ORDER: readonly ServiceKind[] = ['alineamiento', 'lavado'];

export const SERVICE_LABELS: Readonly<Record<ServiceKind, string>> = {
  alineamiento: 'Alineamiento',
  lavado: 'Lavado',
};

export const IN_PROGRESS_STATUS: Readonly<Record<ServiceKind, OrderStatus>> = {
  alineamiento: 'EN_ALINEAMIENTO',
  lavado: 'EN_LAVADO',
};

export const PENDING_STATUS: Readonly<Record<ServiceKind, OrderStatus>> = {
  alineamiento: 'PENDIENTE_ALINEAMIENTO',
  lavado: 'PENDIENTE_LAVADO',
};

export type EntryState = 'pendiente' | 'en_proceso' | 'terminado';

export interface QueueEntry {
  readonly orderId: string;
  readonly orderCode: string;
  readonly vehicle: string;
  readonly plate: string;
  readonly customer: string;
  readonly state: EntryState;
  /** Minutos desde que empezó. `null` si no ha empezado. */
  readonly startedMinutesAgo: number | null;
  /** Minutos que suele tardar esta estación. Para avisar de lo que se alarga. */
  readonly typicalMinutes: number;
  /** Hora prometida al cliente, en minutos desde ahora. Negativo = vencida. */
  readonly promisedInMinutes: number;
  /** Servicios finales que este vehículo todavía necesita, en orden. */
  readonly remainingServices: readonly ServiceKind[];
}

/**
 * Estados desde los que un vehículo puede entrar a servicios finales.
 *
 * `CONTROL_CALIDAD_APROBADO` es la puerta. Los estados de las propias
 * estaciones también valen porque un vehículo en la cadena sigue dentro.
 */
const ELIGIBLE: ReadonlySet<OrderStatus> = new Set<OrderStatus>([
  'CONTROL_CALIDAD_APROBADO',
  'PENDIENTE_ALINEAMIENTO',
  'EN_ALINEAMIENTO',
  'PENDIENTE_LAVADO',
  'EN_LAVADO',
]);

export function isEligible(status: OrderStatus): boolean {
  return ELIGIBLE.has(status);
}

export function inProgress(queue: readonly QueueEntry[]): QueueEntry | undefined {
  return queue.find((e) => e.state === 'en_proceso');
}

export function waiting(queue: readonly QueueEntry[]): readonly QueueEntry[] {
  return queue.filter((e) => e.state === 'pendiente');
}

export function finished(queue: readonly QueueEntry[]): readonly QueueEntry[] {
  return queue.filter((e) => e.state === 'terminado');
}

export interface StartCheck {
  readonly canStart: boolean;
  readonly reason?: string;
}

/**
 * Si puede empezarse este vehículo ahora.
 *
 * Se devuelve el motivo, no un booleano suelto: un botón apagado sin
 * explicación hace que el operario lo pulse tres veces y luego pregunte.
 */
export function startCheck(queue: readonly QueueEntry[], orderId: string): StartCheck {
  const entry = queue.find((e) => e.orderId === orderId);
  if (entry === undefined) return { canStart: false, reason: 'Este vehículo no está en la cola.' };
  if (entry.state === 'terminado') return { canStart: false, reason: 'Ya está terminado.' };
  if (entry.state === 'en_proceso') return { canStart: false, reason: 'Ya está en proceso.' };

  const current = inProgress(queue);
  if (current !== undefined) {
    return {
      canStart: false,
      reason: `Termina primero ${current.plate}. Dos vehículos a la vez dejan uno olvidado en la bahía.`,
    };
  }

  return { canStart: true };
}

export function start(queue: readonly QueueEntry[], orderId: string): readonly QueueEntry[] {
  if (!startCheck(queue, orderId).canStart) return queue;
  return queue.map((e) =>
    e.orderId === orderId ? { ...e, state: 'en_proceso' as const, startedMinutesAgo: 0 } : e,
  );
}

export function finish(queue: readonly QueueEntry[], orderId: string): readonly QueueEntry[] {
  return queue.map((e) =>
    e.orderId === orderId && e.state === 'en_proceso'
      ? { ...e, state: 'terminado' as const }
      : e,
  );
}

/** Un vehículo se alarga cuando pasa del tiempo típico de la estación. */
export function isOverrunning(entry: QueueEntry): boolean {
  return entry.state === 'en_proceso' && (entry.startedMinutesAgo ?? 0) > entry.typicalMinutes;
}

/**
 * A dónde va el vehículo al terminar esta estación.
 *
 * Si le queda otro servicio final, encadena; si no, queda listo para entrega.
 * Se respeta `SERVICE_ORDER`, no el orden en que aparezcan en la lista.
 */
export function nextStationAfter(
  kind: ServiceKind,
  remaining: readonly ServiceKind[],
): ServiceKind | null {
  /*
   * Solo se encadena HACIA DELANTE en `SERVICE_ORDER`. Bastaba excluir la
   * estación actual para que un vehículo recién lavado, con el alineamiento
   * aún marcado como pendiente, volviera a la prueba en pista y saliera sucio
   * hacia el cliente: justo lo que el orden de las estaciones existe para
   * evitar. Si queda una estación anterior sin hacer, el error está en cómo
   * se encoló el vehículo, y repetir la pista no lo arregla.
   */
  const position = SERVICE_ORDER.indexOf(kind);
  if (position === -1) return null;

  const left = SERVICE_ORDER.filter((s, i) => i > position && remaining.includes(s));
  return left[0] ?? null;
}

export function statusAfter(
  kind: ServiceKind,
  remaining: readonly ServiceKind[],
): OrderStatus {
  const next = nextStationAfter(kind, remaining);
  return next === null ? 'LISTO_PARA_ENTREGA' : PENDING_STATUS[next];
}

export interface StationSummary {
  readonly waiting: number;
  readonly inProgress: number;
  readonly finishedToday: number;
  /** Vehículos cuya hora prometida ya venció y siguen sin terminar. */
  readonly overdue: number;
}

export function summarize(queue: readonly QueueEntry[]): StationSummary {
  return {
    waiting: waiting(queue).length,
    inProgress: inProgress(queue) === undefined ? 0 : 1,
    finishedToday: finished(queue).length,
    overdue: queue.filter((e) => e.state !== 'terminado' && e.promisedInMinutes < 0).length,
  };
}

/**
 * Orden de atención sugerido: primero lo vencido, luego lo más urgente.
 *
 * No reordena la cola por sí solo —el operario decide— pero poner arriba lo
 * que ya va tarde evita que se atienda por orden de llegada un vehículo cuyo
 * cliente lleva media hora esperando en recepción.
 */
export function byUrgency(queue: readonly QueueEntry[]): readonly QueueEntry[] {
  return [...queue].sort((a, b) => a.promisedInMinutes - b.promisedInMinutes);
}
