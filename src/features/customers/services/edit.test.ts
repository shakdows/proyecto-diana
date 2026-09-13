import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  SIN_CAMBIOS,
  applyEdit,
  applyEdits,
  editableFrom,
  plateOwner,
  withFields,
  withVehicle,
} from './edit';
import type { DemoCustomer, DemoVehicle } from '../demo';

const VEHICULO = (plate: string, openOrderId: string | null = null): DemoVehicle => ({
  id: `veh-${plate}`,
  plate,
  brand: 'Toyota',
  model: 'Hilux',
  modelYear: 2022,
  color: 'Blanco',
  mileage: 41200,
  lastServiceDaysAgo: null,
  equipmentKind: 'vehiculo',
  openOrderId,
});

const JUAN: DemoCustomer = {
  id: 'cli-1',
  kind: 'persona',
  firstName: 'Juan',
  lastName: 'Pérez',
  businessName: null,
  documentType: 'DNI',
  documentLast: '275',
  phone: '+51 987 654 321',
  altPhone: null,
  email: null,
  address: null,
  contactPreference: 'whatsapp',
  corporateClient: null,
  lastVisitDaysAgo: 0,
  vehicles: [VEHICULO('ABC123', 'ord-9')],
  isDemo: true,
};

describe('los cambios hechos desde la ficha', () => {
  it('sin cambios, el cliente sale tal cual vino', () => {
    assert.equal(applyEdit(JUAN, undefined), JUAN);
    assert.deepEqual(applyEdits([JUAN], SIN_CAMBIOS), [JUAN]);
  });

  describe('editar datos', () => {
    it('cambia solo lo tocado', () => {
      const edits = withFields(SIN_CAMBIOS, 'cli-1', { email: 'juan@ejemplo.com' });
      const r = applyEdit(JUAN, edits['cli-1']);
      assert.equal(r.email, 'juan@ejemplo.com');
      assert.equal(r.phone, JUAN.phone);
      assert.equal(r.documentLast, '275');
    });

    /*
     * ESTA es la prueba que justifica guardar un parche y no un cliente
     * entero.
     *
     * Los clientes sembrados los deriva el servidor de las órdenes abiertas.
     * Si al editar el teléfono guardáramos una copia completa, esa copia se
     * congelaría: la orden avanza, el vehículo cambia de etapa, y la ficha
     * seguiría enseñando la foto del día en que alguien tocó el teléfono.
     */
    it('deja pasar lo que cambió en el servidor', () => {
      const edits = withFields(SIN_CAMBIOS, 'cli-1', { phone: '999 999 999' });
      // El servidor ahora dice que el coche salió del taller.
      const alDia: DemoCustomer = { ...JUAN, vehicles: [VEHICULO('ABC123', null)] };
      const r = applyEdit(alDia, edits['cli-1']);
      assert.equal(r.phone, '999 999 999');
      assert.equal(r.vehicles[0]?.openOrderId, null, 'se quedó con la foto vieja del vehículo');
    });

    it('acumula ediciones sucesivas', () => {
      let edits = withFields(SIN_CAMBIOS, 'cli-1', { email: 'a@b.c' });
      edits = withFields(edits, 'cli-1', { address: 'Av. Primavera 1120' });
      const r = applyEdit(JUAN, edits['cli-1']);
      assert.equal(r.email, 'a@b.c');
      assert.equal(r.address, 'Av. Primavera 1120');
    });

    it('no toca a los demás clientes', () => {
      const otro: DemoCustomer = { ...JUAN, id: 'cli-2', vehicles: [] };
      const edits = withFields(SIN_CAMBIOS, 'cli-1', { email: 'a@b.c' });
      assert.equal(applyEdits([JUAN, otro], edits)[1]?.email, null);
    });
  });

  describe('añadir vehículos', () => {
    it('los pone delante de los del servidor', () => {
      // Quien acaba de registrarlo lo busca arriba.
      const edits = withVehicle(SIN_CAMBIOS, 'cli-1', VEHICULO('XYZ789'));
      const r = applyEdit(JUAN, edits['cli-1']);
      assert.deepEqual(
        r.vehicles.map((v) => v.plate),
        ['XYZ789', 'ABC123'],
      );
    });

    it('acumula varios', () => {
      let edits = withVehicle(SIN_CAMBIOS, 'cli-1', VEHICULO('XYZ789'));
      edits = withVehicle(edits, 'cli-1', VEHICULO('QWE456'));
      assert.equal(applyEdit(JUAN, edits['cli-1']).vehicles.length, 3);
    });

    /*
     * Alguien registra la placa a mano y días después llega su orden: el
     * servidor empieza a mandar el mismo vehículo. Sin esto, la ficha
     * enseñaría la placa dos veces, y la copia de aquí —sin orden abierta—
     * diría que el coche no está en el taller cuando sí lo está.
     */
    it('deja mandar al del servidor cuando la placa llega por las dos vías', () => {
      const edits = withVehicle(SIN_CAMBIOS, 'cli-1', VEHICULO('ABC123'));
      const r = applyEdit(JUAN, edits['cli-1']);
      assert.equal(r.vehicles.length, 1);
      assert.equal(r.vehicles[0]?.openOrderId, 'ord-9');
    });

    it('convive con una edición de datos', () => {
      let edits = withFields(SIN_CAMBIOS, 'cli-1', { email: 'a@b.c' });
      edits = withVehicle(edits, 'cli-1', VEHICULO('XYZ789'));
      const r = applyEdit(JUAN, edits['cli-1']);
      assert.equal(r.email, 'a@b.c');
      assert.equal(r.vehicles.length, 2);
    });
  });

  describe('lo que se puede editar', () => {
    it('NO incluye el documento', () => {
      // Cambiar el documento de un cliente es fusionar dos identidades, y eso
      // no se hace desde una ficha. Además la pantalla solo conoce los tres
      // últimos: no hay nada que editar.
      const campos = Object.keys(editableFrom(JUAN));
      assert.equal(campos.includes('documentLast'), false);
      assert.equal(campos.includes('documentType'), false);
    });

    it('trae los valores actuales para rellenar el formulario', () => {
      assert.equal(editableFrom(JUAN).phone, '+51 987 654 321');
      assert.equal(editableFrom(JUAN).contactPreference, 'whatsapp');
    });
  });

  describe('quién tiene una placa', () => {
    it('la encuentra antes de crear el duplicado', () => {
      assert.equal(plateOwner([JUAN], 'ABC123')?.id, 'cli-1');
      assert.equal(plateOwner([JUAN], 'XYZ789'), undefined);
    });
  });
});
