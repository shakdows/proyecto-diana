import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { customerTargets } from './targets';
import type { DemoCustomer, DemoVehicle } from '../demo';

const veh = (plate: string, openOrderId: string | null = null): DemoVehicle => ({
  id: `v-${plate}`, plate, brand: 'Toyota', model: 'Hilux', modelYear: 2023,
  color: 'Blanco', mileage: 1000, lastServiceDaysAgo: null,
  equipmentKind: 'vehiculo', openOrderId,
});

const cli = (extra: Partial<DemoCustomer> = {}): DemoCustomer => ({
  id: 'cli-1', kind: 'persona', firstName: 'Juan', lastName: 'Pérez', businessName: null,
  documentType: 'DNI', documentLast: '275', phone: '+51 987 654 321', altPhone: null,
  email: 'juan@ejemplo.com', address: null, contactPreference: 'whatsapp',
  corporateClient: null,
  license: { number: 'Q43802725', category: 'A-I', expiresOn: null, restrictions: null },
  createdAt: null, lastVisitDaysAgo: null, vehicles: [], isDemo: true, ...extra,
});

describe('los clientes en la búsqueda universal', () => {
  /*
   * ESTA es la prueba que justifica el módulo.
   *
   * La caja dice «Buscar placa, orden o cliente…» y solo se indexaban las
   * ÓRDENES abiertas: un cliente sin orden en el taller —la mayor parte de la
   * cartera, y todos los recién dados de alta— no existía para la búsqueda
   * que promete encontrarlo.
   */
  it('incluye a un cliente sin vehículos ni órdenes', () => {
    const [t] = customerTargets([cli()]);
    assert.equal(t?.title, 'Juan Pérez');
    assert.equal(t?.href, '/clientes/cli-1');
    assert.equal(t?.subtitle, 'Sin vehículos');
  });

  describe('lo que encuentra', () => {
    it('nombre, teléfono, correo, empresa y placas', () => {
      const t = customerTargets([
        cli({ corporateClient: 'Mitsui', vehicles: [veh('ABC123')] }),
      ])[0];
      assert.ok(t);
      for (const dato of ['Juan Pérez', '987 654 321', 'juan@ejemplo.com', 'Mitsui', 'ABC123']) {
        assert.ok(t.haystack.includes(dato), dato);
      }
    });

    /*
     * El documento completo y la licencia NO entran. La pantalla solo conoce
     * los tres últimos del documento, y la licencia es dato personal que no
     * tiene por qué asomar en una lista que se proyecta en un mostrador.
     */
    it('NUNCA el documento ni el número de licencia', () => {
      const t = customerTargets([cli()])[0];
      assert.ok(t);
      assert.equal(t.haystack.includes('Q43802725'), false, 'la licencia se filtró al índice');
      assert.equal(t.haystack.includes('275'), false, 'el documento se filtró al índice');
    });
  });

  describe('el subtítulo', () => {
    it('dice lo que distingue a este cliente de otro igual', () => {
      // Repetir «Cliente» en las ocho filas no distingue nada.
      assert.equal(customerTargets([cli({ corporateClient: 'BBVA' })])[0]?.subtitle, 'BBVA');
      assert.equal(customerTargets([cli({ vehicles: [veh('ABC123')] })])[0]?.subtitle, 'Toyota Hilux');
      assert.equal(
        customerTargets([cli({ vehicles: [veh('ABC123'), veh('XYZ789')] })])[0]?.subtitle,
        '2 vehículos',
      );
    });
  });

  describe('la placa que se enseña', () => {
    it('es la del vehículo que está EN EL TALLER', () => {
      // Es la que se teclea cuando se busca a alguien mientras su coche está aquí.
      const t = customerTargets([
        cli({ vehicles: [veh('XYZ789'), veh('ABC123', 'ord-9')] }),
      ])[0];
      assert.equal(t?.plate, 'ABC123');
    });

    it('no se inventa una cuando ninguno está en el taller', () => {
      assert.equal(customerTargets([cli({ vehicles: [veh('XYZ789')] })])[0]?.plate, undefined);
    });
  });

  it('los identificadores no chocan con los de las órdenes', () => {
    assert.match(customerTargets([cli()])[0]?.id ?? '', /^cliente-/);
  });
});
