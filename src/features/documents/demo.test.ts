import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { allItems, nonConformities, overallProgress, tyresBelowMinimum } from '@/features/reception/services/checklist';
import { DEMO_CHECKLIST_STATE, DEMO_FINDINGS } from './demo';

/*
 * Estas pruebas existen porque el checklist del PDF salió con
 * «Observaciones al ingreso (0)» teniendo tres sembradas: los identificadores
 * del ejemplo no coincidían con los reales y nada falló, simplemente el
 * documento mintió. Un dato de ejemplo con una clave equivocada es invisible
 * para el compilador, así que lo comprueba una prueba.
 */
describe('checklist de ejemplo de los documentos', () => {
  it('responde los 42 ítems, ninguno queda sin revisar', () => {
    const p = overallProgress(DEMO_CHECKLIST_STATE);
    assert.equal(p.done, p.total);
  });

  it('todas sus claves existen en el checklist real', () => {
    const reales = new Set(allItems().map((i) => i.id));
    const inventadas = Object.keys(DEMO_CHECKLIST_STATE).filter((k) => !reales.has(k));
    assert.deepEqual(inventadas, []);
  });

  it('tiene exactamente 3 no conformidades, y con nota', () => {
    const fallos = nonConformities(DEMO_CHECKLIST_STATE);
    assert.equal(fallos.length, 3);
    assert.ok(fallos.every((f) => (DEMO_CHECKLIST_STATE[f.id]?.note ?? '') !== ''));
  });

  it('tiene un neumático bajo el mínimo legal', () => {
    assert.equal(tyresBelowMinimum(DEMO_CHECKLIST_STATE).length, 1);
  });
});

describe('hallazgos de ejemplo', () => {
  it('cubre las cuatro prioridades, para que el documento las enseñe todas', () => {
    assert.deepEqual(
      [...new Set(DEMO_FINDINGS.map((f) => f.priority))].sort(),
      ['alto', 'critico', 'medio', 'recomendacion'],
    );
  });
});
