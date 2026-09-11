/**
 * Semáforo operacional (§44).
 *
 * Se evalúa en orden y gana la primera condición que se cumple. El GRIS va
 * antes que el ROJO a propósito: una orden lleva seis días parada porque el
 * cliente no contesta; pintarla de rojo la mezcla con las que el taller está
 * gestionando mal, y el tablero pierde su utilidad. En gris, el asesor ve de un
 * vistazo qué depende de él y qué depende de un tercero.
 *
 * Dominio PURO. Documentación: `docs/11-progreso-eta-y-semaforo.md`
 */

import {
  CLOSED_STATUSES,
  WAITING_ON_THIRD_PARTY,
  type OrderStatus,
} from '@/features/orders/services/order-status';
import { DEFAULT_DELAY_TOLERANCE_MINUTES } from './time-tracking';

export const TRAFFIC_LIGHTS = ['verde', 'amarillo', 'rojo', 'gris'] as const;
export type TrafficLight = (typeof TRAFFIC_LIGHTS)[number];

export const TRAFFIC_LIGHT_LABELS: Readonly<Record<TrafficLight, string>> = {
  verde: 'Dentro de tiempo',
  amarillo: 'Riesgo de retraso',
  rojo: 'Retrasada',
  gris: 'En espera de un tercero',
};

/** SEMILLA de `app_settings.traffic_light.*`. */
export const DEFAULT_WARNING_RATIO = 0.2;
export const DEFAULT_WARNING_MARGIN_MINUTES = 30;

export interface TrafficLightInput {
  readonly status: OrderStatus;
  readonly now: Date;
  readonly promisedAt: Date | null;
  readonly etaAt: Date | null;
  readonly indeterminateEta: boolean;
  readonly estimatedMinutes: number;
  readonly remainingMinutes: number;
}

export interface TrafficLightOptions {
  readonly toleranceMinutes?: number;
  readonly warningRatio?: number;
  readonly warningMarginMinutes?: number;
}

export interface TrafficLightResult {
  readonly color: TrafficLight;
  readonly label: string;
  /** Por qué salió ese color. Se muestra en el tooltip del tablero. */
  readonly reason: string;
}

const MS_PER_MINUTE = 60_000;

export function trafficLight(
  input: TrafficLightInput,
  options: TrafficLightOptions = {},
): TrafficLightResult {
  const tolerance = options.toleranceMinutes ?? DEFAULT_DELAY_TOLERANCE_MINUTES;
  const warningRatio = options.warningRatio ?? DEFAULT_WARNING_RATIO;
  const warningMargin = options.warningMarginMinutes ?? DEFAULT_WARNING_MARGIN_MINUTES;

  const result = (color: TrafficLight, reason: string): TrafficLightResult => ({
    color,
    label: TRAFFIC_LIGHT_LABELS[color],
    reason,
  });

  // Una orden entregada o cerrada no se juzga por tiempo.
  if (CLOSED_STATUSES.has(input.status)) {
    return result('verde', 'La orden ya no está en el taller.');
  }

  // 1 · GRIS — se espera a alguien que no es el taller.
  if (WAITING_ON_THIRD_PARTY.has(input.status)) {
    return result('gris', 'Esperando al cliente, al proveedor o una autorización.');
  }
  if (input.indeterminateEta) {
    return result('gris', 'La hora de término depende de un tercero.');
  }

  // 2 · ROJO — ya se pasó la hora prometida, o la ETA dice que se pasará.
  if (input.promisedAt !== null) {
    if (input.now.getTime() > input.promisedAt.getTime()) {
      return result('rojo', 'Superó la hora prometida al cliente.');
    }
    if (
      input.etaAt !== null &&
      input.etaAt.getTime() > input.promisedAt.getTime() + tolerance * MS_PER_MINUTE
    ) {
      return result('rojo', 'La hora estimada supera la prometida al cliente.');
    }
  }

  // 3 · AMARILLO — sin margen.
  if (
    input.estimatedMinutes > 0 &&
    input.remainingMinutes <= input.estimatedMinutes * warningRatio
  ) {
    return result('amarillo', 'Queda menos del 20 % del tiempo estimado.');
  }
  if (input.promisedAt !== null && input.etaAt !== null) {
    const marginMinutes =
      (input.promisedAt.getTime() - input.etaAt.getTime()) / MS_PER_MINUTE;
    if (marginMinutes <= warningMargin) {
      return result('amarillo', 'Queda poco margen sobre la hora prometida.');
    }
  }

  // 4 · VERDE
  return result('verde', 'Dentro del tiempo previsto.');
}
