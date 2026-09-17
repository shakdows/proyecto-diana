'use client';

import { useCallback, useMemo } from 'react';
import { usePersistentState } from '@/lib/demo/store';
import { DEMO_PEOPLE, demoProfileId } from '@/lib/auth/demo-people';
import { ROLE_LABELS, ROLE_PERMISSIONS } from '@/lib/auth/permissions';
import {
  assignableTechnicians,
  readWorkfile,
  workfileSlot,
  type OrderWorkfile,
  type Technician,
} from './services/workfile';

/**
 * El expediente de una orden, vivo.
 *
 * Se puede llamar desde dos sitios a la vez —el panel que escribe y el cálculo
 * de hechos que lee— porque `usePersistentState` está construido sobre
 * `useSyncExternalStore`: las dos instancias se suscriben al mismo almacén y
 * se enteran del mismo cambio. Sin eso habría que subir el estado a un
 * contexto y pasarlo a mano por media pantalla.
 */
export function useOrderWorkfile(orderId: string): {
  readonly workfile: OrderWorkfile;
  readonly update: (fn: (previous: OrderWorkfile) => OrderWorkfile) => void;
} {
  const [stored, setStored] = usePersistentState<unknown>(workfileSlot(orderId), null);

  const workfile = useMemo(() => readWorkfile(stored), [stored]);

  /*
   * El actualizador recibe SIEMPRE lo que hay guardado, no lo que este
   * componente leyó al renderizarse. Dos pulsaciones seguidas en la misma
   * pasada —marcar dos trabajos, por ejemplo— perderían la primera si
   * partieran del mismo valor viejo.
   */
  const update = useCallback(
    (fn: (previous: OrderWorkfile) => OrderWorkfile): void => {
      setStored((previous: unknown) => fn(readWorkfile(previous)));
    },
    [setStored],
  );

  return { workfile, update };
}

/**
 * Los técnicos a los que se puede asignar la orden.
 *
 * Sale de los permisos, no de una lista escrita a mano: un puesto nuevo de
 * taller aparece aquí solo. Es una constante de módulo porque no depende de
 * nada que cambie en ejecución.
 */
export const TECHNICIANS: readonly Technician[] = assignableTechnicians(
  DEMO_PEOPLE,
  ROLE_PERMISSIONS,
  ROLE_LABELS,
  demoProfileId,
);
