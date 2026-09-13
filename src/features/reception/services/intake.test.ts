import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import type { DemoCustomer } from '@/features/customers/demo';
import {
  arrivedAt,
  arrivedToday,
  formatPlate,
  isCompletePlate,
  isSearchable,
  lookupPlate,
  normalizePlate,
  searchState,
} from './intake';

const veh = (plate: string) => ({
  id: `v-${plate}`, plate, brand: 'Toyota', model: 'Hilux', modelYear: 2023,
  color: 'Blanco', mileage: 1000, lastServiceDaysAgo: null,
  equipmentKind: 'vehiculo' as const, openOrderId: null,
});

const cli = (id: string, plates: readonly string[]): DemoCustomer => ({
  id, kind: 'persona', firstName: 'Ana', lastName: 'Ruiz', businessName: null,
  documentType: 'DNI', documentLast: '111', phone: null, altPhone: null, email: null,
  address: null, contactPreference: 'whatsapp', corporateClient: null, license: null, createdAt: null,
  lastVisitDaysAgo: null, isDemo: true, vehicles: plates.map(veh),
});

const CARTERA = [cli('c1', ['ABC123']), cli('c2', ['ABC789', 'XYZ555']), cli('c3', ['ABD100'])];

describe('la placa', () => {
  it('se normaliza como la guarda la base', () => {
    assert.equal(normalizePlate('abc-123'), 'ABC123');
    assert.equal(normalizePlate(' a b c 1 2 3 '), 'ABC123');
  });

  it('se muestra con guion solo cuando está completa', () => {
    assert.equal(formatPlate('abc123'), 'ABC-123');
    assert.equal(formatPlate('abc'), 'ABC');
  });

  it('completa son seis caracteres', () => {
    assert.equal(isCompletePlate('ABC-123'), true);
    assert.equal(isCompletePlate('ABC12'), false);
  });
});

describe('cuándo buscar', () => {
  it('con menos de tres no se busca', () => {
    // Con dos caracteres la respuesta es media flota, y eso enseña al asesor
    // a ignorar lo que aparece.
    assert.equal(isSearchable('AB'), false);
    assert.equal(isSearchable('ABC'), true);
  });

  it('los guiones no cuentan como caracteres', () => {
    assert.equal(isSearchable('A-B'), false);
  });
});

describe('buscar la placa', () => {
  it('la coincidencia exacta va primera', () => {
    const r = lookupPlate(CARTERA, 'ABC123');
    assert.equal(r[0]?.vehicle.plate, 'ABC123');
    assert.equal(r[0]?.exact, true);
  });

  it('con una placa parcial ofrece las candidatas', () => {
    // El asesor que teclea «ABC» mirando el parachoques quiere ver las dos,
    // no un «no encontrado» que le haga dudar de su propia vista.
    const r = lookupPlate(CARTERA, 'ABC');
    assert.deepEqual(r.map((m) => m.vehicle.plate), ['ABC123', 'ABC789']);
    assert.ok(r.every((m) => !m.exact));
  });

  it('el orden de las parciales no cambia entre pulsaciones', () => {
    const alReves = [...CARTERA].reverse();
    assert.deepEqual(
      lookupPlate(alReves, 'AB').map((m) => m.vehicle.plate),
      lookupPlate(CARTERA, 'AB').map((m) => m.vehicle.plate),
    );
  });

  it('devuelve también a quién pertenece', () => {
    assert.equal(lookupPlate(CARTERA, 'XYZ555')[0]?.customer.id, 'c2');
  });

  it('lo que no existe no devuelve nada', () => {
    assert.deepEqual(lookupPlate(CARTERA, 'ZZZ999'), []);
  });

  it('con menos de tres caracteres no devuelve nada, aunque coincidan', () => {
    assert.deepEqual(lookupPlate(CARTERA, 'AB'), []);
  });
});

describe('estado de la búsqueda', () => {
  it('vacío mientras no se escribe', () => {
    assert.equal(searchState({ query: '', pending: false, matches: 0 }), 'vacio');
  });

  it('corto mientras no llega a tres', () => {
    assert.equal(searchState({ query: 'AB', pending: false, matches: 0 }), 'corto');
  });

  it('buscando mientras la consulta está en vuelo', () => {
    assert.equal(searchState({ query: 'ABC', pending: true, matches: 0 }), 'buscando');
  });

  it('NO dice «sin resultados» mientras todavía busca', () => {
    // Ofrecer «registrar vehículo» a medio escribir es como se crea un
    // duplicado de un vehículo que sí existía.
    assert.notEqual(searchState({ query: 'ABC1', pending: true, matches: 0 }), 'sin_resultados');
  });

  it('sin resultados solo cuando terminó y no hay nada', () => {
    assert.equal(searchState({ query: 'ZZZ999', pending: false, matches: 0 }), 'sin_resultados');
  });

  it('encontrado cuando hay al menos uno', () => {
    assert.equal(searchState({ query: 'ABC', pending: false, matches: 2 }), 'encontrado');
  });
});

describe('la hora de llegada', () => {
  const ahora = new Date('2026-09-12T14:30:00');

  it('se calcula al pintar, no se guarda formateada', () => {
    assert.equal(arrivedAt(ahora, 90).getHours(), 13);
    assert.equal(arrivedAt(ahora, 90).getMinutes(), 0);
  });

  it('distingue lo que llegó hoy de lo de ayer', () => {
    assert.equal(arrivedToday(ahora, 60), true);
    assert.equal(arrivedToday(ahora, 60 * 20), false);
  });

  it('lo de esta madrugada sigue siendo hoy', () => {
    assert.equal(arrivedToday(ahora, 14 * 60), true);
  });
});
