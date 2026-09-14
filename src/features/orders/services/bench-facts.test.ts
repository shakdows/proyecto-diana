import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import type { JobStep } from '@/features/repairs/services/job-steps';
import type { OrderFacts } from './state-machine';
import { canTransition } from './state-machine';
import { PERMISSIONS } from '@/lib/auth/permissions';
import { benchHasWork, benchPhrase, benchSlots, withBenchFacts, type BenchState } from './bench-facts';

const sembrado: OrderFacts = {
  status: 'EN_REPARACION',
  hasCustomer: true,
  hasVehicle: true,
  hasServiceType: true,
  requiredChecklistItems: 10,
  resolvedChecklistItems: 10,
  hasCustomerSignature: true,
  hasAdvisorSignature: true,
  assignedTechnicianId: 'tec-1',
  diagnosticItemCount: 4,
  quotationLineCount: 4,
  quotationLinesPriced: 4,
  authorizationLinkIssued: true,
  decidedItemCount: 4,
  approvedItemCount: 4,
  requiredPartsCount: 3,
  partsCoverageComplete: true,
  partsRequestPending: true,
  supplierLinesAllSelected: true,
  purchaseWithinAuthorizerLimit: true,
  purchaseOrderIssued: true,
  estimatedMinutes: 210,
  repairJobsTotal: 4,
  repairJobsDone: 3,
  hasOpenTimeSession: true,
  hasFinalEvidence: false,
  qualityChecklistComplete: true,
  qualityFindingCount: 1,
  pendingFinalStages: ['lavado'],
  deliveryActSigned: false,
  hasOpenTasks: false,
};

function steps(hechos: number, total: number): readonly JobStep[] {
  return Array.from({ length: total }, (_, i) => ({
    id: `s${i}`,
    label: `Paso ${i + 1}`,
    state: i < hechos ? 'hecho' : 'pendiente',
  }));
}

function bench(overrides: Partial<BenchState> = {}): BenchState {
  return {
    steps: steps(5, 5),
    evidenceCount: 2,
    finished: true,
    clock: { base: 900, desde: null },
    ...overrides,
  };
}

describe('mezclar lo que sabe la bahía', () => {
  it('sin bahía abierta no toca nada', () => {
    assert.equal(withBenchFacts(sembrado, null), sembrado);
  });

  it('una bahía sin pasos no pisa lo sembrado', () => {
    // Si pisara, «0 de 0 trabajos hechos» dejaría cerrar la reparación.
    const merged = withBenchFacts(sembrado, bench({ steps: [] }));
    assert.equal(merged.repairJobsTotal, 4);
    assert.equal(merged.repairJobsDone, 3);
  });

  it('trae los trabajos marcados y la evidencia de la bahía', () => {
    const merged = withBenchFacts(sembrado, bench());
    assert.equal(merged.repairJobsTotal, 5);
    assert.equal(merged.repairJobsDone, 5);
    assert.equal(merged.hasFinalEvidence, true);
  });

  it('el cronómetro corriendo es una sesión abierta', () => {
    const merged = withBenchFacts(sembrado, bench({ finished: false, clock: { base: 0, desde: 1 } }));
    assert.equal(merged.hasOpenTimeSession, true);
  });

  it('terminado en la bahía no deja la sesión abierta para siempre', () => {
    const merged = withBenchFacts(sembrado, bench({ finished: true, clock: { base: 10, desde: 5 } }));
    assert.equal(merged.hasOpenTimeSession, false);
  });

  it('no inventa hechos de otras áreas', () => {
    const merged = withBenchFacts(sembrado, bench());
    assert.equal(merged.deliveryActSigned, false);
    assert.equal(merged.approvedItemCount, 4);
    assert.deepEqual(merged.pendingFinalStages, ['lavado']);
  });
});

describe('el efecto que se buscaba', () => {
  const actor = { profileId: 'tec-1', permissions: PERMISSIONS };

  it('con lo sembrado la reparación no se puede terminar', () => {
    const check = canTransition(sembrado, 'terminar_reparacion', actor);
    assert.equal(check.allowed, false);
    assert.ok(!check.allowed);
    assert.equal(check.unmet.length, 3);
  });

  it('tras hacer el trabajo en la bahía, sí', () => {
    const check = canTransition(withBenchFacts(sembrado, bench()), 'terminar_reparacion', actor);
    assert.equal(check.allowed, true, 'la orden debe ver lo que el técnico hizo');
  });

  it('a medio hacer sigue diciendo exactamente qué falta', () => {
    const medias = bench({ steps: steps(3, 5), evidenceCount: 0, finished: false });
    const check = canTransition(withBenchFacts(sembrado, medias), 'terminar_reparacion', actor);
    assert.equal(check.allowed, false);
    assert.ok(!check.allowed);
    assert.equal(check.unmet.length, 2, 'trabajos sin marcar y evidencia sin adjuntar');
  });
});

describe('resumen y ranuras', () => {
  it('las ranuras son las mismas que escribe la bahía', () => {
    const slots = benchSlots('OS-2026-000154');
    assert.equal(slots.steps, 'reparacion.OS-2026-000154.pasos');
    assert.equal(slots.evidence, 'reparacion.OS-2026-000154.evidencia');
    assert.equal(slots.finished, 'reparacion.OS-2026-000154.terminado');
    assert.equal(slots.clock, 'reparacion.OS-2026-000154.reloj');
  });

  it('el resumen cuenta trabajos y fotos', () => {
    assert.equal(benchPhrase(bench()), '5 de 5 trabajos · 2 fotos');
    assert.equal(benchPhrase(bench({ evidenceCount: 1 })), '5 de 5 trabajos · 1 foto');
    assert.equal(benchPhrase(bench({ evidenceCount: 0 })), '5 de 5 trabajos · sin evidencia');
  });

  it('sin trabajo en la bahía no hay nada que resumir', () => {
    assert.equal(benchPhrase(null), null);
    assert.equal(benchHasWork(null), false);
    assert.equal(benchHasWork(bench({ steps: [] })), false);
  });
});

describe('la foto de la orden también es evidencia', () => {
  const actor = { profileId: 'tec-1', permissions: PERMISSIONS };

  it('una foto subida en la ficha cuenta como evidencia final', () => {
    const sinEvidencia = bench({ evidenceCount: 0 });
    assert.equal(withBenchFacts(sembrado, sinEvidencia, 0).hasFinalEvidence, false);
    assert.equal(withBenchFacts(sembrado, sinEvidencia, 1).hasFinalEvidence, true);
  });

  it('cuenta aunque la bahía ni se haya abierto', () => {
    assert.equal(withBenchFacts(sembrado, null, 2).hasFinalEvidence, true);
    assert.equal(withBenchFacts(sembrado, null, 0).hasFinalEvidence, false);
  });

  it('sin fotos no toca nada cuando no hay bahía', () => {
    assert.equal(withBenchFacts(sembrado, null, 0), sembrado);
  });

  it('cierra el paso: trabajos marcados + foto en la orden = se puede terminar', () => {
    const facts = withBenchFacts(sembrado, bench({ evidenceCount: 0 }), 1);
    assert.equal(canTransition(facts, 'terminar_reparacion', actor).allowed, true);
  });

  it('el resumen suma las dos clases de foto', () => {
    assert.equal(benchPhrase(bench({ evidenceCount: 2 }), 1), '5 de 5 trabajos · 3 fotos');
    assert.equal(benchPhrase(bench({ evidenceCount: 0 }), 1), '5 de 5 trabajos · 1 foto');
    assert.equal(benchPhrase(bench({ evidenceCount: 0 }), 0), '5 de 5 trabajos · sin evidencia');
  });
});
