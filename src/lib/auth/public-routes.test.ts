import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { describe, it } from 'node:test';

import { PUBLIC_ROUTES, isPublicRoute } from './public-routes';

describe('la puerta de la demostración', () => {
  /*
   * ESTA es la prueba que justifica el módulo.
   *
   * Cada carpeta de `public/` se sirve como una ruta más, así que el
   * middleware la intercepta y la manda al login. El navegador recibe una
   * página HTML donde esperaba una imagen y lo único que se ve es un icono de
   * imagen rota: ni un error en consola, ni un fallo de compilación, ni una
   * prueba en rojo. Ha pasado cuatro veces —`/fotos-de-carros`, `/fondos`,
   * `/marca` y `/assets`— y siempre se descubrió mirando la pantalla.
   *
   * Con esto, añadir una carpeta y olvidarse de declararla falla aquí.
   */
  it('deja pasar TODA carpeta de public/', () => {
    const carpetas = readdirSync(new URL('../../../public', import.meta.url), {
      withFileTypes: true,
    })
      .filter((e) => e.isDirectory())
      .map((e) => `/${e.name}`);

    assert.ok(carpetas.length > 0, 'no se encontró ninguna carpeta en public/');

    for (const carpeta of carpetas) {
      assert.ok(
        isPublicRoute(`${carpeta}/cualquier-archivo.webp`),
        `«${carpeta}» se sirve desde public/ y el middleware la manda al login: ` +
          'añádela a PUBLIC_ROUTES',
      );
    }
  });

  it('casa por segmento completo, no por prefijo de texto', () => {
    assert.ok(isPublicRoute('/login'));
    assert.ok(isPublicRoute('/login/olvide'));
    // `/loginfalso` NO es `/login`: un prefijo suelto abriría rutas de más.
    assert.equal(isPublicRoute('/loginfalso'), false);
  });

  it('lo que no está declarado pasa por la puerta', () => {
    for (const ruta of ['/tablero', '/ordenes', '/admin', '/']) {
      assert.equal(isPublicRoute(ruta), false, ruta);
    }
  });

  it('no declara rutas duplicadas', () => {
    assert.equal(new Set(PUBLIC_ROUTES).size, PUBLIC_ROUTES.length);
  });
});
