'use client';

import { useCallback, useMemo } from 'react';
import { usePersistentState } from '@/lib/demo/store';
import type { DemoCustomer, DemoVehicle } from './demo';
import {
  SIN_CAMBIOS,
  applyEdit,
  applyEdits,
  withFields,
  withVehicle,
  type CustomerEdits,
  type EditableFields,
} from './services/edit';

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

/** Las ranuras en `localStorage`. Las barre «Comenzar de nuevo». */
const RANURA = 'clientes.nuevos';
const RANURA_CAMBIOS = 'clientes.cambios';

/* Referencia estable: `usePersistentState` la lleva en las dependencias de su
   `useCallback`, y un `[]` nuevo en cada render lo recrearía sin parar. */
const NINGUNO: readonly DemoCustomer[] = [];

/**
 * Lo editado y los vehículos añadidos, por cliente.
 *
 * Va aparte de los creados a propósito: un cambio en el teléfono de un
 * cliente SEMBRADO no puede guardarse como un cliente nuevo —ver
 * `services/edit.ts`, que explica por qué se guarda el parche y no la fila—.
 */
export function useCustomerEdits(): {
  readonly edits: CustomerEdits;
  readonly editFields: (id: string, fields: Partial<EditableFields>) => void;
  readonly addVehicle: (id: string, vehicle: DemoVehicle) => void;
} {
  const [edits, setEdits] = usePersistentState<CustomerEdits>(RANURA_CAMBIOS, SIN_CAMBIOS);

  const editFields = useCallback(
    (id: string, fields: Partial<EditableFields>): void => {
      setEdits((prev) => withFields(prev, id, fields));
    },
    [setEdits],
  );

  const addVehicle = useCallback(
    (id: string, vehicle: DemoVehicle): void => {
      setEdits((prev) => withVehicle(prev, id, vehicle));
    },
    [setEdits],
  );

  return useMemo(() => ({ edits, editFields, addVehicle }), [edits, editFields, addVehicle]);
}

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
  readonly editFields: (id: string, fields: Partial<EditableFields>) => void;
  readonly addVehicle: (id: string, vehicle: DemoVehicle) => void;
} {
  const { created, add } = useCreatedCustomers();
  const { edits, editFields, addVehicle } = useCustomerEdits();

  const customers = useMemo(
    () => applyEdits([...created, ...seeded], edits),
    [created, seeded, edits],
  );

  return useMemo(
    () => ({ customers, add, editFields, addVehicle }),
    [customers, add, editFields, addVehicle],
  );
}

/**
 * Un cliente suelto, con sus cambios ya aplicados.
 *
 * Lo usa la ficha, que recibe el cliente del servidor —o no lo recibe, si se
 * creó en este navegador— y necesita enseñarlo con lo editado encima.
 */
export function useCustomer(
  id: string,
  seeded: DemoCustomer | undefined,
): {
  readonly customer: DemoCustomer | undefined;
  readonly editFields: (fields: Partial<EditableFields>) => void;
  readonly addVehicle: (vehicle: DemoVehicle) => void;
} {
  const { created } = useCreatedCustomers();
  const { edits, editFields, addVehicle } = useCustomerEdits();

  const base = seeded ?? created.find((c) => c.id === id);
  const customer = useMemo(
    () => (base === undefined ? undefined : applyEdit(base, edits[id])),
    [base, edits, id],
  );

  const editarCampos = useCallback(
    (fields: Partial<EditableFields>): void => {
      editFields(id, fields);
    },
    [editFields, id],
  );

  const añadirVehiculo = useCallback(
    (vehicle: DemoVehicle): void => {
      addVehicle(id, vehicle);
    },
    [addVehicle, id],
  );

  return useMemo(
    () => ({ customer, editFields: editarCampos, addVehicle: añadirVehiculo }),
    [customer, editarCampos, añadirVehiculo],
  );
}
