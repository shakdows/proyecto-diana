import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  cheapestOffer,
  coversQuantity,
  fastestOffer,
  offerFor,
  ordersBySupplier,
  overpayCents,
  readiness,
  totalsOf,
  type QuotedLine,
  type Selection,
  type SupplierOffer,
} from './supplier-quotes';

const offer = (over: Partial<SupplierOffer> = {}): SupplierOffer => ({
  supplierId: 's1',
  supplierName: 'Repuestos Lima',
  unitCostCents: 10_000,
  leadTimeDays: 2,
  warrantyMonths: 6,
  paymentTerms: 'contado',
  availableQuantity: 10,
  ...over,
});

const line = (over: Partial<QuotedLine> = {}): QuotedLine => ({
  lineId: 'l1',
  description: 'Disco de freno',
  quantity: 2,
  offers: [offer()],
  ...over,
});

describe('elegir oferta', () => {
  const l = line({
    offers: [
      offer({ supplierId: 'a', unitCostCents: 12_000, leadTimeDays: 1 }),
      offer({ supplierId: 'b', unitCostCents: 9_000, leadTimeDays: 5 }),
      offer({ supplierId: 'c', unitCostCents: 11_000, leadTimeDays: 1 }),
    ],
  });

  it('la más barata es la más barata', () => {
    assert.equal(cheapestOffer(l)?.supplierId, 'b');
  });

  it('a igualdad de plazo, la más rápida es la más barata de las rápidas', () => {
    // Entre dos proveedores que entregan mañana, pagar de más no compra nada.
    assert.equal(fastestOffer(l)?.supplierId, 'c');
  });

  it('una línea sin ofertas no devuelve nada, y no revienta', () => {
    assert.equal(cheapestOffer(line({ offers: [] })), undefined);
    assert.equal(fastestOffer(line({ offers: [] })), undefined);
  });

  it('el sobrecosto se mide contra la más barata y por la cantidad', () => {
    const elegida = offer({ supplierId: 'a', unitCostCents: 12_000 });
    assert.equal(overpayCents(l, elegida), (12_000 - 9_000) * 2);
  });

  it('elegir la más barata no cuesta de más', () => {
    assert.equal(overpayCents(l, offer({ supplierId: 'b', unitCostCents: 9_000 })), 0);
  });
});

describe('cobertura de la oferta', () => {
  it('un proveedor sin stock suficiente no cubre la línea', () => {
    assert.equal(coversQuantity(line({ quantity: 4 }), offer({ availableQuantity: 2 })), false);
  });

  it('justo la cantidad pedida sí cubre', () => {
    assert.equal(coversQuantity(line({ quantity: 4 }), offer({ availableQuantity: 4 })), true);
  });
});

describe('totales de la compra', () => {
  const a = line({
    lineId: 'a',
    quantity: 2,
    offers: [
      offer({ supplierId: 's1', unitCostCents: 10_000, leadTimeDays: 2 }),
      offer({ supplierId: 's2', unitCostCents: 12_000, leadTimeDays: 1 }),
    ],
  });
  const b = line({
    lineId: 'b',
    quantity: 1,
    offers: [
      offer({ supplierId: 's1', unitCostCents: 30_000, leadTimeDays: 7 }),
      offer({ supplierId: 's2', unitCostCents: 32_000, leadTimeDays: 3 }),
    ],
  });

  it('manda el repuesto MÁS LENTO, no el promedio', () => {
    // Con una pieza el martes y otra el viernes, se repara el viernes.
    const s: Selection = { a: 's1', b: 's1' };
    assert.equal(totalsOf([a, b], s).leadTimeDays, 7);
  });

  it('cuenta proveedores distintos: cada uno es una orden y un flete', () => {
    const s: Selection = { a: 's1', b: 's2' };
    assert.equal(totalsOf([a, b], s).supplierCount, 2);
  });

  it('el IGV se calcula una vez sobre el subtotal', () => {
    const s: Selection = { a: 's1', b: 's1' };
    const t = totalsOf([a, b], s);
    assert.equal(t.subtotalCents, 20_000 + 30_000);
    assert.equal(t.taxCents, Math.round(50_000 * 0.18));
    assert.equal(t.totalCents, 50_000 + t.taxCents);
  });

  it('las líneas sin elegir no suman nada pero sí se cuentan', () => {
    const t = totalsOf([a, b], { a: 's1' });
    assert.equal(t.subtotalCents, 20_000);
    assert.equal(t.decidedLines, 1);
    assert.equal(t.pendingLines, 1);
  });

  it('una compra sin elecciones da ceros, no NaN', () => {
    const t = totalsOf([a, b], {});
    assert.equal(t.totalCents, 0);
    assert.equal(t.leadTimeDays, 0);
    assert.equal(t.supplierCount, 0);
  });
});

describe('qué impide mandar a autorizar', () => {
  const l = line({ lineId: 'l1' });

  it('sin elegir proveedor no se manda', () => {
    const r = readiness([l], {});
    assert.equal(r.canSend, false);
    assert.deepEqual(r.blockers, ['Falta elegir proveedor para 1 repuesto.']);
  });

  it('con todo elegido y con stock, se manda', () => {
    assert.deepEqual(readiness([l], { l1: 's1' }), { canSend: true, blockers: [] });
  });

  it('un repuesto sin ninguna cotización bloquea', () => {
    const r = readiness([line({ lineId: 'x', offers: [] })], {});
    assert.equal(r.canSend, false);
    assert.ok(r.blockers.some((b) => b.includes('ninguna cotización')));
  });

  it('un proveedor que no cubre la cantidad bloquea', () => {
    // Se descubriría una semana después, con el vehículo ocupando una bahía.
    const corta = line({ lineId: 'l1', quantity: 5, offers: [offer({ availableQuantity: 2 })] });
    const r = readiness([corta], { l1: 's1' });
    assert.equal(r.canSend, false);
    assert.ok(r.blockers.some((b) => b.includes('no cubre')));
  });

  it('sin líneas no hay nada que cotizar', () => {
    assert.equal(readiness([], {}).canSend, false);
  });
});

describe('órdenes por proveedor', () => {
  const a = line({ lineId: 'a', quantity: 2, offers: [offer({ supplierId: 's1', unitCostCents: 10_000, leadTimeDays: 2 })] });
  const b = line({ lineId: 'b', quantity: 1, offers: [offer({ supplierId: 's2', supplierName: 'AutoParts', unitCostCents: 30_000, leadTimeDays: 5 })] });
  const c = line({ lineId: 'c', quantity: 3, offers: [offer({ supplierId: 's1', unitCostCents: 5_000, leadTimeDays: 4 })] });

  const s: Selection = { a: 's1', b: 's2', c: 's1' };

  it('agrupa las líneas de un mismo proveedor en una sola orden', () => {
    const orders = ordersBySupplier([a, b, c], s);
    assert.equal(orders.length, 2);
    assert.equal(orders[0]?.supplierId, 's1');
    assert.equal(orders[0]?.lines.length, 2);
  });

  it('el subtotal de la orden suma sus líneas', () => {
    const orders = ordersBySupplier([a, b, c], s);
    assert.equal(orders[0]?.subtotalCents, 20_000 + 15_000);
  });

  it('el plazo de la orden es el de su línea más lenta', () => {
    const orders = ordersBySupplier([a, b, c], s);
    assert.equal(orders[0]?.leadTimeDays, 4);
  });

  it('las líneas sin proveedor elegido no entran en ninguna orden', () => {
    assert.equal(ordersBySupplier([a, b, c], { a: 's1' }).length, 1);
  });
});

describe('oferta seleccionada', () => {
  it('devuelve undefined si la selección apunta a un proveedor que no cotizó', () => {
    assert.equal(offerFor(line({ lineId: 'l1' }), { l1: 'fantasma' }), undefined);
  });
});
