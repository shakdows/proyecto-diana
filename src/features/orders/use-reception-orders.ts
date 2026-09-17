'use client';

import { useMemo, useState } from 'react';
import { toBoardRow, type BoardRow } from '@/features/demo/board';
import { demoCustomers, type DemoCustomer } from '@/features/customers/demo';
import { useAllCustomers } from '@/features/customers/use-created';
import { useReceptions } from '@/features/reception/use-receptions';
import type { CompletedReception } from '@/features/reception/services/acta';
import {
  SIN_DEFINIR,
  factsFromReception,
  findVehicle,
  orderFromReception,
  receptionCodeFromOrderId,
} from './services/from-reception';
import { useServiceType } from './use-order-workfile';
import type { OrderFacts } from './services/state-machine';

export interface ReceptionOrder {
  readonly row: BoardRow;
  readonly acta: CompletedReception;
  readonly facts: OrderFacts;
  readonly match: ReturnType<typeof findVehicle>;
}

/**
 * Un instante fijo por montaje.
 *
 * `new Date()` en el cuerpo del componente da un valor distinto en cada
 * pasada, y React puede reejecutar el cuerpo cuando le convenga: el semáforo
 * y el avance parpadearían sin que cambiara nada. El resto de las pantallas
 * de la demostración resuelven el reloj igual.
 */
function useNow(): Date {
  const [now] = useState(() => new Date());
  return now;
}

/**
 * Las órdenes que abrieron las recepciones cerradas en este navegador.
 *
 * Existen porque cerrar una recepción emite un código de orden —`OT-2026-0001`—
 * y hasta ahora esa orden no aparecía en ninguna parte: quien recibía un
 * vehículo no lo volvía a ver. Pasan por `toBoardRow` como las demás, así que
 * el avance, la ETA y el semáforo salen de las mismas funciones puras.
 */
export function useReceptionOrders(): readonly ReceptionOrder[] {
  const now = useNow();
  const { receptions } = useReceptions();
  const seeded = useMemo(() => demoCustomers(now), [now]);
  const { customers } = useAllCustomers(seeded);

  return useMemo(
    () => receptions.map((acta) => build(acta, customers, now)),
    [receptions, customers, now],
  );
}

/** Una sola, por el identificador que usa la ruta. */
export function useReceptionOrder(orderId: string): {
  readonly order: ReceptionOrder | null;
  readonly serviceType: string;
  readonly setServiceType: (value: string) => void;
} {
  const now = useNow();
  const { receptions } = useReceptions();
  const seeded = useMemo(() => demoCustomers(now), [now]);
  const { customers } = useAllCustomers(seeded);
  const { serviceType, setServiceType } = useServiceType(orderId);

  const order = useMemo(() => {
    const code = receptionCodeFromOrderId(orderId);
    if (code === null) return null;
    const acta = receptions.find((r) => r.code === code);
    if (acta === undefined) return null;
    return build(acta, customers, now, serviceType);
  }, [orderId, receptions, customers, now, serviceType]);

  return { order, serviceType, setServiceType };
}

function build(
  acta: CompletedReception,
  customers: readonly DemoCustomer[],
  now: Date,
  serviceType = '',
): ReceptionOrder {
  const match = findVehicle(customers, acta.plate);
  const elegido = serviceType.trim();
  const order = orderFromReception(
    elegido === '' ? { acta, match } : { acta, match, serviceType: elegido },
    now,
  );
  return { row: toBoardRow(order, now), acta, facts: factsFromReception(order, acta), match };
}

export { SIN_DEFINIR };
