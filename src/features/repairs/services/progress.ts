/**
 * Porcentaje de avance de la orden (§33).
 *
 * «El porcentaje no debe ser un valor manual arbitrario». El avance es la suma
 * ponderada del avance de ocho etapas:
 *
 *     avance = Σ peso(e) × completitud(e)          ∈ [0, 100]
 *
 * Cinco de las ocho etapas se cuentan sobre hechos reales (ítems resueltos,
 * decididos, unidades recibidas, trabajos hechos, etapas finales terminadas).
 * Las otras tres son binarias con crédito parcial, porque dentro de ellas no
 * hay nada que contar de forma significativa. Queda dicho explícitamente para
 * que no se confunda con una estimación caprichosa.
 *
 * Los pesos son filas de `app_settings`; los de aquí son la SEMILLA.
 *
 * Dominio PURO. Documentación: `docs/11-progreso-eta-y-semaforo.md`
 */

import { CLOSED_STATUSES, type OrderStatus } from '@/features/orders/services/order-status';

export const PROGRESS_STAGES = [
  'recepcion',
  'diagnostico',
  'autorizacion',
  'repuestos',
  'reparacion',
  'calidad',
  'finales',
  'entrega',
] as const;

export type ProgressStage = (typeof PROGRESS_STAGES)[number];

export const PROGRESS_STAGE_LABELS: Readonly<Record<ProgressStage, string>> = {
  recepcion: 'Recepción',
  diagnostico: 'Diagnóstico',
  autorizacion: 'Autorización',
  repuestos: 'Repuestos',
  reparacion: 'Reparación',
  calidad: 'Calidad',
  finales: 'Servicios finales',
  entrega: 'Entrega',
};

/** SEMILLA de `app_settings.progress.stage_weights`. Suman 100. */
export const DEFAULT_STAGE_WEIGHTS: Readonly<Record<ProgressStage, number>> = {
  recepcion: 5,
  diagnostico: 15,
  autorizacion: 10,
  repuestos: 15,
  reparacion: 40,
  calidad: 5,
  finales: 7,
  entrega: 3,
};

/** Reparto dentro de la etapa de reparación: trabajo hecho vs. esfuerzo. */
export const REPAIR_WORK_WEIGHT = 0.7;
export const REPAIR_TIME_WEIGHT = 0.3;

/**
 * Orden canónico de los hitos.
 *
 * Sirve para responder «¿ya se pasó por aquí?». No es el grafo: los estados que
 * suponen retroceso real —`OBSERVADO_CONTROL_CALIDAD` vuelve al nivel de
 * reparación— tienen deliberadamente un rango menor, de modo que el avance
 * BAJE. Una barra que solo sube mentiría justo cuando el asesor más necesita
 * saber la verdad.
 */
const MILESTONE_RANK: Readonly<Record<OrderStatus, number>> = {
  DRAFT: 0,
  RECEPCIONADO: 1,
  CHECKLIST_COMPLETADO: 2,
  PENDIENTE_DIAGNOSTICO: 3,
  EN_DIAGNOSTICO: 4,
  DIAGNOSTICO_COMPLETADO: 5,
  COTIZACION_EN_PREPARACION: 6,
  COTIZACION_ENVIADA: 7,
  ESPERANDO_CLIENTE: 8,
  APROBACION_PARCIAL: 9,
  APROBADO: 9,
  SOLICITUD_REPUESTOS: 10,
  REPUESTOS_EN_COTIZACION: 11,
  COMPRA_PENDIENTE_AUTORIZACION: 12,
  COMPRA_AUTORIZADA: 13,
  ORDEN_COMPRA_GENERADA: 14,
  ESPERANDO_REPUESTOS: 15,
  REPUESTOS_PARCIALES: 16,
  REPUESTOS_COMPLETOS: 17,
  LISTO_PARA_REPARACION: 18,
  EN_REPARACION: 19,
  REPARACION_PAUSADA: 19,
  OBSERVADO_CONTROL_CALIDAD: 19,
  REPARACION_TERMINADA: 20,
  CONTROL_CALIDAD: 21,
  CONTROL_CALIDAD_APROBADO: 22,
  PENDIENTE_LAVADO: 23,
  EN_LAVADO: 23,
  PENDIENTE_ALINEAMIENTO: 23,
  EN_ALINEAMIENTO: 23,
  LISTO_PARA_ENTREGA: 24,
  ENTREGADO: 25,
  CERRADO: 26,
  CANCELADO: 0,
};

const RANK = {
  checklistDone: 2,
  diagnosticDone: 5,
  quotationSent: 7,
  decided: 9,
  partsRequested: 10,
  partsComplete: 17,
  repairStarted: 19,
  repairDone: 20,
  qualityApproved: 22,
  finalStages: 23,
  readyToDeliver: 24,
  delivered: 25,
} as const;

export interface ProgressInput {
  readonly status: OrderStatus;
  /** Ítems obligatorios del checklist y cuántos están resueltos. */
  readonly checklistRequired: number;
  readonly checklistResolved: number;
  /** Líneas de la cotización vigente y cuántas ha decidido el cliente. */
  readonly quotationLineCount: number;
  readonly decidedItemCount: number;
  /** Repuestos requeridos por los trabajos aprobados (0 = no hacen falta). */
  readonly requiredPartsCount: number;
  /** `orderCoverage(...).ratio`, 0–1. */
  readonly partsCoverageRatio: number;
  /** Trabajos aprobados y cuántos están marcados como hechos. */
  readonly repairJobsTotal: number;
  readonly repairJobsDone: number;
  readonly estimatedMinutes: number;
  readonly effectiveMinutes: number;
  /** Etapas finales configuradas y cuántas han terminado. */
  readonly finalStagesTotal: number;
  readonly finalStagesDone: number;
}

export interface StageProgress {
  readonly stage: ProgressStage;
  readonly label: string;
  readonly weight: number;
  /** 0–1. */
  readonly completion: number;
  /** Puntos de los 100 que aporta esta etapa. */
  readonly contribution: number;
}

export interface ProgressResult {
  /** 0–100, redondeado a un decimal. */
  readonly percent: number;
  readonly stages: readonly StageProgress[];
}

function clamp01(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return value >= 1 ? 1 : value;
}

function ratio(part: number, total: number): number {
  return total <= 0 ? 0 : clamp01(part / total);
}

function round(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Completitud de la etapa de reparación: 0,7 trabajo hecho + 0,3 esfuerzo. */
export function repairCompletion(input: ProgressInput): number {
  const work = ratio(input.repairJobsDone, input.repairJobsTotal);
  const effort = ratio(input.effectiveMinutes, input.estimatedMinutes);
  // Se redondea a 6 decimales para que la suma de dos fracciones no aflore
  // como 0.6499999999999999 en la interfaz ni en las pruebas.
  return round(clamp01(REPAIR_WORK_WEIGHT * work + REPAIR_TIME_WEIGHT * effort), 6);
}

function stageCompletion(stage: ProgressStage, input: ProgressInput): number {
  const rank = MILESTONE_RANK[input.status];

  switch (stage) {
    case 'recepcion':
      if (rank >= RANK.checklistDone) return 1;
      if (input.status === 'RECEPCIONADO') {
        return input.checklistRequired > 0
          ? ratio(input.checklistResolved, input.checklistRequired)
          : 0.5;
      }
      return 0;

    case 'diagnostico':
      if (rank >= RANK.diagnosticDone) return 1;
      if (input.status === 'EN_DIAGNOSTICO') return 0.5;
      return 0;

    case 'autorizacion':
      if (rank >= RANK.decided) return 1;
      if (rank >= RANK.quotationSent) {
        return ratio(input.decidedItemCount, input.quotationLineCount);
      }
      return 0;

    case 'repuestos':
      if (rank >= RANK.partsComplete) return 1;
      // Sin repuestos que esperar, la etapa se da por cumplida en cuanto el
      // cliente decide: no hay nada pendiente de nadie.
      if (input.requiredPartsCount === 0 && rank >= RANK.decided) return 1;
      if (rank >= RANK.partsRequested) return clamp01(input.partsCoverageRatio);
      return 0;

    case 'reparacion':
      if (rank >= RANK.repairDone) return 1;
      if (rank >= RANK.repairStarted) return repairCompletion(input);
      return 0;

    case 'calidad':
      if (rank >= RANK.qualityApproved) return 1;
      if (input.status === 'CONTROL_CALIDAD') return 0.5;
      return 0;

    case 'finales':
      if (rank >= RANK.readyToDeliver) return 1;
      if (input.finalStagesTotal === 0) return rank >= RANK.qualityApproved ? 1 : 0;
      if (rank >= RANK.finalStages) {
        return ratio(input.finalStagesDone, input.finalStagesTotal);
      }
      return 0;

    case 'entrega':
      return rank >= RANK.delivered ? 1 : 0;
  }
}

/**
 * Avance de la orden.
 *
 * `ENTREGADO` y `CERRADO` devuelven 100. `CANCELADO` se calcula normalmente:
 * el valor refleja dónde se detuvo la orden.
 */
export function computeProgress(
  input: ProgressInput,
  weights: Readonly<Record<ProgressStage, number>> = DEFAULT_STAGE_WEIGHTS,
): ProgressResult {
  const totalWeight = PROGRESS_STAGES.reduce((sum, s) => sum + weights[s], 0);

  const stages: StageProgress[] = PROGRESS_STAGES.map((stage) => {
    const weight = weights[stage];
    const completion =
      input.status === 'ENTREGADO' || input.status === 'CERRADO'
        ? 1
        : stageCompletion(stage, input);

    return {
      stage,
      label: PROGRESS_STAGE_LABELS[stage],
      weight,
      completion,
      // Se normaliza por el total real de pesos: si alguien configura pesos
      // que no suman 100, el porcentaje sigue estando en 0–100.
      contribution: totalWeight <= 0 ? 0 : round((weight * completion * 100) / totalWeight, 2),
    };
  });

  const percent = round(
    stages.reduce((sum, s) => sum + s.contribution, 0),
  );

  return { percent: Math.min(100, Math.max(0, percent)), stages };
}

/** ¿La orden ya salió del taller? No se le calcula retraso. */
export function isClosed(status: OrderStatus): boolean {
  return CLOSED_STATUSES.has(status);
}
