import assert from 'node:assert/strict';
import { test } from 'node:test';

import type { OrderStatus } from '@/features/orders/services/order-status';
import type { Actor, OrderFacts } from '@/features/orders/services/state-machine';
import { ROLE_PERMISSIONS } from '@/lib/auth/permissions';
import {
  finishedToday,
  isRunning,
  minutesWorkedToday,
  nextStep,
  pauseBlocks,
  pauseLabel,
  pauseStep,
  planDay,
  stepHref,
  waitingPhrase,
  waitingOn,
  type DayJob,
  type OpenPause,
} from './my-day';
import { summarizeSessions, type TimeSession } from './time-tracking';

const TECNICO: Actor = {
  profileId: 'demo-tecnico',
  permissions: ROLE_PERMISSIONS.tecnico,
};

const NOW = new Date('2026-09-12T15:00:00-05:00');

const ago = (minutes: number): Date => new Date(NOW.getTime() - minutes * 60_000);

function facts(status: OrderStatus, overrides: Partial<OrderFacts> = {}): OrderFacts {
  return {
    status,
    hasCustomer: true,
    hasVehicle: true,
    hasServiceType: true,
    requiredChecklistItems: 38,
    resolvedChecklistItems: 38,
    hasCustomerSignature: true,
    hasAdvisorSignature: true,
    assignedTechnicianId: TECNICO.profileId,
    diagnosticItemCount: 3,
    quotationLineCount: 3,
    quotationLinesPriced: 3,
    authorizationLinkIssued: true,
    decidedItemCount: 3,
    approvedItemCount: 3,
    requiredPartsCount: 0,
    partsCoverageComplete: true,
    partsRequestPending: false,
    supplierLinesAllSelected: true,
    purchaseWithinAuthorizerLimit: true,
    purchaseOrderIssued: true,
    estimatedMinutes: 120,
    repairJobsTotal: 3,
    repairJobsDone: 3,
    hasOpenTimeSession: false,
    hasFinalEvidence: true,
    qualityChecklistComplete: true,
    qualityFindingCount: 0,
    pendingFinalStages: [],
    deliveryActSigned: false,
    hasOpenTasks: false,
    ...overrides,
  };
}

function job(
  status: OrderStatus,
  overrides: Partial<DayJob> = {},
  factOverrides: Partial<OrderFacts> = {},
): DayJob {
  const sessions = overrides.sessions ?? [];
  const base = facts(status, factOverrides);
  return {
    id: 'os-1',
    code: 'OS-2026-000001',
    plate: 'ABC123',
    vehicle: 'Toyota Hilux',
    serviceType: 'FRENOS',
    customer: 'Juan Pérez',
    status,
    facts: {
      ...base,
      hasOpenTimeSession: sessions.some((s) => s.endedAt === null),
      ...factOverrides,
    },
    sessions,
    totals: summarizeSessions(sessions, NOW),
    estimatedMinutes: 120,
    promisedAt: null,
    openPause: null,
    lastWorkEndedAt: null,
    jobsTotal: 3,
    jobsDone: 3,
    ...overrides,
  };
}

const working: readonly TimeSession[] = [
  { kind: 'trabajo', startedAt: ago(90), endedAt: null },
];

// ─────────────────────────────────────────────────────────────────────────────
// La acción que toca
// ─────────────────────────────────────────────────────────────────────────────

test('el estado decide el botón, sin elección del técnico', () => {
  const cases: readonly (readonly [OrderStatus, string])[] = [
    ['PENDIENTE_DIAGNOSTICO', 'iniciar_diagnostico'],
    ['EN_DIAGNOSTICO', 'completar_diagnostico'],
    ['LISTO_PARA_REPARACION', 'iniciar_trabajo'],
    ['REPARACION_PAUSADA', 'reanudar'],
    ['REPARACION_TERMINADA', 'enviar_a_calidad'],
    ['OBSERVADO_CONTROL_CALIDAD', 'retomar_reparacion'],
  ];

  for (const [status, action] of cases) {
    assert.equal(nextStep(job(status), TECNICO).action, action, status);
  }
});

test('en reparación, el botón es terminar y no pausar', () => {
  const step = nextStep(job('EN_REPARACION', { sessions: working }), TECNICO);
  assert.equal(step.action, 'terminar_reparacion');
});

test('el cronómetro corriendo no bloquea el botón de terminar: lo para él', () => {
  const step = nextStep(job('EN_REPARACION', { sessions: working }), TECNICO);

  assert.equal(step.enabled, true);
  assert.deepEqual(step.blockedBy, []);
});

test('pero los requisitos que el botón no puede resolver siguen bloqueando', () => {
  const step = nextStep(
    job('EN_REPARACION', { sessions: working }, { hasFinalEvidence: false }),
    TECNICO,
  );

  assert.equal(step.enabled, false);
  assert.deepEqual(step.blockedBy, ['Adjunta la evidencia final de la reparación.']);
});

test('un botón bloqueado dice qué falta, en vez de desaparecer', () => {
  const step = nextStep(
    job('EN_REPARACION', { sessions: working }, { repairJobsDone: 1, repairJobsTotal: 3 }),
    TECNICO,
  );

  assert.equal(step.action, 'terminar_reparacion');
  assert.equal(step.enabled, false);
  assert.ok(step.blockedBy.some((m) => m.includes('sin marcar como hechos')));
});

test('la orden de otro técnico no ofrece iniciar el trabajo', () => {
  const step = nextStep(
    job('LISTO_PARA_REPARACION', {}, { assignedTechnicianId: 'otro' }),
    TECNICO,
  );

  assert.equal(step.enabled, false);
  assert.ok(step.blockedBy.some((m) => m.includes('Solo el técnico asignado')));
});

test('sin acción del técnico, el botón dice a quién se espera', () => {
  const step = nextStep(job('ESPERANDO_REPUESTOS'), TECNICO);

  assert.equal(step.action, null);
  assert.equal(step.label, 'Esperando al proveedor');
  assert.equal(step.tone, 'muted');
});

test('pausar solo se ofrece con el cronómetro corriendo', () => {
  assert.notEqual(pauseStep(job('EN_REPARACION', { sessions: working }), TECNICO), null);
  assert.equal(pauseStep(job('LISTO_PARA_REPARACION'), TECNICO), null);

  const paused: readonly TimeSession[] = [
    { kind: 'trabajo', startedAt: ago(90), endedAt: ago(30) },
    { kind: 'pausa', startedAt: ago(30), endedAt: null, pauseReason: 'refrigerio' },
  ];
  assert.equal(pauseStep(job('REPARACION_PAUSADA', { sessions: paused }), TECNICO), null);
});

// ─────────────────────────────────────────────────────────────────────────────
// A quién se espera
// ─────────────────────────────────────────────────────────────────────────────

test('cada espera nombra a su tercero', () => {
  assert.equal(waitingOn(job('ESPERANDO_CLIENTE')), 'el cliente');
  assert.equal(waitingOn(job('CONTROL_CALIDAD')), 'control de calidad');
  assert.equal(waitingOn(job('EN_LAVADO')), 'lavado');
  assert.equal(waitingOn(job('LISTO_PARA_REPARACION')), null);
  assert.equal(waitingOn(job('EN_REPARACION', { sessions: working })), null);
});

test('un motivo de pausa no es alguien a quien esperar', () => {
  const pause: OpenPause = {
    reason: 'espera_autorizacion',
    label: 'Espera de autorización',
    blocks: true,
    since: ago(20),
  };
  const pausada = job('REPARACION_PAUSADA', { openPause: pause });

  /* «Esperando a espera de autorización» era lo que salía al mezclar las dos
     cosas. El tercero lo dice el estado; el motivo lo dice la pausa. */
  assert.equal(waitingOn(pausada), null);
  assert.equal(pausada.openPause?.label, 'Espera de autorización');
  // Y sigue contando como parada: no es trabajo que el técnico pueda empezar.
  assert.equal(planDay([pausada], TECNICO, NOW).waiting.length, 1);
});

test('las etiquetas de pausa salen del catálogo, no de aquí', () => {
  assert.equal(pauseLabel('espera_repuestos'), 'Espera de repuestos');
  assert.equal(pauseBlocks('espera_repuestos'), true);
  assert.equal(pauseBlocks('refrigerio'), false);
  // Un motivo que no existe no rompe la pantalla.
  assert.equal(pauseLabel('inventado'), 'inventado');
});

// ─────────────────────────────────────────────────────────────────────────────
// La jornada
// ─────────────────────────────────────────────────────────────────────────────

test('el trabajo con el cronómetro corriendo es el de ahora', () => {
  const plan = planDay(
    [
      job('LISTO_PARA_REPARACION', { id: 'a', code: 'OS-A' }),
      job('EN_REPARACION', { id: 'b', code: 'OS-B', sessions: working }),
    ],
    TECNICO,
    NOW,
  );

  assert.equal(plan.current?.job.id, 'b');
  assert.deepEqual(
    plan.next.map((e) => e.job.id),
    ['a'],
  );
});

test('una pausa bloqueante va a esperando aunque reanudar esté disponible', () => {
  const pause: OpenPause = {
    reason: 'espera_repuestos',
    label: 'Espera de repuestos',
    blocks: true,
    since: ago(200),
  };
  const plan = planDay([job('REPARACION_PAUSADA', { openPause: pause })], TECNICO, NOW);

  assert.equal(plan.next.length, 0);
  assert.equal(plan.waiting.length, 1);
  // El botón sigue existiendo: el aviso puede llegar antes que el repuesto.
  assert.equal(plan.waiting[0]?.step.action, 'reanudar');
});

test('una pausa de refrigerio sigue siendo trabajo del técnico', () => {
  const pause: OpenPause = {
    reason: 'refrigerio',
    label: 'Refrigerio',
    blocks: false,
    since: ago(10),
  };
  const plan = planDay([job('REPARACION_PAUSADA', { openPause: pause })], TECNICO, NOW);

  assert.equal(plan.waiting.length, 0);
  assert.equal(plan.next[0]?.step.action, 'reanudar');
});

test('terminado hoy es hoy, no «en las últimas 24 horas»', () => {
  const anoche = job('CONTROL_CALIDAD', {
    lastWorkEndedAt: new Date('2026-09-11T23:00:00-05:00'),
  });
  const estaMañana = job('CONTROL_CALIDAD', {
    lastWorkEndedAt: new Date('2026-09-12T09:00:00-05:00'),
  });

  assert.equal(finishedToday(anoche, NOW), false);
  assert.equal(finishedToday(estaMañana, NOW), true);
});

test('una orden que salió del taller sin cerrar hoy no aparece en la jornada', () => {
  const plan = planDay(
    [
      job('CONTROL_CALIDAD', {
        id: 'viejo',
        lastWorkEndedAt: new Date('2026-09-10T16:00:00-05:00'),
      }),
    ],
    TECNICO,
    NOW,
  );

  assert.equal(plan.finishedToday.length, 0);
  // No se pierde: sigue esperando a calidad.
  assert.equal(plan.waiting[0]?.job.id, 'viejo');
});

test('lo que vence antes va primero, y lo que no tiene promesa al final', () => {
  const plan = planDay(
    [
      job('LISTO_PARA_REPARACION', { id: 'sin', code: 'OS-C', promisedAt: null }),
      job('LISTO_PARA_REPARACION', {
        id: 'tarde',
        code: 'OS-B',
        promisedAt: new Date('2026-09-12T18:00:00-05:00'),
      }),
      job('LISTO_PARA_REPARACION', {
        id: 'pronto',
        code: 'OS-A',
        promisedAt: new Date('2026-09-12T16:00:00-05:00'),
      }),
    ],
    TECNICO,
    NOW,
  );

  assert.deepEqual(
    plan.next.map((e) => e.job.id),
    ['pronto', 'tarde', 'sin'],
  );
});

test('dos cronómetros abiertos no esconden trabajo: el segundo pasa a lo siguiente', () => {
  const plan = planDay(
    [
      job('EN_REPARACION', { id: 'a', code: 'OS-A', sessions: working }),
      job('EN_REPARACION', { id: 'b', code: 'OS-B', sessions: working }),
    ],
    TECNICO,
    NOW,
  );

  assert.equal(plan.current?.job.id, 'a');
  assert.deepEqual(
    plan.next.map((e) => e.job.id),
    ['b'],
  );
});

test('isRunning distingue el cronómetro corriendo de la pausa abierta', () => {
  assert.equal(isRunning(job('EN_REPARACION', { sessions: working })), true);

  const paused: readonly TimeSession[] = [
    { kind: 'trabajo', startedAt: ago(90), endedAt: ago(30) },
    { kind: 'pausa', startedAt: ago(30), endedAt: null, pauseReason: 'refrigerio' },
  ];
  assert.equal(isRunning(job('REPARACION_PAUSADA', { sessions: paused })), false);
});

test('el tiempo de hoy recorta lo que viene de ayer', () => {
  const ayer: readonly TimeSession[] = [
    {
      kind: 'trabajo',
      // Ocho horas a caballo de la medianoche: solo cuentan las de hoy.
      startedAt: new Date('2026-09-11T22:00:00-05:00'),
      endedAt: new Date('2026-09-12T02:00:00-05:00'),
    },
  ];
  const plan = planDay([job('CONTROL_CALIDAD', { sessions: ayer })], TECNICO, NOW);

  assert.equal(minutesWorkedToday(plan, NOW), 120);
});

test('el tiempo de hoy cuenta la sesión abierta hasta ahora, y no las pausas', () => {
  const mixed: readonly TimeSession[] = [
    { kind: 'trabajo', startedAt: ago(120), endedAt: ago(60) },
    { kind: 'pausa', startedAt: ago(60), endedAt: ago(45), pauseReason: 'refrigerio' },
    { kind: 'trabajo', startedAt: ago(45), endedAt: null },
  ];
  const plan = planDay([job('EN_REPARACION', { sessions: mixed })], TECNICO, NOW);

  assert.equal(minutesWorkedToday(plan, NOW), 105);
});

test('cada acción lleva a su banco de trabajo, y lo demás a la ficha', () => {
  assert.equal(stepHref('iniciar_diagnostico', 'os-1'), '/taller/diagnostico');
  assert.equal(stepHref('terminar_reparacion', 'os-1'), '/taller/reparacion');
  assert.equal(stepHref('enviar_a_calidad', 'os-1'), '/calidad/os-1');
  // Sin acción —esperando a un tercero— la tarjeta sigue abriendo algo útil.
  assert.equal(stepHref(null, 'os-1'), '/ordenes/os-1');
  assert.equal(stepHref('cancelar', 'os-1'), '/ordenes/os-1');
});

test('el plan trae la pausa solo en el trabajo en curso', () => {
  const plan = planDay(
    [
      job('EN_REPARACION', { id: 'a', code: 'OS-A', sessions: working }),
      job('LISTO_PARA_REPARACION', { id: 'b', code: 'OS-B' }),
    ],
    TECNICO,
    NOW,
  );

  assert.equal(plan.current?.pause?.action, 'pausar');
  assert.equal(plan.next[0]?.pause, null);
});

test('«a el» no se dice: la contracción va en el dominio, no en la plantilla', () => {
  assert.equal(waitingPhrase('el cliente'), 'al cliente');
  assert.equal(waitingPhrase('el proveedor'), 'al proveedor');
  assert.equal(waitingPhrase('compras'), 'a compras');
  assert.equal(waitingPhrase('control de calidad'), 'a control de calidad');
  // «la autorización» no se contrae.
  assert.equal(waitingPhrase('la autorización de compra'), 'a la autorización de compra');
});
