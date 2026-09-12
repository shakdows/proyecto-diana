import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  EMPTY_DRAFT,
  RECEPTION_STEPS,
  canOpen,
  completedSteps,
  hasProgress,
  currentStep,
  progress,
  stepState,
  type ReceptionDraft,
} from './steps';

const draft = (patch: Partial<ReceptionDraft> = {}): ReceptionDraft => ({
  ...EMPTY_DRAFT,
  ...patch,
});

const hastaChecklist = draft({
  plate: 'ABC123',
  customerConfirmed: true,
  vehicleConfirmed: true,
  checklistResolved: 42,
});

describe('la recepción avanza en orden', () => {
  it('un borrador vacío empieza por el cliente', () => {
    assert.equal(currentStep(EMPTY_DRAFT), 'cliente');
    assert.equal(completedSteps(EMPTY_DRAFT).size, 0);
  });

  it('sin placa no se completa el cliente aunque se confirme', () => {
    assert.equal(completedSteps(draft({ customerConfirmed: true })).has('cliente'), false);
  });

  it('el vehículo no se completa antes que el cliente', () => {
    const d = draft({ vehicleConfirmed: true });
    assert.equal(completedSteps(d).has('vehiculo'), false);
  });

  it('con cliente y vehículo, toca el checklist', () => {
    const d = draft({ plate: 'ABC123', customerConfirmed: true, vehicleConfirmed: true });
    assert.equal(currentStep(d), 'checklist');
  });
});

describe('el checklist exige TODOS los puntos', () => {
  it('41 de 42 no basta', () => {
    const d = draft({
      plate: 'ABC123',
      customerConfirmed: true,
      vehicleConfirmed: true,
      checklistResolved: 41,
    });
    assert.equal(completedSteps(d).has('checklist'), false);
    assert.equal(currentStep(d), 'checklist');
  });

  it('42 de 42 sí', () => {
    assert.equal(completedSteps(hastaChecklist).has('checklist'), true);
  });
});

describe('daños: revisado no es lo mismo que dañado', () => {
  // Un vehículo sin un rayón es un resultado válido del paso. Si se exigiera
  // al menos un daño, la recepción se quedaría atascada en los coches nuevos.
  it('cero daños revisados completa el paso', () => {
    const d = { ...hastaChecklist, damageCount: 0, damagesReviewed: true };
    assert.equal(completedSteps(d).has('danos'), true);
  });

  it('daños sin revisar NO completa el paso', () => {
    const d = { ...hastaChecklist, damageCount: 3, damagesReviewed: false };
    assert.equal(completedSteps(d).has('danos'), false);
  });
});

describe('la firma necesita las dos partes', () => {
  const hastaEvidencia = {
    ...hastaChecklist,
    damagesReviewed: true,
    photoCount: 4,
  };

  it('solo el cliente no basta', () => {
    const d = { ...hastaEvidencia, customerSigned: true, advisorSigned: false };
    assert.equal(completedSteps(d).has('firma'), false);
  });

  it('las dos firmas cierran el paso y dejan la confirmación', () => {
    const d = { ...hastaEvidencia, customerSigned: true, advisorSigned: true };
    assert.equal(completedSteps(d).has('firma'), true);
    assert.equal(currentStep(d), 'confirmacion');
  });
});

describe('no se puede saltar al final', () => {
  // Firmar sin checklist deja una firma sobre un estado que nadie comprobó,
  // y esa firma es la que se usa cuando el cliente reclama un rayón.
  it('la firma está cerrada desde el primer paso', () => {
    assert.equal(canOpen(EMPTY_DRAFT, 'firma'), false);
    assert.equal(canOpen(EMPTY_DRAFT, 'cliente'), true);
  });

  it('un paso ya terminado se puede reabrir para corregir', () => {
    assert.equal(canOpen(hastaChecklist, 'cliente'), true);
    assert.equal(canOpen(hastaChecklist, 'vehiculo'), true);
  });

  it('el siguiente al actual sigue cerrado', () => {
    assert.equal(canOpen(hastaChecklist, 'danos'), true);
    assert.equal(canOpen(hastaChecklist, 'evidencia'), false);
  });
});

describe('progreso y estado por paso', () => {
  it('cuenta los pasos terminados sobre siete', () => {
    const p = progress(hastaChecklist);
    assert.equal(p.total, RECEPTION_STEPS.length);
    assert.equal(p.done, 3);
    assert.equal(p.percent, 43);
  });

  it('cada paso declara uno de los tres estados', () => {
    assert.equal(stepState(hastaChecklist, 'cliente'), 'completado');
    assert.equal(stepState(hastaChecklist, 'danos'), 'en_progreso');
    assert.equal(stepState(hastaChecklist, 'firma'), 'pendiente');
  });
});

describe('¿hay trabajo en el borrador?', () => {
  it('una placa tecleada NO es trabajo', () => {
    // Si contara, quien escribió una placa un día y se fue la vería
    // reaparecer cada vez que entra a recibir otro vehículo.
    assert.equal(hasProgress({ ...EMPTY_DRAFT, plate: 'ABC123' }), false);
  });

  it('el borrador vacío tampoco', () => {
    assert.equal(hasProgress(EMPTY_DRAFT), false);
  });

  it('confirmar al cliente sí lo es', () => {
    assert.equal(hasProgress({ ...EMPTY_DRAFT, customerConfirmed: true }), true);
  });

  it('un solo punto del checklist ya lo es', () => {
    assert.equal(hasProgress({ ...EMPTY_DRAFT, checklistResolved: 1 }), true);
  });

  it('haber revisado los daños lo es, aunque no hubiera ninguno', () => {
    // Un vehículo sin un rayón es un resultado válido del paso.
    assert.equal(hasProgress({ ...EMPTY_DRAFT, damagesReviewed: true }), true);
  });

  it('una foto o una firma lo son', () => {
    assert.equal(hasProgress({ ...EMPTY_DRAFT, photoCount: 1 }), true);
    assert.equal(hasProgress({ ...EMPTY_DRAFT, customerSigned: true }), true);
  });
});
