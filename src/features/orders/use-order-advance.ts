'use client';

import { useCallback, useMemo } from 'react';
import { usePersistentState } from '@/lib/demo/store';
import { usePhotoCount } from '@/features/evidence/use-photo-count';
import type { JobStep } from '@/features/repairs/services/job-steps';
import { ORDER_STATUSES, type OrderStatus } from './services/order-status';
import {
  advanceSlot,
  applyAction,
  factsAt,
  freshAdvance,
  readAdvance,
  undoLast,
  type AdvanceResult,
  type OrderAdvance,
} from './services/advance';
import { benchSlots, withBenchFacts, type BenchState } from './services/bench-facts';
import type { Actor, OrderAction, OrderFacts } from './services/state-machine';

/*
 * Los valores iniciales viven fuera del componente A PROPÓSITO.
 *
 * `usePersistentState` los mete en las dependencias de su `useCallback`: un
 * `[]` escrito en línea sería un array nuevo en cada renderizado y rehacría el
 * setter cada vez. Con constantes de módulo la identidad es estable.
 */
const SIN_PASOS: readonly JobStep[] = [];
const RELOJ_PARADO = { base: 0, desde: null as number | null };

/**
 * El avance de una orden, con lo que la bahía ya hizo.
 *
 * Junta las dos mitades que hasta ahora no se hablaban: lo que el técnico
 * marcó en `/taller/reparacion` y el estado al que ha llegado la orden. Sin
 * esto, la ficha pedía requisitos que el técnico YA había cumplido.
 */
export function useOrderAdvance({
  orderId,
  orderCode,
  baseStatus,
  baseFacts,
  actor,
  actorName,
}: {
  readonly orderId: string;
  readonly orderCode: string;
  readonly baseStatus: OrderStatus;
  readonly baseFacts: OrderFacts;
  readonly actor: Actor;
  readonly actorName: string;
}): {
  readonly advance: OrderAdvance;
  readonly facts: OrderFacts;
  readonly bench: BenchState | null;
  readonly orderPhotos: number;
  readonly run: (action: OrderAction) => AdvanceResult;
  readonly undo: () => void;
  readonly reset: () => void;
} {
  const slots = useMemo(() => benchSlots(orderCode), [orderCode]);

  const [steps] = usePersistentState<readonly JobStep[]>(slots.steps, SIN_PASOS);
  const [evidenceCount] = usePersistentState<number>(slots.evidence, 0);
  const [finished] = usePersistentState<boolean>(slots.finished, false);
  const [clock] = usePersistentState<{ base: number; desde: number | null }>(
    slots.clock,
    RELOJ_PARADO,
  );

  const bench = useMemo<BenchState | null>(
    () => (steps.length === 0 ? null : { steps, evidenceCount, finished, clock }),
    [steps, evidenceCount, finished, clock],
  );

  /*
   * Las fotos que se suben en la propia ficha son evidencia final igual que
   * las de la bahía. Sin esto, subir la foto en la orden y seguir viendo
   * «adjunta la evidencia final» era el mismo desencuentro de antes, con otro
   * disfraz.
   */
  const orderPhotos = usePhotoCount(`orden-${orderId}`);

  const [stored, setStored] = usePersistentState<unknown>(advanceSlot(orderId), null);

  /*
   * Lo guardado se HIDRATA, no se cree. `readAdvance` descarta lo que no
   * encaja con el estado sembrado y devuelve el avance limpio: un almacén
   * manipulado no puede hacer que la orden pinte «Entregado».
   */
  const advance = useMemo(
    () => readAdvance(baseStatus, stored, ORDER_STATUSES),
    [baseStatus, stored],
  );

  const facts = useMemo(
    () => factsAt(withBenchFacts(baseFacts, bench, orderPhotos), advance),
    [baseFacts, bench, orderPhotos, advance],
  );

  const run = useCallback(
    (action: OrderAction): AdvanceResult => {
      const result = applyAction(
        advance,
        withBenchFacts(baseFacts, bench, orderPhotos),
        action,
        actor,
        actorName,
        new Date(),
      );
      if (result.ok) setStored(result.advance);
      return result;
    },
    [advance, baseFacts, bench, orderPhotos, actor, actorName, setStored],
  );

  const undo = useCallback(() => {
    setStored(undoLast(advance));
  }, [advance, setStored]);

  const reset = useCallback(() => {
    setStored(freshAdvance(baseStatus));
  }, [baseStatus, setStored]);

  return { advance, facts, bench, orderPhotos, run, undo, reset };
}

/**
 * Solo el estado al que ha llegado una orden.
 *
 * Lo usa la LISTA de órdenes. Sin esto, avanzar una orden en su ficha dejaba
 * la lista mostrando el estado sembrado: dos pantallas del mismo sistema
 * diciendo cosas distintas del mismo vehículo, que es peor que no haber
 * avanzado nada.
 *
 * No carga la bahía ni las fotos: la lista no necesita saber si falta la
 * evidencia, solo dónde está la orden.
 */
export function useOrderStatus(orderId: string, baseStatus: OrderStatus): OrderStatus {
  const [stored] = usePersistentState<unknown>(advanceSlot(orderId), null);
  return useMemo(
    () => readAdvance(baseStatus, stored, ORDER_STATUSES).status,
    [baseStatus, stored],
  );
}
