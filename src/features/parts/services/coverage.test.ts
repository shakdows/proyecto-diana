import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  lineCoverage,
  orderCoverage,
  requiredQuantity,
  type PartLine,
} from './coverage';

describe('cobertura por línea', () => {
  it('calcula el porcentaje y lo que falta', () => {
    const l = lineCoverage({ partId: 'f', description: 'Filtros', required: 3, received: 1 });
    assert.equal(l.percent, 33.3);
    assert.equal(l.complete, false);
    assert.equal(l.missing, 2);
  });

  it('nunca supera el 100 % aunque se reciba de más', () => {
    const l = lineCoverage({ partId: 'a', description: 'Aceite', required: 5, received: 8 });
    assert.equal(l.ratio, 1);
    assert.equal(l.percent, 100);
    assert.equal(l.missing, 0);
  });

  it('un repuesto sin requerimiento no bloquea nada', () => {
    const l = lineCoverage({ partId: 'x', description: 'Discos', required: 0, received: 0 });
    assert.equal(l.complete, true);
    assert.equal(l.ratio, 1);
  });
});

describe('el ejemplo de §29', () => {
  // Solicitado: pastillas 2 · filtros 3 · aceite 5
  // Primera entrega: pastillas 2 · filtros 1 · aceite 5
  const primeraEntrega: readonly PartLine[] = [
    { partId: 'p', description: 'Pastillas', required: 2, received: 2 },
    { partId: 'f', description: 'Filtros', required: 3, received: 1 },
    { partId: 'a', description: 'Aceite', required: 5, received: 5 },
  ];

  it('reproduce 100 % / 33 % / 100 %', () => {
    const c = orderCoverage(primeraEntrega);
    assert.deepEqual(
      c.lines.map((l) => l.percent),
      [100, 33.3, 100],
    );
  });

  it('la orden queda al 80 % pero NO completa', () => {
    const c = orderCoverage(primeraEntrega);
    assert.equal(c.totalRequired, 10);
    assert.equal(c.totalReceived, 8);
    assert.equal(c.percent, 80);
    // 80 % no permite empezar a reparar si falta el perno que sujeta la pieza.
    assert.equal(c.complete, false);
    assert.deepEqual(
      c.pendingLines.map((l) => l.description),
      ['Filtros'],
    );
  });

  it('la segunda entrega la completa', () => {
    const c = orderCoverage([
      { partId: 'p', description: 'Pastillas', required: 2, received: 2 },
      { partId: 'f', description: 'Filtros', required: 3, received: 3 },
      { partId: 'a', description: 'Aceite', required: 5, received: 5 },
    ]);
    assert.equal(c.complete, true);
    assert.equal(c.percent, 100);
  });
});

describe('recibir de más no compensa lo que falta', () => {
  it('no deja la orden completa', () => {
    const c = orderCoverage([
      { partId: 'a', description: 'Aceite', required: 2, received: 10 },
      { partId: 'b', description: 'Filtro', required: 2, received: 0 },
    ]);
    assert.equal(c.totalReceived, 2, 'solo cuenta min(recibido, requerido)');
    assert.equal(c.percent, 50);
    assert.equal(c.complete, false);
  });
});

describe('cantidad requerida derivada de la autorización (§60, I-4)', () => {
  it('solo suma los ítems aprobados', () => {
    const cantidad = requiredQuantity([
      { quotationItemId: '1', quantity: 2, itemStatus: 'aprobado' },
      { quotationItemId: '2', quantity: 4, itemStatus: 'rechazado' },
      { quotationItemId: '3', quantity: 1, itemStatus: 'aprobado_con_observacion' },
      { quotationItemId: '4', quantity: 8, itemStatus: 'pendiente' },
    ]);
    assert.equal(cantidad, 3);
  });

  it('un repuesto de trabajos todos rechazados no se compra', () => {
    const cantidad = requiredQuantity([
      { quotationItemId: '1', quantity: 2, itemStatus: 'rechazado' },
      { quotationItemId: '2', quantity: 3, itemStatus: 'rechazado' },
    ]);
    assert.equal(cantidad, 0);
  });

  it('un repuesto compartido solo cuenta por el trabajo aprobado', () => {
    // El mismo filtro lo usan dos trabajos; el cliente aprueba uno.
    const cantidad = requiredQuantity([
      { quotationItemId: 'mantenimiento', quantity: 1, itemStatus: 'aprobado' },
      { quotationItemId: 'reparacion', quantity: 1, itemStatus: 'rechazado' },
    ]);
    assert.equal(cantidad, 1);
  });
});

describe('sin repuestos que esperar', () => {
  it('una orden sin líneas está cubierta', () => {
    const c = orderCoverage([]);
    assert.equal(c.complete, true);
    assert.equal(c.percent, 100);
  });
});
