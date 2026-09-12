import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ROLE_PERMISSIONS } from './permissions';
import { NAVIGATION, visibleNavigation } from './navigation';

function labels(role: Parameters<typeof visibleNavigation>[1]): readonly string[] {
  return visibleNavigation(ROLE_PERMISSIONS[role!], role).flatMap((g) =>
    g.items.map((i) => i.label),
  );
}

describe('el nombre de una pantalla puede depender del puesto', () => {
  it('el técnico ve «Mi jornada» donde el administrador ve «Taller»', () => {
    assert.ok(labels('tecnico').includes('Mi jornada'));
    assert.ok(!labels('tecnico').includes('Taller'));
    assert.ok(labels('admin').includes('Taller'));
    assert.ok(!labels('admin').includes('Mi jornada'));
  });

  it('cambiar el nombre no cambia la ruta ni el permiso', () => {
    const original = NAVIGATION.flatMap((g) => g.items).find((i) => i.href === '/taller');
    const visto = visibleNavigation(ROLE_PERMISSIONS.tecnico, 'tecnico')
      .flatMap((g) => g.items)
      .find((i) => i.href === '/taller');

    assert.equal(visto?.permission, original?.permission);
    assert.equal(visto?.icon, original?.icon);
  });

  it('sin rol, el menú conserva los nombres base', () => {
    const sinRol = visibleNavigation(ROLE_PERMISSIONS.tecnico)
      .flatMap((g) => g.items)
      .map((i) => i.label);

    assert.ok(sinRol.includes('Taller'));
  });

  it('el alias no añade ni quita entradas', () => {
    const con = visibleNavigation(ROLE_PERMISSIONS.tecnico, 'tecnico').flatMap((g) => g.items);
    const sin = visibleNavigation(ROLE_PERMISSIONS.tecnico).flatMap((g) => g.items);

    assert.deepEqual(
      con.map((i) => i.href),
      sin.map((i) => i.href),
    );
  });
});
