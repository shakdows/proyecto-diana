'use client';

import { useCallback, useMemo } from 'react';
import { usePersistentState } from '@/lib/demo/store';
import type { DemoCustomer, DemoVehicle } from './demo';
import { removalKind } from './services/removal';
import { hydrateCustomers } from './services/stored';
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
/** Los que se quitaron. Solo ids: la fila del catálogo la manda el servidor. */
const RANURA_QUITADOS = 'clientes.quitados';

/* Referencia estable: `usePersistentState` la lleva en las dependencias de su
   `useCallback`, y un `[]` nuevo en cada render lo recrearía sin parar. */
const NINGUNO: readonly DemoCustomer[] = [];
const NINGUNO_ID: readonly string[] = [];

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
  readonly remove: (id: string) => void;
} {
  const [guardados, setCreated] = usePersistentState<readonly DemoCustomer[]>(RANURA, NINGUNO);

  /*
   * Se pone en forma al LEER, no al escribir.
   *
   * Un cliente guardado ayer no tiene los campos que el código añadió hoy, y
   * con eso la ficha reventaba entera. Ver `services/stored.ts`, que explica
   * por qué se migra en vez de descartar.
   */
  const created = useMemo(() => hydrateCustomers(guardados), [guardados]);

  const add = useCallback(
    (customer: DemoCustomer): void => {
      setCreated((prev) => [customer, ...prev]);
    },
    [setCreated],
  );

  const remove = useCallback(
    (id: string): void => {
      setCreated((prev) => prev.filter((c) => c.id !== id));
    },
    [setCreated],
  );

  return useMemo(() => ({ created, add, remove }), [created, add, remove]);
}

/**
 * Los clientes del catálogo que se quitaron de la vista.
 *
 * Un cliente sembrado no se puede borrar: lo manda el servidor en cada carga.
 * Lo único que cabe es no enseñarlo, y eso se guarda como una lista de ids
 * —no como una copia de la fila—, para que el día que el servidor cambie ese
 * cliente no quede aquí una versión congelada de algo que además está oculto.
 */
export function useHiddenCustomers(): {
  readonly hidden: readonly string[];
  readonly hide: (id: string) => void;
} {
  const [hidden, setHidden] = usePersistentState<readonly string[]>(RANURA_QUITADOS, NINGUNO_ID);

  const hide = useCallback(
    (id: string): void => {
      setHidden((prev) => (prev.includes(id) ? prev : [...prev, id]));
    },
    [setHidden],
  );

  return useMemo(() => ({ hidden, hide }), [hidden, hide]);
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
  const { hidden } = useHiddenCustomers();

  const customers = useMemo(() => {
    const quitados = new Set(hidden);
    return applyEdits(
      [...created, ...seeded].filter((c) => !quitados.has(c.id)),
      edits,
    );
  }, [created, seeded, edits, hidden]);

  return useMemo(
    () => ({ customers, add, editFields, addVehicle }),
    [customers, add, editFields, addVehicle],
  );
}

/**
 * Quitar un cliente, sea de donde sea.
 *
 * Una sola función para las dos cosas que pueden pasar —borrar el creado aquí,
 * ocultar el del catálogo— porque quien la llama no debería tener que
 * decidirlo: `removalKind` ya lo sabe mirando el identificador, y la pantalla
 * ya se lo dijo al usuario antes de pulsar.
 */
export function useRemoveCustomer(): (id: string) => void {
  const { remove } = useCreatedCustomers();
  const { hide } = useHiddenCustomers();

  return useCallback(
    (id: string): void => {
      if (removalKind(id) === 'creado') remove(id);
      else hide(id);
    },
    [remove, hide],
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
  const { hidden } = useHiddenCustomers();

  /* Un cliente quitado no tiene ficha: entrar por la URL a la de alguien que
     acabas de eliminar y verla entera diría que no se eliminó. */
  const base = hidden.includes(id) ? undefined : (seeded ?? created.find((c) => c.id === id));
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
