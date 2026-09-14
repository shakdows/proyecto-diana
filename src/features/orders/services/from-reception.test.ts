import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { PERMISSIONS } from '@/lib/auth/permissions';
import type { DemoCustomer } from '@/features/customers/demo';
import type { CompletedReception } from '@/features/reception/services/acta';
import { canTransition } from './state-machine';
import { toBoardRow } from '@/features/demo/board';
import {
  SERVICE_TYPES,
  SIN_DEFINIR,
  checkServiceType,
  customerName,
  factsFromReception,
  findVehicle,
  isReceptionOrderId,
  minutesSince,
  normalizePlate,
  orderFromReception,
  orderIdForReception,
  receptionCodeFromOrderId,
  receptionOrderTargets,
  serviceTypeSlot,
} from './from-reception';

const AHORA = new Date('2026-09-14T18:00:00Z');

function acta(overrides: Partial<CompletedReception> = {}): CompletedReception {
  return {
    code: 'REC-2026-0001',
    plate: 'ABC321',
    vehicle: 'Toyota Corolla',
    customer: 'Alexis Ramírez',
    customerId: 'cli-nuevo',
    closedAt: '2026-09-14T17:00:00Z',
    checklistResolved: 24,
    checklistTotal: 24,
    damageCount: 2,
    photoCount: 7,
    customerSignature: { dataUrl: 'data:image/png;base64,x', name: 'Alexis Ramírez', signedAt: '2026-09-14T16:58:00Z' },
    advisorName: 'Andrea López',
    orderCode: 'OT-2026-0001',
    ...overrides,
  };
}

function customer(overrides: Partial<DemoCustomer> = {}): DemoCustomer {
  return {
    id: 'cli-nuevo', kind: 'persona', firstName: 'Alexis', lastName: 'Ramírez',
    businessName: null, documentType: 'DNI', documentLast: '275',
    phone: '+51 987 000 111', altPhone: null, email: 'alexis@ejemplo.com',
    address: 'Av. Principal 100', contactPreference: 'whatsapp',
    corporateClient: null, license: null, createdAt: '2026-09-13T10:00:00Z',
    lastVisitDaysAgo: null, isDemo: true,
    vehicles: [{
      id: 'veh-1', plate: 'ABC-321', brand: 'Toyota', model: 'Corolla', modelYear: 2020,
      color: 'Rojo', mileage: 52000, lastServiceDaysAgo: null, equipmentKind: 'vehiculo',
      openOrderId: null,
    }],
    ...overrides,
  };
}

describe('identificadores', () => {
  it('la orden de un acta tiene un identificador estable y reversible', () => {
    assert.equal(orderIdForReception('REC-2026-0001'), 'rec-2026-0001');
    assert.equal(receptionCodeFromOrderId('rec-2026-0001'), 'REC-2026-0001');
  });

  it('no confunde una orden sembrada con una de recepción', () => {
    assert.equal(isReceptionOrderId('os-154'), false);
    assert.equal(isReceptionOrderId('rec-2026-0001'), true);
    assert.equal(receptionCodeFromOrderId('os-154'), null);
  });
});

describe('encontrar el vehículo en la cartera', () => {
  const cartera = [customer()];

  it('la placa casa aunque lleve guion o minúsculas', () => {
    assert.ok(findVehicle(cartera, 'ABC321') !== null);
    assert.ok(findVehicle(cartera, 'abc-321') !== null);
    assert.ok(findVehicle(cartera, 'ABC-321') !== null);
  });

  it('devuelve null si la placa no está registrada', () => {
    assert.equal(findVehicle(cartera, 'ZZZ999'), null);
  });

  it('normaliza sin perder caracteres válidos', () => {
    assert.equal(normalizePlate('abc-321'), 'ABC321');
    assert.equal(normalizePlate('EXC 014'), 'EXC014');
  });

  it('el nombre sale de la persona o de la razón social', () => {
    assert.equal(customerName(customer()), 'Alexis Ramírez');
    assert.equal(
      customerName(customer({ kind: 'empresa', businessName: 'Transportes Sur S.A.C.' })),
      'Transportes Sur S.A.C.',
    );
  });
});

describe('el acta con forma de orden', () => {
  it('conserva el código de orden que emitió la recepción', () => {
    const order = orderFromReception({ acta: acta(), match: null }, AHORA);
    assert.equal(order.code, 'OT-2026-0001');
    assert.equal(order.id, 'rec-2026-0001');
  });

  it('trae del vehículo registrado lo que el acta no sabe', () => {
    const match = findVehicle([customer()], 'ABC321');
    const order = orderFromReception({ acta: acta(), match }, AHORA);
    assert.equal(order.modelYear, 2020);
    assert.equal(order.usage, 52000);
    assert.equal(order.color, 'Rojo');
    assert.equal(order.customerPhone, '+51 987 000 111');
    assert.equal(order.customerDocLast3, '275');
  });

  it('sin vehículo registrado no se inventa el año ni el kilometraje', () => {
    const order = orderFromReception({ acta: acta(), match: null }, AHORA);
    assert.equal(order.modelYear, 0);
    assert.equal(order.usage, 0);
    assert.equal(order.color, '');
  });

  it('nace sin tipo de servicio: en recepción no se sabe qué hay que hacer', () => {
    assert.equal(orderFromReception({ acta: acta(), match: null }, AHORA).serviceType, SIN_DEFINIR);
  });

  it('no promete una hora de entrega que nadie ha estimado', () => {
    const order = orderFromReception({ acta: acta(), match: null }, AHORA);
    assert.equal(order.promisedInMinutes, null);
    assert.equal(order.estimatedMinutes, 0);
  });

  it('la antigüedad sale del cierre del acta', () => {
    assert.equal(orderFromReception({ acta: acta(), match: null }, AHORA).openedMinutesAgo, 60);
  });

  it('pasa por las mismas funciones puras que las órdenes sembradas', () => {
    const order = orderFromReception({ acta: acta(), match: null }, AHORA);
    const row = toBoardRow(order, AHORA);
    assert.ok(row.progressPercent >= 0 && row.progressPercent <= 100);
    assert.ok(typeof row.light.color === 'string');
  });
});

describe('minutos desde el cierre', () => {
  it('nunca es negativo aunque el reloj vaya atrasado', () => {
    assert.equal(minutesSince('2026-09-14T19:00:00Z', AHORA), 0);
  });

  it('ante una fecha ilegible devuelve cero en vez de NaN', () => {
    assert.equal(minutesSince('no es una fecha', AHORA), 0);
  });
});

describe('los hechos de una orden recién recibida', () => {
  const actor = { profileId: 'ase-1', permissions: PERMISSIONS };

  it('el checklist y la firma vienen del acta', () => {
    const order = orderFromReception({ acta: acta(), match: null }, AHORA);
    const facts = factsFromReception(order, acta());
    assert.equal(facts.resolvedChecklistItems, 24);
    assert.equal(facts.hasCustomerSignature, true);
    assert.equal(facts.hasAdvisorSignature, true);
  });

  it('sin tipo de servicio NO se puede enviar a diagnóstico', () => {
    const order = orderFromReception({ acta: acta(), match: null }, AHORA);
    const check = canTransition(factsFromReception(order, acta()), 'enviar_a_diagnostico', actor);
    assert.equal(check.allowed, false);
    assert.ok(!check.allowed);
    assert.deepEqual(check.unmet, ['Falta definir el tipo de servicio.']);
  });

  it('con tipo de servicio, sí', () => {
    const order = orderFromReception(
      { acta: acta(), match: null, serviceType: 'CAMBIO DE ACEITE Y FILTROS' },
      AHORA,
    );
    const check = canTransition(factsFromReception(order, acta()), 'enviar_a_diagnostico', actor);
    assert.equal(check.allowed, true);
  });

  it('no rellena con ceros lo que la máquina leería como «adelante»', () => {
    const order = orderFromReception({ acta: acta(), match: null }, AHORA);
    const facts = factsFromReception(order, acta());
    assert.equal(facts.hasFinalEvidence, false);
    assert.equal(facts.deliveryActSigned, false);
    assert.equal(facts.qualityChecklistComplete, false);
    assert.equal(facts.estimatedMinutes, null);
  });
});

describe('tipo de servicio', () => {
  it('la ranura es propia de cada orden', () => {
    assert.equal(serviceTypeSlot('rec-2026-0001'), 'orden.rec-2026-0001.servicio');
    assert.notEqual(serviceTypeSlot('rec-2026-0001'), serviceTypeSlot('rec-2026-0002'));
  });

  it('el campo vacío no es un error', () => {
    assert.deepEqual(checkServiceType('   '), { valid: false, error: null });
  });

  it('avisa de lo demasiado corto y lo demasiado largo', () => {
    assert.equal(checkServiceType('ABC').valid, false);
    assert.equal(checkServiceType('x'.repeat(81)).valid, false);
    assert.equal(checkServiceType('CAMBIO DE ACEITE').valid, true);
  });

  it('la lista ofrecida es válida entera', () => {
    for (const t of SERVICE_TYPES) assert.equal(checkServiceType(t).valid, true, t);
  });

  it('ninguna opción de la lista es el marcador de «sin definir»', () => {
    assert.ok(!SERVICE_TYPES.includes(SIN_DEFINIR));
  });
});

describe('las órdenes recibidas se buscan', () => {
  const actas = [acta(), acta({ code: 'REC-2026-0002', plate: 'XYZ-987', orderCode: 'OT-2026-0002', customer: 'Rosa Díaz', vehicle: 'Kia Rio' })];

  it('encuentra por placa con y sin guion, y por los dos códigos', () => {
    const [uno] = receptionOrderTargets(actas, () => '');
    assert.ok(uno !== undefined);
    assert.ok(uno.haystack.includes('ABC321'));
    assert.ok(uno.haystack.includes('OT-2026-0001'));
    assert.ok(uno.haystack.includes('REC-2026-0001'));
    assert.ok(uno.haystack.includes('Alexis Ramírez'));
  });

  it('apunta a la orden, no al acta', () => {
    const [uno] = receptionOrderTargets(actas, () => '');
    assert.equal(uno?.href, '/ordenes/rec-2026-0001');
    assert.equal(uno?.kind, 'orden');
  });

  it('el título usa el tipo de servicio cuando ya se definió', () => {
    const [uno] = receptionOrderTargets(actas, () => 'CAMBIO DE ACEITE Y FILTROS');
    assert.ok(uno?.title.startsWith('CAMBIO DE ACEITE Y FILTROS'));
    const [sinDefinir] = receptionOrderTargets(actas, () => '');
    assert.ok(sinDefinir?.title.startsWith(SIN_DEFINIR));
  });

  it('NUNCA mete el documento del cliente en lo que se busca', () => {
    for (const t of receptionOrderTargets(actas, () => '')) {
      assert.ok(!/\b\d{8}\b/u.test(t.haystack), t.haystack);
    }
  });

  it('cada acta da exactamente una orden', () => {
    assert.equal(receptionOrderTargets(actas, () => '').length, 2);
    assert.equal(receptionOrderTargets([], () => '').length, 0);
  });
});
