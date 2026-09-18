import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { internalPathOr, isInternalPath } from './paths';

describe('rutas de vuelta', () => {
  it('acepta las de esta aplicación', () => {
    for (const p of ['/', '/ordenes', '/ordenes/rec-2026-0001#expediente', '/taller?x=1']) {
      assert.equal(isInternalPath(p), true, p);
    }
  });

  it('rechaza lo que saca al usuario fuera', () => {
    for (const p of [
      'https://otro.com',
      '//otro.com',
      '/\\otro.com',
      'javascript:alert(1)',
      'ordenes',
      '',
      '/ordenes\nSet-Cookie: x=1',
    ]) {
      assert.equal(isInternalPath(p), false, p);
    }
  });

  it('ante cualquier duda, la portada', () => {
    assert.equal(internalPathOr('/ordenes', '/'), '/ordenes');
    assert.equal(internalPathOr('https://otro.com', '/'), '/');
    assert.equal(internalPathOr(undefined, '/'), '/');
    assert.equal(internalPathOr(42, '/tablero'), '/tablero');
  });
});
