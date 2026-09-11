import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { balanceCents, isPaid, readiness, usageDelta, type HandoverFacts } from './handover';

const facts = (over: Partial<HandoverFacts> = {}): HandoverFacts => ({
  totalCents: 175_820,
  paidCents: 175_820,
  method: 'tarjeta',
  hasCorporateCredit: false,
  pickupPerson: 'titular',
  authorizedName: '',
  authorizedDocLast3: '',
  signatureCaptured: true,
  keysReturned: true,
  documentsReturned: true,
  usageAtReception: 48_200,
  usageAtDelivery: 48_206,
  ...over,
});

describe('saldo', () => {
  it('pagado entero no deja saldo', () => {
    assert.equal(balanceCents(facts()), 0);
    assert.equal(isPaid(facts()), true);
  });

  it('pagar de más no deja saldo negativo', () => {
    assert.equal(balanceCents(facts({ paidCents: 200_000 })), 0);
  });

  it('un pago parcial deja la diferencia', () => {
    assert.equal(balanceCents(facts({ paidCents: 100_000 })), 75_820);
  });
});

describe('qué impide entregar', () => {
  it('con todo en orden se entrega', () => {
    assert.deepEqual(readiness(facts()), { canDeliver: true, blockers: [] });
  });

  it('saldo pendiente sin crédito corporativo bloquea', () => {
    // Si no, se cobra por teléfono durante tres semanas, si es que se cobra.
    const r = readiness(facts({ paidCents: 0, method: 'efectivo' }));
    assert.equal(r.canDeliver, false);
    assert.ok(r.blockers.some((b) => b.includes('saldo pendiente')));
  });

  it('con crédito corporativo sí sale con saldo', () => {
    const r = readiness(
      facts({ paidCents: 0, hasCorporateCredit: true, method: 'credito_corporativo' }),
    );
    assert.equal(r.canDeliver, true);
  });

  it('no se puede pagar con un crédito que la cuenta no tiene', () => {
    const r = readiness(facts({ method: 'credito_corporativo', hasCorporateCredit: false }));
    assert.equal(r.canDeliver, false);
  });

  it('sin forma de pago registrada no se entrega', () => {
    assert.equal(readiness(facts({ method: null })).canDeliver, false);
  });

  it('un tercero sin nombre no puede llevarse el vehículo', () => {
    // «Lo recogió un señor» no es un registro.
    const r = readiness(facts({ pickupPerson: 'autorizado', authorizedDocLast3: '456' }));
    assert.equal(r.canDeliver, false);
    assert.ok(r.blockers.some((b) => b.includes('nombre')));
  });

  it('un tercero necesita los tres dígitos del documento, ni más ni menos', () => {
    const base = { pickupPerson: 'autorizado' as const, authorizedName: 'Ana Torres' };
    assert.equal(readiness(facts({ ...base, authorizedDocLast3: '45' })).canDeliver, false);
    assert.equal(readiness(facts({ ...base, authorizedDocLast3: '45678901' })).canDeliver, false);
    assert.equal(readiness(facts({ ...base, authorizedDocLast3: 'abc' })).canDeliver, false);
    assert.equal(readiness(facts({ ...base, authorizedDocLast3: '456' })).canDeliver, true);
  });

  it('el odómetro no retrocede', () => {
    const r = readiness(facts({ usageAtDelivery: 48_100 }));
    assert.equal(r.canDeliver, false);
    assert.ok(r.blockers.some((b) => b.includes('menor que el de entrada')));
  });

  it('el mismo kilometraje sí vale: el vehículo pudo no moverse', () => {
    assert.equal(readiness(facts({ usageAtDelivery: 48_200 })).canDeliver, true);
  });

  it('sin kilometraje de salida no se entrega', () => {
    assert.equal(readiness(facts({ usageAtDelivery: null })).canDeliver, false);
  });

  it('llaves, documentos y firma son obligatorios', () => {
    assert.equal(readiness(facts({ keysReturned: false })).canDeliver, false);
    assert.equal(readiness(facts({ documentsReturned: false })).canDeliver, false);
    assert.equal(readiness(facts({ signatureCaptured: false })).canDeliver, false);
  });

  it('la firma se pide la última', () => {
    // Pedirla antes de tener el resto en orden obliga a pedirla dos veces.
    const r = readiness(facts({ signatureCaptured: false, keysReturned: false }));
    assert.equal(r.blockers.at(-1), 'Falta la firma de conformidad.');
  });
});

describe('recorrido dentro del taller', () => {
  it('calcula la diferencia de kilometraje', () => {
    assert.equal(usageDelta(facts()), 6);
  });

  it('sin lectura de salida no hay diferencia', () => {
    assert.equal(usageDelta(facts({ usageAtDelivery: null })), null);
  });
});
