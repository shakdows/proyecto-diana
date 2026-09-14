import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { PERMISSIONS, ROLE_LABELS, ROLE_PERMISSIONS } from '@/lib/auth/permissions';
import { ORDER_ACTIONS, allTransitions, type Actor, type OrderFacts } from './state-machine';
import { ORDER_STATUSES, statusLabel } from './order-status';
import {
  advanceRank,
  advanceSlot,
  applyAction,
  factsAt,
  freshAdvance,
  hasAdvanced,
  isAdvancing,
  lastTransition,
  nextStepOwner,
  ownerPhrase,
  readAdvance,
  screenFor,
  transitionPhrase,
  undoLast,
  type OrderAdvance,
} from './advance';

const actor: Actor = { profileId: 'tec-1', permissions: PERMISSIONS };
const AHORA = new Date('2026-09-14T15:30:00Z');

function facts(overrides: Partial<OrderFacts> = {}): OrderFacts {
  return {
    status: 'EN_REPARACION',
    hasCustomer: true,
    hasVehicle: true,
    hasServiceType: true,
    requiredChecklistItems: 10,
    resolvedChecklistItems: 10,
    hasCustomerSignature: true,
    hasAdvisorSignature: true,
    assignedTechnicianId: 'tec-1',
    diagnosticItemCount: 4,
    quotationLineCount: 4,
    quotationLinesPriced: 4,
    authorizationLinkIssued: true,
    decidedItemCount: 4,
    approvedItemCount: 4,
    requiredPartsCount: 3,
    partsCoverageComplete: true,
    partsRequestPending: true,
    supplierLinesAllSelected: true,
    purchaseWithinAuthorizerLimit: true,
    purchaseOrderIssued: true,
    estimatedMinutes: 210,
    repairJobsTotal: 4,
    repairJobsDone: 4,
    hasOpenTimeSession: false,
    hasFinalEvidence: true,
    qualityChecklistComplete: true,
    qualityFindingCount: 1,
    pendingFinalStages: [],
    deliveryActSigned: true,
    hasOpenTasks: false,
    ...overrides,
  };
}

function apply(
  advance: OrderAdvance,
  action: Parameters<typeof applyAction>[2],
  base = facts(),
): OrderAdvance {
  const result = applyAction(advance, base, action, actor, 'Andrea López', AHORA);
  assert.equal(result.ok, true, `«${action}» debía aplicarse: ${result.ok ? '' : result.message}`);
  assert.ok(result.ok);
  return result.advance;
}

describe('aplicar una acción', () => {
  it('mueve el estado al destino que declara la máquina', () => {
    const after = apply(freshAdvance('EN_REPARACION'), 'terminar_reparacion');
    assert.equal(after.status, 'REPARACION_TERMINADA');
    assert.equal(after.base, 'EN_REPARACION', 'el estado sembrado no se toca');
  });

  it('deja rastro de quién y cuándo, no solo del resultado', () => {
    const after = apply(freshAdvance('EN_REPARACION'), 'terminar_reparacion');
    const step = lastTransition(after);
    assert.ok(step !== null);
    assert.equal(step.from, 'EN_REPARACION');
    assert.equal(step.to, 'REPARACION_TERMINADA');
    assert.equal(step.by, 'tec-1');
    assert.equal(step.byName, 'Andrea López');
    assert.equal(step.at, AHORA.getTime());
  });

  it('encadena: la segunda acción parte del estado al que llevó la primera', () => {
    let advance = apply(freshAdvance('EN_REPARACION'), 'terminar_reparacion');
    advance = apply(advance, 'enviar_a_calidad');
    assert.equal(advance.status, 'CONTROL_CALIDAD');
    assert.equal(advance.history.length, 2);
  });

  it('no decide por su cuenta: rechaza lo que la máquina rechaza', () => {
    const result = applyAction(
      freshAdvance('EN_REPARACION'),
      facts({ repairJobsDone: 2, hasFinalEvidence: false }),
      'terminar_reparacion',
      actor,
      'Andrea López',
      AHORA,
    );
    assert.equal(result.ok, false);
    assert.ok(!result.ok);
    assert.equal(result.unmet.length, 2, 'devuelve LOS DOS requisitos, no el primero');
  });

  it('rechaza una acción que no existe en el estado ALCANZADO, no en el sembrado', () => {
    // Tras terminar, «terminar» ya no es legal aunque lo fuera al sembrar.
    const after = apply(freshAdvance('EN_REPARACION'), 'terminar_reparacion');
    const result = applyAction(after, facts(), 'terminar_reparacion', actor, 'A', AHORA);
    assert.equal(result.ok, false);
  });

  it('no muta el avance que recibe', () => {
    const before = freshAdvance('EN_REPARACION');
    apply(before, 'terminar_reparacion');
    assert.equal(before.status, 'EN_REPARACION');
    assert.equal(before.history.length, 0);
  });
});

describe('factsAt', () => {
  it('sustituye el estado sembrado por el alcanzado', () => {
    const advance = apply(freshAdvance('EN_REPARACION'), 'terminar_reparacion');
    assert.equal(factsAt(facts(), advance).status, 'REPARACION_TERMINADA');
  });

  it('no toca ningún otro hecho: un trabajo sin marcar sigue sin marcar', () => {
    const advance = apply(freshAdvance('EN_REPARACION'), 'terminar_reparacion');
    const base = facts({ repairJobsDone: 1 });
    assert.equal(factsAt(base, advance).repairJobsDone, 1);
  });

  it('devuelve el mismo objeto cuando no hay nada que cambiar', () => {
    const base = facts();
    assert.equal(factsAt(base, freshAdvance('EN_REPARACION')), base);
  });
});

describe('deshacer', () => {
  it('vuelve al estado anterior y quita el paso', () => {
    const advance = apply(freshAdvance('EN_REPARACION'), 'terminar_reparacion');
    const back = undoLast(advance);
    assert.equal(back.status, 'EN_REPARACION');
    assert.equal(back.history.length, 0);
    assert.equal(hasAdvanced(back), false);
  });

  it('deshace UNO, no todos', () => {
    let advance = apply(freshAdvance('EN_REPARACION'), 'terminar_reparacion');
    advance = apply(advance, 'enviar_a_calidad');
    const back = undoLast(advance);
    assert.equal(back.status, 'REPARACION_TERMINADA');
    assert.equal(back.history.length, 1);
  });

  it('sobre un avance limpio no hace nada', () => {
    const limpio = freshAdvance('EN_REPARACION');
    assert.deepEqual(undoLast(limpio), limpio);
  });
});

describe('leer lo guardado', () => {
  const guardado = apply(freshAdvance('EN_REPARACION'), 'terminar_reparacion');

  it('recupera un avance íntegro', () => {
    const leido = readAdvance(
      'EN_REPARACION',
      JSON.parse(JSON.stringify(guardado)),
      ORDER_STATUSES,
    );
    assert.deepEqual(leido, guardado);
  });

  it('descarta lo guardado si el estado sembrado ya no es el mismo', () => {
    // La orden se resembró en otro estado: lo guardado describe otra orden.
    const leido = readAdvance('CONTROL_CALIDAD', guardado, ORDER_STATUSES);
    assert.equal(leido.status, 'CONTROL_CALIDAD');
    assert.equal(leido.history.length, 0);
  });

  it('descarta un historial que no cierra con el estado guardado', () => {
    const manipulado = { ...guardado, status: 'ENTREGADO' };
    const leido = readAdvance('EN_REPARACION', manipulado, ORDER_STATUSES);
    assert.equal(leido.status, 'EN_REPARACION', 'vuelve a lo sembrado, no pinta ENTREGADO');
  });

  it('descarta un historial cuyos pasos no se encadenan', () => {
    const roto = {
      base: 'EN_REPARACION',
      status: 'CONTROL_CALIDAD',
      history: [
        { action: 'enviar_a_calidad', from: 'REPARACION_TERMINADA', to: 'CONTROL_CALIDAD', at: 1, by: 'x', byName: 'X' },
      ],
    };
    assert.equal(readAdvance('EN_REPARACION', roto, ORDER_STATUSES).history.length, 0);
  });

  it('descarta estados y acciones que no existen', () => {
    const inventado = {
      base: 'EN_REPARACION',
      status: 'PINTURA',
      history: [],
    };
    assert.equal(readAdvance('EN_REPARACION', inventado, ORDER_STATUSES).status, 'EN_REPARACION');

    const accionInventada = {
      base: 'EN_REPARACION',
      status: 'REPARACION_TERMINADA',
      history: [
        { action: 'teletransportar', from: 'EN_REPARACION', to: 'REPARACION_TERMINADA', at: 1, by: 'x', byName: 'X' },
      ],
    };
    assert.equal(readAdvance('EN_REPARACION', accionInventada, ORDER_STATUSES).history.length, 0);
  });

  it('nunca lanza ante basura', () => {
    for (const basura of [null, undefined, 0, 'texto', [], { base: 1 }, { base: 'EN_REPARACION' }]) {
      assert.equal(readAdvance('EN_REPARACION', basura, ORDER_STATUSES).status, 'EN_REPARACION');
    }
  });
});

describe('dónde se resuelve cada acción', () => {
  it('lleva a la bahía lo que se hace en la bahía', () => {
    assert.equal(screenFor('terminar_reparacion', 'os-154')?.href, '/taller/reparacion');
  });

  it('lleva a calidad, a entrega y a compras cada una a su pantalla', () => {
    assert.equal(screenFor('aprobar_calidad', 'os-154')?.href, '/calidad/os-154');
    assert.equal(screenFor('entregar', 'os-154')?.href, '/ordenes/os-154/entrega');
    assert.equal(screenFor('recepcion_completa', 'os-154')?.href, '/compras/os-154/recepcion');
  });

  it('no inventa destino para lo que se hace en la propia orden', () => {
    assert.equal(screenFor('cancelar', 'os-154'), null);
    assert.equal(screenFor('enviar_a_calidad', 'os-154'), null);
  });

  it('toda ruta con identificador lo lleva dentro', () => {
    for (const action of ORDER_ACTIONS) {
      const screen = screenFor(action, 'os-999');
      if (screen === null) continue;
      assert.ok(
        screen.href.startsWith('/'),
        `«${action}» debe apuntar a una ruta absoluta`,
      );
    }
  });
});

describe('orden de las acciones', () => {
  it('en reparación, terminar pesa más que cancelar', () => {
    assert.ok(advanceRank('terminar_reparacion') < advanceRank('cancelar'));
    assert.ok(advanceRank('terminar_reparacion') < advanceRank('pausar'));
  });

  it('cancelar y pausar no cuentan como avanzar', () => {
    assert.equal(isAdvancing('cancelar'), false);
    assert.equal(isAdvancing('pausar'), false);
    assert.equal(isAdvancing('terminar_reparacion'), true);
  });

  it('la frase dice qué hace y adónde lleva', () => {
    assert.equal(
      transitionPhrase('terminar_reparacion', 'REPARACION_TERMINADA', statusLabel),
      'Terminar reparación · pasa a Reparación terminada',
    );
  });
});

describe('ranura de guardado', () => {
  it('es distinta por orden', () => {
    assert.notEqual(advanceSlot('os-154'), advanceSlot('os-158'));
    assert.equal(advanceSlot('os-154'), 'orden.os-154.avance');
  });
});

describe('a quién le toca', () => {
  const transitions = allTransitions();

  it('en reparación le toca al técnico, no al asesor que mira', () => {
    const owner = nextStepOwner('EN_REPARACION', transitions, ROLE_PERMISSIONS);
    assert.ok(owner !== null);
    assert.equal(owner.action, 'terminar_reparacion');
    assert.equal(owner.to, 'REPARACION_TERMINADA');
    assert.ok(owner.roles.includes('tecnico'));
  });

  it('en control de calidad le toca a calidad', () => {
    const owner = nextStepOwner('CONTROL_CALIDAD', transitions, ROLE_PERMISSIONS);
    assert.equal(owner?.action, 'aprobar_calidad');
    assert.ok(owner?.roles.includes('calidad'));
  });

  it('no propone cancelar ni pausar como siguiente paso', () => {
    for (const status of ORDER_STATUSES) {
      const owner = nextStepOwner(status, transitions, ROLE_PERMISSIONS);
      if (owner === null) continue;
      assert.notEqual(owner.action, 'cancelar', status);
      assert.notEqual(owner.action, 'pausar', status);
    }
  });

  it('desde un estado terminal no le toca a nadie', () => {
    assert.equal(nextStepOwner('CERRADO', transitions, ROLE_PERMISSIONS), null);
    assert.equal(nextStepOwner('CANCELADO', transitions, ROLE_PERMISSIONS), null);
  });

  it('la frase no se llena de administradores', () => {
    const owner = nextStepOwner('EN_REPARACION', transitions, ROLE_PERMISSIONS);
    assert.ok(owner !== null);
    const frase = ownerPhrase(owner, (r) => ROLE_LABELS[r]);
    assert.ok(frase.includes(ROLE_LABELS.tecnico), frase);
    assert.ok(!frase.includes(ROLE_LABELS.super_admin), frase);
  });
});
