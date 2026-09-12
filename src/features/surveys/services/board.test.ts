import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  bucketCounts,
  byAspect,
  isAnswered,
  pendingFollowUps,
  summarize,
  type SurveyResponse,
} from './board';

const R = (over: Partial<SurveyResponse> & { id: string }): SurveyResponse => ({
  orderId: 'o1', orderCode: 'OS-1', plate: 'ABC123', vehicle: 'Toyota Hilux',
  customer: 'Juan Pérez', corporateClient: null, advisor: 'Andrea',
  npsScore: 9, answers: { atencion: 5, tiempo: 5 }, comment: '',
  answeredDaysAgo: 1, followedUp: false, ...over,
});

describe('resumen', () => {
  it('no cuenta como contestadas las que nadie respondió', () => {
    const r = summarize([R({ id: '1' }), R({ id: '2', npsScore: null, answers: {} })]);
    assert.equal(r.sent, 2);
    assert.equal(r.answered, 1);
    assert.equal(r.responseRate, 50);
  });

  it('sin encuestas enviadas, la tasa es «no hay dato», no 0 %', () => {
    // 0 % diría que nadie contesta; la verdad es que no se preguntó a nadie.
    assert.equal(summarize([]).responseRate, null);
    assert.equal(summarize([]).csat, null);
  });

  it('el CSAT promedia POR RESPUESTA, no por nota suelta', () => {
    // Si promediara notas sueltas, quien contesta cinco aspectos pesaría cinco
    // veces más que quien contesta uno, y un cliente hablador movería la cifra
    // del taller entero.
    const r = summarize([
      R({ id: '1', answers: { a: 5, b: 5, c: 5, d: 5, e: 5 } }),
      R({ id: '2', answers: { a: 1 } }),
    ]);
    assert.equal(r.csat, 3); // (5 + 1) / 2, no (25+1)/6 = 4,3
  });

  it('ignora los aspectos sin contestar', () => {
    assert.equal(summarize([R({ id: '1', answers: { a: 4, b: 0 } })]).csat, 4);
  });
});

describe('a quién hay que llamar', () => {
  it('un detractor siempre entra', () => {
    const p = pendingFollowUps([R({ id: '1', npsScore: 3 })]);
    assert.equal(p.length, 1);
  });

  it('quien puntúa bien pero hunde un aspecto también', () => {
    // Un 9 con un 1 en plazos es un cliente que volverá y al que se le falló
    // en algo concreto y arreglable.
    const p = pendingFollowUps([R({ id: '1', npsScore: 9, answers: { tiempo: 1 } })]);
    assert.equal(p.length, 1);
  });

  it('a quien ya se llamó no vuelve a salir', () => {
    assert.deepEqual(pendingFollowUps([R({ id: '1', npsScore: 2, followedUp: true })]), []);
  });

  it('quien no contestó no se puede seguir', () => {
    assert.deepEqual(pendingFollowUps([R({ id: '1', npsScore: null, answers: {} })]), []);
  });

  it('los detractores van antes que los aspectos hundidos', () => {
    const p = pendingFollowUps([
      R({ id: 'aspecto', npsScore: 9, answers: { tiempo: 1 }, answeredDaysAgo: 0 }),
      R({ id: 'detractor', npsScore: 2, answeredDaysAgo: 5 }),
    ]);
    assert.deepEqual(p.map((r) => r.id), ['detractor', 'aspecto']);
  });

  it('dentro del mismo grupo, lo más reciente primero', () => {
    // Una queja de hace dos días se arregla; una de hace tres semanas ya solo
    // se disculpa.
    const p = pendingFollowUps([
      R({ id: 'vieja', npsScore: 1, answeredDaysAgo: 21 }),
      R({ id: 'nueva', npsScore: 1, answeredDaysAgo: 2 }),
    ]);
    assert.deepEqual(p.map((r) => r.id), ['nueva', 'vieja']);
  });
});

describe('por aspecto', () => {
  it('ordena de peor a mejor', () => {
    // Lo primero que se lee es lo que hay que arreglar.
    const a = byAspect([
      R({ id: '1', answers: { atencion: 5, tiempo: 2 } }),
      R({ id: '2', answers: { atencion: 5, tiempo: 4 } }),
    ]);
    assert.deepEqual(a.map((x) => x.id), ['tiempo', 'atencion']);
    assert.equal(a[0]?.average, 3);
  });

  it('cuenta cuántos contestaron cada aspecto', () => {
    const a = byAspect([
      R({ id: '1', answers: { atencion: 5 } }),
      R({ id: '2', answers: { atencion: 3, tiempo: 4 } }),
    ]);
    assert.equal(a.find((x) => x.id === 'atencion')?.responses, 2);
    assert.equal(a.find((x) => x.id === 'tiempo')?.responses, 1);
  });

  it('sin respuestas, ningún aspecto', () => {
    assert.deepEqual(byAspect([R({ id: '1', npsScore: null, answers: {} })]), []);
  });
});

describe('reparto', () => {
  it('cuenta promotores, pasivos y detractores', () => {
    const c = bucketCounts([
      R({ id: '1', npsScore: 10 }),
      R({ id: '2', npsScore: 8 }),
      R({ id: '3', npsScore: 4 }),
      R({ id: '4', npsScore: null }),
    ]);
    assert.deepEqual(c, { promotor: 1, pasivo: 1, detractor: 1 });
  });
});

describe('contestada', () => {
  it('lo está si tiene nota de recomendación', () => {
    assert.equal(isAnswered(R({ id: '1', npsScore: 0 })), true);
    assert.equal(isAnswered(R({ id: '2', npsScore: null })), false);
  });
});
