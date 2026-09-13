import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { coverageOf, coveragePhrase, isDocumented, type ZoneCoverage } from './coverage';

const z = (id: string, photos: number): ZoneCoverage => ({ id, label: id, photos });

describe('la cobertura de la evidencia', () => {
  /*
   * ESTA es la prueba que justifica que existan las DOS clases de foto.
   *
   * La de una zona prueba UN daño; la vuelta completa prueba el estado
   * general, que es lo que cubre lo que nadie marcó —y ahí es donde aparecen
   * las reclamaciones—. Quitar cualquiera deja un hueco, así que en vez de
   * competir se cuentan juntas.
   */
  it('cuenta las dos cosas por separado', () => {
    const c = coverageOf([z('capo', 2), z('techo', 0)], [1, 1, 0, 0, 0, 0]);
    assert.equal(c.damaged, 2);
    assert.equal(c.documented, 1);
    assert.deepEqual(c.missing.map((m) => m.id), ['techo']);
    assert.equal(c.shots, 2);
    assert.equal(c.shotsTotal, 6);
  });

  it('está documentada solo cuando no falta ninguna de las dos', () => {
    assert.equal(isDocumented(coverageOf([z('capo', 1)], [1, 1])), true);
    assert.equal(isDocumented(coverageOf([z('capo', 0)], [1, 1])), false, 'falta la del daño');
    assert.equal(isDocumented(coverageOf([z('capo', 1)], [1, 0])), false, 'falta una toma');
  });

  it('sin daños marcados, basta con la vuelta completa', () => {
    // Un vehículo que llega sin un rasguño también necesita su evidencia.
    assert.equal(isDocumented(coverageOf([], [1, 1, 1])), true);
  });

  describe('lo que dice en pantalla', () => {
    it('sin nada, lo dice y no finge un cero de tres', () => {
      assert.equal(coveragePhrase(coverageOf([], [0, 0])), 'Todavía no hay ninguna foto.');
    });

    it('con daños a medias, dice cuántos faltan', () => {
      assert.match(coveragePhrase(coverageOf([z('a', 1), z('b', 0)], [0, 0])), /1 de 2 daños/);
    });

    it('con todos hechos, deja de contar de cuántos', () => {
      // «2 de 2» se lee como si faltara algo; «2 daños documentados», no.
      assert.match(coveragePhrase(coverageOf([z('a', 1), z('b', 1)], [1])), /2 daños documentados/);
    });

    it('siempre nombra las tomas generales, aunque no haya daños', () => {
      assert.match(coveragePhrase(coverageOf([], [1, 0, 0])), /1 de 3 tomas generales/);
    });
  });
});
