/**
 * Los cambios hechos desde la pantalla, encima de lo que vino del servidor.
 *
 * ── Por qué un parche y no un cliente entero ───────────────────────────────
 *
 * Los clientes sembrados los DERIVA el servidor de las órdenes abiertas: el
 * teléfono, la empresa y el vehículo salen de la misma fila que pinta el
 * tablero, y eso es lo que impide que dos pantallas se contradigan sobre el
 * dueño de una placa. Si al editar el teléfono guardáramos una copia entera
 * del cliente en el navegador, esa copia se quedaría congelada: la orden
 * avanza, el vehículo cambia de etapa, y la ficha seguiría enseñando la foto
 * del día en que alguien tocó el teléfono.
 *
 * Guardando solo LO QUE CAMBIÓ, el resto sigue viniendo del servidor y sigue
 * moviéndose. Es la misma razón por la que un `UPDATE` toca columnas y no
 * filas enteras.
 *
 * ── Lo que se puede cambiar ────────────────────────────────────────────────
 *
 * Contacto y nombre. NO el documento: la base guarda el número completo con
 * `REVOKE SELECT` y la pantalla solo conoce los tres últimos, así que no hay
 * nada que editar aquí —cambiar el documento de un cliente es fusionar dos
 * identidades, y eso no se hace desde una ficha—.
 */

import type { DemoCustomer, DemoVehicle } from '../demo';

/** Lo que la ficha deja tocar. El documento no está, y es deliberado. */
export interface EditableFields {
  readonly firstName: string | null;
  readonly lastName: string | null;
  readonly businessName: string | null;
  readonly phone: string | null;
  readonly altPhone: string | null;
  readonly email: string | null;
  readonly address: string | null;
  readonly contactPreference: DemoCustomer['contactPreference'];
  readonly corporateClient: string | null;
}

export interface CustomerEdit {
  readonly fields?: Partial<EditableFields>;
  /** Vehículos añadidos desde la ficha. Van DELANTE de los del servidor. */
  readonly addedVehicles?: readonly DemoVehicle[];
}

export type CustomerEdits = Readonly<Record<string, CustomerEdit>>;

export const SIN_CAMBIOS: CustomerEdits = {};

/** Los valores actuales, para rellenar el formulario de edición. */
export function editableFrom(customer: DemoCustomer): EditableFields {
  return {
    firstName: customer.firstName,
    lastName: customer.lastName,
    businessName: customer.businessName,
    phone: customer.phone,
    altPhone: customer.altPhone,
    email: customer.email,
    address: customer.address,
    contactPreference: customer.contactPreference,
    corporateClient: customer.corporateClient,
  };
}

export function applyEdit(customer: DemoCustomer, edit: CustomerEdit | undefined): DemoCustomer {
  if (edit === undefined) return customer;

  const añadidos = edit.addedVehicles ?? [];
  /* Un vehículo añadido a mano puede tener la placa de uno que ya venía del
     servidor —se registró aquí y luego llegó su orden—. En ese caso manda el
     del servidor, que es el que sabe si está en el taller; el de aquí se
     descarta en vez de duplicar la placa en la lista. */
  const delServidor = new Set(customer.vehicles.map((v) => v.plate));
  const nuevos = añadidos.filter((v) => !delServidor.has(v.plate));

  return {
    ...customer,
    ...edit.fields,
    vehicles: [...nuevos, ...customer.vehicles],
  };
}

export function applyEdits(
  customers: readonly DemoCustomer[],
  edits: CustomerEdits,
): readonly DemoCustomer[] {
  return customers.map((c) => applyEdit(c, edits[c.id]));
}

export function withFields(
  edits: CustomerEdits,
  id: string,
  fields: Partial<EditableFields>,
): CustomerEdits {
  const previo = edits[id] ?? {};
  return { ...edits, [id]: { ...previo, fields: { ...previo.fields, ...fields } } };
}

export function withVehicle(
  edits: CustomerEdits,
  id: string,
  vehicle: DemoVehicle,
): CustomerEdits {
  const previo = edits[id] ?? {};
  return {
    ...edits,
    [id]: { ...previo, addedVehicles: [vehicle, ...(previo.addedVehicles ?? [])] },
  };
}

/** Si alguna placa ya está registrada en esta cartera. Evita el duplicado
 *  antes de crearlo, que es cuando todavía se puede. */
export function plateOwner(
  customers: readonly DemoCustomer[],
  plate: string,
): DemoCustomer | undefined {
  return customers.find((c) => c.vehicles.some((v) => v.plate === plate));
}
