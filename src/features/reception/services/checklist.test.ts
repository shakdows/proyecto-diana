import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  CHECKLIST,
  MIN_TREAD_MM,
  TOTAL_ITEMS,
  allItems,
  isComplete,
  isResolved,
  nonConformities,
  overallProgress,
  sectionProgress,
  tyresBelowMinimum,
  type ChecklistState,
} from './checklist';

const itemBy = (id: string) => {
  const found = allItems().find((i) => i.id === id);
  assert.ok(found, `no existe el punto ${id}`);
  return found;
};

const tapiceria = itemBy('int-tapiceria');
const combustible = itemBy('flu-combustible');
const aceite = itemBy('flu-aceite');
const neumatico = itemBy('neu-di');

describe('el catálogo', () => {
  it('tiene 42 puntos repartidos en siete bloques', () => {
    assert.equal(TOTAL_ITEMS, 42);
    assert.equal(CHECKLIST.length, 7);
  });

  it('no repite identificadores', () => {
    const ids = allItems().map((i) => i.id);
    assert.equal(new Set(ids).size, ids.length);
  });
});

describe('el silencio no cuenta como conforme', () => {
  // Es la regla que sostiene el documento: un punto en blanco significa «nadie
  // lo miró», y en una discusión por un rayón eso vale en contra del taller.
  it('sin respuesta, el punto no está resuelto', () => {
    assert.equal(isResolved(tapiceria, undefined), false);
    assert.equal(isResolved(tapiceria, {}), false);
  });

  it('un checklist vacío está al 0 %', () => {
    const p = overallProgress({});
    assert.equal(p.done, 0);
    assert.equal(p.percent, 0);
    assert.equal(isComplete({}), false);
  });
});

describe('«no aplica» es una respuesta, no un hueco', () => {
  // Un vehículo sin radio no puede dejar la recepción bloqueada para siempre.
  it('resuelve el punto igual que un OK', () => {
    assert.equal(isResolved(tapiceria, { answer: 'no_aplica' }), true);
    assert.equal(isResolved(tapiceria, { answer: 'ok' }), true);
  });
});

describe('«no conforme» exige describir qué pasa', () => {
  it('sin observación no cierra el punto', () => {
    assert.equal(isResolved(tapiceria, { answer: 'no_conforme' }), false);
    assert.equal(isResolved(tapiceria, { answer: 'no_conforme', note: '   ' }), false);
  });

  it('con observación sí', () => {
    const r = { answer: 'no_conforme' as const, note: 'Rasgada en el asiento trasero' };
    assert.equal(isResolved(tapiceria, r), true);
  });

  it('las no conformidades se pueden listar para el diagnóstico', () => {
    const state: ChecklistState = {
      'int-tapiceria': { answer: 'no_conforme', note: 'Rasgada' },
      'int-radio': { answer: 'ok' },
      'ext-plumillas': { answer: 'no_conforme', note: 'Gastadas' },
    };
    const ids = nonConformities(state).map((i) => i.id);
    assert.deepEqual(ids, ['int-tapiceria', 'ext-plumillas']);
  });
});

describe('fluidos y neumáticos no se responden con OK', () => {
  it('el combustible necesita un nivel', () => {
    assert.equal(isResolved(combustible, { answer: 'ok' }), false);
    assert.equal(isResolved(combustible, { level: 'medio' }), true);
  });

  it('el aceite también', () => {
    assert.equal(isResolved(aceite, {}), false);
    assert.equal(isResolved(aceite, { level: 'normal' }), true);
  });

  it('el neumático necesita una cifra, y el cero es una cifra válida', () => {
    assert.equal(isResolved(neumatico, {}), false);
    assert.equal(isResolved(neumatico, { depthMm: 0 }), true);
    assert.equal(isResolved(neumatico, { depthMm: 4.5 }), true);
  });

  it('un valor no finito no resuelve', () => {
    assert.equal(isResolved(neumatico, { depthMm: Number.NaN }), false);
  });
});

describe('neumáticos por debajo del mínimo legal', () => {
  it('marca los que no llegan a 1,6 mm', () => {
    const state: ChecklistState = {
      'neu-di': { depthMm: 1.2 },
      'neu-dd': { depthMm: MIN_TREAD_MM },
      'neu-pi': { depthMm: 5 },
    };
    assert.deepEqual(tyresBelowMinimum(state).map((i) => i.id), ['neu-di']);
  });

  it('no marca nada si no se han medido', () => {
    assert.equal(tyresBelowMinimum({}).length, 0);
  });
});

describe('progreso', () => {
  it('cuenta por bloque', () => {
    const seguridad = CHECKLIST.find((s) => s.id === 'seguridad');
    assert.ok(seguridad);
    const state: ChecklistState = { 'seg-gata': { answer: 'ok' } };
    assert.deepEqual(sectionProgress(seguridad, state), { done: 1, total: 3 });
  });

  it('completo solo cuando están los 42', () => {
    const state: ChecklistState = Object.fromEntries(
      allItems().map((item) => [
        item.id,
        item.kind === 'profundidad'
          ? { depthMm: 6 }
          : item.kind === 'estado'
            ? { answer: 'ok' as const }
            : { level: 'normal' },
      ]),
    );
    assert.equal(overallProgress(state).done, TOTAL_ITEMS);
    assert.equal(isComplete(state), true);

    // Quitar uno solo lo vuelve incompleto: no hay «casi».
    const casiTodo: ChecklistState = Object.fromEntries(
      Object.entries(state).filter(([id]) => id !== 'int-radio'),
    );
    assert.equal(isComplete(casiTodo), false);
  });
});
