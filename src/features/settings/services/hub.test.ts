import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { CHECKLIST, CORPORATE_CLIENTS, PAUSE_REASONS, SERVICE_TYPES, SURVEY_QUESTIONS } from '../../../../db/seed/catalog';
import { ORDER_STATUSES, type OrderStatus } from '@/features/orders/services/order-status';
import { PERMISSIONS, ROLES, ROLE_PERMISSIONS } from '@/lib/auth/permissions';
import {
  SECTION_LABELS,
  SETTINGS,
  searchSettings,
  sectionsOf,
  settingById,
  visibleSettings,
} from './hub';

describe('el mapa de configuración', () => {
  it('no repite identificadores', () => {
    assert.equal(new Set(SETTINGS.map((s) => s.id)).size, SETTINGS.length);
  });

  it('cada bloque pide un permiso que EXISTE', () => {
    // Un permiso mal escrito no da error: el bloque simplemente no aparece
    // nunca, y eso se descubre cuando alguien pregunta por qué no lo ve.
    const conocidos = new Set<string>(PERMISSIONS);
    for (const s of SETTINGS) {
      assert.ok(conocidos.has(s.permission), `«${s.label}» pide «${s.permission}», que no existe`);
    }
  });

  it('cada sección usada tiene rótulo', () => {
    for (const s of SETTINGS) assert.ok(SECTION_LABELS[s.section].length > 0);
  });

  it('las cifras salen del catálogo real, no escritas a mano', () => {
    // Si se escribieran, dirían «5 empresas» el día que haya seis.
    assert.equal(settingById('empresas')?.count, CORPORATE_CLIENTS.length);
    assert.equal(settingById('servicios')?.count, SERVICE_TYPES.length);
    assert.equal(settingById('pausas')?.count, PAUSE_REASONS.length);
    assert.equal(settingById('encuesta')?.count, SURVEY_QUESTIONS.length);
    assert.equal(settingById('roles')?.count, ROLES.length);
    assert.equal(settingById('workflow')?.count, ORDER_STATUSES.length);
    assert.equal(
      settingById('checklist')?.count,
      CHECKLIST.reduce((n, c) => n + c.items.length, 0),
    );
  });

  it('un bloque sin panel se marca como no disponible', () => {
    // Una tarjeta que no abre nada es peor que no tener la tarjeta.
    const sinPanel = SETTINGS.filter((s) => !s.available);
    assert.ok(sinPanel.length > 0);
    for (const s of sinPanel) assert.equal(s.count, null, `«${s.label}» promete una cifra que no tiene`);
  });
});

describe('modo simple y avanzado', () => {
  it('el simple esconde lo que cambia el significado de los informes', () => {
    const simples = new Set(
      visibleSettings(ROLE_PERMISSIONS.super_admin, 'simple').map((s) => s.id),
    );
    for (const peligroso of ['workflow', 'parametros']) {
      assert.equal(simples.has(peligroso), false, `«${peligroso}» no debería estar en modo simple`);
    }
  });

  it('el avanzado enseña todo lo del simple y algo más', () => {
    const simple = visibleSettings(ROLE_PERMISSIONS.super_admin, 'simple');
    const avanzado = visibleSettings(ROLE_PERMISSIONS.super_admin, 'avanzado');
    for (const s of simple) {
      assert.ok(avanzado.some((a) => a.id === s.id), `«${s.label}» desaparece en avanzado`);
    }
    assert.ok(avanzado.length > simple.length);
  });

  it('el nivel NUNCA concede lo que el permiso niega', () => {
    // Cambiar a «simple» no puede abrir nada: filtra después del permiso.
    const sinPermisos = visibleSettings([], 'simple');
    assert.deepEqual(sinPermisos, []);
    assert.deepEqual(visibleSettings([], 'avanzado'), []);
  });

  it('el asesor no administra el sistema', () => {
    assert.deepEqual(visibleSettings(ROLE_PERMISSIONS.asesor, 'avanzado'), []);
  });

  it('solo el super administrador ve TODO', () => {
    assert.equal(visibleSettings(ROLE_PERMISSIONS.super_admin, 'avanzado').length, SETTINGS.length);
  });

  it('el administrador lo ve todo MENOS la matriz de permisos', () => {
    // Cambiar quién puede qué es la acción más peligrosa del sistema: quien la
    // tiene puede concederse cualquier otra. Por eso `roles:manage` es solo
    // del super administrador, y esta pantalla lo respeta en vez de
    // inventarse su propia idea de quién administra.
    const suyos = visibleSettings(ROLE_PERMISSIONS.admin, 'avanzado').map((s) => s.id);
    assert.equal(suyos.includes('roles'), false);
    assert.equal(suyos.length, SETTINGS.length - 1);
  });
});

describe('buscar un ajuste', () => {
  it('sin texto devuelve todo', () => {
    assert.equal(searchSettings(SETTINGS, '').length, SETTINGS.length);
  });

  it('«NPS» lleva a los umbrales, que no se llaman NPS', () => {
    // Quien teclea «NPS» no sabe cómo se llama el ajuste: por eso lo busca.
    const r = searchSettings(SETTINGS, 'NPS');
    assert.ok(r.some((s) => s.id === 'parametros'), 'NPS no encuentra los umbrales');
  });

  it('«BBVA» lleva a empresas', () => {
    assert.ok(searchSettings(SETTINGS, 'BBVA').some((s) => s.id === 'empresas'));
  });

  it('ignora acentos', () => {
    assert.ok(searchSettings(SETTINGS, 'inspeccion').some((s) => s.id === 'checklist'));
    assert.ok(searchSettings(SETTINGS, 'INSPECCIÓN').some((s) => s.id === 'checklist'));
  });

  it('lo que no coincide no sale', () => {
    assert.deepEqual(searchSettings(SETTINGS, 'zzzz'), []);
  });
});

describe('secciones', () => {
  it('salen siempre en el mismo orden', () => {
    assert.deepEqual(sectionsOf(SETTINGS), ['general', 'personas', 'taller', 'cliente', 'sistema']);
    assert.deepEqual(
      sectionsOf([...SETTINGS].reverse()),
      ['general', 'personas', 'taller', 'cliente', 'sistema'],
    );
  });

  it('una sección sin bloques visibles no se dibuja', () => {
    const soloGeneral = SETTINGS.filter((s) => s.section === 'general');
    assert.deepEqual(sectionsOf(soloGeneral), ['general']);
  });
});

describe('coherencia con el dominio', () => {
  it('el recuento de estados cubre el grafo entero', () => {
    const todos: readonly OrderStatus[] = ORDER_STATUSES;
    assert.equal(settingById('workflow')?.count, todos.length);
  });
});
