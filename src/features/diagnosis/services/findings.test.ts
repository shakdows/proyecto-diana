import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  countByPriority,
  countBySystem,
  readiness,
  sortByPriority,
  totalEstimatedMinutes,
  type Finding,
} from './findings';

const finding = (patch: Partial<Finding> & { id: string }): Finding => ({
  system: 'frenos',
  title: 'Hallazgo',
  detail: '',
  priority: 'medio',
  estimatedMinutes: 60,
  photoCount: 1,
  videoCount: 0,
  ...patch,
});

describe('el orden lo decide la gravedad, no el momento de escribirlo', () => {
  it('crítico va antes que alto, medio y recomendación', () => {
    const ordenados = sortByPriority([
      finding({ id: 'a', priority: 'recomendacion' }),
      finding({ id: 'b', priority: 'critico' }),
      finding({ id: 'c', priority: 'medio' }),
      finding({ id: 'd', priority: 'alto' }),
    ]);
    assert.deepEqual(ordenados.map((f) => f.id), ['b', 'd', 'c', 'a']);
  });

  it('a igual gravedad, primero el trabajo más largo', () => {
    const ordenados = sortByPriority([
      finding({ id: 'corto', priority: 'alto', estimatedMinutes: 30 }),
      finding({ id: 'largo', priority: 'alto', estimatedMinutes: 180 }),
    ]);
    assert.deepEqual(ordenados.map((f) => f.id), ['largo', 'corto']);
  });

  it('no modifica la lista original', () => {
    const original = [finding({ id: 'a', priority: 'medio' }), finding({ id: 'b', priority: 'critico' })];
    sortByPriority(original);
    assert.deepEqual(original.map((f) => f.id), ['a', 'b']);
  });
});

describe('recuentos', () => {
  const lista = [
    finding({ id: '1', system: 'motor', priority: 'critico' }),
    finding({ id: '2', system: 'frenos', priority: 'alto' }),
    finding({ id: '3', system: 'frenos', priority: 'medio' }),
  ];

  it('por sistema, con cero en los que no tienen nada', () => {
    const c = countBySystem(lista);
    assert.equal(c.frenos, 2);
    assert.equal(c.motor, 1);
    assert.equal(c.electrico, 0);
  });

  it('por prioridad', () => {
    const c = countByPriority(lista);
    assert.equal(c.critico, 1);
    assert.equal(c.alto, 1);
    assert.equal(c.recomendacion, 0);
  });

  it('suma el tiempo estimado', () => {
    assert.equal(totalEstimatedMinutes(lista), 180);
    assert.equal(totalEstimatedMinutes([]), 0);
  });
});

describe('cerrar el diagnóstico tiene requisitos', () => {
  // Cerrarlo avisa al asesor, que cotiza con lo que haya. Un diagnóstico
  // incompleto vuelve como ampliación a mitad de la reparación, con el
  // vehículo desarmado y el cliente esperando.

  it('sin hallazgos no se puede cerrar', () => {
    const r = readiness([]);
    assert.equal(r.canFinish, false);
    assert.match(r.blockers[0] ?? '', /al menos un hallazgo/u);
  });

  it('un crítico sin evidencia lo bloquea', () => {
    const r = readiness([
      finding({ id: '1', priority: 'critico', title: 'Pastillas gastadas', photoCount: 0 }),
    ]);
    assert.equal(r.canFinish, false);
    assert.match(r.blockers.join(' '), /Pastillas gastadas/u);
  });

  it('un vídeo vale como evidencia igual que una foto', () => {
    const r = readiness([
      finding({ id: '1', priority: 'critico', photoCount: 0, videoCount: 1 }),
    ]);
    assert.equal(r.canFinish, true);
  });

  // Un medio o una recomendación sin foto no bloquea: no son los que el
  // cliente discute, y exigir evidencia de todo haría que nadie cierre nada.
  it('un medio sin evidencia NO lo bloquea', () => {
    const r = readiness([finding({ id: '1', priority: 'medio', photoCount: 0 })]);
    assert.equal(r.canFinish, true);
  });

  it('sin tiempo estimado no hay mano de obra que cotizar', () => {
    const r = readiness([finding({ id: '1', title: 'Fuga de aceite', estimatedMinutes: 0 })]);
    assert.equal(r.canFinish, false);
    assert.match(r.blockers.join(' '), /Fuga de aceite/u);
  });

  it('varios problemas del mismo tipo se agrupan en un solo aviso', () => {
    const r = readiness([
      finding({ id: '1', priority: 'critico', photoCount: 0 }),
      finding({ id: '2', priority: 'alto', photoCount: 0 }),
    ]);
    assert.equal(r.blockers.length, 1);
    assert.match(r.blockers[0] ?? '', /2 hallazgos/u);
  });

  it('todo en regla: se puede cerrar', () => {
    const r = readiness([
      finding({ id: '1', priority: 'critico', photoCount: 3 }),
      finding({ id: '2', priority: 'recomendacion', photoCount: 0 }),
    ]);
    assert.equal(r.canFinish, true);
    assert.deepEqual(r.blockers, []);
  });
});
