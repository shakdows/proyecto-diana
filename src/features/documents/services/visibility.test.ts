import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  assertSafeForCustomer,
  lineFor,
  linesFor,
  type DocumentLine,
} from './visibility';

const line = (over: Partial<DocumentLine> = {}): DocumentLine => ({
  description: 'Juego de pastillas delanteras',
  quantity: 1,
  unitPriceCents: 32_000,
  lineTotalCents: 32_000,
  internalCostCents: 18_000,
  supplierName: 'Importaciones del Sur',
  technicianNote: 'Cliente pidió la marca barata; se le puso la buena.',
  ...over,
});

describe('poda por destinatario', () => {
  it('el cliente no ve costo interno, proveedor ni nota del técnico', () => {
    const out = lineFor('cliente', line());
    assert.equal(out.internalCostCents, undefined);
    assert.equal(out.supplierName, undefined);
    assert.equal(out.technicianNote, undefined);
  });

  it('el cliente sí ve lo que paga', () => {
    const out = lineFor('cliente', line());
    assert.equal(out.description, 'Juego de pastillas delanteras');
    assert.equal(out.lineTotalCents, 32_000);
  });

  it('el documento interno lo conserva todo', () => {
    const out = lineFor('interno', line());
    assert.equal(out.internalCostCents, 18_000);
    assert.equal(out.supplierName, 'Importaciones del Sur');
  });

  it('poda la lista entera', () => {
    const out = linesFor('cliente', [line(), line({ description: 'Discos' })]);
    assert.equal(out.length, 2);
    assert.ok(out.every((l) => l.supplierName === undefined));
  });
});

describe('comprobación defensiva', () => {
  it('acepta un documento ya podado', () => {
    assert.doesNotThrow(() =>
      assertSafeForCustomer({ items: linesFor('cliente', [line()]) }),
    );
  });

  it('falla si el costo interno se coló, aunque sea anidado', () => {
    // Un PDF se manda por correo y ya no se puede retirar.
    assert.throws(
      () => assertSafeForCustomer({ pagina: { bloques: [{ items: [line()] }] } }),
      /internalCostCents/,
    );
  });

  it('nombra el campo culpable para poder arreglarlo', () => {
    assert.throws(
      () => assertSafeForCustomer([{ supplierName: 'X' }]),
      /supplierName/,
    );
  });

  it('un objeto con ciclos no cuelga la generación', () => {
    const a: Record<string, unknown> = { nombre: 'ok' };
    a.yo = a;
    assert.doesNotThrow(() => assertSafeForCustomer(a));
  });

  it('valores primitivos y nulos no molestan', () => {
    assert.doesNotThrow(() => assertSafeForCustomer(null));
    assert.doesNotThrow(() => assertSafeForCustomer('texto'));
    assert.doesNotThrow(() => assertSafeForCustomer([1, 2, null]));
  });
});
