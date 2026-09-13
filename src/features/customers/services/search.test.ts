import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  FILTER_LABELS,
  applyFilter,
  countByKind,
  findDuplicates,
  fold,
  plateKey,
  searchCustomers,
  type SearchableCustomer,
} from './search';

const C = (over: Partial<SearchableCustomer> & { id: string; name: string }): SearchableCustomer => ({
  kind: 'persona',
  documentType: 'DNI',
  documentLast: '000',
  phone: null,
  email: null,
  corporateClient: null,
  plates: [],
  ...over,
});

const FLOTA: readonly SearchableCustomer[] = [
  C({ id: '1', name: 'Juan Pérez García', documentLast: '725', phone: '+51 987 654 321', email: 'juan.perez@ejemplo.com', plates: ['ABC123'] }),
  C({ id: '2', name: 'Transportes del Sur S.A.C.', kind: 'empresa', documentType: 'RUC', documentLast: '610', corporateClient: 'Mitsui', plates: ['V2K481'] }),
  C({ id: '3', name: 'María Quispe', documentLast: '481', phone: '987111222', plates: ['D9M772'] }),
  C({ id: '4', name: 'Pedro Pérez', documentLast: '999', phone: '955444333' }),
];

describe('buscar', () => {
  it('sin texto devuelve todo', () => {
    assert.equal(searchCustomers(FLOTA, '').length, 4);
    assert.equal(searchCustomers(FLOTA, '   ').length, 4);
  });

  it('la placa exacta gana a todo lo demás', () => {
    // Es el caso del asesor con el vehículo delante.
    assert.equal(searchCustomers(FLOTA, 'ABC-123')[0]?.id, '1');
    assert.equal(searchCustomers(FLOTA, 'abc123')[0]?.id, '1');
  });

  it('encuentra por teléfono aunque esté escrito de otra forma', () => {
    assert.equal(searchCustomers(FLOTA, '987654321')[0]?.id, '1');
    assert.equal(searchCustomers(FLOTA, '+51 987 654 321')[0]?.id, '1');
  });

  it('encuentra por apellido, no solo por el nombre de pila', () => {
    const r = searchCustomers(FLOTA, 'perez');
    assert.deepEqual(r.map((c) => c.id).sort(), ['1', '4']);
  });

  it('ignora acentos', () => {
    assert.ok(searchCustomers(FLOTA, 'maria').some((c) => c.id === '3'));
    assert.ok(searchCustomers(FLOTA, 'QUISPE').some((c) => c.id === '3'));
  });

  it('encuentra por la empresa corporativa', () => {
    assert.equal(searchCustomers(FLOTA, 'mitsui')[0]?.id, '2');
  });

  it('encuentra por correo', () => {
    assert.equal(searchCustomers(FLOTA, 'juan.perez@ejemplo')[0]?.id, '1');
  });

  it('el teléfono pesa más que el parecido de nombre', () => {
    // Quien teclea «987654321» con el cliente al teléfono espera al que TIENE
    // ese número, no a quien vive en el 987 de una calle.
    const r = searchCustomers(FLOTA, '987654321');
    assert.equal(r[0]?.id, '1');
  });

  it('a igual puntuación ordena alfabéticamente, no por el orden de entrada', () => {
    // Si dependiera del orden de la lista, la misma búsqueda daría dos
    // respuestas distintas según de dónde vinieran los datos.
    const alReves = [...FLOTA].reverse();
    assert.deepEqual(
      searchCustomers(alReves, 'perez').map((c) => c.id),
      searchCustomers(FLOTA, 'perez').map((c) => c.id),
    );
  });

  it('lo que no coincide con nada no sale', () => {
    assert.deepEqual(searchCustomers(FLOTA, 'zzzz'), []);
  });
});

describe('duplicados', () => {
  it('avisa por documento', () => {
    const d = findDuplicates(FLOTA, { documentType: 'DNI', documentLast: '43802725' });
    assert.equal(d.length, 1);
    assert.equal(d[0]?.customer.id, '1');
    assert.equal(d[0]?.reason, 'documento');
  });

  it('no confunde un DNI con un RUC acabado igual', () => {
    const d = findDuplicates(FLOTA, { documentType: 'RUC', documentLast: '725' });
    assert.deepEqual(d, []);
  });

  it('avisa por teléfono, aunque venga con prefijo', () => {
    const d = findDuplicates(FLOTA, { phone: '+51 987 654 321' });
    assert.equal(d[0]?.customer.id, '1');
    assert.equal(d[0]?.reason, 'telefono');
  });

  it('avisa por correo sin importar mayúsculas', () => {
    const d = findDuplicates(FLOTA, { email: '  JUAN.PEREZ@ejemplo.com ' });
    assert.equal(d[0]?.customer.id, '1');
  });

  it('un mismo cliente sale UNA vez aunque coincida por tres cosas', () => {
    const d = findDuplicates(FLOTA, {
      documentType: 'DNI',
      documentLast: '43802725',
      phone: '987654321',
      email: 'juan.perez@ejemplo.com',
    });
    assert.equal(d.length, 1);
  });

  it('NO avisa por parecido de nombre', () => {
    // Hay muchos «Juan Pérez». Avisar por eso enseña a ignorar el aviso, y
    // entonces el aviso que importa tampoco se lee.
    assert.deepEqual(findDuplicates(FLOTA, {}), []);
  });

  it('no avisa con un documento a medio escribir', () => {
    // Con dos dígitos coincidiría medio padrón.
    assert.deepEqual(findDuplicates(FLOTA, { documentType: 'DNI', documentLast: '25' }), []);
  });

  it('no avisa con un teléfono incompleto', () => {
    assert.deepEqual(findDuplicates(FLOTA, { phone: '98765' }), []);
  });
});

describe('normalizadores', () => {
  it('fold quita acentos y signos', () => {
    assert.equal(fold('Pérez-García, S.A.'), 'perez garcia s a');
  });

  it('plateKey deja la placa comparable', () => {
    assert.equal(plateKey('abc-123'), 'ABC123');
    assert.equal(plateKey('ABC 123'), 'ABC123');
  });
});

describe('el filtro de la cartera', () => {
  const cartera = [
    { kind: 'persona' as const },
    { kind: 'empresa' as const },
    { kind: 'persona' as const },
  ];

  it('las tres cifras suman el total', () => {
    const n = countByKind(cartera);
    assert.equal(n.todos, 3);
    assert.equal(n.personas, 2);
    assert.equal(n.empresas, 1);
    assert.equal(n.personas + n.empresas, n.todos);
  });

  it('«Todos» no filtra nada', () => {
    assert.equal(applyFilter(cartera, 'todos').length, 3);
  });

  it('cada pestaña deja solo lo suyo', () => {
    assert.deepEqual(
      applyFilter(cartera, 'personas').map((c) => c.kind),
      ['persona', 'persona'],
    );
    assert.deepEqual(
      applyFilter(cartera, 'empresas').map((c) => c.kind),
      ['empresa'],
    );
  });

  it('una cartera vacía cuenta cero y no revienta', () => {
    assert.deepEqual(countByKind([]), { todos: 0, personas: 0, empresas: 0 });
    assert.deepEqual(applyFilter([], 'empresas'), []);
  });

  it('cada filtro tiene rótulo', () => {
    for (const f of ['todos', 'personas', 'empresas'] as const) {
      assert.ok(FILTER_LABELS[f].length > 0);
    }
  });
});
