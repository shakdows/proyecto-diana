import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { lookupReception } from './intake';
import { searchPeople } from './people';
import type { DemoCustomer, DemoVehicle } from '@/features/customers/demo';

const veh = (plate: string): DemoVehicle => ({
  id: `v-${plate}`, plate, brand: 'Toyota', model: 'Hilux', modelYear: 2023,
  color: 'Blanco', mileage: 1000, lastServiceDaysAgo: null,
  equipmentKind: 'vehiculo', openOrderId: null,
});

const cli = (
  id: string,
  firstName: string,
  extra: Partial<DemoCustomer> = {},
): DemoCustomer => ({
  id, kind: 'persona', firstName, lastName: 'Ramírez', businessName: null,
  documentType: 'DNI', documentLast: '156', phone: '936 512 527', altPhone: null,
  email: null, address: null, contactPreference: 'whatsapp', corporateClient: null,
  license: null, createdAt: null, lastVisitDaysAgo: null, vehicles: [], isDemo: true, ...extra,
});

const ALEXIS = cli('nuevo-1', 'alexis');
const JUAN = cli('cli-1', 'Juan', { vehicles: [veh('ABC123')], documentLast: '275' });
const CARTERA = [ALEXIS, JUAN];

describe('buscar en la recepción', () => {
  /*
   * ESTA es la prueba que justifica el cambio.
   *
   * Debajo del campo pone «Escribe la placa. También sirve el nombre, el
   * documento o el teléfono», y no servía: solo se buscaba por placa.
   * Tecleabas el nombre de un cliente y la pantalla decía «no encontrado»,
   * que no es que no ayude —es que MIENTE, y lleva a crear otra vez un
   * cliente que ya existe—.
   */
  it('encuentra por nombre, no solo por placa', () => {
    const r = lookupReception(CARTERA, 'alexis', searchPeople);
    assert.deepEqual(r.people.map((c) => c.id), ['nuevo-1']);
  });

  /*
   * Y esto es lo que de verdad reportó quien lo probaba: un cliente recién
   * dado de alta SIN vehículo no tiene placa, así que era literalmente
   * imposible llegar a él desde la recepción.
   */
  it('encuentra a un cliente que todavía no tiene vehículo', () => {
    assert.equal(ALEXIS.vehicles.length, 0);
    assert.equal(lookupReception(CARTERA, 'alexis', searchPeople).people.length, 1);
  });

  it('encuentra por teléfono', () => {
    assert.equal(lookupReception(CARTERA, '936512527', searchPeople).people.length, 2);
  });

  describe('la placa sigue mandando', () => {
    it('el vehículo va arriba y la persona no se repite abajo', () => {
      // La misma persona dos veces en la misma pantalla hace dudar de si son dos.
      const r = lookupReception(CARTERA, 'ABC123', searchPeople);
      assert.equal(r.vehicles[0]?.vehicle.plate, 'ABC123');
      assert.equal(r.vehicles[0]?.exact, true);
      assert.equal(r.people.some((c) => c.id === 'cli-1'), false);
    });

    it('una placa parcial sigue ofreciendo candidatas', () => {
      assert.equal(lookupReception(CARTERA, 'ABC', searchPeople).vehicles.length, 1);
    });
  });

  describe('lo que es demasiado corto', () => {
    it('no devuelve media cartera', () => {
      // Lanzar la búsqueda a cada tecla enseña al asesor a ignorar lo que sale.
      for (const q of ['', 'a', 'al']) {
        const r = lookupReception(CARTERA, q, searchPeople);
        assert.equal(r.vehicles.length, 0, q);
        assert.equal(r.people.length, 0, q);
      }
    });
  });

  it('lo que no está no aparece', () => {
    const r = lookupReception(CARTERA, 'zzzz', searchPeople);
    assert.equal(r.vehicles.length, 0);
    assert.equal(r.people.length, 0);
  });
});
