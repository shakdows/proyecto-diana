import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';

const css = readFileSync(new URL('./globals.css', import.meta.url), 'utf8');

describe('la paleta de la casa', () => {
  /*
   * ESTA es la prueba que justifica el fichero.
   *
   * La identidad de Romero Motors es clara —crema, grafito y rojo—, pero la
   * hoja arrastraba un `@media (prefers-color-scheme: dark)` que redefinía la
   * paleta entera en `:root`. Quien tuviera el sistema en oscuro veía Clientes
   * en negro sobre negro: nada falla, nada avisa, y solo se descubre mirando
   * la pantalla desde un equipo con esa preferencia. Las pantallas que sí se
   * visten de noche lo hacen a propósito y acotado, con `.theme-night`.
   *
   * Con esto, volver a colgar la paleta de la preferencia del sistema falla
   * aquí y no en el taller.
   */
  it('no cuelga la paleta de la preferencia del sistema', () => {
    const reglas = css.match(/@media[^{]*prefers-color-scheme[^{]*\{/g) ?? [];

    assert.deepEqual(
      reglas,
      [],
      'la paleta no sigue el modo oscuro del sistema: si hace falta un modo ' +
        'oscuro, se declara con una clase que el usuario pueda elegir',
    );
  });

  it('declara la luz como esquema de partida', () => {
    assert.match(css, /:root\s*\{[^}]*color-scheme:\s*light/s);
  });

  /*
   * Tailwind v4 resuelve el alias `--color-fg: var(--fg)` en `:root`, así que
   * redefinir `--fg` dentro de una isla NO cambia `--color-fg` para sus hijos:
   * el texto sigue saliendo del color de fuera. Cada isla tiene que redeclarar
   * los dos nombres.
   */
  for (const isla of ['theme-night', 'theme-cream']) {
    it(`«${isla}» redeclara los alias --color-*, no solo las variables`, () => {
      const declaraciones = css.match(new RegExp(`\\.${isla}\\s*\\{([^}]*)\\}`, 's'))?.[1];
      assert.ok(declaraciones, `no se encontró el bloque .${isla}`);

      for (const nombre of ['surface', 'surface-raised', 'surface-sunken', 'fg', 'fg-muted', 'border']) {
        assert.match(
          declaraciones,
          new RegExp(`--${nombre}\\s*:`),
          `.${isla} no define --${nombre}`,
        );
        assert.match(
          declaraciones,
          new RegExp(`--color-${nombre}\\s*:`),
          `.${isla} define --${nombre} pero no --color-${nombre}: los hijos ` +
            'seguirán usando el color de fuera de la isla',
        );
      }
    });
  }
});
