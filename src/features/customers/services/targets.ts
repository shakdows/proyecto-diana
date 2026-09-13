/**
 * Los clientes, como entradas de la búsqueda universal.
 *
 * ── El hueco que cierra ────────────────────────────────────────────────────
 *
 * La caja de arriba dice «Buscar placa, orden o cliente…» y el comentario de
 * la paleta dice que alcanza «vehículos, órdenes, clientes y pantallas». No
 * alcanzaba clientes: solo se indexaban las ÓRDENES abiertas. O sea que un
 * cliente sin orden en el taller —la mayor parte de la cartera de cualquier
 * taller, y absolutamente todos los que alguien acaba de dar de alta— no
 * existía para la búsqueda que promete encontrarlo.
 *
 * ── Lo que NO entra en el índice ───────────────────────────────────────────
 *
 * El documento completo y el número de licencia. La pantalla solo conoce los
 * tres últimos del documento, y la licencia es dato personal que no tiene por
 * qué asomar en una lista de resultados que se proyecta en un mostrador. Se
 * busca por nombre, teléfono, correo, empresa y placa, que es como la gente
 * pide a un cliente.
 */

import type { DemoCustomer } from '../demo';
import { displayName } from './identity';

export interface CustomerTarget {
  readonly id: string;
  readonly href: string;
  readonly kind: 'cliente';
  readonly title: string;
  readonly subtitle?: string;
  readonly plate?: string;
  readonly haystack: string;
}

export function customerTargets(
  customers: readonly DemoCustomer[],
): readonly CustomerTarget[] {
  return customers.map((customer) => {
    const nombre = displayName(customer);
    const placas = customer.vehicles.map((v) => v.plate);
    const enTaller = customer.vehicles.find((v) => v.openOrderId !== null);

    /* El subtítulo dice lo que distingue a este cliente de otro con el mismo
       nombre: su empresa, o su coche, o cuántos tiene. Repetir «Cliente» en
       las ocho filas no distingue nada. */
    const detalle =
      customer.corporateClient ??
      (placas.length === 0
        ? 'Sin vehículos'
        : placas.length === 1
          ? `${customer.vehicles[0]?.brand ?? ''} ${customer.vehicles[0]?.model ?? ''}`.trim()
          : `${String(placas.length)} vehículos`);

    return {
      id: `cliente-${customer.id}`,
      href: `/clientes/${customer.id}`,
      kind: 'cliente' as const,
      title: nombre,
      subtitle: detalle === '' ? undefined : detalle,
      /* La placa del que está EN EL TALLER, si lo hay: es la que se teclea
         cuando se busca a alguien mientras su coche está aquí. */
      ...(enTaller === undefined ? {} : { plate: enTaller.plate }),
      haystack: [
        nombre,
        customer.phone ?? '',
        customer.altPhone ?? '',
        customer.email ?? '',
        customer.corporateClient ?? '',
        ...placas,
      ].join(' '),
    };
  });
}
