import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { describe, it } from 'node:test';

import { PERMISSIONS, ROLE_PERMISSIONS } from '@/lib/auth/permissions';
import { NAVIGATION } from '@/lib/auth/navigation';
import { ADMIN_MODULES, moduleImage, visibleModules } from './modules';

describe('los módulos del tablero', () => {
  it('son siete: cuatro arriba y tres abajo', () => {
    assert.equal(ADMIN_MODULES.length, 7);
    assert.equal(ADMIN_MODULES.filter((m) => m.span === 3).length, 4);
    assert.equal(ADMIN_MODULES.filter((m) => m.span === 4).length, 3);
  });

  it('cada fila suma doce columnas exactas', () => {
    const arriba = ADMIN_MODULES.filter((m) => m.span === 3);
    const abajo = ADMIN_MODULES.filter((m) => m.span === 4);
    assert.equal(
      arriba.reduce((n, m) => n + m.span, 0),
      12,
    );
    assert.equal(
      abajo.reduce((n, m) => n + m.span, 0),
      12,
    );
  });

  it('no repite identificadores ni destinos', () => {
    assert.equal(new Set(ADMIN_MODULES.map((m) => m.id)).size, 7);
    assert.equal(new Set(ADMIN_MODULES.map((m) => m.href)).size, 7);
  });

  it('cada módulo pide un permiso que EXISTE', () => {
    const conocidos = new Set<string>(PERMISSIONS);
    for (const m of ADMIN_MODULES) {
      assert.ok(conocidos.has(m.permission), `«${m.label}» pide «${m.permission}»`);
    }
  });

  /*
   * El error que esta prueba impide es invisible al ojo: una tarjeta que lleva
   * a una ruta que no existe se ve perfecta hasta que alguien la pulsa.
   */
  it('cada destino es una ruta REAL del menú, no una inventada', () => {
    const rutas = new Set(NAVIGATION.flatMap((g) => g.items).map((i) => i.href));
    for (const m of ADMIN_MODULES) {
      assert.ok(rutas.has(m.href), `«${m.label}» apunta a «${m.href}», que no está en el menú`);
    }
  });

  /*
   * Y este es el otro error invisible: el identificador ES el nombre del
   * archivo, así que un cambio de nombre deja un hueco gris sin que nada falle.
   */
  it('cada módulo tiene su fotografía en disco', () => {
    for (const m of ADMIN_MODULES) {
      const ruta = new URL(`../../../../public${moduleImage(m.id)}`, import.meta.url);
      assert.ok(existsSync(ruta), `falta ${moduleImage(m.id)}`);
    }
  });
});

describe('quién ve qué', () => {
  it('el administrador los ve todos', () => {
    assert.equal(visibleModules(ADMIN_MODULES, ROLE_PERMISSIONS.admin).length, 7);
  });

  it('el técnico solo ve lo suyo, y nunca la configuración', () => {
    const suyos = visibleModules(ADMIN_MODULES, ROLE_PERMISSIONS.tecnico).map((m) => m.id);
    assert.ok(suyos.includes('taller'));
    assert.ok(!suyos.includes('configuracion'));
    assert.ok(!suyos.includes('reportes'));
  });

  it('sin ningún permiso no se ofrece ninguna puerta', () => {
    assert.deepEqual(visibleModules(ADMIN_MODULES, []), []);
  });
});
