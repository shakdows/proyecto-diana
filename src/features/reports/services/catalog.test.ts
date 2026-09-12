import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { PERMISSIONS, ROLE_PERMISSIONS } from '@/lib/auth/permissions';
import {
  DOCUMENTS,
  GROUP_HINTS,
  GROUP_LABELS,
  documentById,
  documentHref,
  groupsOf,
  searchDocuments,
  visibleDocuments,
} from './catalog';

describe('el catálogo', () => {
  it('no repite identificadores', () => {
    assert.equal(new Set(DOCUMENTS.map((d) => d.id)).size, DOCUMENTS.length);
  });

  it('cada documento pide un permiso que EXISTE', () => {
    // Un permiso mal escrito no da error: simplemente nadie ve la tarjeta
    // nunca, y eso se descubre cuando alguien pregunta por qué no aparece.
    const conocidos = new Set<string>(PERMISSIONS);
    for (const d of DOCUMENTS) {
      assert.ok(conocidos.has(d.permission), `«${d.label}» pide «${d.permission}», que no existe`);
    }
  });

  it('cada documento tiene nombre, descripción e icono', () => {
    for (const d of DOCUMENTS) {
      assert.ok(d.label.length > 0, d.id);
      assert.ok(d.description.length > 0, d.id);
      assert.ok(d.icon.length > 0, d.id);
    }
  });

  it('cada grupo usado tiene su rótulo y su explicación', () => {
    for (const d of DOCUMENTS) {
      assert.ok(GROUP_LABELS[d.group].length > 0);
      assert.ok(GROUP_HINTS[d.group].length > 0);
    }
  });

  it('el administrador los ve todos', () => {
    assert.equal(visibleDocuments(ROLE_PERMISSIONS.admin).length, DOCUMENTS.length);
  });

  it('el técnico NO ve los documentos de compras', () => {
    const suyos = visibleDocuments(ROLE_PERMISSIONS.tecnico);
    assert.equal(suyos.some((d) => d.group === 'compras' && d.id === 'compra'), false);
  });

  it('sin permisos no se ve nada', () => {
    assert.deepEqual(visibleDocuments([]), []);
  });

  it('un grupo sin documentos visibles no se dibuja', () => {
    // Un encabezado «Compras y repuestos» sobre un hueco vacío es peor que no
    // tener la sección: parece que algo se rompió.
    const soloOperativos = DOCUMENTS.filter((d) => d.group === 'operativos');
    assert.deepEqual(groupsOf(soloOperativos), ['operativos']);
  });

  it('los grupos salen siempre en el mismo orden', () => {
    assert.deepEqual(groupsOf(DOCUMENTS), ['operativos', 'compras', 'ejecutivos']);
    assert.deepEqual(groupsOf([...DOCUMENTS].reverse()), ['operativos', 'compras', 'ejecutivos']);
  });
});

describe('buscar un documento', () => {
  it('sin texto devuelve todos', () => {
    assert.equal(searchDocuments(DOCUMENTS, '').length, DOCUMENTS.length);
  });

  it('encuentra por nombre ignorando acentos', () => {
    assert.ok(searchDocuments(DOCUMENTS, 'diagnostico').some((d) => d.id === 'diagnostico'));
    assert.ok(searchDocuments(DOCUMENTS, 'DIAGNÓSTICO').some((d) => d.id === 'diagnostico'));
  });

  it('encuentra por lo que el documento hace, no solo por su nombre', () => {
    // Quien busca «proveedor» no sabe que el documento se llama «orden de
    // compra»; justamente por eso lo busca.
    assert.ok(searchDocuments(DOCUMENTS, 'proveedor').some((d) => d.id === 'compra'));
  });

  it('lo que no coincide no sale', () => {
    assert.deepEqual(searchDocuments(DOCUMENTS, 'zzzz'), []);
  });
});

describe('el enlace que genera', () => {
  it('apunta a la API con el tipo y el destino', () => {
    const d = documentById('checklist');
    assert.ok(d !== undefined);
    assert.equal(documentHref(d, 'os-154'), '/api/documentos/checklist/os-154');
  });

  it('escapa lo que lleva espacios o acentos', () => {
    const d = documentById('informe');
    assert.ok(d !== undefined);
    assert.equal(documentHref(d, 'Grupo Andino'), '/api/documentos/informe/Grupo%20Andino');
  });

  it('añade el proveedor solo cuando lo hay', () => {
    const d = documentById('compra');
    assert.ok(d !== undefined);
    assert.equal(documentHref(d, 'os-155', ''), '/api/documentos/compra/os-155');
    assert.equal(
      documentHref(d, 'os-155', 'prov-1'),
      '/api/documentos/compra/os-155?proveedor=prov-1',
    );
  });

  it('un tipo desconocido no existe en el catálogo', () => {
    assert.equal(documentById('factura'), undefined);
  });
});
