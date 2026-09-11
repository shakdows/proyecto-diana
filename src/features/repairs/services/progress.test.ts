import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ORDER_STATUSES } from '@/features/orders/services/order-status';
import {
  DEFAULT_STAGE_WEIGHTS,
  PROGRESS_STAGES,
  computeProgress,
  repairCompletion,
  type ProgressInput,
} from './progress';

function input(overrides: Partial<ProgressInput> = {}): ProgressInput {
  return {
    status: 'DRAFT',
    checklistRequired: 10,
    checklistResolved: 0,
    quotationLineCount: 4,
    decidedItemCount: 0,
    requiredPartsCount: 3,
    partsCoverageRatio: 0,
    repairJobsTotal: 4,
    repairJobsDone: 0,
    estimatedMinutes: 182,
    effectiveMinutes: 0,
    finalStagesTotal: 0,
    finalStagesDone: 0,
    ...overrides,
  };
}

describe('pesos', () => {
  it('los pesos por defecto suman 100', () => {
    const total = PROGRESS_STAGES.reduce((s, e) => s + DEFAULT_STAGE_WEIGHTS[e], 0);
    assert.equal(total, 100);
  });

  it('normaliza si los pesos configurados no suman 100', () => {
    const raros = { ...DEFAULT_STAGE_WEIGHTS, reparacion: 400 };
    const r = computeProgress(input({ status: 'ENTREGADO' }), raros);
    assert.equal(r.percent, 100);
  });
});

describe('el ejemplo trabajado de la documentación', () => {
  // docs/11-progreso-eta-y-semaforo.md §11.1
  const orden = input({
    status: 'EN_REPARACION',
    checklistResolved: 10,
    decidedItemCount: 4,
    partsCoverageRatio: 1,
    repairJobsDone: 3,
    estimatedMinutes: 182,
    effectiveMinutes: 134,
  });

  it('la etapa de reparación da 0,746', () => {
    assert.equal(Number(repairCompletion(orden).toFixed(3)), 0.746);
  });

  it('el avance total es 74,8 %', () => {
    assert.equal(computeProgress(orden).percent, 74.8);
  });

  it('el desglose por etapa cuadra con la tabla', () => {
    const byStage = new Map(
      computeProgress(orden).stages.map((s) => [s.stage, s.contribution]),
    );
    assert.equal(byStage.get('recepcion'), 5);
    assert.equal(byStage.get('diagnostico'), 15);
    assert.equal(byStage.get('autorizacion'), 10);
    assert.equal(byStage.get('repuestos'), 15);
    assert.equal(byStage.get('reparacion'), 29.84);
    assert.equal(byStage.get('calidad'), 0);
    assert.equal(byStage.get('finales'), 0);
    assert.equal(byStage.get('entrega'), 0);
  });
});

describe('reparto 0,7 trabajo / 0,3 esfuerzo', () => {
  it('con la mitad de trabajos y sin tiempo consumido da 0,35', () => {
    assert.equal(
      repairCompletion(input({ repairJobsTotal: 4, repairJobsDone: 2, effectiveMinutes: 0 })),
      0.35,
    );
  });

  it('pasarse del tiempo estimado no empuja la barra por encima de lo hecho', () => {
    const sinPasarse = repairCompletion(
      input({ repairJobsDone: 2, estimatedMinutes: 100, effectiveMinutes: 100 }),
    );
    const pasado = repairCompletion(
      input({ repairJobsDone: 2, estimatedMinutes: 100, effectiveMinutes: 500 }),
    );
    assert.equal(sinPasarse, pasado);
    assert.equal(pasado, 0.65, '0,7 × (2/4) + 0,3 × 1');
  });

  it('un trabajo largo y único avanza por tiempo, no se queda en cero', () => {
    const mitad = repairCompletion(
      input({ repairJobsTotal: 1, repairJobsDone: 0, estimatedMinutes: 240, effectiveMinutes: 120 }),
    );
    assert.equal(mitad, 0.15);
    assert.ok(mitad > 0, 'la barra debe moverse durante un trabajo largo');
  });
});

describe('límites', () => {
  it('siempre está entre 0 y 100 en todos los estados', () => {
    for (const status of ORDER_STATUSES) {
      const r = computeProgress(input({ status }));
      assert.ok(r.percent >= 0 && r.percent <= 100, `${status} → ${r.percent}`);
    }
  });

  it('una orden recién abierta está en 0', () => {
    assert.equal(computeProgress(input({ status: 'DRAFT' })).percent, 0);
  });

  it('entregada y cerrada están en 100', () => {
    assert.equal(computeProgress(input({ status: 'ENTREGADO' })).percent, 100);
    assert.equal(computeProgress(input({ status: 'CERRADO' })).percent, 100);
  });
});

describe('el avance puede bajar cuando el trabajo se deshace', () => {
  it('el rechazo en calidad devuelve la orden por debajo de su máximo', () => {
    const base = {
      checklistResolved: 10,
      decidedItemCount: 4,
      partsCoverageRatio: 1,
      repairJobsDone: 4,
      effectiveMinutes: 182,
    };
    const enCalidad = computeProgress(input({ ...base, status: 'CONTROL_CALIDAD' }));
    const observada = computeProgress(
      input({ ...base, status: 'OBSERVADO_CONTROL_CALIDAD', repairJobsDone: 3 }),
    );

    assert.ok(
      observada.percent < enCalidad.percent,
      'una barra que solo sube mentiría justo cuando hay que rehacer trabajo',
    );
  });
});

describe('etapas que se cuentan sobre hechos reales', () => {
  it('la recepción avanza con el checklist', () => {
    const mitad = computeProgress(
      input({ status: 'RECEPCIONADO', checklistRequired: 10, checklistResolved: 5 }),
    );
    const completo = computeProgress(
      input({ status: 'RECEPCIONADO', checklistRequired: 10, checklistResolved: 10 }),
    );
    assert.equal(mitad.percent, 2.5);
    assert.equal(completo.percent, 5);
  });

  it('la autorización avanza con los ítems decididos', () => {
    const r = computeProgress(
      input({ status: 'ESPERANDO_CLIENTE', checklistResolved: 10, quotationLineCount: 4, decidedItemCount: 2 }),
    );
    const autorizacion = r.stages.find((s) => s.stage === 'autorizacion');
    assert.equal(autorizacion?.completion, 0.5);
  });

  it('los repuestos avanzan con la cobertura recibida', () => {
    const r = computeProgress(
      input({ status: 'REPUESTOS_PARCIALES', partsCoverageRatio: 0.8 }),
    );
    const repuestos = r.stages.find((s) => s.stage === 'repuestos');
    assert.equal(repuestos?.completion, 0.8);
  });

  it('sin repuestos requeridos, la etapa se da por cumplida al decidir', () => {
    const r = computeProgress(
      input({ status: 'APROBADO', requiredPartsCount: 0, partsCoverageRatio: 0 }),
    );
    assert.equal(r.stages.find((s) => s.stage === 'repuestos')?.completion, 1);
  });

  it('las etapas finales avanzan una a una', () => {
    const r = computeProgress(
      input({ status: 'EN_LAVADO', finalStagesTotal: 2, finalStagesDone: 1 }),
    );
    assert.equal(r.stages.find((s) => s.stage === 'finales')?.completion, 0.5);
  });
});
