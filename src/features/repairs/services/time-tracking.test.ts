import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  computeEta,
  formatMinutes,
  isDelayRisk,
  summarizeSessions,
  type TimeSession,
} from './time-tracking';

const at = (hhmm: string): Date => new Date(`2026-09-11T${hhmm}:00-05:00`);

describe('el ejemplo de la documentación', () => {
  // docs/11 §11.2 — inicio 10:00, estimado 3 h 30 min, a las 13:00
  // efectivo 134 min y pausado 46 min.
  const sesiones: readonly TimeSession[] = [
    { kind: 'trabajo', startedAt: at('10:00'), endedAt: at('11:00') },
    { kind: 'pausa', startedAt: at('11:00'), endedAt: at('11:30'), pauseReason: 'refrigerio' },
    { kind: 'trabajo', startedAt: at('11:30'), endedAt: at('12:44') },
    { kind: 'pausa', startedAt: at('12:44'), endedAt: null, pauseReason: 'herramienta' },
  ];

  const now = at('13:00');
  const totals = summarizeSessions(sesiones, now);

  it('separa efectivo, pausas y bruto', () => {
    assert.equal(totals.effectiveMinutes, 134);
    assert.equal(totals.pausedMinutes, 46);
    assert.equal(totals.grossMinutes, 180);
  });

  it('detecta la pausa abierta', () => {
    assert.equal(totals.hasOpenSession, true);
    assert.equal(totals.isPaused, true);
    assert.equal(totals.isBlocked, false, 'una pausa por herramienta no bloquea la ETA');
  });

  it('la hora estimada es 14:16, no 13:30', () => {
    const eta = computeEta({ estimatedMinutes: 210, totals, now, startedAt: at('10:00') });
    assert.equal(eta.remainingMinutes, 76);
    assert.equal(eta.indeterminate, false);
    assert.equal(eta.etaAt?.toISOString(), at('14:16').toISOString());
  });
});

describe('esperas que dependen de un tercero', () => {
  const now = at('13:00');

  it('dejan la ETA indeterminada en vez de inventar una hora', () => {
    const totals = summarizeSessions(
      [
        { kind: 'trabajo', startedAt: at('10:00'), endedAt: at('11:00') },
        {
          kind: 'pausa',
          startedAt: at('11:00'),
          endedAt: null,
          pauseReason: 'espera_autorizacion',
          blocksEta: true,
        },
      ],
      now,
    );

    assert.equal(totals.isBlocked, true);

    const eta = computeEta({ estimatedMinutes: 210, totals, now, startedAt: at('10:00') });
    assert.equal(eta.etaAt, null);
    assert.equal(eta.indeterminate, true);
    assert.equal(eta.remainingMinutes, 150);
  });

  it('la reparación aún no iniciada también es indeterminada', () => {
    const totals = summarizeSessions([], now);
    const eta = computeEta({ estimatedMinutes: 120, totals, now, startedAt: null });
    assert.equal(eta.etaAt, null);
    assert.equal(eta.indeterminate, true);
    assert.equal(eta.remainingMinutes, 120);
  });
});

describe('exceso sobre lo estimado', () => {
  it('no deja el restante en negativo y expone el exceso', () => {
    const now = at('16:00');
    const totals = summarizeSessions(
      [{ kind: 'trabajo', startedAt: at('10:00'), endedAt: null }],
      now,
    );
    const eta = computeEta({ estimatedMinutes: 210, totals, now, startedAt: at('10:00') });

    assert.equal(totals.effectiveMinutes, 360);
    assert.equal(eta.remainingMinutes, 0);
    assert.equal(eta.overrunMinutes, 150);
    assert.equal(eta.etaAt?.toISOString(), now.toISOString());
  });
});

describe('riesgo de retraso (§64)', () => {
  it('avisa cuando la ETA supera la hora prometida más la tolerancia', () => {
    assert.equal(isDelayRisk(at('16:45'), at('16:25'), 15), true);
  });

  it('no avisa dentro de la tolerancia', () => {
    assert.equal(isDelayRisk(at('16:35'), at('16:25'), 15), false);
  });

  it('no avisa si falta la ETA o la hora prometida', () => {
    assert.equal(isDelayRisk(null, at('16:25')), false);
    assert.equal(isDelayRisk(at('16:45'), null), false);
  });
});

describe('formato', () => {
  it('escribe las duraciones como las lee un asesor', () => {
    assert.equal(formatMinutes(134), '2 h 14 min');
    assert.equal(formatMinutes(48), '48 min');
    assert.equal(formatMinutes(120), '2 h');
    assert.equal(formatMinutes(0), '0 min');
    assert.equal(formatMinutes(-5), '0 min');
  });
});
