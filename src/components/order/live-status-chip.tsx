'use client';

import { StatusChip } from '@/components/ui/status-chip';
import { useOrderStatus } from '@/features/orders/use-order-advance';
import type { OrderStatus } from '@/features/orders/services/order-status';

/**
 * La insignia de estado en una lista, siguiendo el avance real.
 *
 * La lista de órdenes se renderiza en el servidor con el estado sembrado. En
 * cuanto la ficha permitió avanzar de verdad, esa lista se quedó contando una
 * versión vieja del mismo vehículo. Este componente lee el avance guardado y
 * pinta el estado al que llegó la orden.
 *
 * Durante el renderizado en servidor y la hidratación devuelve el estado
 * sembrado, que es justo lo que ya pintaba: no hay parpadeo ni discrepancia
 * de hidratación.
 */
export function LiveOrderStatusChip({
  orderId,
  status,
}: {
  readonly orderId: string;
  readonly status: OrderStatus;
}) {
  return <StatusChip status={useOrderStatus(orderId, status)} />;
}
