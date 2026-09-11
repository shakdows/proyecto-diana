import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  formatUsage,
  isEquipmentKind,
  vocabularyFor,
  vocabularyForMany,
  type EquipmentKind,
} from './equipment-kind';

const plain = (n: number): string => String(n);

describe('cada tipo de equipo se nombra como lo nombra el taller', () => {
  it('una camioneta tiene placa y kilómetros', () => {
    const v = vocabularyFor('vehiculo');
    assert.equal(v.identifier, 'Placa');
    assert.equal(v.usageMeter, 'Kilometraje');
    assert.equal(v.usageUnit, 'km');
    assert.equal(v.serialLabel, 'VIN');
  });

  it('una excavadora tiene código de equipo y horas', () => {
    const v = vocabularyFor('maquinaria');
    assert.equal(v.identifier, 'Código de equipo');
    assert.equal(v.usageMeter, 'Horómetro');
    assert.equal(v.usageUnit, 'h');
    assert.equal(v.serialLabel, 'N.º de serie');
  });

  it('8420 no significa lo mismo en una que en otra', () => {
    assert.equal(formatUsage(8420, 'maquinaria', plain), '8420 h');
    assert.equal(formatUsage(8420, 'vehiculo', plain), '8420 km');
  });
});

describe('una lista solo usa el término preciso si puede', () => {
  it('lista toda de maquinaria: término preciso', () => {
    const v = vocabularyForMany(['maquinaria', 'maquinaria']);
    assert.equal(v.identifier, 'Código de equipo');
  });

  it('lista toda de vehículos: término preciso', () => {
    const v = vocabularyForMany(['vehiculo', 'vehiculo', 'vehiculo']);
    assert.equal(v.identifier, 'Placa');
    assert.equal(v.usageUnit, 'km');
  });

  // Este es el caso que justifica el módulo: si la cabecera dijera «Placa»,
  // mentiría en las filas que son excavadoras.
  it('lista mixta: término neutro, nunca el de la mayoría', () => {
    const v = vocabularyForMany(['vehiculo', 'maquinaria']);
    assert.equal(v.identifier, 'Identificador');
    assert.equal(v.noun, 'Equipo');
  });

  it('una lista mixta no declara unidad: cada fila trae la suya', () => {
    assert.equal(vocabularyForMany(['maquinaria', 'vehiculo']).usageUnit, '');
  });

  it('una lista vacía no rompe', () => {
    assert.equal(typeof vocabularyForMany([]).identifier, 'string');
  });
});

describe('la guarda de tipo protege lo que venga de fuera', () => {
  it('acepta los dos valores válidos', () => {
    for (const k of ['vehiculo', 'maquinaria'] satisfies EquipmentKind[]) {
      assert.equal(isEquipmentKind(k), true);
    }
  });

  it('rechaza cualquier otra cosa', () => {
    for (const k of ['VEHICULO', 'camion', '', 'vehículo']) {
      assert.equal(isEquipmentKind(k), false);
    }
  });
});
