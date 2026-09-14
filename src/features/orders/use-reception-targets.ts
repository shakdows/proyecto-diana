'use client';

import { useMemo } from 'react';
import { useReceptions } from '@/features/reception/use-receptions';
import { readSlot } from '@/lib/demo/store';
import {
  orderIdForReception,
  receptionOrderTargets,
  serviceTypeSlot,
  type ReceptionOrderTarget,
} from './services/from-reception';

/**
 * Las órdenes recibidas, listas para el buscador.
 *
 * El tipo de servicio se lee de su ranura de una sola vez y no con un hook
 * por orden: el número de recepciones cambia entre renderizados, y un hook
 * por fila rompería la regla de los hooks en cuanto alguien cierre la
 * siguiente recepción.
 */
export function useReceptionTargets(): readonly ReceptionOrderTarget[] {
  const { receptions } = useReceptions();

  return useMemo(
    () =>
      receptionOrderTargets(receptions, (orderId) => {
        const value = readSlot<string>(serviceTypeSlot(orderId));
        return typeof value === 'string' ? value : '';
      }),
    [receptions],
  );
}

/** Cuántas órdenes abrió la recepción en este navegador. Para el contador del menú. */
export function useReceptionOrderCount(): number {
  return useReceptions().receptions.length;
}

export { orderIdForReception };
