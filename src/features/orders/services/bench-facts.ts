/**
 * Lo que la bahía del técnico sabe y la orden necesita.
 *
 * ── El problema que resuelve ───────────────────────────────────────────────
 *
 * La ficha de la orden pintaba «Terminar reparación» deshabilitado con tres
 * requisitos que salían del dato SEMBRADO: «3 de 4 trabajos hechos», «falta
 * evidencia», «hay una sesión de tiempo abierta». El técnico iba a la bahía,
 * marcaba el cuarto paso, subía la foto y paraba el reloj… y al volver a la
 * orden el botón seguía deshabilitado con los mismos tres motivos, porque la
 * orden no miraba lo que la bahía había guardado.
 *
 * Eso no es una pantalla incompleta: es una pantalla que MIENTE, y la salida
 * evidente para quien la usa es dejar de creerle.
 *
 * Aquí se traduce el estado de la bahía a los hechos que leen las guardas. En
 * producción no hace falta: los dos leen las mismas filas de
 * `repair_job_items` y `repair_time_sessions`. Mientras el almacén sea el
 * navegador, alguien tiene que unir las dos mitades, y es mejor que sea una
 * función pura y probada que un `useEffect`.
 *
 * Dominio PURO.
 */

import { doneCount, type JobStep } from '@/features/repairs/services/job-steps';
import type { OrderFacts } from './state-machine';

/** Lo que la bahía deja guardado de un trabajo. */
export interface BenchState {
  readonly steps: readonly JobStep[];
  readonly evidenceCount: number;
  readonly finished: boolean;
  /** El ancla del cronómetro: `desde === null` significa parado. */
  readonly clock: { readonly base: number; readonly desde: number | null };
}

/** Las cuatro ranuras que escribe `RepairBench`, por código de orden. */
export function benchSlots(orderCode: string): {
  readonly steps: string;
  readonly evidence: string;
  readonly finished: string;
  readonly clock: string;
} {
  return {
    steps: `reparacion.${orderCode}.pasos`,
    evidence: `reparacion.${orderCode}.evidencia`,
    finished: `reparacion.${orderCode}.terminado`,
    clock: `reparacion.${orderCode}.reloj`,
  };
}

/**
 * Mezcla lo que la bahía sabe con los hechos de la orden.
 *
 * Solo toca los cuatro hechos que la bahía es quien conoce. Todo lo demás
 * —cotización, repuestos, calidad— lo sigue aportando quien llama: si esta
 * función rellenara hechos que no le constan, la orden se dejaría cerrar por
 * datos inventados aquí.
 *
 * `bench === null` significa que el técnico no ha abierto la bahía: se
 * devuelven los hechos tal cual, que es lo sembrado.
 */
export function withBenchFacts(
  facts: OrderFacts,
  bench: BenchState | null,
  /*
   * Las fotos tomadas EN LA ORDEN también son evidencia final. El contador de
   * la bahía y la cámara de la ficha estaban contando cosas distintas de lo
   * mismo, así que «adjunta la evidencia final» seguía apareciendo después de
   * subir la foto en la propia orden. Suman; no compiten.
   */
  orderPhotoCount = 0,
): OrderFacts {
  const conFoto = orderPhotoCount > 0;

  if (bench === null || bench.steps.length === 0) {
    /*
     * Una lista de pasos vacía NO significa «cero trabajos hechos de cero»,
     * que la guarda leería como «no hay nada que hacer, adelante». Significa
     * que la bahía todavía no tiene pasos: se respeta lo sembrado, salvo la
     * evidencia, que sí consta.
     */
    return conFoto && !facts.hasFinalEvidence ? { ...facts, hasFinalEvidence: true } : facts;
  }

  return {
    ...facts,
    repairJobsTotal: bench.steps.length,
    repairJobsDone: doneCount(bench.steps),
    hasFinalEvidence: bench.evidenceCount > 0 || conFoto,
    /*
     * El cronómetro cuenta como sesión abierta solo si corre Y el trabajo no
     * se ha dado por terminado en la bahía: al terminar, la bahía para el
     * reloj pero deja el ancla, y sin esta condición la orden vería una
     * sesión abierta para siempre.
     */
    hasOpenTimeSession: bench.clock.desde !== null && !bench.finished,
  };
}

/** ¿Hay algo guardado por la bahía que merezca pisar lo sembrado? */
export function benchHasWork(bench: BenchState | null): boolean {
  return bench !== null && bench.steps.length > 0;
}

/** «4 de 5 trabajos · 2 fotos» — lo que la orden enseña sin abrir la bahía. */
export function benchPhrase(bench: BenchState | null, orderPhotoCount = 0): string | null {
  if (!benchHasWork(bench)) return null;
  const state = bench as BenchState;
  const hechos = doneCount(state.steps);
  const total = state.evidenceCount + orderPhotoCount;
  const fotos = total === 0 ? 'sin evidencia' : `${total} ${total === 1 ? 'foto' : 'fotos'}`;
  return `${hechos} de ${state.steps.length} trabajos · ${fotos}`;
}
