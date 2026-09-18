'use client';

import { useCallback, useMemo } from 'react';
import { readSlot, usePersistentState } from '@/lib/demo/store';
import { serviceTypeSlot } from './services/from-reception';
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

  /*
   * El tipo de servicio de antes de que existiera el expediente.
   *
   * Se leía solo al pintar el título, y eso dejaba una orden diciendo dos
   * cosas a la vez: la cabecera con su tipo de servicio, la orden ya enviada a
   * diagnóstico… y el paso uno del expediente marcado «Pendiente». Se mezcla
   * AQUÍ, que es por donde pasan todos —los hechos de la máquina de estados
   * incluidos—, y no en cada pantalla por su cuenta.
   */
  const [legado] = usePersistentState<string>(serviceTypeSlot(orderId), '');

  const workfile = useMemo(() => {
    const leido = readWorkfile(stored);
    if (leido.serviceType.trim() !== '' || legado.trim() === '') return leido;
    return { ...leido, serviceType: legado.trim() };
  }, [stored, legado]);

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

/* ------------------------------------------------------------------ *
 * El tipo de servicio
 * ------------------------------------------------------------------ */

/**
 * Lo que se decidió que se le hace al vehículo.
 *
 * Vive en el expediente, con el resto de decisiones. Antes tenía su propia
 * ranura —`orden.<id>.servicio`— y se editaba con un lápiz junto al título de
 * la orden, donde parecía un detalle del encabezado y en realidad era el
 * requisito que impedía mandarla a diagnóstico.
 *
 * La ranura vieja se sigue LEYENDO: quien tenga una orden a medias de antes
 * de este cambio no puede perder lo que ya había escrito. No se escribe nunca
 * más, así que se apaga sola.
 */
export function useServiceType(orderId: string): {
  readonly serviceType: string;
  readonly setServiceType: (value: string) => void;
} {
  /* La mezcla con la ranura vieja ya la hace `useOrderWorkfile`: aquí solo se
     lee, para que no haya dos sitios donde pueda salir distinta. */
  const { workfile, update } = useOrderWorkfile(orderId);
  const serviceType = workfile.serviceType;

  const setServiceType = useCallback(
    (value: string): void => {
      update((w) => ({ ...w, serviceType: value }));
    },
    [update],
  );

  return { serviceType, setServiceType };
}

/**
 * El mismo dato, de una sola lectura y fuera de un hook.
 *
 * Lo necesita el buscador: el número de recepciones cambia entre
 * renderizados, y un hook por fila rompería la regla de los hooks en cuanto
 * alguien cierre la siguiente recepción.
 */
export function readServiceType(orderId: string): string {
  const delExpediente = readWorkfile(readSlot<unknown>(workfileSlot(orderId))).serviceType.trim();
  if (delExpediente !== '') return delExpediente;
  const viejo = readSlot<string>(serviceTypeSlot(orderId));
  return typeof viejo === 'string' ? viejo.trim() : '';
}
