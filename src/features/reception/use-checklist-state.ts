'use client';

import { useSyncExternalStore } from 'react';
import type { ChecklistState } from './services/checklist';

/**
 * Leer el checklist guardado desde OTRA pantalla.
 *
 * El checklist se guarda con su propia clave y su propio formato desde antes
 * de que existiera el almacén de la demostración —`diana:recepcion-checklist`,
 * escrito a mano con `localStorage`—. Los pasos de firma y confirmación
 * necesitan leerlo para decir cuántos puntos se revisaron.
 *
 * Se lee AQUÍ y no se migra la pantalla del checklist entera: mover ese
 * formato ahora significaría que quien tenga una recepción a medias la pierde
 * al desplegar. Cuando el borrador viva en la base, esto desaparece con él.
 */
const VACIO: ChecklistState = {};
const CLAVE = 'diana:recepcion-checklist';

let cache: ChecklistState = VACIO;
let cacheRaw: string | null = null;

function leer(): ChecklistState {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(CLAVE);
  } catch {
    return VACIO;
  }
  if (raw === null) return VACIO;
  /* Se cachea contra el TEXTO y no contra el objeto: `useSyncExternalStore`
     compara por identidad, y volver a parsear en cada render devolvería un
     objeto nuevo cada vez y entraría en un bucle infinito. */
  if (raw === cacheRaw) return cache;
  try {
    cache = JSON.parse(raw) as ChecklistState;
    cacheRaw = raw;
  } catch {
    return VACIO;
  }
  return cache;
}

function subscribe(listener: () => void): () => void {
  window.addEventListener('storage', listener);
  return () => window.removeEventListener('storage', listener);
}

export function useChecklistState(): ChecklistState {
  return useSyncExternalStore(subscribe, leer, () => VACIO);
}
