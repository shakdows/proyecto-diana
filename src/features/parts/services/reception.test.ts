import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  acceptAll,
  isLineComplete,
  pendingAfter,
  pendingBefore,
  readiness,
  statusAfter,
  summarize,
  type Entries,
  type ReceivableLine,
} from './reception';

const line = (over: Partial<ReceivableLine> = {}): ReceivableLine => ({
  lineId: 'l1',
  description: 'Disco de freno delantero',
  supplierName: 'Repuestos Lima',
  ordered: 2,
  alreadyReceived: 0,
  ...over,
});

describe('lo que falta por recibir', () => {
  it('descuenta las recepciones anteriores', () => {
    assert.equal(pendingBefore(line({ ordered: 5, alreadyReceived: 2 })), 3);
  });

  it('recibir de más en una entrega anterior no deja pendiente negativo', () => {
    assert.equal(pendingBefore(line({ ordered: 2, alreadyReceived: 4 })), 0);
  });

  it('lo aceptado ahora reduce lo que falta', () => {
    const l = line({ ordered: 5, alreadyReceived: 1 });
    assert.equal(pendingAfter(l, { l1: { accepted: 3, rejected: 0 } }), 1);
  });

  it('lo RECHAZADO no reduce lo que falta', () => {
    // Un disco rayado dentro de la caja no es un disco.
    const l = line({ ordered: 2 });
    assert.equal(pendingAfter(l, { l1: { accepted: 0, rejected: 2, reason: 'danado' } }), 2);
    assert.equal(isLineComplete(l, { l1: { accepted: 0, rejected: 2, reason: 'danado' } }), false);
  });
});

describe('qué impide confirmar la recepción', () => {
  it('sin líneas no hay recepción', () => {
    assert.equal(readiness([], {}).canConfirm, false);
  });

  it('una recepción vacía es alguien pulsando un botón, no una entrega', () => {
    const r = readiness([line()], {});
    assert.equal(r.canConfirm, false);
    assert.ok(r.blockers.some((b) => b.includes('al menos una unidad')));
  });

  it('aceptar lo pendiente basta para confirmar', () => {
    assert.deepEqual(readiness([line()], { l1: { accepted: 2, rejected: 0 } }), {
      canConfirm: true,
      blockers: [],
    });
  });

  it('aceptar más de lo pedido bloquea', () => {
    const r = readiness([line({ ordered: 2 })], { l1: { accepted: 3, rejected: 0 } });
    assert.equal(r.canConfirm, false);
    assert.ok(r.blockers.some((b) => b.includes('más unidades')));
  });

  it('un rechazo sin motivo bloquea', () => {
    const r = readiness([line()], { l1: { accepted: 1, rejected: 1 } });
    assert.equal(r.canConfirm, false);
    assert.ok(r.blockers.some((b) => b.includes('motivo')));
  });

  it('con motivo, el rechazo pasa', () => {
    const r = readiness([line()], { l1: { accepted: 1, rejected: 1, reason: 'danado' } });
    assert.equal(r.canConfirm, true);
  });

  it('«otro motivo» necesita nota', () => {
    const sinNota: Entries = { l1: { accepted: 1, rejected: 1, reason: 'otro' } };
    assert.equal(readiness([line()], sinNota).canConfirm, false);
    const conNota: Entries = {
      l1: { accepted: 1, rejected: 1, reason: 'otro', note: 'Vino la referencia de 2019.' },
    };
    assert.equal(readiness([line()], conNota).canConfirm, true);
  });
});

describe('resumen de la recepción', () => {
  const a = line({ lineId: 'a', ordered: 2 });
  const b = line({ lineId: 'b', ordered: 5, alreadyReceived: 1 });

  it('cuenta aceptadas y rechazadas por separado', () => {
    const e: Entries = {
      a: { accepted: 2, rejected: 0 },
      b: { accepted: 2, rejected: 1, reason: 'danado' },
    };
    const s = summarize([a, b], e);
    assert.equal(s.acceptedUnits, 4);
    assert.equal(s.rejectedUnits, 1);
  });

  it('la cobertura cuenta solo lo aceptado', () => {
    // a: 2/2 · b: 3/5 -> 5 de 7 unidades.
    const e: Entries = {
      a: { accepted: 2, rejected: 0 },
      b: { accepted: 2, rejected: 1, reason: 'danado' },
    };
    const s = summarize([a, b], e);
    assert.equal(s.percent, 71.4);
    assert.equal(s.complete, false);
    assert.equal(s.missingUnits, 2);
  });

  it('todo aceptado deja la orden completa al 100 %', () => {
    const e: Entries = { a: { accepted: 2, rejected: 0 }, b: { accepted: 4, rejected: 0 } };
    const s = summarize([a, b], e);
    assert.equal(s.percent, 100);
    assert.equal(s.complete, true);
    assert.equal(s.pendingLines, 0);
  });

  it('una recepción sin registrar nada no inventa cobertura', () => {
    const s = summarize([a, b], {});
    assert.equal(s.acceptedUnits, 0);
    assert.equal(s.complete, false);
  });
});

describe('estado después de confirmar', () => {
  const a = line({ lineId: 'a', ordered: 2 });
  const b = line({ lineId: 'b', ordered: 3 });

  it('todo cubierto pasa a REPUESTOS_COMPLETOS', () => {
    const e: Entries = { a: { accepted: 2, rejected: 0 }, b: { accepted: 3, rejected: 0 } };
    assert.equal(statusAfter([a, b], e), 'REPUESTOS_COMPLETOS');
  });

  it('al 93 % sigue siendo PARCIALES si falta el perno', () => {
    // No se empieza a reparar sin la pieza que falta, por pequeña que sea.
    const e: Entries = { a: { accepted: 2, rejected: 0 }, b: { accepted: 2, rejected: 0 } };
    assert.equal(statusAfter([a, b], e), 'REPUESTOS_PARCIALES');
  });

  it('lo rechazado no completa la orden', () => {
    const e: Entries = {
      a: { accepted: 2, rejected: 0 },
      b: { accepted: 0, rejected: 3, reason: 'no_corresponde' },
    };
    assert.equal(statusAfter([a, b], e), 'REPUESTOS_PARCIALES');
  });
});

describe('«llegó todo»', () => {
  it('rellena solo lo pendiente, no lo ya recibido', () => {
    const e = acceptAll([line({ lineId: 'a', ordered: 5, alreadyReceived: 2 })]);
    assert.deepEqual(e, { a: { accepted: 3, rejected: 0 } });
  });

  it('omite las líneas ya completas', () => {
    assert.deepEqual(acceptAll([line({ lineId: 'a', ordered: 2, alreadyReceived: 2 })]), {});
  });
});
