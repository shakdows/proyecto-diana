/**
 * Las fotos que se toman durante la atención.
 *
 * Un rayón anotado sin foto no prueba nada. El checklist de entrada, el
 * defecto que rechaza calidad y la ficha del vehículo necesitan lo mismo:
 * una imagen con fecha, atada a algo concreto. Por eso hay UN módulo y no
 * tres: el límite, el tamaño y el formato no pueden discrepar entre pantallas
 * o la evidencia deja de ser comparable.
 *
 * ── ⚠ ESTO NO ES ALMACENAMIENTO DE VERDAD ─────────────────────────────────
 *
 * Hoy las fotos viven en `localStorage`, como el resto de la demostración: en
 * este navegador, sin servidor, y con un cupo de unos 5 MB para TODO lo
 * guardado. De ahí las dos reglas duras de aquí —se reduce cada imagen antes
 * de guardarla y hay un tope por anclaje—. Sin ellas, la tercera foto de un
 * móvil llena el cupo, y lo que se rompe no es la foto: es el checklist, la
 * autorización y todo lo demás que comparte el mismo espacio.
 *
 * Cuando haya base, esto va a `evidence_files`, que YA existe en el esquema,
 * con el archivo en un bucket PRIVADO y URLs firmadas para verlo. Nunca un
 * bucket público: una foto del taller enseña una placa, un interior y a veces
 * a una persona.
 */

export interface EvidencePhoto {
  readonly id: string;
  /** La imagen ya reducida, como `data:image/jpeg;base64,…`. */
  readonly dataUrl: string;
  /** ISO. Cuándo se tomó o se subió. */
  readonly takenAt: string;
  readonly width: number;
  readonly height: number;
  readonly bytes: number;
  /** `camara` si salió del objetivo; `archivo` si se subió. */
  readonly source: 'camara' | 'archivo';
}

/**
 * Cuántas caben por anclaje.
 *
 * Seis cubre un defecto desde tres ángulos más el detalle, que es lo que se
 * discute después. No es un límite de producto: es el límite de guardar
 * imágenes donde no se deben guardar.
 */
export const MAX_PHOTOS = 6;

/** Lado mayor al que se reduce. A 1280 se lee una placa y un número de serie. */
export const MAX_EDGE = 1280;

/** Calidad JPEG. 0.72 deja un rayón visible y pesa la cuarta parte que 0.92. */
export const JPEG_QUALITY = 0.72;

/**
 * El tamaño al que hay que redibujar, respetando la proporción.
 *
 * Puro y aparte porque es donde se cuela el fallo clásico: usar el lado que
 * no toca y estirar la foto. Una imagen ya pequeña NO se agranda: subirla a
 * 1280 solo añade peso y borrosidad.
 */
export function fitWithin(
  width: number,
  height: number,
  maxEdge: number = MAX_EDGE,
): { readonly width: number; readonly height: number } {
  if (width <= 0 || height <= 0) return { width: 0, height: 0 };
  const mayor = Math.max(width, height);
  if (mayor <= maxEdge) return { width, height };
  const factor = maxEdge / mayor;
  return {
    width: Math.max(1, Math.round(width * factor)),
    height: Math.max(1, Math.round(height * factor)),
  };
}

/** Los bytes reales detrás de un `data:` URL en base64. */
export function bytesOfDataUrl(dataUrl: string): number {
  const coma = dataUrl.indexOf(',');
  if (coma === -1) return 0;
  const b64 = dataUrl.slice(coma + 1);
  const relleno = b64.endsWith('==') ? 2 : b64.endsWith('=') ? 1 : 0;
  return Math.max(0, Math.floor((b64.length * 3) / 4) - relleno);
}

export function totalBytes(photos: readonly EvidencePhoto[]): number {
  return photos.reduce((suma, p) => suma + p.bytes, 0);
}

/** Cuántas caben todavía. Sirve para cortar una selección de veinte archivos. */
export function roomLeft(photos: readonly EvidencePhoto[]): number {
  return Math.max(0, MAX_PHOTOS - photos.length);
}

export function canAddPhotos(photos: readonly EvidencePhoto[]): boolean {
  return roomLeft(photos) > 0;
}

/** La más reciente primero: la foto que importa casi siempre es la última. */
export function addPhotos(
  photos: readonly EvidencePhoto[],
  nuevas: readonly EvidencePhoto[],
): readonly EvidencePhoto[] {
  return [...nuevas, ...photos].slice(0, MAX_PHOTOS);
}

export function removePhoto(
  photos: readonly EvidencePhoto[],
  id: string,
): readonly EvidencePhoto[] {
  return photos.filter((p) => p.id !== id);
}

export function newPhotoId(now: number, seed = ''): string {
  const sufijo = seed === '' ? Math.random().toString(36).slice(2, 6) : seed;
  return `foto-${String(now)}-${sufijo}`;
}

/**
 * Cuándo se tomó, en la frase que se lee debajo de la miniatura.
 *
 * La fecha exacta no dice nada de un vistazo; lo que se quiere saber es si la
 * foto es de esta visita o de hace un año. Pasada la semana sí sale la fecha,
 * porque «hace 83 días» tampoco ayuda.
 */
export function photoWhen(takenAt: string, now: Date): string {
  const t = Date.parse(takenAt);
  if (Number.isNaN(t)) return 'Sin fecha';

  const hora = new Date(t).toLocaleTimeString('es-PE', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const dia = (ms: number): number => Math.floor(ms / 86_400_000);
  const dias = dia(now.getTime()) - dia(t);

  if (dias <= 0) return `Hoy ${hora}`;
  if (dias === 1) return `Ayer ${hora}`;
  if (dias < 7) return `Hace ${String(dias)} días`;
  return new Date(t).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/** «1.2 MB», «340 KB». Para decir cuánto ocupa sin mentir. */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${String(bytes)} B`;
  if (bytes < 1024 * 1024) return `${String(Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Solo imágenes, y no un PDF con la extensión cambiada. */
export function isImage(type: string): boolean {
  return type.startsWith('image/');
}

/**
 * La ranura donde se guardan las fotos de una cosa concreta.
 *
 * Van APARTE del borrador de la recepción a propósito: ese borrador es un
 * JSON que se reescribe entero en cada tecla, y meterle seis imágenes en
 * base64 lo convertiría en megabytes reescritos a cada letra que se teclea en
 * una observación.
 */
export function slotFor(anchor: string): string {
  return `evidencia.${anchor}`;
}
