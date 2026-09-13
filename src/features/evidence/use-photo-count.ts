'use client';

import { usePersistentState } from '@/lib/demo/store';
import { slotFor, type EvidencePhoto } from './services/photos';

const NINGUNA: readonly EvidencePhoto[] = [];

/**
 * Cuántas fotos tiene una cosa, sin cargar las fotos.
 *
 * Lo usan las LÍNEAS —«2 fotos» al lado de la zona— y el resumen del paso de
 * evidencia. Devuelve el número y no la lista a propósito: una fila de la
 * lista de zonas no necesita seis imágenes en base64 en memoria para escribir
 * un número, y son catorce filas.
 */
export function usePhotoCount(anchor: string): number {
  const [photos] = usePersistentState<readonly EvidencePhoto[]>(slotFor(anchor), NINGUNA);
  return photos.length;
}
