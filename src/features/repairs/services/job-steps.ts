/**
 * Trabajo del técnico: pasos del trabajo actual y cronómetro.
 *
 * Vive aparte de `time-tracking.ts` porque aquello contabiliza sesiones de la
 * ORDEN; esto describe lo que el técnico ve y toca en la bahía: una lista de
 * pasos, un reloj y tres botones grandes.
 *
 * Módulo puro: sin React y sin base de datos.
 */

export type StepState = 'hecho' | 'en_curso' | 'pendiente';

export interface JobStep {
  readonly id: string;
  readonly label: string;
  readonly state: StepState;
}

export type PauseReason =
  | 'espera_herramienta'
  | 'soporte'
  | 'prueba'
  | 'incidencia'
  | 'otro';

export const PAUSE_LABELS: Readonly<Record<PauseReason, string>> = {
  espera_herramienta: 'Esperando herramienta',
  soporte: 'Soporte',
  prueba: 'Prueba',
  incidencia: 'Incidencia',
  otro: 'Otro',
};

/**
 * Una pausa por incidencia o por espera de herramienta no es lo mismo que una
 * prueba: la primera depende de un tercero y compromete la hora prometida.
 */
export const BLOCKS_ETA: Readonly<Record<PauseReason, boolean>> = {
  espera_herramienta: true,
  soporte: true,
  prueba: false,
  incidencia: true,
  otro: false,
};

/** «Otro» sin nota deja una pausa que nadie puede explicar mañana. */
export function pauseNeedsNote(reason: PauseReason): boolean {
  return reason === 'otro' || reason === 'incidencia';
}

export function canPause(reason: PauseReason | undefined, note: string): boolean {
  if (reason === undefined) return false;
  if (pauseNeedsNote(reason) && note.trim() === '') return false;
  return true;
}

export function currentStep(steps: readonly JobStep[]): JobStep | undefined {
  return steps.find((s) => s.state === 'en_curso');
}

export function doneCount(steps: readonly JobStep[]): number {
  return steps.filter((s) => s.state === 'hecho').length;
}

export function allDone(steps: readonly JobStep[]): boolean {
  return steps.length > 0 && steps.every((s) => s.state === 'hecho');
}

/**
 * Marca el paso en curso como hecho y pone en curso el siguiente pendiente.
 *
 * El técnico avanza de uno en uno, en orden: saltarse un paso deja un hueco
 * que nadie recuerda al final del día, y el control de calidad lo encuentra
 * cuando el vehículo ya está lavado.
 */
export function completeCurrent(steps: readonly JobStep[]): readonly JobStep[] {
  const index = steps.findIndex((s) => s.state === 'en_curso');
  if (index === -1) return steps;

  const next = steps.map((s, i): JobStep => (i === index ? { ...s, state: 'hecho' } : s));
  const following = next.findIndex((s, i) => i > index && s.state === 'pendiente');
  if (following === -1) return next;

  return next.map((s, i): JobStep => (i === following ? { ...s, state: 'en_curso' } : s));
}

/**
 * Desmarca un paso ya hecho. Lo vuelve el paso en curso y devuelve a pendiente
 * el que lo estaba, porque equivocarse marcando es normal y volver atrás no
 * puede exigir llamar al asesor.
 */
export function reopenStep(steps: readonly JobStep[], id: string): readonly JobStep[] {
  const target = steps.find((s) => s.id === id);
  if (target === undefined || target.state !== 'hecho') return steps;

  return steps.map((s): JobStep => {
    if (s.id === id) return { ...s, state: 'en_curso' };
    if (s.state === 'en_curso') return { ...s, state: 'pendiente' };
    return s;
  });
}

export interface ClockView {
  readonly effectiveSeconds: number;
  readonly estimatedSeconds: number;
  /** Nunca negativo: ver `overrunSeconds`. */
  readonly remainingSeconds: number;
  /** Segundos por encima del estimado. 0 mientras no se exceda. */
  readonly overrunSeconds: number;
  /** 0–100, tope 100. */
  readonly percent: number;
  readonly over: boolean;
}

/**
 * Estado del cronómetro frente al tiempo estimado.
 *
 * Cuando lo efectivo supera lo estimado, el restante NO se vuelve negativo:
 * «−00:12:30 restantes» es un dato sobre el que el técnico no puede actuar.
 * Se muestra 00:00:00 restantes y, aparte, cuánto se lleva excedido.
 */
export function clockView(effectiveSeconds: number, estimatedSeconds: number): ClockView {
  const effective = Math.max(0, effectiveSeconds);
  const estimated = Math.max(0, estimatedSeconds);
  const diff = estimated - effective;

  return {
    effectiveSeconds: effective,
    estimatedSeconds: estimated,
    remainingSeconds: Math.max(0, diff),
    overrunSeconds: Math.max(0, -diff),
    percent: estimated === 0 ? 0 : Math.min(100, (effective / estimated) * 100),
    over: diff < 0,
  };
}

/** HH:MM:SS. El técnico lee un reloj, no «2,24 h». */
export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number): string => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(sec)}`;
}

export interface FinishReadiness {
  readonly canFinish: boolean;
  readonly blockers: readonly string[];
}

/**
 * Qué impide dar el trabajo por terminado.
 *
 * No se comprueba el tiempo: terminar antes de lo estimado es una buena
 * noticia, no un error. Lo que importa es que los pasos estén hechos y que la
 * evidencia exista, porque es lo único que queda cuando el cliente reclama.
 */
export function finishReadiness(
  steps: readonly JobStep[],
  evidenceCount: number,
  paused: boolean,
): FinishReadiness {
  const blockers: string[] = [];

  const pendientes = steps.filter((s) => s.state !== 'hecho').length;
  if (pendientes > 0) {
    blockers.push(
      pendientes === 1 ? 'Falta 1 paso por marcar.' : `Faltan ${pendientes} pasos por marcar.`,
    );
  }

  if (evidenceCount === 0) {
    blockers.push('Agrega al menos una foto del trabajo terminado.');
  }

  if (paused) {
    // Terminar desde la pausa dejaría la sesión de pausa abierta y el tiempo
    // efectivo contabilizado mal para siempre.
    blockers.push('Reanuda el trabajo antes de finalizarlo.');
  }

  return { canFinish: blockers.length === 0, blockers };
}
