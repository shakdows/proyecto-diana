/**
 * Reglas del almacén de la demostración.
 *
 * Puro y probado: lo que decide si un dato guardado se puede usar o hay que
 * tirarlo no puede vivir mezclado con el acceso a `localStorage`, porque es
 * justo lo que hay que poder probar sin navegador.
 */

/**
 * Versión del formato guardado.
 *
 * SÚBELA cuando cambie la forma de lo que se guarda. Un objeto viejo al que
 * le falta un campo nuevo no revienta: renderiza mal y en silencio, que es
 * peor. Al subir la versión, lo viejo se descarta y la pantalla vuelve a su
 * estado inicial, que es honesto y recuperable.
 */
export const STORE_VERSION = 1;

export const STORE_PREFIX = 'diana.demo';

/** `diana.demo.v1.checklist` */
export function keyFor(slot: string): string {
  return `${STORE_PREFIX}.v${STORE_VERSION}.${slot}`;
}

/** Reconoce cualquier clave nuestra, incluidas las de versiones anteriores. */
export function isOwnKey(key: string): boolean {
  return key.startsWith(`${STORE_PREFIX}.`);
}

export function isCurrentKey(key: string): boolean {
  return key.startsWith(`${STORE_PREFIX}.v${STORE_VERSION}.`);
}

export interface Envelope<T> {
  readonly v: number;
  readonly at: number;
  readonly data: T;
}

export function wrap<T>(data: T, now: number): Envelope<T> {
  return { v: STORE_VERSION, at: now, data };
}

/**
 * Lee lo guardado y decide si sirve.
 *
 * Devuelve `null` ante cualquier duda —JSON roto, versión distinta, sobre sin
 * forma de sobre—, y quien llama usa su valor inicial. Nunca lanza: un dato
 * corrupto en el navegador de alguien no puede dejar la pantalla en blanco.
 */
export function unwrap<T>(raw: string | null): T | null {
  if (raw === null || raw === '') return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (typeof parsed !== 'object' || parsed === null) return null;
  const envelope = parsed as Partial<Envelope<T>>;
  if (envelope.v !== STORE_VERSION) return null;
  if (!('data' in envelope)) return null;

  return envelope.data as T;
}

export interface StoredSummary {
  readonly slots: number;
  readonly bytes: number;
  /** Marca de tiempo del guardado más reciente, o `null` si no hay nada. */
  readonly lastSavedAt: number | null;
}

/**
 * Resumen de lo guardado, para poder decirle a alguien QUÉ va a borrar.
 *
 * Un botón de «comenzar de nuevo» que no dice cuánto se lleva por delante se
 * pulsa por error una vez y ya no se vuelve a usar nunca.
 */
export function summarize(entries: readonly (readonly [string, string])[]): StoredSummary {
  const mine = entries.filter(([k]) => isCurrentKey(k));
  let lastSavedAt: number | null = null;
  let bytes = 0;

  for (const [key, value] of mine) {
    bytes += key.length + value.length;
    try {
      const at = (JSON.parse(value) as Partial<Envelope<unknown>>).at;
      if (typeof at === 'number' && (lastSavedAt === null || at > lastSavedAt)) lastSavedAt = at;
    } catch {
      /* un valor ilegible cuenta en el tamaño pero no aporta fecha */
    }
  }

  return { slots: mine.length, bytes, lastSavedAt };
}
