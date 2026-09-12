import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { attentionItems, demoBoard, type AttentionItem, type BoardRow } from '@/features/demo/board';
import { dayWord, priorityDetail, topPriorities } from './priorities';

const NOW = new Date('2026-09-12T15:00:00-05:00');

describe('cuándo fue eso', () => {
  it('cuenta días de calendario, no múltiplos de 24 horas', () => {
    // 26 horas antes, pero dos fechas atrás en el calendario del taller.
    assert.equal(dayWord(new Date('2026-09-10T23:00:00-05:00'), NOW), 'hace 2 días');
    assert.equal(dayWord(new Date('2026-09-11T23:00:00-05:00'), NOW), 'ayer');
    assert.equal(dayWord(new Date('2026-09-12T01:00:00-05:00'), NOW), 'hoy');
  });

  it('una promesa futura del día siguiente es «mañana», no «hoy»', () => {
    assert.equal(dayWord(new Date('2026-09-13T09:00:00-05:00'), NOW), 'mañana');
  });

  it('la hora del taller manda sobre la del servidor', () => {
    /* 2026-09-13T02:00Z son las 21:00 del día 12 en Lima: «hoy», no «mañana».
       Con `getDate()` del proceso —que corre en UTC— habría dicho mañana. */
    assert.equal(dayWord(new Date('2026-09-13T02:00:00Z'), NOW), 'hoy');
  });
});

function itemWith(overrides: Partial<AttentionItem> & { row: BoardRow }): AttentionItem {
  return {
    kind: 'retrasada',
    reason: 'Entrega retrasada',
    elapsed: '2 h',
    severity: 'crit',
    ...overrides,
  };
}

describe('la segunda línea', () => {
  const rows = demoBoard(NOW);

  it('una orden con promesa se explica por su promesa', () => {
    const row = rows.find((r) => r.promisedAt !== null);
    assert.ok(row !== undefined);
    const detail = priorityDetail(itemWith({ row }), NOW);
    assert.match(detail, /^Promesa: (hoy|ayer|mañana|hace \d+ días) /);
  });

  it('una orden sin promesa se explica por cuánto lleva abierta', () => {
    const row = rows.find((r) => r.promisedAt === null);
    assert.ok(row !== undefined, 'la demostración necesita una orden sin promesa');
    assert.match(priorityDetail(itemWith({ row, kind: 'cliente' }), NOW), /^Desde /);
  });

  it('una pausa se explica por lo que lleva parada, no por la promesa', () => {
    const row = rows.find((r) => r.order.status === 'REPARACION_PAUSADA');
    assert.ok(row !== undefined);
    const detail = priorityDetail(itemWith({ row, kind: 'pausada', elapsed: '28 min' }), NOW);
    assert.equal(detail, 'Parada desde hace 28 min');
  });
});

describe('las primeras', () => {
  it('corta por abajo, que es donde está lo menos grave', () => {
    const items = attentionItems(demoBoard(NOW), NOW);
    assert.ok(items.length > 2, 'la demostración necesita más de dos avisos');

    const top = topPriorities(items, NOW, 2);
    assert.equal(top.length, 2);
    assert.deepEqual(
      top.map((p) => p.id),
      items.slice(0, 2).map((i) => i.row.order.id),
    );
  });

  it('cada fila lleva vehículo, placa, qué pasa y cuándo', () => {
    for (const p of topPriorities(attentionItems(demoBoard(NOW), NOW), NOW)) {
      assert.ok(p.vehicle.length > 0);
      assert.ok(p.plate.length > 0);
      assert.ok(p.headline.length > 0);
      assert.ok(p.detail.length > 0);
      assert.match(p.href, /^\/ordenes\//);
    }
  });

  it('no inventa filas cuando el taller está tranquilo', () => {
    assert.deepEqual(topPriorities([], NOW), []);
  });
});
