/**
 * Etapas finales configurables (§37).
 *
 * Cablear "lavado y luego alineamiento" en la máquina de estados obligaría a
 * tocar código cada vez que cambie la política del taller. En su lugar, cada
 * orden resuelve al aprobar calidad una lista ordenada desde
 * `service_type_final_stages`, y estas funciones deciden qué va después.
 *
 * Dominio PURO.
 */

import type { OrderStatus } from './order-status';

export const FINAL_STAGES = ['lavado', 'alineamiento'] as const;
export type FinalStage = (typeof FINAL_STAGES)[number];

export const FINAL_STAGE_LABELS: Readonly<Record<FinalStage, string>> = {
  lavado: 'Lavado',
  alineamiento: 'Alineamiento',
};

const PENDING_STATUS: Readonly<Record<FinalStage, OrderStatus>> = {
  lavado: 'PENDIENTE_LAVADO',
  alineamiento: 'PENDIENTE_ALINEAMIENTO',
};

const IN_PROGRESS_STATUS: Readonly<Record<FinalStage, OrderStatus>> = {
  lavado: 'EN_LAVADO',
  alineamiento: 'EN_ALINEAMIENTO',
};

export function isFinalStage(value: string): value is FinalStage {
  return (FINAL_STAGES as readonly string[]).includes(value);
}

/**
 * La siguiente etapa final pendiente, respetando el orden configurado.
 * `null` significa que ya no queda ninguna → `LISTO_PARA_ENTREGA`.
 */
export function nextFinalStage(pending: readonly FinalStage[]): FinalStage | null {
  return pending[0] ?? null;
}

/** Estado al que lleva terminar la etapa actual. */
export function statusAfterFinalStage(remaining: readonly FinalStage[]): OrderStatus {
  const next = nextFinalStage(remaining);
  return next === null ? 'LISTO_PARA_ENTREGA' : PENDING_STATUS[next];
}

export function pendingStatusFor(stage: FinalStage): OrderStatus {
  return PENDING_STATUS[stage];
}

export function inProgressStatusFor(stage: FinalStage): OrderStatus {
  return IN_PROGRESS_STATUS[stage];
}

/** Quita una etapa de la lista de pendientes, conservando el orden. */
export function withoutStage(
  pending: readonly FinalStage[],
  done: FinalStage,
): readonly FinalStage[] {
  const index = pending.indexOf(done);
  if (index === -1) return pending;
  return [...pending.slice(0, index), ...pending.slice(index + 1)];
}
