import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  allDone,
  BLOCKS_ETA,
  canPause,
  clockView,
  completeCurrent,
  currentStep,
  doneCount,
  finishReadiness,
  formatClock,
  pauseNeedsNote,
  reopenStep,
  type JobStep,
} from './job-steps';

const steps = (): readonly JobStep[] => [
  { id: 's1', label: 'Desmontaje de ruedas', state: 'hecho' },
  { id: 's2', label: 'Retiro de pastillas usadas', state: 'hecho' },
  { id: 's3', label: 'Instalación de pastillas nuevas', state: 'en_curso' },
  { id: 's4', label: 'Montaje de ruedas', state: 'pendiente' },
  { id: 's5', label: 'Prueba de frenado', state: 'pendiente' },
];

describe('pasos del trabajo', () => {
  it('hay un único paso en curso', () => {
    assert.equal(currentStep(steps())?.id, 's3');
    assert.equal(steps().filter((s) => s.state === 'en_curso').length, 1);
  });

  it('completar avanza al siguiente pendiente', () => {
    const next = completeCurrent(steps());
    assert.equal(next[2]?.state, 'hecho');
    assert.equal(next[3]?.state, 'en_curso');
    assert.equal(doneCount(next), 3);
  });

  it('completar el último no deja ninguno en curso', () => {
    let list = steps();
    list = completeCurrent(list);
    list = completeCurrent(list);
    list = completeCurrent(list);
    assert.equal(currentStep(list), undefined);
    assert.equal(allDone(list), true);
  });

  it('sin paso en curso, completar no hace nada', () => {
    const done = steps().map((s): JobStep => ({ ...s, state: 'hecho' }));
    assert.deepEqual(completeCurrent(done), done);
  });

  it('reabrir un paso hecho lo pone en curso y devuelve el actual a pendiente', () => {
    // Equivocarse marcando es normal; volver atrás no puede exigir llamar al asesor.
    const next = reopenStep(steps(), 's1');
    assert.equal(next[0]?.state, 'en_curso');
    assert.equal(next[2]?.state, 'pendiente');
  });

  it('reabrir un paso pendiente no hace nada', () => {
    assert.deepEqual(reopenStep(steps(), 's4'), steps());
  });

  it('una lista vacía no está terminada', () => {
    assert.equal(allDone([]), false);
  });
});

describe('pausas', () => {
  it('la espera de herramienta compromete la hora prometida; una prueba no', () => {
    assert.equal(BLOCKS_ETA.espera_herramienta, true);
    assert.equal(BLOCKS_ETA.prueba, false);
  });

  it('«otro» e «incidencia» exigen nota', () => {
    assert.equal(pauseNeedsNote('otro'), true);
    assert.equal(pauseNeedsNote('incidencia'), true);
    assert.equal(pauseNeedsNote('soporte'), false);
  });

  it('sin motivo no se pausa', () => {
    assert.equal(canPause(undefined, 'lo que sea'), false);
  });

  it('«otro» sin nota deja una pausa que nadie explica mañana', () => {
    assert.equal(canPause('otro', '   '), false);
    assert.equal(canPause('otro', 'Se cortó la luz en la bahía.'), true);
  });

  it('un motivo que no pide nota pasa sin ella', () => {
    assert.equal(canPause('prueba', ''), true);
  });
});

describe('cronómetro', () => {
  it('calcula restante y porcentaje', () => {
    const v = clockView(2 * 3600 + 14 * 60 + 38, 3 * 3600);
    assert.equal(v.remainingSeconds, 45 * 60 + 22);
    assert.equal(Math.round(v.percent), 75);
    assert.equal(v.over, false);
  });

  it('excederse no da restante negativo', () => {
    // «−00:12:30 restantes» es un dato sobre el que no se puede actuar.
    const v = clockView(3 * 3600 + 750, 3 * 3600);
    assert.equal(v.remainingSeconds, 0);
    assert.equal(v.overrunSeconds, 750);
    assert.equal(v.over, true);
  });

  it('el porcentaje tiene tope 100', () => {
    assert.equal(clockView(10_000, 100).percent, 100);
  });

  it('sin estimado no inventa un porcentaje', () => {
    assert.equal(clockView(500, 0).percent, 0);
  });

  it('un cronómetro en cero no da NaN', () => {
    const v = clockView(0, 3600);
    assert.equal(v.percent, 0);
    assert.equal(v.remainingSeconds, 3600);
  });
});

describe('formato de reloj', () => {
  it('rellena a dos dígitos', () => {
    assert.equal(formatClock(8078), '02:14:38');
    assert.equal(formatClock(0), '00:00:00');
    assert.equal(formatClock(59), '00:00:59');
  });

  it('pasa de 24 horas sin reiniciarse', () => {
    assert.equal(formatClock(25 * 3600), '25:00:00');
  });

  it('un negativo se muestra como cero, no como basura', () => {
    assert.equal(formatClock(-500), '00:00:00');
  });
});

describe('qué impide finalizar el trabajo', () => {
  const done = steps().map((s): JobStep => ({ ...s, state: 'hecho' }));

  it('con pasos pendientes no se finaliza', () => {
    const r = finishReadiness(steps(), 2, false);
    assert.equal(r.canFinish, false);
    assert.ok(r.blockers.some((b) => b.includes('3 pasos')));
  });

  it('sin evidencia no se finaliza', () => {
    // La foto es lo único que queda cuando el cliente reclama.
    const r = finishReadiness(done, 0, false);
    assert.equal(r.canFinish, false);
    assert.ok(r.blockers.some((b) => b.includes('foto')));
  });

  it('en pausa no se finaliza', () => {
    const r = finishReadiness(done, 1, true);
    assert.equal(r.canFinish, false);
    assert.ok(r.blockers.some((b) => b.includes('Reanuda')));
  });

  it('con todo hecho, evidencia y sin pausa, se finaliza', () => {
    assert.deepEqual(finishReadiness(done, 1, false), { canFinish: true, blockers: [] });
  });

  it('terminar antes de lo estimado no es un error: el tiempo no bloquea', () => {
    assert.equal(finishReadiness(done, 1, false).canFinish, true);
  });
});
