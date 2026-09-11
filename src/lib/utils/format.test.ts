import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { displayPlate, formatDayTime, normalizePlate } from './format';

/** Instante en hora de Lima (UTC-5, sin horario de verano). */
const lima = (iso: string): Date => new Date(`${iso}-05:00`);

describe('formatDayTime · la fecha solo aparece cuando no es hoy', () => {
  const ahora = lima('2026-09-11T09:00:00');

  it('hoy muestra solo la hora', () => {
    assert.equal(formatDayTime(lima('2026-09-11T16:25:00'), ahora), '16:25');
  });

  it('hoy de madrugada sigue siendo hoy', () => {
    assert.equal(formatDayTime(lima('2026-09-11T00:10:00'), ahora), '00:10');
  });

  it('hoy hasta el último minuto del día', () => {
    assert.equal(formatDayTime(lima('2026-09-11T23:59:00'), ahora), '23:59');
  });

  it('mañana se nombra, no se numera', () => {
    assert.equal(formatDayTime(lima('2026-09-12T07:30:00'), ahora), 'mañana 07:30');
  });

  it('pasado mañana ya lleva fecha', () => {
    assert.equal(formatDayTime(lima('2026-09-13T07:30:00'), ahora), '13 set · 07:30');
  });

  it('una entrega pasada también lleva su fecha', () => {
    assert.equal(formatDayTime(lima('2026-09-08T15:00:00'), ahora), '08 set · 15:00');
  });
});

describe('formatDayTime · el día se decide en la zona del taller, no en UTC', () => {
  // 2026-09-12T02:00Z son todavía las 21:00 del 11 en Lima. Comparar en UTC
  // diría «mañana» para algo que el taller entrega esta misma noche.
  it('las 21:00 de hoy en Lima no son mañana', () => {
    const ahora = lima('2026-09-11T09:00:00');
    const esaNoche = new Date('2026-09-12T02:00:00Z');
    assert.equal(formatDayTime(esaNoche, ahora), '21:00');
  });

  // Y al revés: a las 23:00 de Lima, las 03:00Z del día siguiente son mañana.
  it('cruzar la medianoche de Lima sí cambia el día', () => {
    const ahora = lima('2026-09-11T23:00:00');
    const despues = lima('2026-09-12T03:00:00');
    assert.equal(formatDayTime(despues, ahora), 'mañana 03:00');
  });
});

describe('placas y códigos de equipo', () => {
  it('una placa de seis se parte en tres y tres', () => {
    assert.equal(displayPlate('ABC123'), 'ABC-123');
  });

  it('un código de flota se lee igual que una placa', () => {
    assert.equal(displayPlate('EXC014'), 'EXC-014');
  });

  it('guiones y minúsculas se normalizan antes de comparar', () => {
    assert.equal(normalizePlate('exc-014'), 'EXC014');
    assert.equal(displayPlate('exc-014'), 'EXC-014');
  });
});
