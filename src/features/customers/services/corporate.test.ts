import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  NUEVA_EMPRESA,
  checkCorporateName,
  findCorporate,
  resolveCorporate,
} from './corporate';

const CATALOGO = ['MG', 'Mitsui', 'Relsa', 'Invetsa', 'BBVA'];

describe('la empresa corporativa del cliente', () => {
  describe('elegir de la lista', () => {
    it('sin empresa es sin empresa, no una cadena vacía', () => {
      assert.deepEqual(resolveCorporate(CATALOGO, '', ''), { name: null, isNew: false });
    });

    it('una del catálogo no es nueva', () => {
      assert.deepEqual(resolveCorporate(CATALOGO, 'Mitsui', ''), {
        name: 'Mitsui',
        isNew: false,
      });
    });

    it('lo escrito no cuenta si no se eligió «otra»', () => {
      // El campo de texto queda escrito y luego se vuelve a la lista: lo que
      // manda es la lista, o se guardaría una empresa que ya no está a la vista.
      assert.deepEqual(resolveCorporate(CATALOGO, 'BBVA', 'Scotiabank'), {
        name: 'BBVA',
        isNew: false,
      });
    });
  });

  describe('escribir una que no está', () => {
    it('la da de alta', () => {
      assert.deepEqual(resolveCorporate(CATALOGO, NUEVA_EMPRESA, 'Scotiabank'), {
        name: 'Scotiabank',
        isNew: true,
      });
    });

    it('limpia los espacios de sobra en vez de guardarlos', () => {
      const r = resolveCorporate(CATALOGO, NUEVA_EMPRESA, '  Rimac   Seguros  ');
      assert.equal(r.name, 'Rimac Seguros');
      assert.equal(r.isNew, true);
    });

    /*
     * ESTA es la prueba que justifica el módulo.
     *
     * Una lista abierta sin esto acaba con «mitsui», «Mitsui», «MITSUI» y
     * «Mitsui.» como cuatro empresas distintas, y entonces ningún informe por
     * empresa cuadra. Quien lo escribe no se equivoca —está escribiendo el
     * nombre correcto—, así que no recibe un error: se le reconoce el que ya
     * está en el catálogo.
     */
    it('reconoce la que ya existe en vez de duplicarla', () => {
      for (const escrito of ['mitsui', 'MITSUI', 'Mitsui.', '  mitsui  ']) {
        assert.deepEqual(
          resolveCorporate(CATALOGO, NUEVA_EMPRESA, escrito),
          { name: 'Mitsui', isNew: false, matched: 'Mitsui' },
          escrito,
        );
      }
    });

    it('no confunde un nombre más largo con el del catálogo', () => {
      // «Mitsui Automotriz» podría ser otro acuerdo del mismo grupo. Decidirlo
      // no le toca a la pantalla: se da de alta y administración lo fusiona.
      const r = resolveCorporate(CATALOGO, NUEVA_EMPRESA, 'Mitsui Automotriz');
      assert.equal(r.name, 'Mitsui Automotriz');
      assert.equal(r.isNew, true);
    });

    it('en blanco es no tener empresa, no una empresa sin nombre', () => {
      for (const escrito of ['', '   ']) {
        assert.deepEqual(resolveCorporate(CATALOGO, NUEVA_EMPRESA, escrito), {
          name: null,
          isNew: false,
        });
      }
    });
  });

  describe('el nombre escrito', () => {
    it('pide algo cuando está vacío', () => {
      assert.equal(checkCorporateName('').valid, false);
      assert.equal(checkCorporateName('   ').valid, false);
    });

    it('rechaza una sola letra', () => {
      assert.equal(checkCorporateName('M').valid, false);
    });

    it('acepta nombres cortos y raros que son reales', () => {
      for (const nombre of ['3M', 'AJE', 'BBVA', 'Renting Latinoamérica S.A.']) {
        assert.equal(checkCorporateName(nombre).valid, true, nombre);
      }
    });

    it('corta por la longitud de la columna', () => {
      assert.equal(checkCorporateName('x'.repeat(120)).valid, true);
      assert.equal(checkCorporateName('x'.repeat(121)).valid, false);
    });

    it('explica el problema en lugar de solo negarse', () => {
      assert.notEqual(checkCorporateName('').problem, '');
      assert.notEqual(checkCorporateName('M').problem, '');
      assert.equal(checkCorporateName('BBVA').problem, '');
    });
  });

  describe('el centinela de «otra empresa»', () => {
    it('no choca con ningún nombre del catálogo', () => {
      assert.equal(CATALOGO.includes(NUEVA_EMPRESA), false);
      assert.equal(findCorporate(CATALOGO, NUEVA_EMPRESA), undefined);
    });
  });

  describe('buscar en el catálogo', () => {
    it('no encuentra nada con la cadena vacía', () => {
      assert.equal(findCorporate(CATALOGO, ''), undefined);
      assert.equal(findCorporate(CATALOGO, '   '), undefined);
    });

    it('devuelve el nombre tal como está escrito en el catálogo', () => {
      assert.equal(findCorporate(CATALOGO, 'relsa'), 'Relsa');
    });
  });
});
