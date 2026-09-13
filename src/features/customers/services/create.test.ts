import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  customerFromInput,
  documentLastOf,
  newCustomerId,
  summarizeCreation,
  type CustomerInput,
} from './create';

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
  license: null,
  vehicle: null,
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

describe('lo que se guardó, en una frase', () => {
  const VEH = {
    id: 'v1', plate: 'ABC123', brand: 'Toyota', model: 'Hilux', modelYear: 2022,
    color: 'Blanco', mileage: 0, lastServiceDaysAgo: null,
    equipmentKind: 'vehiculo' as const, openOrderId: null,
  };
  const LIC = { number: 'Q43802725', category: 'A-I', expiresOn: null, restrictions: null };

  /*
   * El alta ya son hasta cuatro cosas y quien se saltó un paso tiene que
   * verlo en el aviso, no descubrirlo mañana al abrir la ficha a medias.
   * Decir solo «cliente creado» es exacto y a la vez inútil.
   */
  it('enumera lo que de verdad se guardó', () => {
    assert.equal(summarizeCreation(PERSONA, 'Juan Pérez', false), 'Juan Pérez queda registrado.');
    assert.equal(
      summarizeCreation({ ...PERSONA, vehicle: VEH }, 'Juan Pérez', false),
      'Juan Pérez queda registrado con el vehículo ABC-123.',
    );
    assert.equal(
      summarizeCreation({ ...PERSONA, vehicle: VEH, license: LIC }, 'Juan Pérez', false),
      'Juan Pérez queda registrado con el vehículo ABC-123 y su licencia.',
    );
  });

  it('nombra la empresa solo cuando se crea, no cuando ya existía', () => {
    const conEmpresa = { ...PERSONA, corporateClient: 'Mitsui' };
    assert.equal(
      summarizeCreation(conEmpresa, 'Juan Pérez', false).includes('Mitsui'),
      false,
      'Mitsui ya existía: nombrarla haría creer que se creó',
    );
    assert.match(summarizeCreation(conEmpresa, 'Juan Pérez', true), /«Mitsui»/);
  });

  it('con tres cosas usa la coma y la «y», no tres «con»', () => {
    assert.equal(
      summarizeCreation(
        { ...PERSONA, corporateClient: 'Scotiabank', vehicle: VEH, license: LIC },
        'Juan Pérez',
        true,
      ),
      'Juan Pérez queda registrado con la empresa «Scotiabank», el vehículo ABC-123 y su licencia.',
    );
  });
});
