/**
 * Qué cliente acaba de entrar en la cartera.
 *
 * ── Para qué ───────────────────────────────────────────────────────────────
 *
 * Para la recepción sin placa. El asesor que da de alta a alguien y al minuto
 * abre una recepción está buscando A ESE, no a uno de los otros catorce; pero
 * en una lista alfabética su cliente recién creado queda entre dos que no le
 * interesan, y lo que hace es volver a crearlo. Un distintivo durante los
 * primeros días resuelve ese tramo exacto.
 *
 * ── Por qué caduca ─────────────────────────────────────────────────────────
 *
 * Porque si no caducara dejaría de significar nada: a los tres meses media
 * cartera sería «nueva» y la etiqueta pasaría a ser ruido que la vista ignora.
 * Dos días es el tiempo en que la recepción de ese cliente todavía está
 * pendiente o acaba de pasar; después ya es un cliente como cualquier otro y
 * se le busca por su nombre, como a todos.
 */

import type { DemoCustomer } from '../demo';

/** Tras estos días deja de estar marcado. */
export const NEW_CUSTOMER_DAYS = 2;

/**
 * Cuándo se creó, deducido del identificador.
 *
 * Los creados por la pantalla llevan `nuevo-<milisegundos>-<azar>`, así que
 * los que se dieron de alta ANTES de que existiera el campo `createdAt`
 * siguen sabiendo su fecha. Sin esto, todo lo guardado antes de este cambio
 * se quedaría sin distintivo para siempre.
 */
export function createdAtFromId(id: string): string | null {
  const m = /^nuevo-(\d{10,})-/u.exec(id);
  if (m === null) return null;
  const ms = Number(m[1]);
  if (!Number.isFinite(ms) || ms <= 0) return null;
  return new Date(ms).toISOString();
}

/** Días enteros transcurridos. Negativo si la fecha está en el futuro. */
export function daysSince(iso: string, now: Date): number | null {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return null;
  const dia = (ms: number): number => Math.floor(ms / 86_400_000);
  return dia(now.getTime()) - dia(t);
}

export function isNewCustomer(customer: DemoCustomer, now: Date): boolean {
  const creado = customer.createdAt ?? createdAtFromId(customer.id);
  if (creado === null) return false;
  const dias = daysSince(creado, now);
  if (dias === null || dias < 0) return false;
  return dias < NEW_CUSTOMER_DAYS;
}

/** «Nuevo · hoy», «Nuevo · ayer». Dice desde cuándo, no solo que lo es. */
export function newCustomerLabel(customer: DemoCustomer, now: Date): string | null {
  if (!isNewCustomer(customer, now)) return null;
  const creado = customer.createdAt ?? createdAtFromId(customer.id);
  if (creado === null) return null;
  return daysSince(creado, now) === 0 ? 'Nuevo · hoy' : 'Nuevo · ayer';
}

/**
 * Ordena para la recepción: los nuevos primero, el resto por nombre.
 *
 * No es lo mismo que el orden del directorio, y por eso vive aquí. En
 * `/clientes` se consulta una cartera; en una recepción se busca a quien
 * acaba de llegar, y casi siempre es el último que se dio de alta.
 */
export function newestFirst(
  customers: readonly DemoCustomer[],
  now: Date,
  nameOf: (c: DemoCustomer) => string,
): readonly DemoCustomer[] {
  return [...customers].sort((a, b) => {
    const na = isNewCustomer(a, now);
    const nb = isNewCustomer(b, now);
    if (na !== nb) return na ? -1 : 1;
    return nameOf(a).localeCompare(nameOf(b), 'es');
  });
}
