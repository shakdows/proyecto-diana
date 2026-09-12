import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { PERMISSIONS, ROLE_PERMISSIONS } from '@/lib/auth/permissions';
import { buildLauncher, pendingTotal, visibleApps, type LauncherCounts } from './launcher';

const CERO: LauncherCounts = {
  atencion: 0, ordenes: 0, recepcionesHoy: 0, enTaller: 0,
  comprasPendientes: 0, listos: 0, encuestasPorLlamar: 0, clientes: 0,
};

describe('el lanzador', () => {
  it('no repite identificadores ni destinos', () => {
    const apps = buildLauncher(CERO);
    assert.equal(new Set(apps.map((a) => a.id)).size, apps.length);
    assert.equal(new Set(apps.map((a) => a.href)).size, apps.length);
  });

  it('cada acceso pide un permiso que EXISTE', () => {
    const conocidos = new Set<string>(PERMISSIONS);
    for (const a of buildLauncher(CERO)) {
      assert.ok(conocidos.has(a.permission), `«${a.label}» pide «${a.permission}», que no existe`);
    }
  });

  it('todos los destinos son rutas internas', () => {
    for (const a of buildLauncher(CERO)) assert.match(a.href, /^\//u);
  });

  it('cada acceso tiene rótulo e icono', () => {
    for (const a of buildLauncher(CERO)) {
      assert.ok(a.label.length > 0, a.id);
      assert.ok(a.icon.length > 0, a.id);
    }
  });
});

describe('el color dice de qué clase es el módulo', () => {
  it('el centro de operaciones se pone rojo cuando hay algo que atender', () => {
    // Una pantalla con un cuadrado rojo se lee antes de saber leer.
    assert.equal(buildLauncher(CERO).find((a) => a.id === 'operacion')?.tone, 'brand');
    assert.equal(
      buildLauncher({ ...CERO, atencion: 3 }).find((a) => a.id === 'operacion')?.tone,
      'crit',
    );
  });

  it('encuestas se pone rojo si hay clientes esperando una llamada', () => {
    assert.equal(buildLauncher(CERO).find((a) => a.id === 'encuestas')?.tone, 'graphite');
    assert.equal(
      buildLauncher({ ...CERO, encuestasPorLlamar: 2 }).find((a) => a.id === 'encuestas')?.tone,
      'crit',
    );
  });

  it('lo administrativo nunca grita', () => {
    const apps = buildLauncher({ ...CERO, atencion: 9, encuestasPorLlamar: 9 });
    for (const id of ['clientes', 'informes', 'configuracion', 'auditoria']) {
      assert.equal(apps.find((a) => a.id === id)?.tone, 'graphite', id);
    }
  });
});

describe('los distintivos', () => {
  it('con todo a cero no hay ninguno', () => {
    assert.equal(pendingTotal(buildLauncher(CERO)), 0);
  });

  it('cada cifra llega a su acceso, no a otro', () => {
    const apps = buildLauncher({ ...CERO, ordenes: 8, comprasPendientes: 1, listos: 2 });
    assert.equal(apps.find((a) => a.id === 'ordenes')?.badge, 8);
    assert.equal(apps.find((a) => a.id === 'compras')?.badge, 1);
    assert.equal(apps.find((a) => a.id === 'entrega')?.badge, 2);
    assert.equal(apps.find((a) => a.id === 'taller')?.badge, 0);
  });
});

describe('quién ve qué', () => {
  it('el administrador los ve casi todos', () => {
    const vistos = visibleApps(buildLauncher(CERO), ROLE_PERMISSIONS.admin);
    assert.ok(vistos.length >= 9);
  });

  it('el técnico NO ve configuración ni auditoría', () => {
    const ids = visibleApps(buildLauncher(CERO), ROLE_PERMISSIONS.tecnico).map((a) => a.id);
    assert.equal(ids.includes('configuracion'), false);
    assert.equal(ids.includes('auditoria'), false);
  });

  it('sin permisos no se ve nada', () => {
    assert.deepEqual(visibleApps(buildLauncher(CERO), []), []);
  });

  it('el orden no cambia al filtrar', () => {
    // La rejilla sigue el camino del día; reordenarla según quién mira haría
    // que cada usuario tuviera que buscar su acceso en un sitio distinto.
    const todos = buildLauncher(CERO).map((a) => a.id);
    const suyos = visibleApps(buildLauncher(CERO), ROLE_PERMISSIONS.asesor).map((a) => a.id);
    assert.deepEqual(suyos, todos.filter((id) => suyos.includes(id)));
  });
});
