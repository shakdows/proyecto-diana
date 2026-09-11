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
  /** Excavadora, tractor oruga, cargador frontal… */
  readonly machineType: string;
  /** Horómetro. La maquinaria pesada se mantiene por horas, no por kilómetros. */
  readonly horometerHours: number;
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
const DAY = 86_400_000;
const ago = (now: Date, minutes: number): Date => new Date(now.getTime() - minutes * MIN);
const ahead = (now: Date, minutes: number): Date => new Date(now.getTime() + minutes * MIN);

/**
 * Hora de cierre a la que el taller promete entregar.
 *
 * Los desfases de esta demostración son relativos a «ahora» para que el
 * tablero esté siempre vivo, pero un desfase crudo hace que una entrega a
 * tres días caiga a la 01:17 de la madrugada. Ningún taller promete a esa
 * hora, y en una pantalla que se enseña a un cliente eso se lee como un
 * error. La promesa se lleva al cierre de la jornada del día que toque,
 * conservando si ya venció o no.
 *
 * `-05:00` es fijo a propósito: Perú no cambia de hora, y esto son datos de
 * demostración, no el reloj de producción —ese sale de `branches.timezone`.
 */
const CLOSING_HOUR = '17:00';

function limaDay(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Lima',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

function closingOn(date: Date): Date {
  return new Date(`${limaDay(date)}T${CLOSING_HOUR}:00-05:00`);
}

/**
 * La promesa, al cierre de la jornada, sin cruzar el «ahora».
 *
 * Una orden vencida debe seguir vencida después de redondear, y una en plazo
 * seguir en plazo: el semáforo cuelga de eso.
 */
function promisedAtFor(now: Date, minutes: number): Date {
  const raw = ahead(now, minutes);
  const snapped = closingOn(raw);

  if (minutes >= 0 && snapped.getTime() <= now.getTime()) {
    return closingOn(new Date(raw.getTime() + DAY));
  }
  if (minutes < 0 && snapped.getTime() >= now.getTime()) {
    return closingOn(new Date(raw.getTime() - DAY));
  }
  return snapped;
}

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
    checklistRequired: 38,
    checklistResolved: 38,
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
      plate: 'EXC014',
      vehicle: 'CAT 320D',
      machineType: 'Excavadora',
      horometerHours: 8420,
      customer: 'Tierras Andes S.A.C.',
      advisor: 'Andrea López',
      technician: 'Carlos Mendoza',
      serviceType: 'REPOSICION MOTOR',
      status: 'EN_REPARACION',
      openedMinutesAgo: 2880,
      promisedInMinutes: 1560,
      estimatedMinutes: 1440,
      startedMinutesAgo: 900,
      sessions: sessions(now, [
        ['trabajo', 900, 540],
        ['pausa', 540, 420, 'fin_de_turno'],
        ['trabajo', 420, null],
      ]),
      parts: [
        { partId: 'p1', description: 'Culata reparada 3066', required: 1, received: 1 },
        { partId: 'p2', description: 'Juego de anillos STD', required: 6, received: 6 },
        { partId: 'p3', description: 'Metales de biela 0.50', required: 6, received: 6 },
      ],
      quotationLineCount: 4,
      decidedItemCount: 4,
      approvedItemCount: 3,
      diagnosticItemCount: 4,
      repairJobsTotal: 4,
      repairJobsDone: 2,
      finalStages: ['lavado'],
    },
    {
      ...base,
      id: 'os-155',
      code: 'OS-2026-000155',
      plate: 'TRC207',
      vehicle: 'Komatsu D65EX-16',
      machineType: 'Tractor oruga',
      horometerHours: 12760,
      customer: 'Contratistas Huari S.A.C.',
      corporateClient: 'Minera Huari',
      advisor: 'Andrea López',
      technician: 'Luis Ramírez',
      serviceType: 'CONTROL VALVULA',
      status: 'ESPERANDO_REPUESTOS',
      openedMinutesAgo: 5760,
      promisedInMinutes: -480,
      estimatedMinutes: 720,
      parts: [
        { partId: 'p1', description: 'Válvula de control principal', required: 1, received: 0 },
        { partId: 'p2', description: 'Kit de sellos de válvula', required: 2, received: 2 },
        { partId: 'p3', description: 'Manguera hidráulica 3/4"', required: 4, received: 3 },
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
      plate: 'CRG031',
      vehicle: 'CAT 950H',
      machineType: 'Cargador frontal',
      horometerHours: 15340,
      customer: 'Vega Pacífico E.I.R.L.',
      advisor: 'Diego Salas',
      technician: 'Carlos Mendoza',
      serviceType: 'TRANSMISION',
      status: 'ESPERANDO_CLIENTE',
      openedMinutesAgo: 10080,
      promisedInMinutes: null,
      quotationLineCount: 6,
      decidedItemCount: 2,
      diagnosticItemCount: 6,
    },
    {
      ...base,
      id: 'os-157',
      code: 'OS-2026-000157',
      plate: 'EXC022',
      vehicle: 'Komatsu PC200-8',
      machineType: 'Excavadora',
      horometerHours: 6180,
      customer: 'Vial Sur S.A.',
      corporateClient: 'Consorcio Vial Sur',
      advisor: 'Andrea López',
      technician: 'Rosa Huamán',
      serviceType: 'MANDO FINAL',
      status: 'EN_REPARACION',
      openedMinutesAgo: 1440,
      promisedInMinutes: 900,
      estimatedMinutes: 960,
      startedMinutesAgo: 420,
      sessions: sessions(now, [['trabajo', 420, null]]),
      parts: [
        { partId: 'p1', description: 'Mando final completo LH', required: 1, received: 1 },
        { partId: 'p2', description: 'Aceite 80W90', required: 12, received: 12 },
      ],
      quotationLineCount: 3,
      decidedItemCount: 3,
      approvedItemCount: 3,
      diagnosticItemCount: 3,
      repairJobsTotal: 3,
      repairJobsDone: 2,
      finalStages: ['lavado'],
    },
    {
      ...base,
      id: 'os-158',
      code: 'OS-2026-000158',
      plate: 'TRC115',
      vehicle: 'John Deere 850K',
      machineType: 'Tractor oruga',
      horometerHours: 9905,
      customer: 'Canteras del Norte S.A.C.',
      corporateClient: 'Agregados Pacífico',
      advisor: 'Diego Salas',
      technician: 'Luis Ramírez',
      serviceType: 'TREN DE RODAJE',
      status: 'REPARACION_PAUSADA',
      openedMinutesAgo: 4320,
      promisedInMinutes: 600,
      estimatedMinutes: 1200,
      startedMinutesAgo: 1500,
      sessions: sessions(now, [
        ['trabajo', 1500, 480],
        ['pausa', 480, null, 'espera_autorizacion', true],
      ]),
      parts: [
        { partId: 'p1', description: 'Rodillo inferior', required: 8, received: 8 },
        { partId: 'p2', description: 'Zapata 600 mm', required: 4, received: 4 },
      ],
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
      plate: 'RTR008',
      vehicle: 'CAT 420F',
      machineType: 'Retroexcavadora',
      horometerHours: 4250,
      customer: 'Agregados Ccahuana E.I.R.L.',
      advisor: 'Andrea López',
      technician: null,
      serviceType: 'MANTENIMIENTO 500 H',
      status: 'PENDIENTE_DIAGNOSTICO',
      openedMinutesAgo: 95,
      promisedInMinutes: 1200,
    },
    {
      ...base,
      id: 'os-160',
      code: 'OS-2026-000160',
      plate: 'CAM044',
      vehicle: 'Volvo A30G',
      machineType: 'Camión articulado',
      horometerHours: 18420,
      customer: 'Mineros Yanac S.A.C.',
      corporateClient: 'Minera Huari',
      advisor: 'Diego Salas',
      technician: 'Rosa Huamán',
      serviceType: 'SISTEMA DE FRENO',
      status: 'EN_LAVADO',
      openedMinutesAgo: 2160,
      promisedInMinutes: -90,
      estimatedMinutes: 480,
      startedMinutesAgo: 1200,
      sessions: sessions(now, [['trabajo', 1200, 720]]),
      parts: [
        { partId: 'p1', description: 'Disco de freno húmedo', required: 6, received: 6 },
        { partId: 'p2', description: 'Kit de sellos de freno', required: 2, received: 2 },
      ],
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
      plate: 'EXC019',
      vehicle: 'CAT 336D',
      machineType: 'Excavadora',
      horometerHours: 11030,
      customer: 'Pedro Ccahuana',
      advisor: 'Andrea López',
      technician: null,
      serviceType: 'REPOSICION TURBO',
      status: 'RECEPCIONADO',
      openedMinutesAgo: 18,
      promisedInMinutes: 2400,
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
    order.promisedInMinutes === null ? null : promisedAtFor(now, order.promisedInMinutes);

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
