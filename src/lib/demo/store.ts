'use client';

import { useCallback, useSyncExternalStore } from 'react';
import {
  isCurrentKey,
  isOwnKey,
  keyFor,
  summarize,
  unwrap,
  wrap,
  type StoredSummary,
} from '@/features/demo/services/persistence';

/**
 * Persistencia de la demostración, en el navegador.
 *
 * ESTO NO ES LA BASE DE DATOS Y NO PRETENDE SERLO. Guarda en `localStorage`,
 * así que es por dispositivo: lo que se haga en el móvil no aparece en el
 * portátil, y nadie más lo ve. Existe para poder PROBAR el recorrido sin que
 * cada recarga borre el trabajo, mientras no hay autenticación real.
 *
 * Cuando la sesión lleve un JWT de verdad, esto se sustituye por consultas a
 * Postgres con RLS y este archivo desaparece.
 */

type Listener = () => void;

const listeners = new Set<Listener>();

/**
 * Caché de instantáneas por clave.
 *
 * `useSyncExternalStore` compara el resultado de `getSnapshot` con `===` y
 * vuelve a renderizar si cambia. Si cada llamada parseara el JSON otra vez
 * devolvería un objeto NUEVO cada vez, la comparación siempre fallaría y React
 * entraría en un bucle infinito de renderizado. Por eso la instantánea se
 * cachea y solo se reemplaza cuando de verdad escribimos.
 */
const snapshots = new Map<string, unknown>();

function notify(): void {
  invalidateSummary();
  for (const listener of listeners) listener();
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  /*
   * `storage` avisa de los cambios hechos en OTRAS pestañas. Sin esto, tener
   * la orden abierta en dos pestañas y reiniciar en una deja a la otra
   * mostrando datos que ya no existen.
   */
  const onStorage = (e: StorageEvent): void => {
    if (e.key === null || isOwnKey(e.key)) {
      snapshots.clear();
      invalidateSummary();
      listener();
    }
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

/** Toda lectura va en try/catch: en ventana privada el acceso LANZA. */
function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeRaw(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    // Cuota agotada o almacenamiento bloqueado. La pantalla sigue funcionando
    // con el estado en memoria; simplemente no sobrevive a la recarga.
    return false;
  }
}

function snapshotOf<T>(slot: string, initial: T): T {
  const key = keyFor(slot);
  if (snapshots.has(key)) return snapshots.get(key) as T;

  const stored = unwrap<T>(readRaw(key));
  const value = stored === null ? initial : stored;
  snapshots.set(key, value);
  return value;
}

/**
 * `useState` que sobrevive a la recarga.
 *
 * Misma forma que `useState`, incluido el actualizador funcional: cambiar una
 * pantalla para que persista es sustituir una línea, y eso es deliberado —si
 * migrar costara reescribir el componente, la mitad de las pantallas se
 * quedaría sin persistir—.
 */
export function usePersistentState<T>(
  slot: string,
  initial: T,
): readonly [T, (next: T | ((prev: T) => T)) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => snapshotOf(slot, initial),
    /*
     * En el servidor no hay `localStorage`: se renderiza el valor inicial.
     * React usa esta instantánea durante la hidratación y vuelve a leer la del
     * cliente justo después, así que no hay discrepancia de hidratación.
     */
    () => initial,
  );

  const setValue = useCallback(
    (next: T | ((prev: T) => T)): void => {
      const key = keyFor(slot);
      const previous = snapshotOf(slot, initial);
      const resolved =
        typeof next === 'function' ? (next as (prev: T) => T)(previous) : next;

      if (Object.is(resolved, previous)) return;

      snapshots.set(key, resolved);
      writeRaw(key, JSON.stringify(wrap(resolved, Date.now())));
      notify();
    },
    [slot, initial],
  );

  return [value, setValue] as const;
}

const VACIO: StoredSummary = { slots: 0, bytes: 0, lastSavedAt: null };

/**
 * Instantánea cacheada del resumen.
 *
 * Igual que con los valores: `useSyncExternalStore` compara por identidad, así
 * que devolver un objeto nuevo en cada llamada provocaría un bucle infinito de
 * renderizado.
 */
let summarySnapshot: StoredSummary | null = null;

function invalidateSummary(): void {
  summarySnapshot = null;
}

/**
 * Resumen de lo guardado, reactivo.
 *
 * Se usa para avisar de que hay trabajo guardado sin leer `localStorage` en
 * cada renderizado y sin escribir estado dentro de un efecto.
 */
export function useSavedSummary(): StoredSummary {
  return useSyncExternalStore(
    subscribe,
    () => {
      summarySnapshot ??= readSummary();
      return summarySnapshot;
    },
    // En el servidor no hay nada guardado que contar.
    () => VACIO,
  );
}

/** Qué hay guardado ahora mismo, para poder decir qué se va a borrar. */
export function readSummary(): StoredSummary {
  const entries: (readonly [string, string])[] = [];
  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key === null) continue;
      entries.push([key, window.localStorage.getItem(key) ?? '']);
    }
  } catch {
    return { slots: 0, bytes: 0, lastSavedAt: null };
  }
  return summarize(entries);
}

/**
 * Borra TODO lo de la demostración y devuelve cuántas ranuras se llevó.
 *
 * Se recogen las claves antes de borrar: `localStorage` reindexa al eliminar,
 * así que recorrerlo y borrar a la vez se salta una de cada dos.
 *
 * Barre también las versiones anteriores: si no, el formato viejo se queda
 * ocupando espacio para siempre sin que nada lo lea.
 */
export function clearAll(): number {
  const keys: string[] = [];
  try {
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (key !== null && isOwnKey(key)) keys.push(key);
    }
    for (const key of keys) window.localStorage.removeItem(key);
  } catch {
    return 0;
  }

  snapshots.clear();
  notify();
  return keys.filter(isCurrentKey).length;
}
