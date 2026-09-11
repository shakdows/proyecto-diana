import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  approvedLines,
  isTrimmed,
  nextStatusAfter,
  outcomeOf,
  readiness,
  rulingFor,
  type Rulings,
} from './authorization';
import type { RequestLine } from './request';

const line = (over: Partial<RequestLine> = {}): RequestLine => ({
  id: 'l1',
  workId: 'w1',
  workTitle: 'Cambio de pastillas delanteras',
  description: 'Juego de pastillas delanteras',
  quantity: 2,
  urgency: 'normal',
  inStock: 0,
  ...over,
});

describe('decisión por línea', () => {
  it('sin decisión explícita la línea está pendiente con la cantidad pedida', () => {
    const l = line({ quantity: 3 });
    assert.deepEqual(rulingFor(l, {}), { decision: 'pendiente', quantity: 3 });
  });

  it('aprobar con menos cantidad es un recorte, no una aprobación limpia', () => {
    const l = line({ quantity: 4 });
    const r: Rulings = { l1: { decision: 'aprobado', quantity: 2, reason: 'Solo hay 2 ejes.' } };
    assert.equal(isTrimmed(l, r), true);
  });

  it('aprobar la cantidad íntegra no es recorte', () => {
    const l = line({ quantity: 4 });
    assert.equal(isTrimmed(l, { l1: { decision: 'aprobado', quantity: 4 } }), false);
  });
});

describe('qué impide autorizar', () => {
  it('con líneas pendientes no se autoriza', () => {
    const r = readiness([line()], {});
    assert.equal(r.canAuthorize, false);
    assert.deepEqual(r.blockers, ['Falta decidir 1 repuesto.']);
  });

  it('un rechazo sin motivo bloquea', () => {
    const r = readiness([line()], { l1: { decision: 'rechazado', quantity: 0 } });
    assert.equal(r.canAuthorize, false);
    assert.ok(r.blockers.some((b) => b.includes('motivo')));
  });

  it('un recorte sin motivo también bloquea', () => {
    const r = readiness([line({ quantity: 4 })], { l1: { decision: 'aprobado', quantity: 1 } });
    assert.equal(r.canAuthorize, false);
  });

  it('con motivo escrito, el rechazo pasa', () => {
    const r = readiness([line()], {
      l1: { decision: 'rechazado', quantity: 0, reason: 'El cliente no lo autorizó.' },
    });
    assert.equal(r.canAuthorize, true);
  });

  it('una solicitud vacía no se autoriza', () => {
    assert.equal(readiness([], {}).canAuthorize, false);
  });
});

describe('resultado', () => {
  const a = line({ id: 'a' });
  const b = line({ id: 'b', quantity: 4 });

  it('mientras falte decidir algo no hay resultado', () => {
    assert.equal(outcomeOf([a, b], { a: { decision: 'aprobado', quantity: 2 } }), null);
  });

  it('todo aprobado íntegro es aprobado_todo', () => {
    const r: Rulings = {
      a: { decision: 'aprobado', quantity: 2 },
      b: { decision: 'aprobado', quantity: 4 },
    };
    assert.equal(outcomeOf([a, b], r), 'aprobado_todo');
  });

  it('un recorte basta para que sea parcial aunque nada se rechace', () => {
    const r: Rulings = {
      a: { decision: 'aprobado', quantity: 2 },
      b: { decision: 'aprobado', quantity: 2, reason: 'Solo un eje.' },
    };
    assert.equal(outcomeOf([a, b], r), 'aprobado_parcial');
  });

  it('todo rechazado es rechazado_todo', () => {
    const r: Rulings = {
      a: { decision: 'rechazado', quantity: 0, reason: 'x' },
      b: { decision: 'rechazado', quantity: 0, reason: 'x' },
    };
    assert.equal(outcomeOf([a, b], r), 'rechazado_todo');
  });
});

describe('a dónde va la orden después', () => {
  it('si queda algo que comprar, pasa por Compras', () => {
    const l = line({ quantity: 2, inStock: 0 });
    const r: Rulings = { l1: { decision: 'aprobado', quantity: 2 } };
    assert.equal(nextStatusAfter([l], r), 'REPUESTOS_EN_COTIZACION');
  });

  it('si el almacén lo cubre todo, se salta Compras', () => {
    // Mandar a cotizar una lista vacía deja la orden esperando a un proveedor
    // que nunca recibió nada.
    const l = line({ quantity: 2, inStock: 2 });
    const r: Rulings = { l1: { decision: 'aprobado', quantity: 2 } };
    assert.equal(nextStatusAfter([l], r), 'REPUESTOS_COMPLETOS');
  });

  it('el recorte reduce lo que hay que comprar', () => {
    const l = line({ quantity: 4, inStock: 2 });
    const r: Rulings = { l1: { decision: 'aprobado', quantity: 2, reason: 'Solo un eje.' } };
    assert.equal(nextStatusAfter([l], r), 'REPUESTOS_COMPLETOS');
  });

  it('sin resultado todavía, no se mueve la orden', () => {
    assert.equal(nextStatusAfter([line()], {}), null);
  });

  it('aprobado cuenta solo lo aprobado', () => {
    const a = line({ id: 'a', quantity: 2 });
    const b = line({ id: 'b', quantity: 3 });
    const r: Rulings = {
      a: { decision: 'aprobado', quantity: 2 },
      b: { decision: 'rechazado', quantity: 0, reason: 'x' },
    };
    assert.equal(approvedLines([a, b], r).length, 1);
  });
});
