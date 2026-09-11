import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  countBy,
  failedChecks,
  groupByWork,
  nextStatusAfter,
  outcomeOf,
  readiness,
  rulingFor,
  separationOfDuties,
  type QualityCheck,
  type Rulings,
} from './inspection';

const check = (over: Partial<QualityCheck> = {}): QualityCheck => ({
  id: 'c1',
  label: 'Prueba de frenado en pista',
  workTitle: 'Cambio de pastillas delanteras',
  critical: true,
  ...over,
});

const TECNICO = 'tec-1';
const INSPECTOR = 'cal-1';

describe('separación de funciones', () => {
  it('quien reparó no puede aprobar su propio trabajo', () => {
    assert.equal(separationOfDuties(TECNICO, TECNICO), false);
  });

  it('otra persona sí puede', () => {
    assert.equal(separationOfDuties(INSPECTOR, TECNICO), true);
  });

  it('un inspector sin identificar no vale', () => {
    assert.equal(separationOfDuties('', TECNICO), false);
  });

  it('bloquea la resolución antes que cualquier otro motivo', () => {
    // Mientras esto falle, lo demás da igual.
    const r = readiness([check()], { c1: { result: 'conforme' } }, TECNICO, TECNICO);
    assert.equal(r.canResolve, false);
    assert.deepEqual(r.blockers, ['Quien reparó no puede aprobar su propio trabajo.']);
  });
});

describe('qué impide resolver la inspección', () => {
  it('sin comprobaciones no hay inspección', () => {
    assert.equal(readiness([], {}, INSPECTOR, TECNICO).canResolve, false);
  });

  it('con comprobaciones pendientes no se resuelve', () => {
    const r = readiness([check()], {}, INSPECTOR, TECNICO);
    assert.equal(r.canResolve, false);
    assert.ok(r.blockers.some((b) => b.includes('Falta revisar')));
  });

  it('todo conforme deja resolver', () => {
    const r = readiness([check()], { c1: { result: 'conforme' } }, INSPECTOR, TECNICO);
    assert.deepEqual(r, { canResolve: true, blockers: [] });
  });

  it('un rechazo sin nota no deja resolver', () => {
    const rulings: Rulings = { c1: { result: 'no_conforme', photoCount: 2 } };
    assert.equal(readiness([check()], rulings, INSPECTOR, TECNICO).canResolve, false);
  });

  it('un rechazo sin foto tampoco', () => {
    // Sin prueba, el vehículo vuelve a calidad con el mismo defecto.
    const rulings: Rulings = { c1: { result: 'no_conforme', note: 'Chirría al frenar.' } };
    assert.equal(readiness([check()], rulings, INSPECTOR, TECNICO).canResolve, false);
  });

  it('con nota y foto, el rechazo pasa', () => {
    const rulings: Rulings = {
      c1: { result: 'no_conforme', note: 'Chirría al frenar.', photoCount: 1 },
    };
    assert.equal(readiness([check()], rulings, INSPECTOR, TECNICO).canResolve, true);
  });
});

describe('resultado de la inspección', () => {
  const a = check({ id: 'a', critical: true });
  const b = check({ id: 'b', critical: false, label: 'Vehículo sin manchas de grasa' });

  it('mientras falte revisar algo, no hay resultado', () => {
    assert.equal(outcomeOf([a, b], { a: { result: 'conforme' } }), null);
  });

  it('todo conforme aprueba', () => {
    const r: Rulings = { a: { result: 'conforme' }, b: { result: 'conforme' } };
    assert.equal(outcomeOf([a, b], r), 'aprobado');
    assert.equal(nextStatusAfter([a, b], r), 'CONTROL_CALIDAD_APROBADO');
  });

  it('basta un no conforme NO crítico para observar la orden', () => {
    // La criticidad prioriza el retrabajo; no sirve para dejarlo pasar.
    const r: Rulings = {
      a: { result: 'conforme' },
      b: { result: 'no_conforme', note: 'Huella de grasa en la puerta.', photoCount: 1 },
    };
    assert.equal(outcomeOf([a, b], r), 'observado');
    assert.equal(nextStatusAfter([a, b], r), 'OBSERVADO_CONTROL_CALIDAD');
  });

  it('sin comprobaciones no se mueve la orden', () => {
    assert.equal(nextStatusAfter([], {}), null);
  });
});

describe('conteos y agrupación', () => {
  const a = check({ id: 'a', workTitle: 'Frenos' });
  const b = check({ id: 'b', workTitle: 'Alineamiento' });
  const c = check({ id: 'c', workTitle: 'Frenos' });

  it('una comprobación sin decidir está pendiente', () => {
    assert.deepEqual(rulingFor(a, {}), { result: 'pendiente' });
  });

  it('cuenta por resultado', () => {
    const r: Rulings = { a: { result: 'conforme' }, b: { result: 'no_conforme' } };
    assert.equal(countBy([a, b, c], r, 'conforme'), 1);
    assert.equal(countBy([a, b, c], r, 'pendiente'), 1);
    assert.equal(failedChecks([a, b, c], r).length, 1);
  });

  it('agrupa por trabajo respetando el orden de aparición', () => {
    const groups = groupByWork([a, b, c]);
    assert.deepEqual(
      groups.map((g) => g.workTitle),
      ['Frenos', 'Alineamiento'],
    );
    assert.equal(groups[0]?.checks.length, 2);
  });
});
