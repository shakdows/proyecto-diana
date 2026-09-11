import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  applyFilters,
  breakdownBy,
  computeKpis,
  dailySeries,
  deltaOf,
  inRange,
  npsMix,
  optionsFor,
  previousWindow,
  type OrderRecord,
} from './metrics';

const d = (iso: string): Date => new Date(iso);

const rec = (over: Partial<OrderRecord> = {}): OrderRecord => ({
  orderId: 'os-1',
  closedAt: d('2026-09-10T15:00:00Z'),
  corporateClient: 'BBVA',
  branch: 'Surco',
  advisor: 'Andrea López',
  brand: 'Toyota',
  serviceType: 'Mantenimiento',
  cycleHours: 24,
  onTime: true,
  revenueCents: 100_000,
  npsScore: 10,
  csatAverage: 5,
  ...over,
});

describe('KPIs', () => {
  it('sin órdenes no divide entre cero', () => {
    const k = computeKpis([]);
    assert.equal(k.averageTicketCents, 0);
    assert.equal(k.onTimePercent, 0);
    assert.equal(k.averageCycleHours, 0);
    assert.equal(k.responseRatePercent, 0);
    assert.ok(!Number.isNaN(k.nps));
  });

  it('el ticket medio es ingresos entre órdenes', () => {
    const k = computeKpis([rec({ revenueCents: 100_000 }), rec({ revenueCents: 200_000 })]);
    assert.equal(k.revenueCents, 300_000);
    assert.equal(k.averageTicketCents, 150_000);
  });

  it('el porcentaje a tiempo cuenta solo las entregadas a tiempo', () => {
    const k = computeKpis([rec({ onTime: true }), rec({ onTime: false }), rec({ onTime: true })]);
    assert.equal(k.onTimePercent, 66.7);
  });

  it('el NPS se calcula solo sobre quien respondió, no sobre todas las órdenes', () => {
    // Contar los silencios como ceros hundiría el indicador sin motivo.
    const k = computeKpis([rec({ npsScore: 10 }), rec({ npsScore: null }), rec({ npsScore: null })]);
    assert.equal(k.nps, 100);
    assert.equal(k.npsResponses, 1);
    assert.equal(k.responseRatePercent, 33.3);
  });

  it('el CSAT ignora las órdenes sin encuesta', () => {
    const k = computeKpis([rec({ csatAverage: 4 }), rec({ csatAverage: null })]);
    assert.equal(k.csat, 4);
  });
});

describe('comparación con el periodo anterior', () => {
  it('describe la dirección', () => {
    assert.equal(deltaOf(10, 8).direction, 'sube');
    assert.equal(deltaOf(8, 10).direction, 'baja');
    assert.equal(deltaOf(8, 8).direction, 'igual');
  });

  it('calcula la variación porcentual', () => {
    assert.equal(deltaOf(12, 10).percent, 20);
    assert.equal(deltaOf(8, 10).percent, -20);
  });

  it('desde cero no inventa un +100 %', () => {
    // Pasar de 0 a 3 no es un aumento del cien por ciento: antes no había
    // nada con qué comparar.
    assert.equal(deltaOf(3, 0).percent, null);
    assert.equal(deltaOf(3, 0).absolute, 3);
  });

  it('con base negativa el porcentaje usa el valor absoluto', () => {
    assert.equal(deltaOf(-5, -10).percent, 50);
  });

  it('la ventana anterior tiene el mismo tamaño y termina donde empieza la actual', () => {
    const { from, to } = previousWindow(d('2026-09-08T00:00:00Z'), d('2026-09-15T00:00:00Z'));
    assert.equal(to.toISOString(), '2026-09-08T00:00:00.000Z');
    assert.equal(from.toISOString(), '2026-09-01T00:00:00.000Z');
  });
});

describe('filtros', () => {
  const rows = [
    rec({ orderId: 'a', corporateClient: 'BBVA', brand: 'Toyota' }),
    rec({ orderId: 'b', corporateClient: 'Mitsui', brand: 'Toyota' }),
    rec({ orderId: 'c', corporateClient: null, brand: 'Kia' }),
  ];

  it('filtran por una dimensión', () => {
    assert.equal(applyFilters(rows, { corporateClient: 'BBVA' }).length, 1);
  });

  it('se combinan', () => {
    assert.equal(applyFilters(rows, { corporateClient: 'BBVA', brand: 'Kia' }).length, 0);
  });

  it('sin filtros devuelve todo', () => {
    assert.equal(applyFilters(rows, {}).length, 3);
  });

  it('los particulares se filtran por su etiqueta, no se pierden', () => {
    assert.equal(applyFilters(rows, { corporateClient: 'Particulares' }).length, 1);
  });

  it('las opciones incluyen «Particulares» y van ordenadas', () => {
    assert.deepEqual(optionsFor(rows, 'corporateClient'), ['BBVA', 'Mitsui', 'Particulares']);
  });
});

describe('rango de fechas', () => {
  const rows = [
    rec({ orderId: 'a', closedAt: d('2026-09-01T10:00:00Z') }),
    rec({ orderId: 'b', closedAt: d('2026-09-10T10:00:00Z') }),
  ];

  it('incluye el inicio y excluye el fin', () => {
    const out = inRange(rows, d('2026-09-01T10:00:00Z'), d('2026-09-10T10:00:00Z'));
    assert.deepEqual(out.map((r) => r.orderId), ['a']);
  });
});

describe('desglose', () => {
  const rows = [
    rec({ corporateClient: 'BBVA', revenueCents: 300_000 }),
    rec({ corporateClient: 'Mitsui', revenueCents: 500_000 }),
    rec({ corporateClient: null, revenueCents: 100_000 }),
  ];

  it('ordena por ingresos', () => {
    assert.deepEqual(breakdownBy(rows, 'corporateClient').map((s) => s.label), [
      'Mitsui',
      'BBVA',
      'Particulares',
    ]);
  });

  it('las partes suman el total', () => {
    // Un desglose cuyas partes no suman hace dudar de todos los demás números.
    const total = breakdownBy(rows, 'corporateClient').reduce((n, s) => n + s.revenueCents, 0);
    assert.equal(total, 900_000);
  });

  it('las órdenes sin empresa no se descartan', () => {
    assert.ok(breakdownBy(rows, 'corporateClient').some((s) => s.label === 'Particulares'));
  });
});

describe('serie diaria', () => {
  it('incluye los días sin órdenes', () => {
    // Omitirlos hace que un fin de semana cerrado parezca un martes flojo.
    const rows = [rec({ closedAt: d('2026-09-10T12:00:00Z') })];
    const serie = dailySeries(rows, d('2026-09-08T00:00:00Z'), d('2026-09-12T00:00:00Z'));
    assert.equal(serie.length, 4);
    assert.deepEqual(serie.map((p) => p.orders), [0, 0, 1, 0]);
  });

  it('una ventana vacía no devuelve días', () => {
    assert.equal(dailySeries([], d('2026-09-10T00:00:00Z'), d('2026-09-10T00:00:00Z')).length, 0);
  });

  it('una ventana absurda no cuelga el render', () => {
    const serie = dailySeries([], d('2020-01-01T00:00:00Z'), d('2030-01-01T00:00:00Z'));
    assert.ok(serie.length <= 400);
  });
});

describe('composición NPS', () => {
  it('reparte en promotores, pasivos, detractores y silencios', () => {
    const rows = [
      rec({ npsScore: 10 }),
      rec({ npsScore: 8 }),
      rec({ npsScore: 4 }),
      rec({ npsScore: null }),
    ];
    assert.deepEqual(npsMix(rows), {
      promoters: 1,
      passives: 1,
      detractors: 1,
      withoutResponse: 1,
    });
  });

  it('las cuatro partes suman las órdenes', () => {
    const rows = [rec({ npsScore: 9 }), rec({ npsScore: null })];
    const m = npsMix(rows);
    assert.equal(m.promoters + m.passives + m.detractors + m.withoutResponse, rows.length);
  });
});
