import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  byUrgency,
  finish,
  inProgress,
  isEligible,
  isOverrunning,
  nextStationAfter,
  SERVICE_ORDER,
  start,
  startCheck,
  statusAfter,
  summarize,
  waiting,
  type QueueEntry,
} from './station';

const entry = (over: Partial<QueueEntry> = {}): QueueEntry => ({
  orderId: 'os-154',
  orderCode: 'OS-2026-000154',
  vehicle: 'Toyota Hilux SRV',
  plate: 'ABC-123',
  customer: 'Juan Pérez',
  state: 'pendiente',
  startedMinutesAgo: null,
  typicalMinutes: 30,
  promisedInMinutes: 120,
  remainingServices: ['lavado'],
  ...over,
});

describe('quién puede entrar a servicios finales', () => {
  it('calidad aprobada es la puerta', () => {
    assert.equal(isEligible('CONTROL_CALIDAD_APROBADO'), true);
  });

  it('un vehículo observado en calidad no entra', () => {
    // Lavar algo que va a volver al taller es lavarlo dos veces.
    assert.equal(isEligible('OBSERVADO_CONTROL_CALIDAD'), false);
    assert.equal(isEligible('EN_REPARACION'), false);
  });

  it('quien ya está en la cadena sigue dentro', () => {
    assert.equal(isEligible('EN_LAVADO'), true);
    assert.equal(isEligible('PENDIENTE_ALINEAMIENTO'), true);
  });
});

describe('un vehículo a la vez', () => {
  const a = entry({ orderId: 'a', plate: 'ABC-123' });
  const b = entry({ orderId: 'b', plate: 'XYZ-789' });

  it('con la bahía libre se empieza', () => {
    assert.equal(startCheck([a, b], 'a').canStart, true);
  });

  it('con uno en proceso, el segundo espera y se dice por qué', () => {
    const queue = start([a, b], 'a');
    const check = startCheck(queue, 'b');
    assert.equal(check.canStart, false);
    assert.ok(check.reason?.includes('ABC-123'));
  });

  it('al terminar el primero se libera la bahía', () => {
    let queue = start([a, b], 'a');
    queue = finish(queue, 'a');
    assert.equal(inProgress(queue), undefined);
    assert.equal(startCheck(queue, 'b').canStart, true);
  });

  it('empezar uno que no existe no rompe la cola', () => {
    assert.deepEqual(start([a], 'fantasma'), [a]);
    assert.equal(startCheck([a], 'fantasma').canStart, false);
  });

  it('no se reempieza lo terminado', () => {
    const done = entry({ orderId: 'a', state: 'terminado' });
    assert.equal(startCheck([done], 'a').canStart, false);
  });

  it('terminar algo que no está en proceso no hace nada', () => {
    assert.deepEqual(finish([a], 'a'), [a]);
  });
});

describe('encadenamiento de estaciones', () => {
  it('el alineamiento va antes que el lavado', () => {
    // Su prueba en pista ensucia el vehículo.
    assert.deepEqual([...SERVICE_ORDER], ['alineamiento', 'lavado']);
  });

  it('al terminar alineamiento, si falta lavado, encadena', () => {
    assert.equal(nextStationAfter('alineamiento', ['alineamiento', 'lavado']), 'lavado');
    assert.equal(statusAfter('alineamiento', ['alineamiento', 'lavado']), 'PENDIENTE_LAVADO');
  });

  it('al terminar lavado no se vuelve al alineamiento aunque figure', () => {
    // Respetamos SERVICE_ORDER, no el orden en que aparezcan en la lista.
    assert.equal(nextStationAfter('lavado', ['lavado', 'alineamiento']), null);
    assert.equal(statusAfter('lavado', ['lavado', 'alineamiento']), 'LISTO_PARA_ENTREGA');
  });

  it('sin más servicios queda listo para entrega', () => {
    assert.equal(statusAfter('lavado', ['lavado']), 'LISTO_PARA_ENTREGA');
  });
});

describe('lo que se alarga', () => {
  it('pasado el tiempo típico se marca', () => {
    assert.equal(
      isOverrunning(entry({ state: 'en_proceso', startedMinutesAgo: 45, typicalMinutes: 30 })),
      true,
    );
  });

  it('dentro del tiempo típico, no', () => {
    assert.equal(
      isOverrunning(entry({ state: 'en_proceso', startedMinutesAgo: 12, typicalMinutes: 30 })),
      false,
    );
  });

  it('lo que no ha empezado nunca se alarga', () => {
    assert.equal(isOverrunning(entry({ state: 'pendiente', typicalMinutes: 1 })), false);
  });
});

describe('resumen y orden de atención', () => {
  const a = entry({ orderId: 'a', promisedInMinutes: -20 });
  const b = entry({ orderId: 'b', promisedInMinutes: 90, state: 'en_proceso', startedMinutesAgo: 5 });
  const c = entry({ orderId: 'c', promisedInMinutes: 300, state: 'terminado' });

  it('cuenta en espera, en proceso y terminados', () => {
    const s = summarize([a, b, c]);
    assert.equal(s.waiting, 1);
    assert.equal(s.inProgress, 1);
    assert.equal(s.finishedToday, 1);
  });

  it('lo terminado no cuenta como vencido aunque su hora pasara', () => {
    const vencidoTerminado = entry({ orderId: 'd', state: 'terminado', promisedInMinutes: -500 });
    assert.equal(summarize([vencidoTerminado]).overdue, 0);
  });

  it('cuenta como vencido lo que sigue sin terminar', () => {
    assert.equal(summarize([a, b, c]).overdue, 1);
  });

  it('lo más vencido va arriba', () => {
    assert.deepEqual(
      byUrgency([c, b, a]).map((e) => e.orderId),
      ['a', 'b', 'c'],
    );
  });

  it('ordenar no muta la cola original', () => {
    const original = [c, b, a];
    byUrgency(original);
    assert.deepEqual(
      original.map((e) => e.orderId),
      ['c', 'b', 'a'],
    );
  });

  it('una cola vacía resume en ceros', () => {
    assert.deepEqual(summarize([]), { waiting: 0, inProgress: 0, finishedToday: 0, overdue: 0 });
    assert.deepEqual(waiting([]), []);
  });
});

describe('órdenes sin hora comprometida', () => {
  const conHora = entry({ orderId: 'con', promisedInMinutes: -30 });
  const sinHora = entry({ orderId: 'sin', promisedInMinutes: null });

  it('no cuentan como vencidas', () => {
    // Tratarlas como 0 las pintaría «vencidas ahora mismo».
    assert.equal(summarize([sinHora]).overdue, 0);
  });

  it('se van al final de la cola, no al principio', () => {
    assert.deepEqual(
      byUrgency([sinHora, conHora]).map((e) => e.orderId),
      ['con', 'sin'],
    );
  });

  it('entre dos sin hora, el orden no revienta', () => {
    const otra = entry({ orderId: 'otra', promisedInMinutes: null });
    assert.equal(byUrgency([sinHora, otra]).length, 2);
  });
});
