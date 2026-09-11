import { demoOrders, type DemoOrder } from '@/features/demo/board';
import type { QueueEntry, ServiceKind } from './services/station';

/**
 * Colas de las estaciones finales, DERIVADAS del tablero.
 *
 * La primera versión inventaba los vehículos a mano, y el resultado fue que
 * `os-157` era «Transportes Andinos, placa JKL-012» aquí y «Banco Continental,
 * placa B4T019» en el tablero: la misma orden con dos dueños. Dos pantallas
 * que se contradicen destruyen la confianza en todo lo demás, aunque lo demás
 * esté bien.
 *
 * Lo único que se declara aquí es el estado dentro de la estación, que es
 * información propia de la cola. Placa, vehículo y cliente salen de la orden.
 * En la Fase 13 todo esto son las órdenes en `PENDIENTE_*` y `EN_*`.
 */

interface StationSlot {
  readonly orderId: string;
  readonly state: QueueEntry['state'];
  readonly startedMinutesAgo: number | null;
  readonly remainingServices: readonly ServiceKind[];
}

const TYPICAL_MINUTES: Readonly<Record<ServiceKind, number>> = {
  alineamiento: 45,
  lavado: 25,
};

const SLOTS: Readonly<Record<ServiceKind, readonly StationSlot[]>> = {
  alineamiento: [
    // Vencida y esperando: es la que debería atenderse primero.
    { orderId: 'os-157', state: 'pendiente', startedMinutesAgo: null, remainingServices: ['alineamiento', 'lavado'] },
    // En proceso y ya pasada del tiempo típico: dispara el aviso en ámbar.
    { orderId: 'os-154', state: 'en_proceso', startedMinutesAgo: 58, remainingServices: ['alineamiento', 'lavado'] },
    { orderId: 'os-158', state: 'terminado', startedMinutesAgo: 180, remainingServices: ['alineamiento', 'lavado'] },
  ],
  lavado: [
    { orderId: 'os-158', state: 'pendiente', startedMinutesAgo: null, remainingServices: ['lavado'] },
    { orderId: 'os-155', state: 'pendiente', startedMinutesAgo: null, remainingServices: ['lavado'] },
    { orderId: 'os-160', state: 'terminado', startedMinutesAgo: 90, remainingServices: ['lavado'] },
  ],
};

function toEntry(order: DemoOrder, slot: StationSlot, kind: ServiceKind): QueueEntry {
  return {
    orderId: order.id,
    orderCode: order.code,
    vehicle: order.vehicle,
    plate: order.plate.replace(/^(.{3})(.*)$/u, '$1-$2'),
    customer: order.customer,
    state: slot.state,
    startedMinutesAgo: slot.startedMinutesAgo,
    typicalMinutes: TYPICAL_MINUTES[kind],
    promisedInMinutes: order.promisedInMinutes,
    remainingServices: slot.remainingServices,
  };
}

export function demoQueue(kind: ServiceKind, now: Date): readonly QueueEntry[] {
  const byId = new Map(demoOrders(now).map((o) => [o.id, o]));
  return SLOTS[kind]
    .map((slot) => {
      const order = byId.get(slot.orderId);
      return order === undefined ? undefined : toEntry(order, slot, kind);
    })
    .filter((e): e is QueueEntry => e !== undefined);
}
