import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  TAX_RATE,
  approvedTotals,
  canConfirm,
  lineTotalCents,
  outcomeOf,
  pendingLines,
  rejectedLines,
  totalsOf,
  type Decisions,
  type QuoteLine,
} from './quotation';

const line = (patch: Partial<QuoteLine> & { id: string }): QuoteLine => ({
  title: 'Trabajo',
  detail: '',
  priority: 'medio',
  partsCents: 0,
  labourCents: 0,
  photoCount: 1,
  ...patch,
});

const pastillas = line({ id: 'p', title: 'Pastillas', partsCents: 32000, labourCents: 13000 });
const discos = line({ id: 'd', title: 'Discos', partsCents: 65000, labourCents: 15000 });
const alineamiento = line({ id: 'a', title: 'Alineamiento', partsCents: 0, labourCents: 12000 });
const TODAS = [pastillas, discos, alineamiento];

describe('el dinero no pierde céntimos', () => {
  // En coma flotante 0.1 + 0.2 no es 0.3. Veinte líneas acumulan un error que
  // el cliente ve en el total y el taller no sabe explicar.
  it('sumar 0,10 y 0,20 da exactamente 0,30', () => {
    const t = totalsOf([
      line({ id: '1', partsCents: 10 }),
      line({ id: '2', partsCents: 20 }),
    ]);
    assert.equal(t.partsCents, 30);
  });

  it('cien líneas de un céntimo suman exactamente un sol', () => {
    const cien = Array.from({ length: 100 }, (_, i) => line({ id: String(i), labourCents: 1 }));
    assert.equal(totalsOf(cien).subtotalCents, 100);
  });

  it('el total de una línea es repuestos más mano de obra', () => {
    assert.equal(lineTotalCents(pastillas), 45000);
    assert.equal(lineTotalCents(alineamiento), 12000);
  });
});

describe('el impuesto se calcula una sola vez, sobre el subtotal', () => {
  // Sumar impuestos redondeados línea a línea da un total distinto del que
  // sale de redondear una vez, y esa diferencia acaba impresa en el acta.
  it('tres líneas de 33 céntimos: 18 % de 99, no tres veces 18 % de 33', () => {
    const tres = [
      line({ id: '1', labourCents: 33 }),
      line({ id: '2', labourCents: 33 }),
      line({ id: '3', labourCents: 33 }),
    ];
    const t = totalsOf(tres);
    assert.equal(t.subtotalCents, 99);
    assert.equal(t.taxCents, Math.round(99 * TAX_RATE)); // 18
    assert.equal(t.taxCents, 18);
    // Línea a línea habría dado 6+6+6 = 18… pero con 34 céntimos daría 19 ≠ 18.
    assert.equal(t.totalCents, 117);
  });

  it('el caso que delata el error: tres líneas de un céntimo', () => {
    // Redondeando línea a línea: round(0.18) = 0, tres veces = 0 de impuesto.
    // Redondeando una sola vez: round(3 * 0.18) = round(0.54) = 1.
    // El taller cobraría un céntimo de menos por cada cotización así.
    const tres = [
      line({ id: '1', labourCents: 1 }),
      line({ id: '2', labourCents: 1 }),
      line({ id: '3', labourCents: 1 }),
    ];
    const t = totalsOf(tres);

    const porLinea = Math.round(1 * TAX_RATE) * 3;
    assert.equal(porLinea, 0);
    assert.equal(t.taxCents, 1);
    assert.notEqual(t.taxCents, porLinea);
  });

  it('y el caso grande, con 25 céntimos por línea', () => {
    const tres = [
      line({ id: '1', labourCents: 25 }),
      line({ id: '2', labourCents: 25 }),
      line({ id: '3', labourCents: 25 }),
    ];
    // Por línea: round(4.5) = 5, tres veces = 15. De una vez: round(13.5) = 14.
    assert.equal(Math.round(25 * TAX_RATE) * 3, 15);
    assert.equal(totalsOf(tres).taxCents, 14);
  });

  it('una cotización vacía vale cero, no NaN', () => {
    const t = totalsOf([]);
    assert.deepEqual(
      { s: t.subtotalCents, i: t.taxCents, tt: t.totalCents, n: t.lineCount },
      { s: 0, i: 0, tt: 0, n: 0 },
    );
  });
});

describe('el cliente decide línea por línea', () => {
  const mixto: Decisions = { p: 'aprobado', d: 'rechazado', a: 'aprobado' };

  it('solo se cobra lo aprobado', () => {
    const t = approvedTotals(TODAS, mixto);
    assert.equal(t.lineCount, 2);
    assert.equal(t.subtotalCents, 45000 + 12000);
    assert.equal(t.totalCents, 57000 + Math.round(57000 * TAX_RATE));
  });

  it('lo rechazado queda registrado, no desaparece', () => {
    assert.deepEqual(rejectedLines(TODAS, mixto).map((l) => l.id), ['d']);
  });

  it('una línea sin decidir cuenta como pendiente', () => {
    assert.deepEqual(pendingLines(TODAS, { p: 'aprobado' }).map((l) => l.id), ['d', 'a']);
  });
});

describe('confirmar exige haber decidido TODO', () => {
  // Dejar una pendiente produce una orden ambigua: el técnico no sabe si ese
  // trabajo entra y acaba preguntando por teléfono, que es lo que el enlace
  // de autorización venía a evitar.
  it('con una pendiente no se puede confirmar', () => {
    assert.equal(canConfirm(TODAS, { p: 'aprobado', d: 'rechazado' }), false);
    assert.equal(outcomeOf(TODAS, { p: 'aprobado', d: 'rechazado' }), null);
  });

  it('una cotización sin líneas tampoco se confirma', () => {
    assert.equal(canConfirm([], {}), false);
  });

  it('todo aprobado', () => {
    const d: Decisions = { p: 'aprobado', d: 'aprobado', a: 'aprobado' };
    assert.equal(outcomeOf(TODAS, d), 'aprobado_todo');
  });

  it('aprobación parcial', () => {
    const d: Decisions = { p: 'aprobado', d: 'rechazado', a: 'rechazado' };
    assert.equal(outcomeOf(TODAS, d), 'aprobado_parcial');
  });

  // Rechazarlo todo es una respuesta válida, y el sistema necesita saberlo
  // para no dejar la orden esperando a un cliente que ya contestó.
  it('rechazado todo es un desenlace, no un error', () => {
    const d: Decisions = { p: 'rechazado', d: 'rechazado', a: 'rechazado' };
    assert.equal(canConfirm(TODAS, d), true);
    assert.equal(outcomeOf(TODAS, d), 'rechazado_todo');
    assert.equal(approvedTotals(TODAS, d).totalCents, 0);
  });
});
