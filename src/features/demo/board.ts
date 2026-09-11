/**
 * ⚠️ DATOS DE DEMOSTRACIÓN — FASE 1.
 *
 * Existen para que la navegación sea recorrible antes de que haya base de
 * datos (Fase 2). Todas las filas llevan `isDemo: true`, igual que llevarán
 * `is_demo = true` en la tabla, y nunca se mezclan con datos reales.
 *
 * Lo importante: el avance, la hora estimada y el semáforo NO están escritos a
 * mano. Se calculan con las mismas funciones puras que usará la aplicación en
 * producción (`computeProgress`, `computeEta`, `trafficLight`). Cambiar una
 * fórmula cambia esta pantalla, que es exactamente lo que se quiere.
 */

import type { OrderStatus } from '@/features/orders/services/order-status';
import type { OrderFacts } from '@/features/orders/services/state-machine';
import type { FinalStage } from '@/features/orders/services/final-stages';
import { orderCoverage, type PartLine } from '@/features/parts/services/coverage';
import { computeProgress } from '@/features/repairs/services/progress';
import {
  computeEta,
  summarizeSessions,
  type EtaResult,
  type TimeSession,
  type TimeTotals,
} from '@/features/repairs/services/time-tracking';
import { trafficLight, type TrafficLightResult } from '@/features/repairs/services/traffic-light';

export interface DemoOrder {
  readonly id: string;
  readonly code: string;
  readonly plate: string;
  readonly vehicle: string;
  readonly customer: string;
  readonly corporateClient: string | null;
  readonly advisor: string;
  readonly technician: string | null;
  readonly serviceType: string;
  readonly status: OrderStatus;
  readonly openedMinutesAgo: number;
  readonly promisedInMinutes: number | null;
  readonly estimatedMinutes: number;
  readonly startedMinutesAgo: number | null;
  readonly sessions: readonly TimeSession[];
  readonly parts: readonly PartLine[];
  readonly finalStages: readonly FinalStage[];
  readonly finalStagesDone: number;
  readonly checklistRequired: number;
  readonly checklistResolved: number;
  readonly quotationLineCount: number;
  readonly decidedItemCount: number;
  readonly approvedItemCount: number;
  readonly diagnosticItemCount: number;
  readonly repairJobsTotal: number;
  readonly repairJobsDone: number;
  readonly isDemo: true;
}

export interface BoardRow {
  readonly order: DemoOrder;
  readonly progressPercent: number;
  readonly totals: TimeTotals;
  readonly eta: EtaResult;
  readonly light: TrafficLightResult;
  readonly promisedAt: Date | null;
  readonly openedAt: Date;
  readonly partsPercent: number;
  readonly partsComplete: boolean;
}

const MIN = 60_000;
const ago = (now: Date, minutes: number): Date => new Date(now.getTime() - minutes * MIN);
const ahead = (now: Date, minutes: number): Date => new Date(now.getTime() + minutes * MIN);

/** Sesiones de trabajo y pausa a partir de tramos relativos a «ahora». */
function sessions(
  now: Date,
  spans: readonly (readonly [SpanKind, number, number | null, string?, boolean?])[],
): readonly TimeSession[] {
  return spans.map(([kind, startAgo, endAgo, reason, blocks]) => ({
    kind,
    startedAt: ago(now, startAgo),
    endedAt: endAgo === null ? null : ago(now, endAgo),
    ...(reason === undefined ? {} : { pauseReason: reason }),
    ...(blocks === undefined ? {} : { blocksEta: blocks }),
  }));
}

type SpanKind = 'trabajo' | 'pausa';

export function demoOrders(now: Date): readonly DemoOrder[] {
  const base = {
    isDemo: true as const,
    corporateClient: null,
    finalStagesDone: 0,
    checklistRequired: 24,
    checklistResolved: 24,
    diagnosticItemCount: 0,
    repairJobsTotal: 0,
    repairJobsDone: 0,
    quotationLineCount: 0,
    decidedItemCount: 0,
    approvedItemCount: 0,
    parts: [] as readonly PartLine[],
    sessions: [] as readonly TimeSession[],
    finalStages: [] as readonly FinalStage[],
    startedMinutesAgo: null,
    estimatedMinutes: 0,
  };

  return [
    {
      ...base,
      id: 'os-154',
      code: 'OS-2026-000154',
      plate: 'ABC123',
      vehicle: 'Toyota Hilux 2021',
      customer: 'Juan Pérez',
      advisor: 'Andrea López',
      technician: 'Carlos Mendoza',
      serviceType: 'Mantenimiento correctivo',
      status: 'EN_REPARACION',
      openedMinutesAgo: 540,
      promisedInMinutes: 205,
      estimatedMinutes: 182,
      startedMinutesAgo: 180,
      sessions: sessions(now, [
        ['trabajo', 180, 120],
        ['pausa', 120, 90, 'refrigerio'],
        ['trabajo', 90, null],
      ]),
      parts: [
        { partId: 'p1', description: 'Pastillas delanteras', required: 1, received: 1 },
        { partId: 'p2', description: 'Filtro de aire', required: 1, received: 1 },
      ],
      quotationLineCount: 4,
      decidedItemCount: 4,
      approvedItemCount: 3,
      diagnosticItemCount: 4,
      repairJobsTotal: 4,
      repairJobsDone: 3,
      finalStages: ['lavado'],
    },
    {
      ...base,
      id: 'os-155',
      code: 'OS-2026-000155',
      plate: 'V2K481',
      vehicle: 'Mitsubishi L200 2019',
      customer: 'Transportes del Sur S.A.C.',
      corporateClient: 'Mitsui',
      advisor: 'Andrea López',
      technician: 'Luis Ramírez',
      serviceType: 'Mantenimiento preventivo',
      status: 'ESPERANDO_REPUESTOS',
      openedMinutesAgo: 1620,
      promisedInMinutes: -120,
      estimatedMinutes: 150,
      parts: [
        { partId: 'p1', description: 'Pastillas delanteras', required: 2, received: 2 },
        { partId: 'p2', description: 'Filtros', required: 3, received: 1 },
        { partId: 'p3', description: 'Aceite 15W40', required: 5, received: 5 },
      ],
      quotationLineCount: 5,
      decidedItemCount: 5,
      approvedItemCount: 5,
      diagnosticItemCount: 5,
      repairJobsTotal: 5,
    },
    {
      ...base,
      id: 'os-156',
      code: 'OS-2026-000156',
      plate: 'D9M772',
      vehicle: 'Hyundai Tucson 2023',
      customer: 'María Quispe',
      advisor: 'Diego Salas',
      technician: 'Carlos Mendoza',
      serviceType: 'Planchado y pintura · Seguro',
      status: 'ESPERANDO_CLIENTE',
      openedMinutesAgo: 2900,
      promisedInMinutes: null,
      quotationLineCount: 6,
      decidedItemCount: 2,
      diagnosticItemCount: 6,
    },
    {
      ...base,
      id: 'os-157',
      code: 'OS-2026-000157',
      plate: 'B4T019',
      vehicle: 'Kia Sportage 2022',
      customer: 'Banco Continental',
      corporateClient: 'BBVA',
      advisor: 'Andrea López',
      technician: 'Rosa Huamán',
      serviceType: 'Mantenimiento preventivo',
      status: 'EN_REPARACION',
      openedMinutesAgo: 300,
      promisedInMinutes: 300,
      estimatedMinutes: 240,
      startedMinutesAgo: 105,
      sessions: sessions(now, [['trabajo', 105, null]]),
      quotationLineCount: 3,
      decidedItemCount: 3,
      approvedItemCount: 3,
      diagnosticItemCount: 3,
      repairJobsTotal: 3,
      repairJobsDone: 2,
      finalStages: ['lavado', 'alineamiento'],
    },
    {
      ...base,
      id: 'os-158',
      code: 'OS-2026-000158',
      plate: 'C7X330',
      vehicle: 'Toyota Corolla 2020',
      customer: 'Renting Andino S.A.',
      corporateClient: 'Relsa',
      advisor: 'Diego Salas',
      technician: 'Luis Ramírez',
      serviceType: 'Mantenimiento correctivo',
      status: 'REPARACION_PAUSADA',
      openedMinutesAgo: 480,
      promisedInMinutes: 150,
      estimatedMinutes: 240,
      startedMinutesAgo: 200,
      sessions: sessions(now, [
        ['trabajo', 200, 60],
        ['pausa', 60, null, 'espera_autorizacion', true],
      ]),
      quotationLineCount: 4,
      decidedItemCount: 4,
      approvedItemCount: 2,
      diagnosticItemCount: 4,
      repairJobsTotal: 2,
      repairJobsDone: 1,
      finalStages: ['lavado'],
    },
    {
      ...base,
      id: 'os-159',
      code: 'OS-2026-000159',
      plate: 'F1P845',
      vehicle: 'Nissan Frontier 2018',
      customer: 'Inversiones Vega E.I.R.L.',
      corporateClient: 'Invetsa',
      advisor: 'Andrea López',
      technician: null,
      serviceType: 'Mantenimiento preventivo',
      status: 'PENDIENTE_DIAGNOSTICO',
      openedMinutesAgo: 95,
      promisedInMinutes: 400,
    },
    {
      ...base,
      id: 'os-160',
      code: 'OS-2026-000160',
      plate: 'G8R204',
      vehicle: 'MG ZS 2024',
      customer: 'Automotores MG Perú',
      corporateClient: 'MG',
      advisor: 'Diego Salas',
      technician: 'Rosa Huamán',
      serviceType: 'Mantenimiento preventivo',
      status: 'EN_LAVADO',
      openedMinutesAgo: 620,
      promisedInMinutes: -45,
      estimatedMinutes: 90,
      startedMinutesAgo: 400,
      sessions: sessions(now, [['trabajo', 400, 310]]),
      quotationLineCount: 2,
      decidedItemCount: 2,
      approvedItemCount: 2,
      diagnosticItemCount: 2,
      repairJobsTotal: 2,
      repairJobsDone: 2,
      finalStages: ['lavado'],
    },
    {
      ...base,
      id: 'os-161',
      code: 'OS-2026-000161',
      plate: 'H3L967',
      vehicle: 'Chevrolet Sail 2017',
      customer: 'Pedro Ccahuana',
      advisor: 'Andrea López',
      technician: null,
      serviceType: 'Mantenimiento correctivo',
      status: 'RECEPCIONADO',
      openedMinutesAgo: 18,
      promisedInMinutes: 600,
      checklistResolved: 9,
    },
  ];
}

/** Convierte un pedido de demostración en los hechos que leen las guardas. */
export function factsFor(order: DemoOrder): OrderFacts {
  const coverage = orderCoverage(order.parts);

  return {
    status: order.status,
    hasCustomer: true,
    hasVehicle: true,
    hasServiceType: true,
    requiredChecklistItems: order.checklistRequired,
    resolvedChecklistItems: order.checklistResolved,
    hasCustomerSignature: order.checklistResolved >= order.checklistRequired,
    hasAdvisorSignature: order.checklistResolved >= order.checklistRequired,
    assignedTechnicianId: order.technician === null ? null : `tec-${order.id}`,
    diagnosticItemCount: order.diagnosticItemCount,
    quotationLineCount: order.quotationLineCount,
    quotationLinesPriced: order.quotationLineCount,
    authorizationLinkIssued: order.quotationLineCount > 0,
    decidedItemCount: order.decidedItemCount,
    approvedItemCount: order.approvedItemCount,
    requiredPartsCount: coverage.totalRequired,
    partsCoverageComplete: coverage.complete,
    partsRequestPending: true,
    supplierLinesAllSelected: true,
    purchaseWithinAuthorizerLimit: true,
    purchaseOrderIssued: true,
    estimatedMinutes: order.estimatedMinutes === 0 ? null : order.estimatedMinutes,
    repairJobsTotal: order.repairJobsTotal,
    repairJobsDone: order.repairJobsDone,
    hasOpenTimeSession: order.sessions.some((s) => s.endedAt === null),
    hasFinalEvidence: order.repairJobsDone === order.repairJobsTotal,
    qualityChecklistComplete: true,
    qualityFindingCount: 0,
    pendingFinalStages: order.finalStages.slice(order.finalStagesDone),
    deliveryActSigned: false,
    hasOpenTasks: false,
  };
}

/** Fila del tablero, con todo derivado de las funciones puras del dominio. */
export function toBoardRow(order: DemoOrder, now: Date): BoardRow {
  const coverage = orderCoverage(order.parts);
  const totals = summarizeSessions(order.sessions, now);

  const eta = computeEta({
    estimatedMinutes: order.estimatedMinutes,
    totals,
    now,
    startedAt: order.startedMinutesAgo === null ? null : ago(now, order.startedMinutesAgo),
  });

  const promisedAt =
    order.promisedInMinutes === null ? null : ahead(now, order.promisedInMinutes);

  const progress = computeProgress({
    status: order.status,
    checklistRequired: order.checklistRequired,
    checklistResolved: order.checklistResolved,
    quotationLineCount: order.quotationLineCount,
    decidedItemCount: order.decidedItemCount,
    requiredPartsCount: coverage.totalRequired,
    partsCoverageRatio: coverage.ratio,
    repairJobsTotal: order.repairJobsTotal,
    repairJobsDone: order.repairJobsDone,
    estimatedMinutes: order.estimatedMinutes,
    effectiveMinutes: totals.effectiveMinutes,
    finalStagesTotal: order.finalStages.length,
    finalStagesDone: order.finalStagesDone,
  });

  const light = trafficLight({
    status: order.status,
    now,
    promisedAt,
    etaAt: eta.etaAt,
    indeterminateEta: eta.indeterminate,
    estimatedMinutes: order.estimatedMinutes,
    remainingMinutes: eta.remainingMinutes,
  });

  return {
    order,
    progressPercent: progress.percent,
    totals,
    eta,
    light,
    promisedAt,
    openedAt: ago(now, order.openedMinutesAgo),
    partsPercent: coverage.percent,
    partsComplete: coverage.complete,
  };
}

export function demoBoard(now: Date): readonly BoardRow[] {
  return demoOrders(now).map((o) => toBoardRow(o, now));
}

export function findDemoOrder(id: string, now: Date): BoardRow | undefined {
  const order = demoOrders(now).find((o) => o.id === id);
  return order === undefined ? undefined : toBoardRow(order, now);
}
