import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  isCurrentKey,
  isOwnKey,
  keyFor,
  STORE_VERSION,
  summarize,
  unwrap,
  wrap,
} from './persistence';

describe('claves', () => {
  it('llevan prefijo y versión', () => {
    assert.equal(keyFor('checklist'), `diana.demo.v${STORE_VERSION}.checklist`);
  });

  it('reconoce las propias, incluidas las de versiones viejas', () => {
    assert.equal(isOwnKey('diana.demo.v0.checklist'), true);
    assert.equal(isOwnKey('otra-app.datos'), false);
  });

  it('distingue las de la versión actual', () => {
    assert.equal(isCurrentKey(keyFor('x')), true);
    assert.equal(isCurrentKey('diana.demo.v0.x'), false);
  });
});

describe('sobre de guardado', () => {
  it('ida y vuelta conserva el dato', () => {
    const sobre = JSON.stringify(wrap({ a: 1, b: ['x'] }, 1000));
    assert.deepEqual(unwrap<{ a: number; b: string[] }>(sobre), { a: 1, b: ['x'] });
  });

  it('nada guardado devuelve null, no revienta', () => {
    assert.equal(unwrap(null), null);
    assert.equal(unwrap(''), null);
  });

  it('JSON roto devuelve null en vez de lanzar', () => {
    // Un dato corrupto en el navegador de alguien no puede dejar la pantalla
    // en blanco.
    assert.equal(unwrap('{esto no es json'), null);
    assert.equal(unwrap('null'), null);
    assert.equal(unwrap('"texto suelto"'), null);
    assert.equal(unwrap('[1,2,3]'), null);
  });

  it('una versión distinta se descarta', () => {
    // Un objeto viejo al que le falta un campo nuevo renderiza mal y en
    // silencio, que es peor que empezar de cero.
    const viejo = JSON.stringify({ v: STORE_VERSION + 1, at: 1, data: { a: 1 } });
    assert.equal(unwrap(viejo), null);
    const anterior = JSON.stringify({ v: STORE_VERSION - 1, at: 1, data: { a: 1 } });
    assert.equal(unwrap(anterior), null);
  });

  it('un sobre sin data se descarta', () => {
    assert.equal(unwrap(JSON.stringify({ v: STORE_VERSION, at: 1 })), null);
  });

  it('guardar undefined o false no se confunde con no haber guardado', () => {
    assert.equal(unwrap<boolean>(JSON.stringify(wrap(false, 1))), false);
    assert.equal(unwrap<number>(JSON.stringify(wrap(0, 1))), 0);
  });
});

describe('resumen de lo guardado', () => {
  const entrada = (slot: string, at: number): readonly [string, string] => [
    keyFor(slot),
    JSON.stringify(wrap({ x: 1 }, at)),
  ];

  it('cuenta solo lo nuestro de la versión actual', () => {
    const s = summarize([
      entrada('a', 10),
      entrada('b', 20),
      ['otra-app.datos', '{}'],
      ['diana.demo.v0.viejo', '{}'],
    ]);
    assert.equal(s.slots, 2);
  });

  it('devuelve la fecha del guardado más reciente', () => {
    assert.equal(summarize([entrada('a', 10), entrada('b', 99)]).lastSavedAt, 99);
  });

  it('sin nada guardado no inventa una fecha', () => {
    const s = summarize([]);
    assert.equal(s.slots, 0);
    assert.equal(s.lastSavedAt, null);
    assert.equal(s.bytes, 0);
  });

  it('un valor ilegible cuenta en el tamaño pero no rompe el resumen', () => {
    const s = summarize([[keyFor('roto'), 'no es json']]);
    assert.equal(s.slots, 1);
    assert.equal(s.lastSavedAt, null);
    assert.ok(s.bytes > 0);
  });
});
