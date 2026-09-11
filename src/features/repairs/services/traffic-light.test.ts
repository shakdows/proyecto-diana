import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { trafficLight, type TrafficLightInput } from './traffic-light';

const at = (hhmm: string): Date => new Date(`2026-09-11T${hhmm}:00-05:00`);

function input(overrides: Partial<TrafficLightInput> = {}): TrafficLightInput {
  return {
    status: 'EN_REPARACION',
    now: at('13:00'),
    promisedAt: at('17:00'),
    etaAt: at('14:16'),
    indeterminateEta: false,
    estimatedMinutes: 210,
    remainingMinutes: 76,
    ...overrides,
  };
}

describe('el gris gana al rojo', () => {
  it('una orden esperando repuestos es gris aunque se haya pasado la hora prometida', () => {
    const r = trafficLight(
      input({ status: 'ESPERANDO_REPUESTOS', now: at('19:00'), promisedAt: at('17:00') }),
    );
    assert.equal(r.color, 'gris');
  });

  it('esperando al cliente también es gris', () => {
    assert.equal(trafficLight(input({ status: 'ESPERANDO_CLIENTE' })).color, 'gris');
    assert.equal(trafficLight(input({ status: 'COTIZACION_ENVIADA' })).color, 'gris');
  });

  it('una ETA indeterminada es gris', () => {
    const r = trafficLight(input({ indeterminateEta: true, etaAt: null }));
    assert.equal(r.color, 'gris');
  });
});

describe('rojo', () => {
  it('cuando ya se pasó la hora prometida', () => {
    const r = trafficLight(input({ now: at('17:30'), promisedAt: at('17:00') }));
    assert.equal(r.color, 'rojo');
    assert.ok(r.reason.includes('hora prometida'));
  });

  it('cuando la ETA dice que se va a pasar', () => {
    const r = trafficLight(input({ promisedAt: at('14:00'), etaAt: at('14:30') }));
    assert.equal(r.color, 'rojo');
  });
});

describe('amarillo', () => {
  it('cuando queda menos del 20 % del tiempo estimado', () => {
    const r = trafficLight(
      input({ estimatedMinutes: 210, remainingMinutes: 30, promisedAt: null }),
    );
    assert.equal(r.color, 'amarillo');
  });

  it('cuando el margen sobre la hora prometida es de media hora o menos', () => {
    const r = trafficLight(
      input({ promisedAt: at('14:30'), etaAt: at('14:16'), remainingMinutes: 76 }),
    );
    assert.equal(r.color, 'amarillo');
  });
});

describe('verde', () => {
  it('con margen suficiente', () => {
    assert.equal(trafficLight(input()).color, 'verde');
  });

  it('una orden entregada ya no se juzga por tiempo', () => {
    const r = trafficLight(
      input({ status: 'ENTREGADO', now: at('23:00'), promisedAt: at('17:00') }),
    );
    assert.equal(r.color, 'verde');
  });
});

describe('umbrales configurables', () => {
  it('respeta la tolerancia que se le pase', () => {
    const params = input({ promisedAt: at('14:00'), etaAt: at('14:30'), remainingMinutes: 200 });
    assert.equal(trafficLight(params, { toleranceMinutes: 15 }).color, 'rojo');
    assert.equal(trafficLight(params, { toleranceMinutes: 60 }).color, 'amarillo');
  });
});
