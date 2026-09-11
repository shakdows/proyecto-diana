import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  band,
  donutArc,
  donutSegments,
  linear,
  linePath,
  niceTicks,
  zeroBasedDomain,
} from './scale';

describe('escala lineal', () => {
  const s = linear([0, 100], [0, 200]);

  it('mapea extremos y centro', () => {
    assert.equal(s(0), 0);
    assert.equal(s(100), 200);
    assert.equal(s(50), 100);
  });

  it('funciona con el rango invertido, que es el caso normal en SVG', () => {
    // En SVG la y crece hacia abajo: el valor máximo va arriba, en y = 0.
    const y = linear([0, 10], [100, 0]);
    assert.equal(y(0), 100);
    assert.equal(y(10), 0);
  });

  it('un dominio de ancho cero devuelve el centro, no NaN', () => {
    // Sin esto, una serie de valores idénticos pinta un gráfico vacío sin
    // ningún error en consola.
    const plano = linear([5, 5], [0, 100]);
    assert.equal(plano(5), 50);
    assert.ok(Number.isFinite(plano(5)));
  });

  it('extrapola fuera del dominio en vez de recortar en silencio', () => {
    assert.equal(s(150), 300);
  });
});

describe('marcas de eje', () => {
  it('elige pasos redondos', () => {
    assert.deepEqual(niceTicks(0, 100, 5), [0, 20, 40, 60, 80, 100]);
  });

  it('no rotula el eje con dieciséis decimales', () => {
    // 3 × 0.2 da 0.6000000000000001 en coma flotante binaria. Si eso llega al
    // eje, el gráfico queda ilegible sin que falle nada.
    assert.deepEqual(niceTicks(0, 1, 5), [0, 0.2, 0.4, 0.6, 0.8, 1]);
  });

  it('no pierde la última marca por acumulación', () => {
    assert.equal(niceTicks(0, 1, 5).at(-1), 1);
    assert.equal(niceTicks(0, 0.5, 5).at(-1), 0.5);
  });

  it('con pasos enteros no inventa decimales', () => {
    assert.deepEqual(niceTicks(0, 50, 5), [0, 10, 20, 30, 40, 50]);
  });

  it('un dominio de un solo punto devuelve ese punto', () => {
    assert.deepEqual(niceTicks(7, 7), [7]);
  });

  it('valores no finitos no revientan', () => {
    assert.deepEqual(niceTicks(Number.NaN, 10), []);
    assert.deepEqual(niceTicks(0, Number.POSITIVE_INFINITY), []);
  });
});

describe('escala de bandas', () => {
  it('reparte el ancho y deja hueco', () => {
    const b = band(4, [0, 400], 0.25);
    assert.equal(b.step, 100);
    assert.equal(b.bandwidth, 75);
    assert.equal(b(0), 12.5);
  });

  it('cero elementos no divide entre cero', () => {
    const b = band(0, [0, 100]);
    assert.ok(Number.isFinite(b.bandwidth));
    assert.ok(Number.isFinite(b(0)));
  });

  it('un padding absurdo se recorta en vez de dar ancho negativo', () => {
    assert.ok(band(3, [0, 300], 5).bandwidth > 0);
    assert.equal(band(3, [0, 300], -2).bandwidth, 100);
  });
});

describe('dominio con base en cero', () => {
  it('las barras arrancan en cero', () => {
    // Un eje que no arranca en cero exagera las diferencias: es la forma más
    // común de mentir con un gráfico sin escribir un número falso.
    assert.deepEqual(zeroBasedDomain([40, 42, 45]), [0, 45]);
  });

  it('con valores negativos incluye el mínimo', () => {
    assert.deepEqual(zeroBasedDomain([-20, 50]), [-20, 50]);
  });

  it('todo a cero no colapsa el dominio', () => {
    assert.deepEqual(zeroBasedDomain([0, 0]), [0, 1]);
    assert.deepEqual(zeroBasedDomain([]), [0, 1]);
  });
});

describe('rutas', () => {
  it('la línea empieza con M y sigue con L', () => {
    assert.equal(linePath([[0, 0], [10, 5]]), 'M0,0 L10,5');
  });

  it('sin puntos no devuelve una ruta rota', () => {
    assert.equal(linePath([]), '');
  });

  it('el arco de 360° se recorta para que el navegador lo dibuje', () => {
    // Inicio y fin en el mismo punto no pintan nada.
    const completo = donutArc(50, 50, 40, 25, 0, Math.PI * 2);
    assert.ok(completo.length > 0);
    assert.ok(!completo.includes('NaN'));
  });

  it('un arco normal no produce NaN', () => {
    assert.ok(!donutArc(50, 50, 40, 25, 0, Math.PI / 2).includes('NaN'));
  });
});

describe('reparto de la dona', () => {
  const items = [{ v: 3 }, { v: 1 }];

  it('los arcos cubren la circunferencia completa', () => {
    const segs = donutSegments(items, (i) => i.v);
    const total = segs.reduce((n, s) => n + (s.endAngle - s.startAngle), 0);
    assert.ok(Math.abs(total - Math.PI * 2) < 1e-9);
  });

  it('empieza a las 12 en punto, no a las 3', () => {
    assert.equal(donutSegments(items, (i) => i.v)[0]?.startAngle, -Math.PI / 2);
  });

  it('cada arco empieza donde termina el anterior', () => {
    const segs = donutSegments(items, (i) => i.v);
    assert.equal(segs[0]?.endAngle, segs[1]?.startAngle);
  });

  it('las fracciones suman uno', () => {
    const segs = donutSegments(items, (i) => i.v);
    assert.equal(segs.reduce((n, s) => n + s.fraction, 0), 1);
  });

  it('un total de cero no reparte nada en vez de dividir entre cero', () => {
    assert.deepEqual(donutSegments([{ v: 0 }], (i) => i.v), []);
    assert.deepEqual(donutSegments([], (i: { v: number }) => i.v), []);
  });

  it('los valores nulos no ocupan un arco invisible', () => {
    assert.equal(donutSegments([{ v: 5 }, { v: 0 }], (i) => i.v).length, 1);
  });

  it('un valor negativo no roba ángulo a los demás', () => {
    const segs = donutSegments([{ v: 4 }, { v: -2 }], (i) => i.v);
    assert.equal(segs.length, 1);
    assert.equal(segs[0]?.fraction, 1);
  });
});
