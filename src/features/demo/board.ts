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

import type { EquipmentKind } from '@/features/equipment/services/equipment-kind';
import type { OrderStatus } from '@/features/orders/services/order-status';
import type { OrderFacts } from '@/features/orders/services/state-machine';
import type { FinalStage } from '@/features/orders/services/final-stages';
import { orderCoverage, type PartLine } from '@/features/parts/services/coverage';
import { computeProgress } from '@/features/repairs/services/progress';
import {
  computeEta,
  formatMinutes,
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
  readonly modelYear: number;
  /** Decide si el contador son kilómetros o horas, y cómo se llama la placa. */
  readonly equipmentKind: EquipmentKind;
  /** Kilometraje en un vehículo, horómetro en una máquina. */
  readonly usage: number;
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
      plate: 'ABC123',
      vehicle: 'Toyota Hilux SRV',
      modelYear: 2023,
      equipmentKind: 'vehiculo',
      usage: 38720,
      customer: 'Juan Pérez',
      advisor: 'Andrea López',
      technician: 'Carlos Mendoza',
      serviceType: 'CAMBIO DE PASTILLAS',
      status: 'EN_REPARACION',
      openedMinutesAgo: 300,
      promisedInMinutes: 150,
      estimatedMinutes: 180,
      startedMinutesAgo: 105,
      sessions: sessions(now, [
        ['trabajo', 105, 40],
        ['pausa', 40, 28, 'refrigerio'],
        ['trabajo', 28, null],
      ]),
      parts: [
        { partId: 'p1', description: 'Juego de pastillas delanteras', required: 1, received: 1 },
        { partId: 'p2', description: 'Líquido de frenos DOT 4', required: 1, received: 1 },
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
      vehicle: 'Mitsubishi L200',
      modelYear: 2019,
      equipmentKind: 'vehiculo',
      usage: 112450,
      customer: 'Transportes del Sur S.A.C.',
      corporateClient: 'Mitsui',
      advisor: 'Andrea López',
      technician: 'Luis Ramírez',
      serviceType: 'CAMBIO DE EMBRAGUE',
      status: 'ESPERANDO_REPUESTOS',
      openedMinutesAgo: 2880,
      promisedInMinutes: -120,
      estimatedMinutes: 300,
      parts: [
        { partId: 'p1', description: 'Kit de embrague completo', required: 1, received: 0 },
        { partId: 'p2', description: 'Rodamiento de empuje', required: 1, received: 1 },
        { partId: 'p3', description: 'Aceite de caja 75W90', required: 3, received: 2 },
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
      vehicle: 'Hyundai Tucson',
      modelYear: 2023,
      equipmentKind: 'vehiculo',
      usage: 24310,
      customer: 'María Quispe',
      advisor: 'Diego Salas',
      technician: 'Carlos Mendoza',
      serviceType: 'PLANCHADO Y PINTURA',
      status: 'ESPERANDO_CLIENTE',
      openedMinutesAgo: 4320,
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
      vehicle: 'Kia Sportage',
      modelYear: 2022,
      equipmentKind: 'vehiculo',
      usage: 61905,
      customer: 'Banco Continental',
      corporateClient: 'BBVA',
      advisor: 'Andrea López',
      technician: 'Rosa Huamán',
      serviceType: 'MANTENIMIENTO 60 000 KM',
      status: 'EN_REPARACION',
      openedMinutesAgo: 210,
      promisedInMinutes: 285,
      estimatedMinutes: 210,
      startedMinutesAgo: 90,
      sessions: sessions(now, [['trabajo', 90, null]]),
      parts: [
        { partId: 'p1', description: 'Filtro de aceite', required: 1, received: 1 },
        { partId: 'p2', description: 'Filtro de aire', required: 1, received: 1 },
        { partId: 'p3', description: 'Aceite 5W30 sintético', required: 5, received: 5 },
      ],
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
      vehicle: 'Toyota Corolla',
      modelYear: 2020,
      equipmentKind: 'vehiculo',
      usage: 88240,
      customer: 'Renting Andino S.A.',
      corporateClient: 'Relsa',
      advisor: 'Diego Salas',
      technician: 'Luis Ramírez',
      serviceType: 'SUSPENSIÓN DELANTERA',
      status: 'REPARACION_PAUSADA',
      openedMinutesAgo: 480,
      promisedInMinutes: 120,
      estimatedMinutes: 240,
      startedMinutesAgo: 200,
      sessions: sessions(now, [
        ['trabajo', 200, 28],
        ['pausa', 28, null, 'espera_autorizacion', true],
      ]),
      parts: [
        { partId: 'p1', description: 'Amortiguadores delanteros', required: 2, received: 2 },
        { partId: 'p2', description: 'Rótulas de suspensión', required: 2, received: 2 },
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
      plate: 'F1P845',
      vehicle: 'Nissan Frontier',
      modelYear: 2018,
      equipmentKind: 'vehiculo',
      usage: 143060,
      customer: 'Inversiones Vega E.I.R.L.',
      corporateClient: 'Invetsa',
      advisor: 'Andrea López',
      technician: null,
      serviceType: 'DIAGNÓSTICO ELECTRÓNICO',
      status: 'PENDIENTE_DIAGNOSTICO',
      openedMinutesAgo: 95,
      promisedInMinutes: 400,
    },
    {
      ...base,
      id: 'os-160',
      code: 'OS-2026-000160',
      plate: 'G8R204',
      vehicle: 'MG ZS',
      modelYear: 2024,
      equipmentKind: 'vehiculo',
      usage: 9180,
      customer: 'Automotores MG Perú',
      corporateClient: 'MG',
      advisor: 'Diego Salas',
      technician: 'Rosa Huamán',
      serviceType: 'ALINEAMIENTO Y BALANCEO',
      status: 'EN_LAVADO',
      openedMinutesAgo: 620,
      promisedInMinutes: -45,
      estimatedMinutes: 90,
      startedMinutesAgo: 400,
      sessions: sessions(now, [['trabajo', 400, 310]]),
      parts: [
        { partId: 'p1', description: 'Contrapesas de balanceo', required: 4, received: 4 },
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
      /*
       * Flota mixta: el taller también atiende maquinaria. Una sola fila basta
       * para que se vea que la tabla cambia de vocabulario —código de equipo y
       * horómetro en vez de placa y kilómetros— sin dejar de ser la misma
       * tabla. Es lo que resuelve `features/equipment`.
       */
      ...base,
      id: 'os-161',
      code: 'OS-2026-000161',
      plate: 'EXC014',
      vehicle: 'CAT 320D',
      modelYear: 2019,
      equipmentKind: 'maquinaria',
      usage: 8420,
      customer: 'Movimiento de Tierras Andes S.A.C.',
      advisor: 'Andrea López',
      technician: null,
      serviceType: 'REPOSICIÓN DE MOTOR',
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

/* ------------------------------------------------------------------ *
 * Bloques del centro de operaciones
 * ------------------------------------------------------------------ */

export interface AttentionItem {
  readonly row: BoardRow;
  /** Por qué pide acción, en las palabras del taller. */
  readonly reason: string;
  /** Cuánto lleva así, ya formateado. */
  readonly elapsed: string;
  readonly severity: 'crit' | 'warn' | 'wait';
}

/**
 * Las órdenes que piden acción HOY, ordenadas por gravedad.
 *
 * No es «todo lo que no está verde». Una orden esperando al cliente lleva dos
 * días parada y no es culpa del taller: sale en gris, al final, porque hay que
 * llamar a alguien, no correr. Lo rojo es lo que el taller sí controla.
 *
 * El orden importa: quien mira este panel tiene treinta segundos y actúa sobre
 * lo primero. Si lo primero no es lo más grave, el panel hace daño.
 */
export function attentionItems(rows: readonly BoardRow[], now: Date): readonly AttentionItem[] {
  const WEIGHT = { crit: 0, warn: 1, wait: 2 } as const;

  const items = rows.flatMap<AttentionItem>((row) => {
    const { order, light } = row;
    const sinceOpened = Math.round((now.getTime() - row.openedAt.getTime()) / 60_000);

    if (order.status === 'REPARACION_PAUSADA') {
      const pause = order.sessions.find((s) => s.kind === 'pausa' && s.endedAt === null);
      const minutes =
        pause === undefined ? 0 : Math.round((now.getTime() - pause.startedAt.getTime()) / 60_000);
      return [
        {
          row,
          reason: 'Reparación pausada',
          elapsed: formatMinutes(minutes),
          severity: 'crit',
        },
      ];
    }

    if (light.color === 'rojo') {
      return [{ row, reason: 'Entrega retrasada', elapsed: formatMinutes(sinceOpened), severity: 'crit' }];
    }

    if (order.status === 'ESPERANDO_REPUESTOS') {
      const coverage = orderCoverage(order.parts);
      return [
        {
          row,
          reason: `Esperando repuestos · ${coverage.percent} %`,
          elapsed: formatMinutes(sinceOpened),
          severity: 'warn',
        },
      ];
    }

    if (light.color === 'amarillo') {
      return [{ row, reason: 'En riesgo de retraso', elapsed: formatMinutes(sinceOpened), severity: 'warn' }];
    }

    if (order.status === 'ESPERANDO_CLIENTE') {
      return [
        {
          row,
          reason: 'Cotización sin respuesta',
          elapsed: formatMinutes(sinceOpened),
          severity: 'wait',
        },
      ];
    }

    return [];
  });

  return [...items].sort((a, b) => WEIGHT[a.severity] - WEIGHT[b.severity]);
}

export interface ActivityEntry {
  readonly id: string;
  readonly minutesAgo: number;
  readonly orderCode: string;
  readonly orderId: string;
  readonly text: string;
  readonly actor: string;
  readonly tone: 'neutral' | 'ok' | 'warn' | 'brand';
}

/**
 * Lo que ha pasado en el taller, más reciente primero.
 *
 * En producción sale de `order_events`, que escribe un disparador y por eso
 * está completa por construcción. Aquí es fija, pero los desfases son
 * relativos a «ahora» para que el panel no se congele.
 */
export function demoActivity(): readonly ActivityEntry[] {
  return [
    {
      id: 'a1',
      minutesAgo: 12,
      orderCode: 'OS-2026-000154',
      orderId: 'os-154',
      text: 'Reparación reanudada tras el refrigerio',
      actor: 'Carlos Mendoza',
      tone: 'brand',
    },
    {
      id: 'a2',
      minutesAgo: 26,
      orderCode: 'OS-2026-000158',
      orderId: 'os-158',
      text: 'Reparación pausada · espera de autorización',
      actor: 'Luis Ramírez',
      tone: 'warn',
    },
    {
      id: 'a3',
      minutesAgo: 48,
      orderCode: 'OS-2026-000157',
      orderId: 'os-157',
      text: 'Repuestos completos · 3 de 3 recibidos',
      actor: 'Compras',
      tone: 'ok',
    },
    {
      id: 'a4',
      minutesAgo: 95,
      orderCode: 'OS-2026-000160',
      orderId: 'os-160',
      text: 'Control de calidad aprobado',
      actor: 'Rosa Huamán',
      tone: 'ok',
    },
    {
      id: 'a5',
      minutesAgo: 140,
      orderCode: 'OS-2026-000159',
      orderId: 'os-159',
      text: 'Vehículo recepcionado · checklist firmado',
      actor: 'Andrea López',
      tone: 'neutral',
    },
    {
      id: 'a6',
      minutesAgo: 180,
      orderCode: 'OS-2026-000155',
      orderId: 'os-155',
      text: 'Cliente aprobó 5 de 5 ítems de la cotización',
      actor: 'Transportes del Sur',
      tone: 'ok',
    },
  ];
}
