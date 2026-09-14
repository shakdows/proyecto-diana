/**
 * Notas del taller.
 *
 * ── Qué había ──────────────────────────────────────────────────────────────
 *
 * Un panel con las notas sembradas y un botón «Agregar nota» sin nada detrás.
 * El mismo patrón que «Agregar foto» en el checklist: un control que promete
 * y no cumple. Aquí importa más de lo que parece, porque la nota del taller es
 * la que se lee meses después —«se recomendó revisar discos y el cliente no
 * autorizó»— cuando hay una reclamación.
 *
 * ── Reglas ─────────────────────────────────────────────────────────────────
 *
 * Una nota NO SE EDITA NI SE BORRA. Se corrige añadiendo otra. Un registro que
 * se puede reescribir después no sirve para respaldar nada, y este es el que
 * tiene que aguantar una discusión con el cliente. Es la misma decisión que en
 * el acta de recepción, donde corregir deja rastro en vez de sobrescribir.
 *
 * Dominio PURO: sin React, sin almacenamiento, sin `Date.now()` escondido.
 */

export interface WorkshopNote {
  readonly id: string;
  readonly text: string;
  /** Epoch en milisegundos. */
  readonly at: number;
  readonly author: string;
}

export const MIN_NOTE = 4;
export const MAX_NOTE = 600;

export function noteSlot(orderId: string): string {
  return `orden.${orderId}.notas`;
}

/** Limpia sin destruir: colapsa espacios y saltos sobrantes, respeta párrafos. */
export function cleanNote(text: string): string {
  return text
    .replace(/\r\n/gu, '\n')
    .replace(/[ \t]+/gu, ' ')
    .replace(/\n{3,}/gu, '\n\n')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .trim();
}

export interface NoteCheck {
  readonly valid: boolean;
  readonly error: string | null;
}

export function checkNote(text: string): NoteCheck {
  const limpio = cleanNote(text);
  if (limpio.length === 0) return { valid: false, error: null };
  if (limpio.length < MIN_NOTE) {
    return { valid: false, error: `Escribe al menos ${MIN_NOTE} caracteres.` };
  }
  if (limpio.length > MAX_NOTE) {
    return { valid: false, error: `Máximo ${MAX_NOTE} caracteres; llevas ${limpio.length}.` };
  }
  return { valid: true, error: null };
}

/**
 * El identificador lleva el instante dentro.
 *
 * No es decorativo: si el almacén se hidrata desde una versión anterior sin
 * fecha, el instante se puede recuperar del identificador en vez de tirar la
 * nota. Es la misma técnica que salvó los clientes creados cuando se añadió
 * la licencia.
 */
export function newNoteId(now: Date, seed: number): string {
  const sufijo = Math.floor(seed * 1e6).toString(36);
  return `nota-${now.getTime()}-${sufijo}`;
}

export function noteFrom(
  text: string,
  author: string,
  now: Date,
  seed: number,
): WorkshopNote | null {
  if (!checkNote(text).valid) return null;
  return { id: newNoteId(now, seed), text: cleanNote(text), at: now.getTime(), author };
}

/** La más reciente primero: es la que alguien abre la orden para leer. */
export function newestFirst(notes: readonly WorkshopNote[]): readonly WorkshopNote[] {
  return [...notes].sort((a, b) => b.at - a.at);
}

/** Hidrata lo guardado y descarta lo que no se reconoce, sin lanzar. */
export function readNotes(stored: unknown): readonly WorkshopNote[] {
  if (!Array.isArray(stored)) return [];
  const out: WorkshopNote[] = [];
  for (const raw of stored) {
    if (typeof raw !== 'object' || raw === null) continue;
    const r = raw as Record<string, unknown>;
    if (typeof r.id !== 'string' || typeof r.text !== 'string') continue;
    const text = cleanNote(r.text);
    if (text.length === 0) continue;
    const at =
      typeof r.at === 'number' && Number.isFinite(r.at) ? r.at : atFromId(r.id);
    if (at === null) continue;
    out.push({
      id: r.id,
      text,
      at,
      author: typeof r.author === 'string' && r.author !== '' ? r.author : 'Desconocido',
    });
  }
  return out;
}

/** `nota-1757000000000-xxxx` → 1757000000000 */
export function atFromId(id: string): number | null {
  const match = /^nota-(\d+)-/u.exec(id);
  if (match === null) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) && value > 0 ? value : null;
}
