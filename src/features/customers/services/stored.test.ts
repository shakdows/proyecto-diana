import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { hydrateCustomer, hydrateCustomers, hydrateLicense } from './stored';

/** Un cliente tal como se guardaba ANTES de que existiera `license`. */
const VIEJO = {
  id: 'nuevo-1-viejo',
  kind: 'persona',
  firstName: 'alexis',
  lastName: 'ramirez',
  businessName: null,
  documentType: 'DNI',
  documentLast: '156',
  phone: '123456789',
  altPhone: null,
  email: 'asd@gmail.com',
  address: null,
  contactPreference: 'whatsapp',
  corporateClient: 'prueba',
  lastVisitDaysAgo: null,
  vehicles: [],
  isDemo: true,
};

describe('lo que sale del navegador', () => {
  /*
   * ESTA es la prueba que justifica el módulo.
   *
   * Se añadió `license` al modelo y la ficha de un cliente creado ANTES
   * reventaba con «Cannot read properties of undefined» —pantalla de error,
   * sin datos y sin pista de por qué—. TypeScript decía que el campo estaba;
   * el navegador de quien lo probaba decía que no. TypeScript no sabe nada de
   * lo que alguien guardó la semana pasada.
   */
  it('rellena los campos que no existían cuando se guardó', () => {
    const c = hydrateCustomer(VIEJO);
    assert.ok(c);
    assert.equal(c.license, null, 'sin esto, la ficha revienta al leer license.expiresOn');
    assert.equal(c.firstName, 'alexis');
    assert.equal(c.corporateClient, 'prueba');
  });

  it('no se lleva por delante lo que sí estaba', () => {
    // Subir STORE_VERSION también arregla el fallo, pero borra los clientes
    // que alguien dio de alta, que es lo único que no se puede regenerar.
    const c = hydrateCustomer({ ...VIEJO, license: { number: 'Q43802725', category: 'A-IIb' } });
    assert.equal(c?.license?.number, 'Q43802725');
    assert.equal(c?.license?.category, 'A-IIb');
    assert.equal(c?.license?.expiresOn, null);
  });

  describe('lo que no se reconoce', () => {
    it('se descarta en vez de pasar a medias', () => {
      // Un objeto incompleto reventaría más adelante y más lejos del origen.
      for (const basura of [null, 'texto', 42, [], {}, { kind: 'persona' }]) {
        assert.equal(hydrateCustomer(basura), null, JSON.stringify(basura));
      }
    });

    it('no tumba la lista entera', () => {
      const lista = hydrateCustomers([VIEJO, null, { roto: true }, { ...VIEJO, id: 'otro' }]);
      assert.equal(lista.length, 2);
    });

    it('una lista que no es lista queda vacía', () => {
      for (const basura of [null, undefined, 'x', {}]) {
        assert.deepEqual(hydrateCustomers(basura), []);
      }
    });
  });

  describe('los valores imposibles', () => {
    it('vuelven a su valor por defecto', () => {
      const c = hydrateCustomer({
        ...VIEJO,
        kind: 'marciano',
        documentType: 'CARNET',
        contactPreference: 'paloma',
        lastVisitDaysAgo: 'ayer',
      });
      assert.equal(c?.kind, 'persona');
      assert.equal(c?.documentType, 'DNI');
      assert.equal(c?.contactPreference, 'whatsapp');
      assert.equal(c?.lastVisitDaysAgo, null);
    });

    it('una empresa sin tipo de documento queda en RUC, no en DNI', () => {
      const c = hydrateCustomer({ ...VIEJO, kind: 'empresa', documentType: undefined });
      assert.equal(c?.documentType, 'RUC');
    });

    it('las cadenas vacías son null, no datos presentes', () => {
      const c = hydrateCustomer({ ...VIEJO, phone: '   ', email: '' });
      assert.equal(c?.phone, null);
      assert.equal(c?.email, null);
    });
  });

  describe('los vehículos guardados', () => {
    it('se quedan con lo que tienen y rellenan lo demás', () => {
      const c = hydrateCustomer({
        ...VIEJO,
        vehicles: [{ id: 'v1', plate: 'ABC123' }, { sinPlaca: true }],
      });
      assert.equal(c?.vehicles.length, 1, 'el que no tiene placa no es un vehículo');
      assert.equal(c?.vehicles[0]?.brand, 'Sin marca');
      assert.equal(c?.vehicles[0]?.openOrderId, null);
    });
  });

  describe('la licencia', () => {
    it('sin número no es una licencia', () => {
      assert.equal(hydrateLicense({ category: 'A-I', expiresOn: '2027-01-01' }), null);
    });

    it('todo lo que no sea un objeto tampoco', () => {
      for (const basura of [null, undefined, 'Q123', 0]) {
        assert.equal(hydrateLicense(basura), null);
      }
    });
  });

  it('todo lo guardado queda marcado como demostración', () => {
    // Lo escribió esta pantalla, no una base con RLS detrás. Aunque el objeto
    // guardado dijera lo contrario.
    assert.equal(hydrateCustomer({ ...VIEJO, isDemo: false })?.isDemo, true);
  });
});
