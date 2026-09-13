import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { customerFromInput, documentLastOf, newCustomerId, type CustomerInput } from './create';

const PERSONA: CustomerInput = {
  kind: 'persona',
  documentType: 'DNI',
  document: '43802725',
  firstName: 'Juan',
  lastName: 'Pérez García',
  businessName: '',
  tradeName: '',
  contactName: '',
  phone: '987 654 321',
  email: 'juan@ejemplo.com',
  corporateClient: null,
};

const EMPRESA: CustomerInput = {
  ...PERSONA,
  kind: 'empresa',
  documentType: 'RUC',
  document: '20100113610',
  firstName: '',
  lastName: '',
  businessName: 'Transportes del Sur S.A.C.',
  tradeName: 'Transur',
  contactName: 'Rosa Delgado',
  corporateClient: 'Mitsui',
};

describe('el cliente que sale del formulario', () => {
  /*
   * ESTA es la prueba que justifica el módulo.
   *
   * La base guarda el documento completo con `REVOKE SELECT` a
   * `authenticated` y expone solo los tres últimos (docs/04 §4.9). Si esta
   * conversión dejara el número entero en el objeto, la demostración lo
   * escribiría en `localStorage` y cualquiera con la consola abierta leería
   * justo el dato que la base protege con permisos. Nada fallaría; solo
   * estaría filtrado.
   */
  it('NUNCA se queda con el documento completo', () => {
    const cliente = customerFromInput(PERSONA, 'x');
    assert.equal(cliente.documentLast, '725');

    const serializado = JSON.stringify(cliente);
    assert.equal(
      serializado.includes('43802725'),
      false,
      'el documento completo viajó dentro del cliente',
    );
  });

  it('trunca ignorando guiones y espacios', () => {
    assert.equal(documentLastOf('438-027-25'), '725');
    assert.equal(documentLastOf('20100113610'), '610');
    assert.equal(documentLastOf('ab'), 'AB');
  });

  describe('una persona', () => {
    it('lleva nombre y apellidos, y ninguna razón social', () => {
      const c = customerFromInput(PERSONA, 'x');
      assert.equal(c.firstName, 'Juan');
      assert.equal(c.lastName, 'Pérez García');
      assert.equal(c.businessName, null);
    });
  });

  describe('una empresa', () => {
    it('lleva razón social, y ningún nombre de persona', () => {
      const c = customerFromInput(EMPRESA, 'x');
      assert.equal(c.businessName, 'Transportes del Sur S.A.C.');
      assert.equal(c.firstName, null);
      // Si el contacto se colara aquí, cualquier pantalla que concatene
      // pintaría «Transportes del Sur S.A.C. Rosa Delgado».
      assert.equal(c.lastName, null);
    });

    it('conserva la empresa corporativa', () => {
      assert.equal(customerFromInput(EMPRESA, 'x').corporateClient, 'Mitsui');
    });
  });

  describe('lo que se deja en blanco', () => {
    it('queda en null y no en cadena vacía', () => {
      // Una cadena vacía se cuela en las pantallas como dato presente y pinta
      // etiquetas sin contenido; `null` es lo que significa «no hay».
      const c = customerFromInput({ ...PERSONA, phone: '  ', email: '' }, 'x');
      assert.equal(c.phone, null);
      assert.equal(c.email, null);
    });
  });

  describe('lo que todavía no ha pasado', () => {
    it('no ha visitado el taller nunca', () => {
      // `0` diría «vino hoy» y lo pintaría como si ya hubiera pasado.
      assert.equal(customerFromInput(PERSONA, 'x').lastVisitDaysAgo, null);
    });

    it('no tiene vehículos: se le añaden en la recepción', () => {
      assert.deepEqual(customerFromInput(PERSONA, 'x').vehicles, []);
    });
  });

  it('queda marcado como demostración', () => {
    // Mientras no haya base, TODO lo que hay en pantalla es demostración, y
    // mezclarlo con datos reales es exactamente lo que no puede pasar.
    assert.equal(customerFromInput(PERSONA, 'x').isDemo, true);
  });

  describe('el identificador', () => {
    it('se distingue a simple vista del catálogo', () => {
      assert.match(newCustomerId(1_700_000_000_000, 'ab12'), /^nuevo-/);
    });

    it('no choca aunque se creen dos en el mismo milisegundo', () => {
      const ids = new Set(
        Array.from({ length: 200 }, () => newCustomerId(1_700_000_000_000)),
      );
      assert.ok(ids.size > 190, `solo ${String(ids.size)} identificadores distintos de 200`);
    });
  });
});
