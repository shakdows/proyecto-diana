/**
 * Buscar personas desde la recepción.
 *
 * Vive aparte de `intake.ts` para no atar la puerta del taller al buscador de
 * clientes: `lookupReception` recibe la función, así que se puede probar con
 * una falsa y cambiar el buscador real sin tocar la recepción.
 */

import { toSearchable, type DemoCustomer } from '@/features/customers/demo';
import { searchCustomers } from '@/features/customers/services/search';

export function searchPeople(
  customers: readonly DemoCustomer[],
  query: string,
): readonly DemoCustomer[] {
  /* La placa ya la resolvió `lookupPlate`. Aquí interesa lo demás —nombre,
     documento, teléfono, correo—, y con menos de tres caracteres la respuesta
     sería media cartera. */
  if (query.trim().length < 3) return [];

  const porId = new Map(customers.map((c) => [c.id, c]));
  return searchCustomers(customers.map(toSearchable), query)
    .map((s) => porId.get(s.id))
    .filter((c): c is DemoCustomer => c !== undefined);
}
