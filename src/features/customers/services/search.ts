/**
 * Búsqueda de clientes y detección de duplicados.
 *
 * Son dos preguntas distintas que la gente confunde:
 *
 *   · BUSCAR es «enséñame lo que se parezca a esto». Tolerante, parcial,
 *     ordenada por relevancia. Sirve para encontrar.
 *   · DUPLICAR es «¿esta persona YA está?». Estricta, exacta sobre las claves
 *     que identifican a alguien. Sirve para no crear dos veces al mismo.
 *
 * Una búsqueda tolerante usada como control de duplicados llena la pantalla de
 * falsos positivos y se acaba ignorando. Un control estricto usado como
 * búsqueda no encuentra nada. Por eso van separadas.
 */

import { normalizeDocument, phoneKey } from './identity';
import type { CustomerKind, DocumentType } from './identity';

export interface SearchableCustomer {
  readonly id: string;
  readonly kind: CustomerKind;
  readonly name: string;
  readonly documentType: DocumentType;
  /** Solo los últimos caracteres: el completo no sale de la base. */
  readonly documentLast: string;
  readonly phone: string | null;
  readonly email: string | null;
  readonly corporateClient: string | null;
  /** Placas de sus vehículos, ya normalizadas. */
  readonly plates: readonly string[];
}

/** Minúsculas, sin acentos, sin signos. */
export function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, ' ')
    .trim();
}

/** Placa comparable: mayúsculas, sin guiones ni espacios. */
export function plateKey(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/gu, '').toUpperCase();
}

/**
 * Puntuación de una coincidencia. Cuanto más alto, antes sale.
 *
 * El orden no es cosmético: quien busca «987» con el cliente al teléfono
 * espera ver primero al que TIENE ese teléfono, no al que vive en el número
 * 987 de una calle.
 */
function score(customer: SearchableCustomer, query: string): number {
  const q = fold(query);
  if (q === '') return 0;

  const qPlate = plateKey(query);
  const qDigits = query.replace(/\D/gu, '');

  // Placa exacta: es el caso del asesor con el vehículo delante.
  if (qPlate.length >= 5 && customer.plates.some((p) => plateKey(p) === qPlate)) return 100;
  if (qPlate.length >= 3 && customer.plates.some((p) => plateKey(p).startsWith(qPlate))) return 80;

  // Teléfono: los últimos nueve dígitos.
  if (qDigits.length >= 6 && customer.phone !== null) {
    const key = phoneKey(customer.phone);
    if (key === qDigits.slice(-9)) return 95;
    if (key.includes(qDigits)) return 70;
  }

  /*
   * Documento. La pantalla solo conoce los TRES ÚLTIMOS caracteres —la base
   * guarda el número entero con `REVOKE SELECT`—, así que hay dos formas de
   * teclearlo y cada una compara al revés que la otra:
   *
   *   · Los tres que se ven en la ficha: «275» contra `documentLast`.
   *   · EL DOCUMENTO ENTERO, que es lo que hace quien tiene el DNI en la mano
   *     en el mostrador. Ahí lo tecleado es más largo que lo guardado, así
   *     que se compara la COLA de lo tecleado. Al revés —como estaba— nunca
   *     casaba: «156».endsWith('71234156') es falso siempre, y la recepción
   *     decía «no encontrado» con el documento correcto delante.
   *
   * Es una lista de candidatos, no una identificación: varios documentos
   * acaban en los mismos tres. Por eso puntúa por debajo del teléfono y por
   * eso la ficha enseña el enmascarado, para confirmar mirando. Cuando haya
   * base, esto lo resuelve exacto el HMAC de `document_hash`.
   */
  const qDoc = normalizeDocument(query);
  if (customer.documentLast !== '') {
    if (qDigits.length >= 2 && customer.documentLast.endsWith(qDigits)) return 75;

    /*
     * Lo tecleado tiene que PARECER un documento antes de compararlo como tal.
     *
     * Sin este filtro, «V2K481» —una placa de seis— casaba con cualquier
     * documento acabado en 481, y buscar una placa devolvía dos clientes: el
     * dueño del coche y un desconocido. Lo cazó la prueba que exige que cada
     * placa lleve a un solo cliente.
     *
     * Una placa peruana son seis con letras; un DNI son ocho cifras y un RUC
     * once. Así que: todo cifras, desde seis; con letras —carné, pasaporte—,
     * desde siete, que es donde ya no puede ser una placa.
     */
    const soloCifras = qDoc === qDigits;
    const pareceDocumento = soloCifras ? qDoc.length >= 6 : qDoc.length >= 7;
    if (pareceDocumento && qDoc.endsWith(customer.documentLast)) return 72;
  }

  const name = fold(customer.name);
  if (name === q) return 90;
  if (name.startsWith(q)) return 65;
  // Cada palabra del nombre: «perez» encuentra a «Juan Pérez García».
  if (name.split(' ').some((w) => w.startsWith(q))) return 55;
  if (name.includes(q)) return 40;

  if (customer.email !== null && fold(customer.email).includes(q)) return 45;
  if (customer.corporateClient !== null && fold(customer.corporateClient).includes(q)) return 30;

  return 0;
}

export function searchCustomers(
  customers: readonly SearchableCustomer[],
  query: string,
): readonly SearchableCustomer[] {
  if (query.trim() === '') return customers;

  return customers
    .map((c) => ({ c, s: score(c, query) }))
    .filter((x) => x.s > 0)
    // A igual puntuación, orden alfabético: el resultado no puede depender de
    // en qué orden vino la lista, o la misma búsqueda daría dos respuestas.
    .sort((a, b) => b.s - a.s || a.c.name.localeCompare(b.c.name, 'es'))
    .map((x) => x.c);
}

export type DuplicateReason = 'documento' | 'telefono' | 'correo';

export interface Duplicate {
  readonly customer: SearchableCustomer;
  readonly reason: DuplicateReason;
}

export interface DuplicateQuery {
  readonly documentType?: DocumentType;
  /** Últimos dígitos del documento que se está escribiendo. */
  readonly documentLast?: string;
  readonly phone?: string;
  readonly email?: string;
}

/**
 * ¿Ya existe esta persona?
 *
 * Estricta a propósito: mismo documento, mismo teléfono o mismo correo. Nada
 * de parecidos de nombre —hay muchos «Juan Pérez» y avisar por eso enseña a
 * ignorar el aviso—.
 *
 * El documento se compara por sus últimos caracteres porque es lo único que la
 * interfaz tiene. En la base la comparación de verdad es contra
 * `document_hash`, que es exacta sin leer el documento; esto es el aviso
 * temprano mientras se escribe, no el control final.
 */
export function findDuplicates(
  customers: readonly SearchableCustomer[],
  query: DuplicateQuery,
): readonly Duplicate[] {
  const out: Duplicate[] = [];
  const seen = new Set<string>();

  const add = (customer: SearchableCustomer, reason: DuplicateReason): void => {
    if (seen.has(customer.id)) return;
    seen.add(customer.id);
    out.push({ customer, reason });
  };

  const docLast = (query.documentLast ?? '').replace(/[^0-9a-zA-Z]/gu, '').toUpperCase();
  if (docLast.length >= 3 && query.documentType !== undefined) {
    for (const c of customers) {
      if (c.documentType === query.documentType && c.documentLast.endsWith(docLast.slice(-3))) {
        add(c, 'documento');
      }
    }
  }

  const phone = phoneKey(query.phone ?? '');
  if (phone.length === 9) {
    for (const c of customers) {
      if (c.phone !== null && phoneKey(c.phone) === phone) add(c, 'telefono');
    }
  }

  const email = (query.email ?? '').trim().toLowerCase();
  if (email.includes('@')) {
    for (const c of customers) {
      if (c.email !== null && c.email.trim().toLowerCase() === email) add(c, 'correo');
    }
  }

  return out;
}

export const DUPLICATE_LABELS: Readonly<Record<DuplicateReason, string>> = {
  documento: 'mismo documento',
  telefono: 'mismo teléfono',
  correo: 'mismo correo',
};

/* ------------------------------------------------------------------ *
 * Filtro por naturaleza
 * ------------------------------------------------------------------ */

export type DirectoryFilter = 'todos' | 'personas' | 'empresas';

export const FILTER_LABELS: Readonly<Record<DirectoryFilter, string>> = {
  todos: 'Todos',
  personas: 'Personas',
  empresas: 'Empresas',
};

/**
 * Cuántos hay de cada clase.
 *
 * Se cuenta sobre la cartera ENTERA y no sobre lo que la búsqueda deja a la
 * vista: los números de las pestañas dicen cuánta gente hay, no cuánta
 * coincide con lo que se está tecleando. Contarlos sobre el resultado haría
 * que las tres cifras cambiaran con cada letra, que es exactamente lo que
 * convierte un dato en ruido.
 */
export function countByKind(
  customers: readonly { readonly kind: 'persona' | 'empresa' }[],
): Readonly<Record<DirectoryFilter, number>> {
  let personas = 0;
  for (const c of customers) if (c.kind === 'persona') personas += 1;
  return {
    todos: customers.length,
    personas,
    empresas: customers.length - personas,
  };
}

export function applyFilter<T extends { readonly kind: 'persona' | 'empresa' }>(
  customers: readonly T[],
  filter: DirectoryFilter,
): readonly T[] {
  if (filter === 'todos') return customers;
  const want = filter === 'personas' ? 'persona' : 'empresa';
  return customers.filter((c) => c.kind === want);
}
