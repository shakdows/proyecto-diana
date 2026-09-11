import type { ReadyVehicle } from '@/components/delivery/ready-queue';
import { demoOrders, quotationTotals, type DemoOrder } from '@/features/demo/board';

/**
 * Vehículos listos para entrega, DERIVADOS del tablero.
 *
 * La primera versión de este archivo inventaba tres vehículos a mano. El
 * resultado fue que `os-159` era un Nissan Frontier de Roberto Silva con
 * S/ 944 pendientes en esta pantalla y un Nissan Frontier de Inversiones Vega
 * con crédito corporativo en el tablero: la misma orden con dos dueños y dos
 * saldos. Dos pantallas que se contradicen sobre dinero destruyen la
 * confianza en todo lo demás, aunque lo demás esté bien.
 *
 * Ahora la lista sale de las mismas órdenes, con sus placas, sus clientes y
 * sus totales reales. En la Fase 14 sale de las órdenes en
 * `LISTO_PARA_ENTREGA`.
 */

/** Cuánto lleva listo cada vehículo y si ya se avisó. Fase 14: `delivery_events`. */
const READY_TIMELINE: Readonly<
  Record<string, { readonly readyMinutesAgo: number; readonly notifiedMinutesAgo: number | null }>
> = {
  'os-160': { readyMinutesAgo: 215, notifiedMinutesAgo: null },
  'os-154': { readyMinutesAgo: 40, notifiedMinutesAgo: 25 },
  'os-155': { readyMinutesAgo: 95, notifiedMinutesAgo: 70 },
};

function toReady(order: DemoOrder): ReadyVehicle {
  const totals = quotationTotals(order.items);
  const totalCents = Math.round(totals.total * 100);
  const timeline = READY_TIMELINE[order.id] ?? {
    readyMinutesAgo: 30,
    notifiedMinutesAgo: null,
  };

  /*
   * Ninguno ha pagado todavía: el cobro ocurre en la entrega. La diferencia
   * está en quién PUEDE salir sin pagar —las cuentas corporativas, que se
   * facturan a fin de mes— y es la misma regla que aplica
   * `handover.readiness`.
   */
  const corporate = order.corporateClient !== null;

  return {
    orderId: order.id,
    orderCode: order.code,
    vehicle: order.vehicle,
    plate: order.plate.replace(/^(.{3})(.*)$/u, '$1-$2'),
    customer: order.customer,
    corporateClient: order.corporateClient,
    phone: order.customerPhone,
    totalCents,
    paidCents: 0,
    hasCorporateCredit: corporate,
    readyMinutesAgo: timeline.readyMinutesAgo,
    notifiedMinutesAgo: timeline.notifiedMinutesAgo,
  };
}

export function demoReady(now: Date): readonly ReadyVehicle[] {
  const byId = new Map(demoOrders(now).map((o) => [o.id, o]));
  return Object.keys(READY_TIMELINE)
    .map((id) => byId.get(id))
    .filter((o): o is DemoOrder => o !== undefined)
    .map(toReady);
}

/** Token del enlace de encuesta. En la Fase 15 sale de `survey_links`. */
export const DEMO_SURVEY_TOKEN = 'enc-154-demo';
