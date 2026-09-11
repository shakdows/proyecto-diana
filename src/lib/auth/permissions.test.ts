import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  PERMISSIONS,
  ROLES,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
  hasPermission,
  isPermission,
  permissionsForRole,
} from './permissions';

describe('catálogo', () => {
  it('no tiene códigos repetidos', () => {
    assert.equal(new Set(PERMISSIONS).size, PERMISSIONS.length);
  });

  it('todos siguen el formato recurso:acción', () => {
    for (const code of PERMISSIONS) {
      assert.match(code, /^[a-z_]+:[a-z_]+$/, code);
    }
  });

  it('todo rol tiene etiqueta y permisos declarados', () => {
    for (const role of ROLES) {
      assert.ok(ROLE_LABELS[role], role);
      assert.ok(Array.isArray(ROLE_PERMISSIONS[role]), role);
    }
  });

  it('ningún rol concede un permiso que no existe', () => {
    for (const role of ROLES) {
      for (const permission of permissionsForRole(role)) {
        assert.ok(isPermission(permission), `${role} concede ${permission}, que no existe`);
      }
    }
  });

  it('ningún rol repite un permiso', () => {
    for (const role of ROLES) {
      const granted = permissionsForRole(role);
      assert.equal(new Set(granted).size, granted.length, role);
    }
  });
});

describe('las decisiones no obvias de la matriz', () => {
  it('el super administrador lo tiene todo', () => {
    assert.equal(permissionsForRole('super_admin').length, PERMISSIONS.length);
  });

  it('el administrador lo tiene todo menos gestionar roles', () => {
    const admin = permissionsForRole('admin');
    assert.equal(hasPermission(admin, 'roles:manage'), false);
    assert.equal(admin.length, PERMISSIONS.length - 1);
  });

  it('compras NO puede autorizar su propia compra', () => {
    const compras = permissionsForRole('compras');
    // Separación de funciones: cotiza, compra y recibe, pero no aprueba el gasto.
    assert.equal(hasPermission(compras, 'purchases:quote'), true);
    assert.equal(hasPermission(compras, 'purchases:write'), true);
    assert.equal(hasPermission(compras, 'purchases:receive'), true);
    assert.equal(hasPermission(compras, 'purchases:authorize'), false);
  });

  it('el asesor sí autoriza la compra', () => {
    assert.equal(hasPermission(permissionsForRole('asesor'), 'purchases:authorize'), true);
  });

  it('el cliente corporativo NO tiene alcance sobre todas las empresas', () => {
    const cliente = permissionsForRole('cliente_corporativo');
    assert.equal(hasPermission(cliente, 'scope:all_corporate_clients'), false);
    assert.equal(hasPermission(cliente, 'dashboard:read_all_clients'), false);
  });

  it('el cliente corporativo no ve costos internos ni márgenes (§65)', () => {
    const cliente = permissionsForRole('cliente_corporativo');
    assert.equal(hasPermission(cliente, 'quotations:read'), true);
    assert.equal(hasPermission(cliente, 'quotations:read_cost'), false);
  });

  it('el técnico ve la cotización pero no su costo', () => {
    const tecnico = permissionsForRole('tecnico');
    assert.equal(hasPermission(tecnico, 'quotations:read'), true);
    assert.equal(hasPermission(tecnico, 'quotations:read_cost'), false);
  });

  it('el técnico sí tiene alcance sobre todas las empresas', () => {
    // La trampa conocida: atar el alcance al permiso de panel deja al técnico
    // sin ver un solo vehículo.
    const tecnico = permissionsForRole('tecnico');
    assert.equal(hasPermission(tecnico, 'scope:all_corporate_clients'), true);
    assert.equal(hasPermission(tecnico, 'dashboard:read_all_clients'), false);
  });

  it('el analista no modifica nada', () => {
    const analista = permissionsForRole('analista');
    const escritura = analista.filter((p) =>
      /:(write|create|delete|manage|execute|approve|send|void|cancel|deliver|close|register)/.test(p),
    );
    assert.deepEqual(escritura, []);
  });

  it('planchado y pintura tiene los mismos permisos que el técnico', () => {
    assert.deepEqual(
      [...permissionsForRole('planchado_pintura')].sort(),
      [...permissionsForRole('tecnico')].sort(),
    );
  });

  it('solo administración lee la auditoría', () => {
    const conAuditoria = ROLES.filter((r) => hasPermission(permissionsForRole(r), 'audit:read'));
    assert.deepEqual(conAuditoria, ['super_admin', 'admin']);
  });
});
