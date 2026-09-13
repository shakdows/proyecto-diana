/**
 * Las fichas que la recepción puede traer.
 *
 * ── El hueco que cierra ────────────────────────────────────────────────────
 *
 * El paso 1 armaba su lista desde el TABLERO, o sea solo los vehículos con
 * orden abierta. Un cliente de siempre que viene por primera vez este mes no
 * estaba; uno recién dado de alta, tampoco. El asesor tecleaba una placa que
 * existe, la pantalla decía «no encontramos esa placa · puede ser la primera
 * visita», y se creaba un duplicado del vehículo y a veces del cliente.
 *
 * La lista sale ahora de la CARTERA: todos los clientes con todos sus
 * vehículos, tengan o no trabajo en el taller hoy.
 */

import type { DemoCustomer, DemoVehicle } from '@/features/customers/demo';
import { displayName } from '@/features/customers/services/identity';
import { vocabularyFor } from '@/features/equipment/services/equipment-kind';

export interface KnownVehicle {
  readonly plate: string;
  readonly vehicle: string;
  readonly brand: string;
  readonly model: string;
  readonly modelYear: number;
  readonly usage: number;
  readonly usageUnit: string;
  readonly color: string;
  readonly customer: string;
  readonly corporateClient: string | null;
  readonly phone: string;
  readonly email: string;
  readonly docLast3: string;
  /** Para volver a su ficha y para saber a quién pertenece. */
  readonly customerId: string;
}

export function knownFrom(
  customer: DemoCustomer,
  vehicle: DemoVehicle,
): KnownVehicle {
  const completo = `${vehicle.brand} ${vehicle.model}`.trim();

  return {
    plate: vehicle.plate,
    vehicle: completo,
    brand: vehicle.brand,
    model: vehicle.model,
    modelYear: vehicle.modelYear,
    usage: vehicle.mileage,
    usageUnit: vocabularyFor(vehicle.equipmentKind).usageUnit,
    color: vehicle.color,
    customer: displayName(customer),
    corporateClient: customer.corporateClient,
    /* Cadena vacía y no `null`: la tarjeta del paso 1 pinta el valor tal
       cual, y un `null` saldría escrito como «null» en pantalla. */
    phone: customer.phone ?? '',
    email: customer.email ?? '',
    docLast3: customer.documentLast,
    customerId: customer.id,
  };
}

/** Toda la cartera, aplanada a vehículos. */
export function knownVehicles(
  customers: readonly DemoCustomer[],
): readonly KnownVehicle[] {
  return customers.flatMap((c) => c.vehicles.map((v) => knownFrom(c, v)));
}
