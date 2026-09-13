import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  NEW_CUSTOMER_DAYS,
  createdAtFromId,
  daysSince,
  isNewCustomer,
  newCustomerLabel,
  newestFirst,
} from './recency';
import type { DemoCustomer } from '../demo';

const HOY = new Date('2026-09-13T15:00:00Z');
const hace = (dias: number): string =>
  new Date(HOY.getTime() - dias * 86_400_000).toISOString();

const cli = (id: string, name: string, createdAt: string | null): DemoCustomer => ({
  id, kind: 'persona', firstName: name, lastName: null, businessName: null,
  documentType: 'DNI', documentLast: '156', phone: null, altPhone: null, email: null,
  address: null, contactPreference: 'whatsapp', corporateClient: null, license: null,
  createdAt, lastVisitDaysAgo: null, vehicles: [], isDemo: true,
});

const nombre = (c: DemoCustomer): string => c.firstName ?? '';

describe('el cliente recién dado de alta', () => {
  /*
   * ESTA es la prueba que justifica el módulo.
   *
   * El asesor que da de alta a alguien y al minuto abre una recepción está
   * buscando A ESE. En una lista alfabética su cliente recién creado queda
   * entre dos que no le interesan, y lo que hace es volver a crearlo.
   */
  it('está marcado hoy y ayer', () => {
    assert.equal(isNewCustomer(cli('c1', 'Ana', hace(0)), HOY), true);
    assert.equal(isNewCustomer(cli('c1', 'Ana', hace(1)), HOY), true);
  });

  /*
   * Y caduca, porque si no dejaría de significar nada: a los tres meses media
   * cartera sería «nueva» y la etiqueta pasaría a ser ruido que la vista
   * ignora.
   */
  it('deja de estarlo a los dos días', () => {
    assert.equal(NEW_CUSTOMER_DAYS, 2);
    assert.equal(isNewCustomer(cli('c1', 'Ana', hace(2)), HOY), false);
    assert.equal(isNewCustomer(cli('c1', 'Ana', hace(30)), HOY), false);
  });

  it('un cliente del catálogo nunca está marcado', () => {
    // Los sembrados se derivan de las órdenes: no tienen un alta que fechar.
    assert.equal(isNewCustomer(cli('cli-101', 'Ana', null), HOY), false);
  });

  it('dice desde cuándo, no solo que lo es', () => {
    assert.equal(newCustomerLabel(cli('c1', 'Ana', hace(0)), HOY), 'Nuevo · hoy');
    assert.equal(newCustomerLabel(cli('c1', 'Ana', hace(1)), HOY), 'Nuevo · ayer');
    assert.equal(newCustomerLabel(cli('c1', 'Ana', hace(5)), HOY), null);
  });

  it('una fecha del futuro no lo marca', () => {
    // Un reloj mal puesto no puede dejar a alguien «nuevo» para siempre.
    assert.equal(isNewCustomer(cli('c1', 'Ana', hace(-3)), HOY), false);
  });

  it('una fecha ilegible no revienta', () => {
    assert.equal(isNewCustomer(cli('c1', 'Ana', 'ayer por la tarde'), HOY), false);
    assert.equal(daysSince('no es fecha', HOY), null);
  });

  describe('los creados antes de que existiera el campo', () => {
    /*
     * Llevan la fecha dentro del identificador —`nuevo-<ms>-<azar>`—. Sin
     * esto, todo lo que alguien dio de alta antes de este cambio se quedaría
     * sin distintivo para siempre.
     */
    it('sacan la fecha del identificador', () => {
      const ms = HOY.getTime();
      const c = cli(`nuevo-${String(ms)}-ab12`, 'Ana', null);
      assert.equal(isNewCustomer(c, HOY), true);
      assert.equal(createdAtFromId(c.id), new Date(ms).toISOString());
    });

    it('un identificador sin fecha devuelve null en vez de inventarse una', () => {
      for (const id of ['cli-101', 'nuevo-abc-12', 'nuevo-', '']) {
        assert.equal(createdAtFromId(id), null, id);
      }
    });
  });

  describe('el orden de la recepción', () => {
    it('pone los nuevos delante y el resto por nombre', () => {
      // No es el orden del directorio: en una recepción se busca a quien
      // acaba de llegar, y casi siempre es el último que se dio de alta.
      const lista = [
        cli('c1', 'Zoraida', null),
        cli('c2', 'Alberto', null),
        cli('c3', 'Manuel', hace(0)),
        cli('c4', 'Beatriz', hace(1)),
      ];
      assert.deepEqual(
        newestFirst(lista, HOY, nombre).map(nombre),
        ['Beatriz', 'Manuel', 'Alberto', 'Zoraida'],
      );
    });

    it('no modifica la lista que recibe', () => {
      const lista = [cli('c1', 'Zoraida', null), cli('c2', 'Alberto', null)];
      newestFirst(lista, HOY, nombre);
      assert.equal(lista[0]?.firstName, 'Zoraida');
    });
  });
});
