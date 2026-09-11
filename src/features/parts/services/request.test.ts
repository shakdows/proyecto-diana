import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  groupByWork,
  isCoveredByStock,
  readiness,
  summarize,
  toBuy,
  type RequestLine,
} from './request';

const line = (over: Partial<RequestLine> = {}): RequestLine => ({
  id: 'l1',
  workId: 'w1',
  workTitle: 'Cambio de pastillas delanteras',
  description: 'Juego de pastillas delanteras',
  quantity: 1,
  urgency: 'normal',
  inStock: 0,
  ...over,
});

describe('lo que hay que comprar', () => {
  it('descuenta lo que ya está en almacén', () => {
    assert.equal(toBuy(line({ quantity: 4, inStock: 1 })), 3);
  });

  it('el exceso de almacén no genera compra negativa', () => {
    assert.equal(toBuy(line({ quantity: 2, inStock: 5 })), 0);
    assert.equal(isCoveredByStock(line({ quantity: 2, inStock: 5 })), true);
  });
});

describe('qué impide enviar la solicitud', () => {
  it('una solicitud vacía no se envía', () => {
    const r = readiness([]);
    assert.equal(r.canSubmit, false);
    assert.deepEqual(r.blockers, ['Agrega al menos un repuesto.']);
  });

  it('una línea completa la deja lista', () => {
    assert.deepEqual(readiness([line()]), { canSubmit: true, blockers: [] });
  });

  it('una descripción en blanco la bloquea', () => {
    const r = readiness([line({ description: '   ' })]);
    assert.equal(r.canSubmit, false);
    assert.ok(r.blockers.some((b) => b.includes('sin descripción')));
  });

  it('media pastilla no se puede pedir a un proveedor', () => {
    assert.equal(readiness([line({ quantity: 2.5 })]).canSubmit, false);
  });

  it('la cantidad cero es una línea olvidada, no un pedido', () => {
    assert.equal(readiness([line({ quantity: 0 })]).canSubmit, false);
  });

  it('una urgencia sin motivo deja a Compras adivinando', () => {
    const r = readiness([line({ urgency: 'urgente' })]);
    assert.equal(r.canSubmit, false);
    assert.ok(r.blockers.some((b) => b.includes('urgente')));
  });

  it('con el motivo escrito, la urgencia pasa', () => {
    const r = readiness([line({ urgency: 'urgente', note: 'El cliente viaja el viernes.' })]);
    assert.equal(r.canSubmit, true);
  });

  it('los motivos se acumulan en plural, uno por regla', () => {
    const r = readiness([line({ id: 'a', description: '' }), line({ id: 'b', description: '' })]);
    assert.deepEqual(r.blockers, ['Hay 2 repuestos sin descripción.']);
  });
});

describe('resumen de la solicitud', () => {
  const lines: readonly RequestLine[] = [
    line({ id: 'a', quantity: 2, inStock: 2 }),
    line({ id: 'b', workId: 'w2', workTitle: 'Discos', quantity: 2, inStock: 0 }),
    line({ id: 'c', workId: 'w2', workTitle: 'Discos', quantity: 1, inStock: 0, urgency: 'urgente' }),
  ];

  it('separa unidades pedidas de unidades por comprar', () => {
    const s = summarize(lines);
    assert.equal(s.unitCount, 5);
    assert.equal(s.toBuyCount, 3);
  });

  it('cuenta las líneas que cubre el almacén', () => {
    assert.equal(summarize(lines).fromStockLines, 1);
  });

  it('cuenta trabajos distintos, no líneas', () => {
    assert.equal(summarize(lines).workCount, 2);
    assert.equal(summarize(lines).lineCount, 3);
  });

  it('una solicitud vacía resume en ceros, no falla', () => {
    assert.deepEqual(summarize([]), {
      lineCount: 0,
      unitCount: 0,
      toBuyCount: 0,
      fromStockLines: 0,
      urgentLines: 0,
      workCount: 0,
    });
  });
});

describe('agrupar por trabajo', () => {
  it('respeta el orden de aparición y no reordena alfabéticamente', () => {
    const groups = groupByWork([
      line({ id: 'a', workId: 'w2', workTitle: 'Discos' }),
      line({ id: 'b', workId: 'w1', workTitle: 'Pastillas' }),
      line({ id: 'c', workId: 'w2', workTitle: 'Discos' }),
    ]);
    assert.deepEqual(
      groups.map((g) => g.workId),
      ['w2', 'w1'],
    );
    assert.equal(groups[0]?.lines.length, 2);
  });
});
