'use client';

import { useCallback, useMemo } from 'react';
import { usePersistentStateChecked } from '@/lib/demo/store';
import {
  nextSequence,
  orderCodeFor,
  receptionCode,
  withCorrection,
  type CompletedReception,
} from './services/acta';

const RANURA = 'recepciones.cerradas';
const NINGUNA: readonly CompletedReception[] = [];

/**
 * Las recepciones que se cerraron en este navegador.
 *
 * ── Por qué se guardan y no solo se enseñan ────────────────────────────────
 *
 * Porque una recepción cerrada es lo único del recorrido que produce algo
 * NUEVO: un acta con su código y una orden abierta. Si al pulsar «Confirmar»
 * la pantalla solo dijera «listo» y no quedara nada, sería el mismo engaño
 * que el contador de fotos: una señal de éxito sin nada detrás.
 *
 * Quedando guardadas, la recepción recién cerrada aparece en «Recepciones de
 * hoy» —que es donde el asesor la va a buscar— y el acta se puede volver a
 * abrir. Cuando haya base, esto es un `INSERT` en `vehicle_receptions` y otro
 * en `service_orders` dentro de la misma transacción.
 */
export function useReceptions(): {
  readonly receptions: readonly CompletedReception[];
  /** Devuelve el acta cerrada, o `null` si no cupo en el navegador. */
  readonly close: (
    data: Omit<CompletedReception, 'code' | 'orderCode' | 'closedAt'>,
    now: Date,
  ) => CompletedReception | null;
  readonly find: (code: string) => CompletedReception | undefined;
  /** Corrige dejando rastro. Devuelve el acta corregida, o `null` si no cupo. */
  readonly correct: (
    code: string,
    patch: Partial<Pick<CompletedReception, 'customer' | 'vehicle' | 'plate'>>,
    by: string,
    now: Date,
  ) => CompletedReception | null;
} {
  const [receptions, setReceptions] = usePersistentStateChecked<readonly CompletedReception[]>(
    RANURA,
    NINGUNA,
  );

  const close = useCallback(
    (
      data: Omit<CompletedReception, 'code' | 'orderCode' | 'closedAt'>,
      now: Date,
    ): CompletedReception | null => {
      /* El correlativo se calcula contra lo que ya hay y no se guarda aparte:
         un contador separado se desincroniza en cuanto alguien borra una
         fila, y entonces dos actas comparten código. */
      const seq = nextSequence(receptions);
      const acta: CompletedReception = {
        ...data,
        code: receptionCode(now, seq),
        orderCode: orderCodeFor(now, seq),
        closedAt: now.toISOString(),
      };
      /* La más reciente primero: es la que se acaba de cerrar. */
      const ok = setReceptions((prev) => [acta, ...prev]);
      return ok ? acta : null;
    },
    [receptions, setReceptions],
  );

  const find = useCallback(
    (code: string): CompletedReception | undefined => receptions.find((r) => r.code === code),
    [receptions],
  );

  const correct = useCallback(
    (
      code: string,
      patch: Partial<Pick<CompletedReception, 'customer' | 'vehicle' | 'plate'>>,
      by: string,
      now: Date,
    ): CompletedReception | null => {
      const actual = receptions.find((r) => r.code === code);
      if (actual === undefined) return null;
      const corregida = withCorrection(actual, patch, by, now);
      const ok = setReceptions((prev) => prev.map((r) => (r.code === code ? corregida : r)));
      return ok ? corregida : null;
    },
    [receptions, setReceptions],
  );

  return useMemo(
    () => ({ receptions, close, find, correct }),
    [receptions, close, find, correct],
  );
}
