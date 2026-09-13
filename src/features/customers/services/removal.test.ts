import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  DELETE_CODE,
  checkDeleteCode,
  removalKind,
  removalLabel,
  removalWarning,
} from './removal';

describe('quitar un cliente', () => {
  describe('la clave de confirmación', () => {
    /*
     * ⚠ NO ES UNA CONTRASEÑA y esta prueba no finge que lo sea.
     *
     * Vive en el navegador: cualquiera que abra las herramientas de
     * desarrollo la lee. Lo que evita es el resbalón —un dedo apoyado en la
     * pantalla de recepción que se lleva por delante la ficha de un cliente
     * con diez visitas—, que es el riesgo real de un taller.
     */
    it('deja pasar la clave y para todo lo demás', () => {
      assert.equal(checkDeleteCode(DELETE_CODE).valid, true);
      assert.equal(checkDeleteCode('0000').valid, false);
      assert.equal(checkDeleteCode('').valid, false);
    });

    it('perdona los espacios de los lados', () => {
      // Quien la teclea con prisa en una tableta deja un espacio al final.
      assert.equal(checkDeleteCode(` ${DELETE_CODE} `).valid, true);
    });

    it('dice por qué no pasa, en vez de solo negarse', () => {
      assert.notEqual(checkDeleteCode('').problem, '');
      assert.notEqual(checkDeleteCode('9999').problem, '');
      assert.equal(checkDeleteCode(DELETE_CODE).problem, '');
    });
  });

  describe('qué pasa de verdad al borrar', () => {
    it('distingue lo creado aquí de lo que manda el servidor', () => {
      assert.equal(removalKind('nuevo-1789-abcd'), 'creado');
      assert.equal(removalKind('cli-101'), 'sembrado');
    });

    /*
     * Llamar «eliminado» a las dos cosas sería mentir en una. Un cliente del
     * catálogo lo manda el servidor en cada carga: lo único que cabe es dejar
     * de enseñarlo, y quien pulsa tiene que saberlo ANTES de pulsar.
     */
    it('el botón dice lo que va a hacer', () => {
      assert.equal(removalLabel('creado'), 'Eliminar cliente');
      assert.equal(removalLabel('sembrado'), 'Ocultar cliente');
    });

    it('avisa de que lo sembrado vuelve', () => {
      assert.match(removalWarning('sembrado', 0), /Comenzar de nuevo/);
      assert.match(removalWarning('creado', 0), /no se puede deshacer/);
    });

    it('una orden abierta manda sobre todo lo demás', () => {
      // Es la consecuencia que de verdad duele: la orden sigue en el taller y
      // se queda sin dueño en la lista.
      assert.match(removalWarning('creado', 1), /una orden abierta/);
      assert.match(removalWarning('sembrado', 3), /3 órdenes abiertas/);
    });
  });
});
