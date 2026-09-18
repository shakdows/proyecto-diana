import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import type { AppliedTransition } from './advance';
import { buildTimeline, durationPhrase, timelinePhrase } from './history';

const MIN = 60_000;
const H = 60 * MIN;

const ENTRADA = Date.parse('2026-09-17T09:00:00Z');

function paso(
  action: AppliedTransition['action'],
  from: AppliedTransition['from'],
  to: AppliedTransition['to'],
  minutos: number,
): AppliedTransition {
  return {
    action,
    from,
    to,
    at: ENTRADA + minutos * MIN,
    by: 'demo-asesor',
    byName: 'Andrea López',
  };
}

describe('la historia del vehículo', () => {
  const historia: readonly AppliedTransition[] = [
    paso('enviar_a_diagnostico', 'CHECKLIST_COMPLETADO', 'PENDIENTE_DIAGNOSTICO', 20),
    paso('iniciar_diagnostico', 'PENDIENTE_DIAGNOSTICO', 'EN_DIAGNOSTICO', 95),
    paso('completar_diagnostico', 'EN_DIAGNOSTICO', 'DIAGNOSTICO_COMPLETADO', 140),
  ];

  it('cuenta desde que ENTRÓ el vehículo, no desde el primer paso', () => {
    // Entre cerrar el acta y mover la orden pasan horas, y son horas del
    // taller que el cliente también cuenta.
    const t = buildTimeline(ENTRADA, historia, ENTRADA + 3 * H);
    assert.equal(t.entries[0]?.waitedMs, 20 * MIN);
  });

  it('cada tramo mide lo que la orden estuvo esperando en el estado anterior', () => {
    const t = buildTimeline(ENTRADA, historia, ENTRADA + 3 * H);
    assert.deepEqual(
      t.entries.map((e) => e.waitedMs / MIN),
      [20, 75, 45],
    );
  });

  it('señala el tramo más lento, que casi nunca es el que se sospecha', () => {
    const t = buildTimeline(ENTRADA, historia, ENTRADA + 3 * H);
    assert.equal(t.slowest?.action, 'iniciar_diagnostico');
    assert.equal(t.slowest?.waitedMs, 75 * MIN);
  });

  it('mientras la orden sigue abierta, el total corre hasta AHORA', () => {
    const t = buildTimeline(ENTRADA, historia, ENTRADA + 5 * H);
    assert.equal(t.closed, false);
    assert.equal(t.totalMs, 5 * H);
    assert.equal(t.currentMs, 5 * H - 140 * MIN);
  });

  it('cuando el vehículo sale, el reloj se para: no sigue sumando días', () => {
    const cerrada = [
      ...historia,
      paso('entregar', 'LISTO_PARA_ENTREGA', 'ENTREGADO', 300),
      paso('cerrar', 'ENTREGADO', 'CERRADO', 310),
    ];
    const t = buildTimeline(ENTRADA, cerrada, ENTRADA + 40 * H);
    assert.equal(t.closed, true);
    assert.equal(t.totalMs, 310 * MIN);
    assert.equal(t.currentMs, 0);
  });

  it('sin ningún paso dado, la historia está vacía pero el reloj corre', () => {
    const t = buildTimeline(ENTRADA, [], ENTRADA + 90 * MIN);
    assert.deepEqual(t.entries, []);
    assert.equal(t.slowest, null);
    assert.equal(t.totalMs, 90 * MIN);
    assert.equal(t.currentMs, 90 * MIN);
  });

  it('un reloj que va hacia atrás no produce esperas negativas', () => {
    // Dos dispositivos con la hora desajustada, o un cambio de huso.
    const t = buildTimeline(ENTRADA + 10 * MIN, [paso('enviar_a_diagnostico', 'CHECKLIST_COMPLETADO', 'PENDIENTE_DIAGNOSTICO', 0)], ENTRADA);
    assert.equal(t.entries[0]?.waitedMs, 0);
    assert.equal(t.totalMs, 0);
  });
});

describe('cómo se dice una duración', () => {
  it('dos unidades como mucho: más no se lee', () => {
    assert.equal(durationPhrase(30_000), 'menos de 1 min');
    assert.equal(durationPhrase(45 * MIN), '45 min');
    assert.equal(durationPhrase(3 * H), '3 h');
    assert.equal(durationPhrase(3 * H + 20 * MIN), '3 h 20 min');
    assert.equal(durationPhrase(26 * H), '1 d 2 h');
    assert.equal(durationPhrase(48 * H), '2 d');
  });

  it('el resumen de una línea cuenta pasos y tiempo', () => {
    const t = buildTimeline(ENTRADA, [paso('enviar_a_diagnostico', 'CHECKLIST_COMPLETADO', 'PENDIENTE_DIAGNOSTICO', 20)], ENTRADA + 2 * H);
    assert.equal(timelinePhrase(t), '1 paso en 2 h');
  });
});
