import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  bucketOf,
  csatAverage,
  CSAT_QUESTIONS,
  needsFollowUp,
  npsOf,
  readiness,
  type CsatAnswers,
} from './survey';

const allFive: CsatAnswers = Object.fromEntries(CSAT_QUESTIONS.map((q) => [q.id, 5]));

describe('clasificación NPS', () => {
  it('los cortes son los estándar del sector', () => {
    assert.equal(bucketOf(10), 'promotor');
    assert.equal(bucketOf(9), 'promotor');
    assert.equal(bucketOf(8), 'pasivo');
    assert.equal(bucketOf(7), 'pasivo');
    assert.equal(bucketOf(6), 'detractor');
    assert.equal(bucketOf(0), 'detractor');
  });
});

describe('agregación NPS', () => {
  it('resta porcentajes, no promedia notas', () => {
    // Un 10 y un 0 promediados dan 5, que parece «normal». La verdad es 0:
    // hay un cliente encantado y otro que va a contarlo.
    const r = npsOf([10, 0]);
    assert.equal(r.score, 0);
    assert.equal(r.promoters, 1);
    assert.equal(r.detractors, 1);
  });

  it('todos promotores dan 100', () => {
    assert.equal(npsOf([9, 10, 10]).score, 100);
  });

  it('todos detractores dan −100', () => {
    assert.equal(npsOf([0, 3, 6]).score, -100);
  });

  it('los pasivos no suman ni restan, pero cuentan en el total', () => {
    const r = npsOf([10, 8, 8, 8]);
    assert.equal(r.passives, 3);
    assert.equal(r.score, 25);
  });

  it('sin respuestas no inventa un cero con cuatro decimales', () => {
    const r = npsOf([]);
    assert.equal(r.responses, 0);
    assert.equal(r.score, 0);
  });

  it('descarta notas fuera de rango en vez de contarlas', () => {
    assert.equal(npsOf([10, 99, -4, Number.NaN]).responses, 1);
  });
});

describe('qué impide enviar la encuesta', () => {
  it('sin nota NPS no se envía', () => {
    const r = readiness(null, allFive, '');
    assert.equal(r.canSubmit, false);
    assert.ok(r.blockers.some((b) => b.includes('del 0 al 10')));
  });

  it('con aspectos sin puntuar no se envía', () => {
    const r = readiness(10, { atencion: 5 }, '');
    assert.equal(r.canSubmit, false);
    assert.ok(r.blockers.some((b) => b.includes('aspectos')));
  });

  it('un promotor no tiene que escribir nada', () => {
    // Pedir comentario a todo el mundo hace que la mayoría escriba «bien».
    assert.deepEqual(readiness(10, allFive, ''), { canSubmit: true, blockers: [] });
  });

  it('un detractor sí: sin el motivo el taller no sabe qué arreglar', () => {
    assert.equal(readiness(4, allFive, '').canSubmit, false);
    assert.equal(readiness(4, allFive, 'Me entregaron dos días tarde.').canSubmit, true);
  });

  it('un pasivo tampoco necesita comentario', () => {
    assert.equal(readiness(8, allFive, '').canSubmit, true);
  });
});

describe('promedio CSAT', () => {
  it('promedia solo lo respondido', () => {
    assert.equal(csatAverage({ a: 5, b: 4, c: 0 }), 4.5);
  });

  it('sin respuestas no hay promedio', () => {
    assert.equal(csatAverage({}), null);
    assert.equal(csatAverage({ a: 0 }), null);
  });

  it('redondea a un decimal', () => {
    assert.equal(csatAverage({ a: 5, b: 4, c: 4 }), 4.3);
  });
});

describe('a quién hay que llamar', () => {
  it('a todo detractor', () => {
    assert.equal(needsFollowUp(3, allFive), true);
  });

  it('y a quien puntúa bien pero hunde un aspecto', () => {
    // Un 9 con un 1 en plazos es un cliente que vuelve, pero al que se le
    // falló en algo concreto y arreglable.
    assert.equal(needsFollowUp(9, { ...allFive, tiempo: 1 }), true);
  });

  it('no a quien está contento en todo', () => {
    assert.equal(needsFollowUp(10, allFive), false);
  });

  it('un 3 no dispara seguimiento por sí solo, un 2 sí', () => {
    assert.equal(needsFollowUp(10, { ...allFive, precio: 3 }), false);
    assert.equal(needsFollowUp(10, { ...allFive, precio: 2 }), true);
  });
});
