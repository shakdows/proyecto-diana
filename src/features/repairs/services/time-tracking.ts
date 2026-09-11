/**
 * Cronómetro del técnico y hora estimada de finalización (§31–32).
 *
 * `repair_time_sessions` es la ÚNICA verdad del tiempo (resolución de I-6): el
 * estado `REPARACION_PAUSADA` es derivado, no una segunda contabilidad. Bruto,
 * pausas y efectivo se calculan siempre desde las sesiones.
 *
 * Las marcas las pone `now()` de PostgreSQL, nunca el reloj del navegador. Si
 * dependieran de la tablet, el indicador de productividad de §47 sería
 * manipulable cambiando la hora del dispositivo.
 *
 * Dominio PURO. Documentación: `docs/11-progreso-eta-y-semaforo.md`
 */

export type SessionKind = 'trabajo' | 'pausa';

export interface TimeSession {
  readonly kind: SessionKind;
  readonly startedAt: Date;
  /** `null` = sesión abierta; se cuenta hasta `now`. */
  readonly endedAt: Date | null;
  /** Motivo de pausa, del catálogo `pause_reasons`. */
  readonly pauseReason?: string;
  /**
   * El motivo depende de un tercero (`espera_autorizacion`,
   * `espera_repuestos`). Mientras esté abierta, la ETA es indeterminada.
   */
  readonly blocksEta?: boolean;
}

export interface TimeTotals {
  /** Minutos trabajados de verdad. */
  readonly effectiveMinutes: number;
  /** Minutos en pausa. */
  readonly pausedMinutes: number;
  /** Efectivo + pausas. */
  readonly grossMinutes: number;
  readonly hasOpenSession: boolean;
  readonly isPaused: boolean;
  /** La pausa abierta depende de un tercero. */
  readonly isBlocked: boolean;
}

const MS_PER_MINUTE = 60_000;

function durationMinutes(session: TimeSession, now: Date): number {
  const end = session.endedAt ?? now;
  const ms = end.getTime() - session.startedAt.getTime();
  return ms <= 0 ? 0 : ms / MS_PER_MINUTE;
}

function round(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function summarizeSessions(
  sessions: readonly TimeSession[],
  now: Date,
): TimeTotals {
  let effective = 0;
  let paused = 0;
  let openSession: TimeSession | undefined;

  for (const session of sessions) {
    const minutes = durationMinutes(session, now);
    if (session.kind === 'trabajo') effective += minutes;
    else paused += minutes;

    if (session.endedAt === null) openSession = session;
  }

  const isPaused = openSession?.kind === 'pausa';

  return {
    effectiveMinutes: round(effective),
    pausedMinutes: round(paused),
    grossMinutes: round(effective + paused),
    hasOpenSession: openSession !== undefined,
    isPaused,
    isBlocked: isPaused && openSession?.blocksEta === true,
  };
}

export interface EtaInput {
  readonly estimatedMinutes: number;
  readonly totals: TimeTotals;
  readonly now: Date;
  /** `null` si la reparación aún no ha empezado. */
  readonly startedAt: Date | null;
}

export interface EtaResult {
  /** `null` cuando la hora de término es genuinamente desconocida. */
  readonly etaAt: Date | null;
  readonly remainingMinutes: number;
  /**
   * `true` cuando se espera a un tercero. No es falta de cálculo: decir
   * «4:25 PM» mientras se espera una autorización sería inventar.
   */
  readonly indeterminate: boolean;
  readonly overrunMinutes: number;
}

export function computeEta(input: EtaInput): EtaResult {
  const { estimatedMinutes, totals, now, startedAt } = input;

  const remaining = Math.max(0, estimatedMinutes - totals.effectiveMinutes);
  const overrun = Math.max(0, totals.effectiveMinutes - estimatedMinutes);

  if (startedAt === null) {
    return {
      etaAt: null,
      remainingMinutes: Math.max(0, estimatedMinutes),
      indeterminate: true,
      overrunMinutes: 0,
    };
  }

  if (totals.isBlocked) {
    return {
      etaAt: null,
      remainingMinutes: round(remaining),
      indeterminate: true,
      overrunMinutes: round(overrun),
    };
  }

  return {
    etaAt: new Date(now.getTime() + remaining * MS_PER_MINUTE),
    remainingMinutes: round(remaining),
    indeterminate: false,
    overrunMinutes: round(overrun),
  };
}

/** SEMILLA de `app_settings.eta.delay_tolerance_minutes`. */
export const DEFAULT_DELAY_TOLERANCE_MINUTES = 15;

/**
 * Riesgo de retraso (§64): la ETA se ha ido más allá de la hora prometida.
 * Se avisa al asesor **solo la primera vez**, para que la alerta no se
 * convierta en ruido y acabe silenciada.
 */
export function isDelayRisk(
  etaAt: Date | null,
  promisedAt: Date | null,
  toleranceMinutes: number = DEFAULT_DELAY_TOLERANCE_MINUTES,
): boolean {
  if (etaAt === null || promisedAt === null) return false;
  return etaAt.getTime() > promisedAt.getTime() + toleranceMinutes * MS_PER_MINUTE;
}

/** Formato «2 h 14 min», para tablero y documentos. */
export function formatMinutes(minutes: number): string {
  const total = Math.max(0, Math.round(minutes));
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours} h`;
  return `${hours} h ${rest} min`;
}
