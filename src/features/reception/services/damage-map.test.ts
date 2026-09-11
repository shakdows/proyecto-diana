import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  CANVAS,
  DAMAGE_KINDS,
  ZONES,
  describe as describeDamage,
  kindInfo,
  markAt,
  summarize,
  toggleMark,
  zoneLabel,
  type DamageMark,
} from './damage-map';

describe('las zonas', () => {
  it('no se solapan', () => {
    // Dos zonas solapadas hacen que un toque caiga en la de encima, que
    // depende del orden del array. El parte diría «capó» donde el asesor
    // señaló «parabrisas», y nadie lo notaría hasta un peritaje.
    for (let i = 0; i < ZONES.length; i += 1) {
      for (let j = i + 1; j < ZONES.length; j += 1) {
        const a = ZONES[i];
        const b = ZONES[j];
        if (a === undefined || b === undefined) continue;
        const separadas =
          a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
        assert.ok(separadas, `«${a.label}» y «${b.label}» se solapan`);
      }
    }
  });

  it('caben todas dentro del lienzo', () => {
    for (const z of ZONES) {
      assert.ok(z.x >= 0 && z.y >= 0, `«${z.label}» empieza fuera`);
      assert.ok(z.x + z.w <= CANVAS.width, `«${z.label}» se sale por el lado`);
      assert.ok(z.y + z.h <= CANVAS.height, `«${z.label}» se sale por abajo`);
    }
  });

  it('todas son tocables con el dedo', () => {
    // Menos de 24 px de lado y hay que apuntar. Esta pantalla se usa de pie,
    // junto al vehículo, con una tablet en la otra mano.
    for (const z of ZONES) {
      assert.ok(Math.min(z.w, z.h) >= 24, `«${z.label}» mide ${String(Math.min(z.w, z.h))} px`);
    }
  });

  it('no hay identificadores repetidos', () => {
    assert.equal(new Set(ZONES.map((z) => z.id)).size, ZONES.length);
  });

  it('izquierda y derecha están en lados opuestos del dibujo', () => {
    const izq = ZONES.filter((z) => z.id.endsWith('-di') || z.id.endsWith('-ti'));
    const der = ZONES.filter((z) => z.id.endsWith('-dd') || z.id.endsWith('-td'));
    assert.equal(izq.length, 4);
    assert.equal(der.length, 4);
    for (const z of izq) assert.ok(z.x < CANVAS.width / 2, `«${z.label}» no está a la izquierda`);
    for (const z of der) assert.ok(z.x > CANVAS.width / 2, `«${z.label}» no está a la derecha`);
  });
});

describe('marcar y desmarcar', () => {
  it('marca una zona vacía', () => {
    const marks = toggleMark([], 'capo', 'abolladura');
    assert.deepEqual([...marks], [{ zone: 'capo', kind: 'abolladura' }]);
  });

  it('vuelve a pulsar el mismo tipo y se borra', () => {
    const uno = toggleMark([], 'capo', 'abolladura');
    assert.deepEqual([...toggleMark(uno, 'capo', 'abolladura')], []);
  });

  it('otro tipo sobre la misma zona la sustituye, no la duplica', () => {
    // Una zona admite un daño: dos golpes en la misma puerta siguen siendo
    // «la puerta está dañada». Permitir varios obliga a decidir cuál se pinta.
    const uno = toggleMark([], 'puerta-di', 'rayon');
    const dos = toggleMark(uno, 'puerta-di', 'rotura');
    assert.equal(dos.length, 1);
    assert.equal(markAt(dos, 'puerta-di')?.kind, 'rotura');
  });

  it('no toca las demás zonas', () => {
    let marks: readonly DamageMark[] = [];
    marks = toggleMark(marks, 'capo', 'rayon');
    marks = toggleMark(marks, 'porton', 'oxido');
    marks = toggleMark(marks, 'capo', 'rayon');
    assert.deepEqual([...marks], [{ zone: 'porton', kind: 'oxido' }]);
  });
});

describe('resumen', () => {
  it('agrupa por gravedad', () => {
    const marks: readonly DamageMark[] = [
      { zone: 'capo', kind: 'rayon' },
      { zone: 'porton', kind: 'abolladura' },
      { zone: 'puerta-di', kind: 'rotura' },
      { zone: 'puerta-dd', kind: 'faltante' },
    ];
    assert.deepEqual(summarize(marks), { total: 4, leve: 1, media: 1, grave: 2 });
  });

  it('sin daños, todo a cero', () => {
    assert.deepEqual(summarize([]), { total: 0, leve: 0, media: 0, grave: 0 });
  });
});

describe('el parte escrito', () => {
  it('dice explícitamente que no hay daños, en vez de quedarse en blanco', () => {
    // Un acta en blanco no distingue «se revisó y no había nada» de «no se
    // revisó». Esa diferencia es justo la que se discute después.
    assert.equal(describeDamage([]), 'Sin daños registrados al ingreso.');
  });

  it('ordena como se lee un vehículo: delante, los lados, detrás', () => {
    const marks: readonly DamageMark[] = [
      { zone: 'paragolpes-trasero', kind: 'abolladura' },
      { zone: 'capo', kind: 'rayon' },
    ];
    assert.equal(
      describeDamage(marks),
      'Capó: rayón · Paragolpes trasero: abolladura',
    );
  });
});

describe('tipos de daño', () => {
  it('cada uno tiene una marca de una sola letra', () => {
    for (const k of DAMAGE_KINDS) {
      assert.equal(k.mark.length, 1, `«${k.label}» no cabe en el punto`);
    }
  });

  it('las marcas no se repiten entre tipos', () => {
    assert.equal(new Set(DAMAGE_KINDS.map((k) => k.mark)).size, DAMAGE_KINDS.length);
  });

  it('un tipo desconocido falla en vez de dibujar algo en blanco', () => {
    // @ts-expect-error -- comprobación deliberada de un valor imposible en TypeScript
    assert.throws(() => kindInfo('meteorito'));
  });

  it('toda zona tiene nombre legible', () => {
    for (const z of ZONES) assert.equal(zoneLabel(z.id), z.label);
  });
});
