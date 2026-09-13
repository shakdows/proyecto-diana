'use client';

import { useCallback, useMemo } from 'react';
import { usePersistentState } from '@/lib/demo/store';
import type { DemoCustomer } from './demo';

/**
 * Los clientes creados desde la pantalla, mientras no haya base de datos.
 *
 * ── Por qué esto existe ────────────────────────────────────────────────────
 *
 * El resto del recorrido ya persiste en el navegador: el checklist de la
 * recepción, la autorización del presupuesto, la inspección de calidad, la
 * entrega, la encuesta. Clientes era la única pantalla que decía «no se
 * guardó» y devolvía al usuario a una lista idéntica a la de antes. Quien lo
 * prueba no concluye «falta la base»: concluye que el botón no funciona, y
 * deja de probar el resto.
 *
 * ── Lo que esto NO es ──────────────────────────────────────────────────────
 *
 * No es la base de datos y no la sustituye. Vive en `localStorage`, o sea:
 *
 *   · Es de ESTE navegador. Lo creado en el móvil no está en el portátil, y
 *     nadie más lo ve.
 *   · No pasa por RLS, porque no hay servidor de por medio. La frontera de
 *     seguridad sigue siendo la base; esto es una maqueta que la espera.
 *   · Se borra entero con «Comenzar de nuevo», igual que el resto de la
 *     demostración.
 *
 * Todo lo que se guarda aquí lleva `isDemo: true` y un identificador que
 * empieza por `nuevo-`. Cuando llegue el `INSERT` con RLS, este archivo se
 * borra y las pantallas que lo usan cambian una línea.
 */

/** La ranura en `localStorage`. La barre «Comenzar de nuevo». */
const RANURA = 'clientes.nuevos';

/* Referencia estable: `usePersistentState` la lleva en las dependencias de su
   `useCallback`, y un `[]` nuevo en cada render lo recrearía sin parar. */
const NINGUNO: readonly DemoCustomer[] = [];

export function useCreatedCustomers(): {
  /** Los creados, el más reciente primero. */
  readonly created: readonly DemoCustomer[];
  readonly add: (customer: DemoCustomer) => void;
} {
  const [created, setCreated] = usePersistentState<readonly DemoCustomer[]>(RANURA, NINGUNO);

  const add = useCallback(
    (customer: DemoCustomer): void => {
      setCreated((prev) => [customer, ...prev]);
    },
    [setCreated],
  );

  return useMemo(() => ({ created, add }), [created, add]);
}

/**
 * La cartera entera: lo creado aquí delante de lo sembrado.
 *
 * Delante a propósito. Quien acaba de crear un cliente lo busca arriba, y
 * dejarlo al final de catorce filas se lee exactamente igual que no haberlo
 * guardado.
 */
export function useAllCustomers(seeded: readonly DemoCustomer[]): {
  readonly customers: readonly DemoCustomer[];
  readonly add: (customer: DemoCustomer) => void;
} {
  const { created, add } = useCreatedCustomers();
  const customers = useMemo(() => [...created, ...seeded], [created, seeded]);
  return useMemo(() => ({ customers, add }), [customers, add]);
}
