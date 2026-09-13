import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  VEHICLE_VACIO,
  canSaveVehicle,
  checkMileage,
  checkPlate,
  checkYear,
  formatPlate,
  newVehicleId,
  normalizePlate,
  vehicleFromInput,
} from './vehicle';

const AHORA = new Date('2026-09-13T12:00:00Z');

const LLENO = {
  ...VEHICLE_VACIO,
  plate: 'abc-123',
  brand: 'Toyota',
  model: 'Hilux SRV',
  modelYear: '2022',
  color: 'Blanco',
  mileage: '41 200',
};

describe('el vehículo que se registra', () => {
  describe('la placa', () => {
    it('se guarda comparable: mayúsculas y sin guiones', () => {
      assert.equal(normalizePlate('abc-123'), 'ABC123');
      assert.equal(normalizePlate(' a1b 234 '), 'A1B234');
      assert.equal(vehicleFromInput(LLENO, 'x', AHORA).plate, 'ABC123');
    });

    it('se enseña con el guión que se lee en la calle', () => {
      assert.equal(formatPlate('ABC123'), 'ABC-123');
      // Un código de maquinaria no son seis: se deja tal cual en vez de
      // partirlo por donde no toca.
      assert.equal(formatPlate('CAT320D1'), 'CAT320D1');
    });

    it('pide algo que se pueda buscar, y nada más', () => {
      assert.equal(checkPlate('').valid, false);
      assert.equal(checkPlate('AB12').valid, false);
      assert.equal(checkPlate('A'.repeat(11)).valid, false);
    });

    /*
     * ESTA es la prueba que justifica no validar el patrón de auto.
     *
     * El taller atiende maquinaria, y ahí lo que hay es un número de serie o
     * un código interno que no sigue ninguna regla. Exigir ABC123 dejaría
     * fuera media nave, y quien lo tiene delante acabaría inventándose una
     * placa con formato correcto para poder guardar.
     */
    it('acepta códigos de maquinaria que no parecen placas', () => {
      for (const p of ['CAT320D', 'EX200-5', 'PC200LC', 'ABC123', 'A1B234']) {
        assert.equal(checkPlate(p).valid, true, p);
      }
    });
  });

  describe('el año', () => {
    it('es opcional: se completa después', () => {
      assert.equal(checkYear('', AHORA).valid, true);
    });

    it('admite el año que viene, que ya está en la calle', () => {
      // En octubre hay coches del año siguiente; rechazarlos obligaría a
      // poner un año falso para poder guardar.
      assert.equal(checkYear('2027', AHORA).valid, true);
      assert.equal(checkYear('2028', AHORA).valid, false);
    });

    it('rechaza lo que no son cuatro cifras', () => {
      for (const v of ['22', 'dos mil', '20222']) {
        assert.equal(checkYear(v, AHORA).valid, false, v);
      }
    });

    it('cuando no se pone, queda el año en curso', () => {
      assert.equal(vehicleFromInput(VEHICLE_VACIO, 'x', AHORA).modelYear, 2026);
    });
  });

  describe('el kilometraje', () => {
    it('es opcional: muchas veces no se mira al recibir', () => {
      assert.equal(checkMileage('').valid, true);
      assert.equal(vehicleFromInput(VEHICLE_VACIO, 'x', AHORA).mileage, 0);
    });

    it('admite los separadores con que la gente escribe las cifras', () => {
      assert.equal(checkMileage('41 200').valid, true);
      assert.equal(checkMileage('41.200').valid, true);
      assert.equal(vehicleFromInput(LLENO, 'x', AHORA).mileage, 41200);
    });

    it('rechaza letras', () => {
      assert.equal(checkMileage('41200 km').valid, false);
    });
  });

  describe('lo que el registro NO hace', () => {
    /*
     * Registrar el vehículo no es recibirlo. La orden nace en la recepción,
     * con su checklist y su kilometraje de entrada. Darla por abierta aquí
     * metería en el taller un coche que nadie ha visto, y aparecería en el
     * centro de operaciones como trabajo pendiente.
     */
    it('no abre una orden', () => {
      assert.equal(vehicleFromInput(LLENO, 'x', AHORA).openOrderId, null);
    });

    it('no da por hecho un servicio', () => {
      // `0` diría «se le hizo algo hoy».
      assert.equal(vehicleFromInput(LLENO, 'x', AHORA).lastServiceDaysAgo, null);
    });
  });

  describe('los huecos', () => {
    it('dicen que faltan en vez de quedarse en blanco', () => {
      const v = vehicleFromInput({ ...VEHICLE_VACIO, plate: 'ABC123' }, 'x', AHORA);
      assert.equal(v.brand, 'Sin marca');
      assert.equal(v.color, 'Sin registrar');
    });
  });

  describe('se puede guardar', () => {
    it('solo con una placa válida', () => {
      assert.equal(canSaveVehicle(VEHICLE_VACIO, AHORA), false);
      assert.equal(canSaveVehicle({ ...VEHICLE_VACIO, plate: 'ABC123' }, AHORA), true);
      assert.equal(canSaveVehicle(LLENO, AHORA), true);
    });

    it('no con un año o un kilometraje imposibles', () => {
      assert.equal(canSaveVehicle({ ...LLENO, modelYear: '1800' }, AHORA), false);
      assert.equal(canSaveVehicle({ ...LLENO, mileage: 'mucho' }, AHORA), false);
    });
  });

  describe('el identificador', () => {
    it('no choca aunque se registren dos en el mismo milisegundo', () => {
      const ids = new Set(Array.from({ length: 200 }, () => newVehicleId(1_700_000_000_000)));
      assert.ok(ids.size > 190, `solo ${String(ids.size)} de 200`);
    });
  });
});
