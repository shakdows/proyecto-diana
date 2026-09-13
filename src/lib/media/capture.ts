'use client';

import {
  JPEG_QUALITY,
  bytesOfDataUrl,
  fitWithin,
  isImage,
  newPhotoId,
  type EvidencePhoto,
} from '@/features/evidence/services/photos';

/**
 * Convertir lo que entrega el navegador en una foto que se pueda guardar.
 *
 * Vive aparte del módulo de dominio porque necesita `canvas`, `Image` y
 * `URL.createObjectURL`: nada de eso existe en el servidor ni en una prueba
 * de Node. La parte que SÍ se puede probar sin navegador —el tamaño, el tope,
 * el peso— está en `features/evidence/services/photos.ts`.
 *
 * ── Por qué se reduce SIEMPRE ──────────────────────────────────────────────
 *
 * Una foto de un móvil son 4000×3000 y entre 3 y 6 MB. Guardarla tal cual en
 * `localStorage` no es «pesado»: es imposible, porque el cupo entero son unos
 * 5 MB para toda la demostración. Reducida a 1280 px y JPEG 0.72 quedan unos
 * 150 KB, y a esa resolución se sigue leyendo una placa y un número de serie,
 * que es para lo que se toma la foto.
 *
 * ── Por qué se pasa por `canvas` y no se guarda el archivo tal cual ────────
 *
 * Además de reducir, redibujar quita los metadatos EXIF —incluida la
 * UBICACIÓN GPS que los móviles graban por defecto—. Una foto del taller con
 * las coordenadas de la casa del cliente dentro es un dato personal que nadie
 * pidió y del que nadie se va a acordar para borrarlo después.
 */

export interface CaptureError {
  readonly kind: 'no-imagen' | 'ilegible' | 'sin-camara' | 'permiso';
  readonly message: string;
}

const MENSAJES: Readonly<Record<CaptureError['kind'], string>> = {
  'no-imagen': 'Ese archivo no es una imagen.',
  ilegible: 'No se pudo leer la imagen. Prueba con otra.',
  'sin-camara': 'Este equipo no tiene cámara. Sube la imagen desde un archivo.',
  permiso: 'No diste permiso para la cámara. Puedes subir la imagen desde un archivo.',
};

export function captureError(kind: CaptureError['kind']): CaptureError {
  return { kind, message: MENSAJES[kind] };
}

export function isCaptureError(value: unknown): value is CaptureError {
  return typeof value === 'object' && value !== null && 'kind' in value && 'message' in value;
}

/** Dibuja lo que se le dé en un lienzo reducido y devuelve el JPEG. */
function drawToJpeg(
  source: CanvasImageSource,
  width: number,
  height: number,
): { dataUrl: string; width: number; height: number } | null {
  const destino = fitWithin(width, height);
  if (destino.width === 0) return null;

  const canvas = document.createElement('canvas');
  canvas.width = destino.width;
  canvas.height = destino.height;

  const ctx = canvas.getContext('2d');
  if (ctx === null) return null;
  /* Sobre blanco: un PNG con transparencia quedaría con el fondo en negro al
     pasar a JPEG, y un rayón sobre negro no se ve. */
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, destino.width, destino.height);
  ctx.drawImage(source, 0, 0, destino.width, destino.height);

  return {
    dataUrl: canvas.toDataURL('image/jpeg', JPEG_QUALITY),
    width: destino.width,
    height: destino.height,
  };
}

function fotoDe(
  dibujo: { dataUrl: string; width: number; height: number },
  source: EvidencePhoto['source'],
  now: Date,
): EvidencePhoto {
  return {
    id: newPhotoId(now.getTime()),
    dataUrl: dibujo.dataUrl,
    takenAt: now.toISOString(),
    width: dibujo.width,
    height: dibujo.height,
    bytes: bytesOfDataUrl(dibujo.dataUrl),
    source,
  };
}

/** Un archivo elegido, o una foto tomada con la cámara del sistema. */
export async function photoFromFile(
  file: File,
  source: EvidencePhoto['source'] = 'archivo',
  now: Date = new Date(),
): Promise<EvidencePhoto | CaptureError> {
  if (!isImage(file.type)) return captureError('no-imagen');

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement | null>((resolve) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => resolve(null);
      el.src = url;
    });
    if (img === null) return captureError('ilegible');

    const dibujo = drawToJpeg(img, img.naturalWidth, img.naturalHeight);
    return dibujo === null ? captureError('ilegible') : fotoDe(dibujo, source, now);
  } finally {
    /* Siempre, también al fallar: cada `createObjectURL` sin revocar se queda
       en memoria hasta que se cierra la pestaña. */
    URL.revokeObjectURL(url);
  }
}

/** Un fotograma del visor en marcha. */
export function photoFromVideo(
  video: HTMLVideoElement,
  now: Date = new Date(),
): EvidencePhoto | CaptureError {
  const dibujo = drawToJpeg(video, video.videoWidth, video.videoHeight);
  return dibujo === null ? captureError('ilegible') : fotoDe(dibujo, 'camara', now);
}

/**
 * Si conviene usar la cámara del SISTEMA en vez de un visor propio.
 *
 * En un móvil o una tablet sí: la aplicación de cámara del teléfono enfoca
 * mejor, tiene flash y es la que quien la sostiene ya sabe usar. Un visor
 * hecho a mano dentro de una página web es peor en todo salvo en que se ve
 * igual en las dos plataformas, y eso no le importa a nadie en un taller.
 */
export function prefersSystemCamera(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
}

/** Si este equipo puede abrir un visor propio. */
export function canUseCamera(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    typeof navigator.mediaDevices?.getUserMedia === 'function' &&
    window.isSecureContext
  );
}

/**
 * Abre la cámara trasera si la hay.
 *
 * `environment` y no `user`: en una tablet de taller la cámara que apunta al
 * vehículo es la de atrás, y abrir la frontal significa que quien la sostiene
 * se graba la cara antes de darse cuenta.
 */
export async function openCamera(): Promise<MediaStream | CaptureError> {
  if (!canUseCamera()) return captureError('sin-camara');
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 } },
      audio: false,
    });
  } catch (error) {
    const name = error instanceof Error ? error.name : '';
    if (name === 'NotAllowedError' || name === 'SecurityError') return captureError('permiso');
    return captureError('sin-camara');
  }
}

/** Apagar de verdad: sin esto la luz de la cámara se queda encendida. */
export function closeCamera(stream: MediaStream | null): void {
  stream?.getTracks().forEach((t) => {
    t.stop();
  });
}
