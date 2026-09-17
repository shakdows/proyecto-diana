import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ORDER_STATUSES } from '@/features/orders/services/order-status';
import {
  ROUTE_STEPS,
  ROUTE_STEP_IDS,
  STATE_LABELS,
  TERMINADO,
  progressOf,
  routeStep,
  stateOf,
  stepForStatus,
  stepNumber,
  type RouteStepId,
} from './route-board';

describe('la ruta del trabajo', () => {
  it('son nueve cuadros, del cliente a la entrega', () => {
    assert.equal(ROUTE_STEPS.length, 9);
    assert.equal(ROUTE_STEP_IDS[0], 'cliente');
    assert.equal(ROUTE_STEP_IDS.at(-1), 'entrega');
  });

  it('cada cuadro trae su fotografía, su título y a dónde lleva', () => {
    for (const s of ROUTE_STEPS) {
      assert.match(s.photo, /^\/(assets|fondos)\/.+\.webp$/u, s.id);
      assert.ok(s.title.length > 0, s.id);
      assert.ok(s.hint.length > 0, s.id);
      assert.match(s.fallbackHref, /^\//u, s.id);
    }
  });

  it('los números se cuentan desde uno, como los lee una persona', () => {
    assert.equal(stepNumber('cliente'), 1);
    assert.equal(stepNumber('entrega'), 9);
  });

  it('el catálogo no tiene huecos', () => {
    for (const id of ROUTE_STEP_IDS) assert.equal(routeStep(id).id, id);
    assert.throws(() => routeStep('inventado' as never));
  });
});

describe('en qué cuadro está el vehículo', () => {
  it('TODOS los estados caen en algún sitio', () => {
    for (const s of ORDER_STATUSES) {
      const donde = stepForStatus(s);
      assert.ok(
        donde === TERMINADO || (ROUTE_STEP_IDS as readonly string[]).includes(donde),
        `${s} → ${donde}`,
      );
    }
  });

  it('el recorrido va hacia adelante y nunca hacia atrás', () => {
    const orden: readonly OrderPair[] = [
      ['CHECKLIST_COMPLETADO', 'orden'],
      ['PENDIENTE_DIAGNOSTICO', 'orden'],
      ['EN_DIAGNOSTICO', 'diagnostico'],
      ['COTIZACION_ENVIADA', 'cotizacion'],
      ['ESPERANDO_CLIENTE', 'cotizacion'],
      ['SOLICITUD_REPUESTOS', 'repuestos'],
      ['ESPERANDO_REPUESTOS', 'repuestos'],
      ['LISTO_PARA_REPARACION', 'reparacion'],
      ['EN_REPARACION', 'reparacion'],
      ['CONTROL_CALIDAD', 'calidad'],
      ['PENDIENTE_LAVADO', 'entrega'],
      ['LISTO_PARA_ENTREGA', 'entrega'],
    ];
    let previo = -1;
    for (const [status, cuadro] of orden) {
      assert.equal(stepForStatus(status), cuadro, status);
      const i = ROUTE_STEP_IDS.indexOf(cuadro);
      assert.ok(i >= previo, `${status} retrocede`);
      previo = i;
    }
  });

  it('una orden recién recibida está en «orden de trabajo», no en recepción', () => {
    // La recepción ya se hizo: lo que falta es decir a qué vino el vehículo.
    assert.equal(stepForStatus('CHECKLIST_COMPLETADO'), 'orden');
  });

  it('entregado y cerrado no dejan ningún cuadro por delante', () => {
    assert.equal(stepForStatus('ENTREGADO'), TERMINADO);
    assert.equal(stepForStatus('CERRADO'), TERMINADO);
    assert.equal(stepForStatus('CANCELADO'), TERMINADO);
  });

  it('la reparación terminada ya es cosa de calidad', () => {
    assert.equal(stepForStatus('REPARACION_TERMINADA'), 'calidad');
  });
});

type OrderPair = readonly [(typeof ORDER_STATUSES)[number], RouteStepId];

describe('cómo se pinta cada cuadro', () => {
  it('sin ningún vehículo en marcha, el primero es el actual y nada está hecho', () => {
    assert.equal(stateOf('cliente', null), 'actual');
    for (const id of ROUTE_STEP_IDS.slice(1)) {
      assert.equal(stateOf(id, null), 'pendiente', id);
    }
  });

  it('lo anterior queda hecho, lo siguiente espera', () => {
    assert.equal(stateOf('cliente', 'cotizacion'), 'hecho');
    assert.equal(stateOf('diagnostico', 'cotizacion'), 'hecho');
    assert.equal(stateOf('cotizacion', 'cotizacion'), 'actual');
    assert.equal(stateOf('repuestos', 'cotizacion'), 'pendiente');
  });

  it('con el trabajo terminado, los nueve están hechos', () => {
    for (const id of ROUTE_STEP_IDS) assert.equal(stateOf(id, TERMINADO), 'hecho');
  });

  it('cada estado tiene su palabra: el color nunca va solo', () => {
    for (const estado of ['hecho', 'actual', 'pendiente'] as const) {
      assert.ok(STATE_LABELS[estado].length > 0, estado);
    }
  });

  it('el avance se cuenta en cuadros dejados atrás', () => {
    assert.deepEqual(progressOf(null), { done: 0, total: 9 });
    assert.deepEqual(progressOf('cliente'), { done: 0, total: 9 });
    assert.deepEqual(progressOf('reparacion'), { done: 6, total: 9 });
    assert.deepEqual(progressOf(TERMINADO), { done: 9, total: 9 });
  });
});
