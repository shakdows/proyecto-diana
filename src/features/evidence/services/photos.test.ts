import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  JPEG_QUALITY,
  MAX_EDGE,
  MAX_PHOTOS,
  addPhotos,
  bytesOfDataUrl,
  canAddPhotos,
  fitWithin,
  formatBytes,
  isImage,
  newPhotoId,
  photoWhen,
  removePhoto,
  roomLeft,
  slotFor,
  totalBytes,
  type EvidencePhoto,
} from './photos';

const HOY = new Date('2026-09-13T15:00:00Z');
const foto = (id: string, bytes = 1000, takenAt = HOY.toISOString()): EvidencePhoto => ({
  id, dataUrl: 'data:image/jpeg;base64,AAAA', takenAt,
  width: 1280, height: 960, bytes, source: 'camara',
});

describe('las fotos de evidencia', () => {
  describe('el tamaño al que se reducen', () => {
    it('respeta la proporción', () => {
      // El fallo clásico es usar el lado que no toca y estirar la foto.
      assert.deepEqual(fitWithin(4032, 3024, 1280), { width: 1280, height: 960 });
      assert.deepEqual(fitWithin(3024, 4032, 1280), { width: 960, height: 1280 });
    });

    it('NO agranda una imagen que ya es pequeña', () => {
      // Subirla a 1280 solo añade peso y borrosidad.
      assert.deepEqual(fitWithin(640, 480, 1280), { width: 640, height: 480 });
    });

    it('nunca devuelve cero de lado', () => {
      assert.deepEqual(fitWithin(10_000, 1, 1280), { width: 1280, height: 1 });
    });

    it('una imagen imposible no revienta', () => {
      assert.deepEqual(fitWithin(0, 0), { width: 0, height: 0 });
      assert.deepEqual(fitWithin(-5, 10), { width: 0, height: 0 });
    });

    it('los ajustes son los que justifican guardar en el navegador', () => {
      assert.equal(MAX_EDGE, 1280);
      assert.equal(JPEG_QUALITY, 0.72);
    });
  });

  describe('el tope por anclaje', () => {
    /*
     * ESTA es la regla que evita el fallo de verdad. `localStorage` da unos
     * 5 MB para TODO, así que sin tope la tercera foto de un móvil llena el
     * cupo y lo que se rompe no es la foto: es el checklist, la autorización
     * y todo lo demás que comparte el espacio.
     */
    it('no deja pasar de seis', () => {
      assert.equal(MAX_PHOTOS, 6);
      const llenas = Array.from({ length: 6 }, (_, i) => foto(`f${String(i)}`));
      assert.equal(canAddPhotos(llenas), false);
      assert.equal(roomLeft(llenas), 0);
      assert.equal(addPhotos(llenas, [foto('nueva')]).length, 6);
    });

    it('dice cuántas caben para poder cortar una selección de veinte', () => {
      assert.equal(roomLeft([foto('a'), foto('b')]), 4);
    });
  });

  describe('el orden', () => {
    it('la más reciente primero', () => {
      // La foto que importa casi siempre es la última que se tomó.
      const r = addPhotos([foto('vieja')], [foto('nueva')]);
      assert.deepEqual(r.map((p) => p.id), ['nueva', 'vieja']);
    });

    it('al llenarse, la nueva entra y la más vieja se cae', () => {
      const llenas = Array.from({ length: 6 }, (_, i) => foto(`f${String(i)}`));
      const r = addPhotos(llenas, [foto('nueva')]);
      assert.equal(r[0]?.id, 'nueva');
      assert.equal(r.some((p) => p.id === 'f5'), false);
    });
  });

  it('quitar una no toca a las demás', () => {
    assert.deepEqual(removePhoto([foto('a'), foto('b')], 'a').map((p) => p.id), ['b']);
  });

  describe('el peso', () => {
    it('cuenta los bytes reales detrás del base64', () => {
      // «AAAA» son 4 caracteres base64 = 3 bytes.
      assert.equal(bytesOfDataUrl('data:image/jpeg;base64,AAAA'), 3);
      assert.equal(bytesOfDataUrl('data:image/jpeg;base64,AAA='), 2);
      assert.equal(bytesOfDataUrl('data:image/jpeg;base64,AA=='), 1);
    });

    it('un valor sin coma no revienta', () => {
      assert.equal(bytesOfDataUrl('no es un data url'), 0);
    });

    it('suma lo guardado', () => {
      assert.equal(totalBytes([foto('a', 1000), foto('b', 2000)]), 3000);
    });

    it('lo dice en la unidad que se lee', () => {
      assert.equal(formatBytes(512), '512 B');
      assert.equal(formatBytes(2048), '2 KB');
      assert.equal(formatBytes(1_572_864), '1.5 MB');
    });
  });

  describe('cuándo se tomó', () => {
    /*
     * La fecha exacta no dice nada de un vistazo: lo que se quiere saber es
     * si la foto es de esta visita o de hace un año.
     */
    it('lo dice en relativo mientras importa', () => {
      const hace = (d: number) => new Date(HOY.getTime() - d * 86_400_000).toISOString();
      assert.match(photoWhen(hace(0), HOY), /^Hoy /);
      assert.match(photoWhen(hace(1), HOY), /^Ayer /);
      assert.equal(photoWhen(hace(3), HOY), 'Hace 3 días');
    });

    it('pasada la semana enseña la fecha, porque «hace 83 días» tampoco ayuda', () => {
      const viejo = new Date(HOY.getTime() - 83 * 86_400_000).toISOString();
      assert.equal(photoWhen(viejo, HOY).startsWith('Hace'), false);
    });

    it('una fecha ilegible no revienta', () => {
      assert.equal(photoWhen('ayer por la tarde', HOY), 'Sin fecha');
    });
  });

  describe('qué archivos entran', () => {
    it('solo imágenes', () => {
      assert.equal(isImage('image/jpeg'), true);
      assert.equal(isImage('image/heic'), true);
      assert.equal(isImage('application/pdf'), false);
      assert.equal(isImage(''), false);
    });
  });

  describe('la ranura de guardado', () => {
    /*
     * Va APARTE del borrador de la recepción: ese borrador se reescribe
     * entero en cada tecla, y meterle seis imágenes en base64 lo convertiría
     * en megabytes reescritos a cada letra de una observación.
     */
    it('es una por anclaje', () => {
      assert.equal(slotFor('checklist:aire'), 'evidencia.checklist:aire');
      assert.notEqual(slotFor('checklist:aire'), slotFor('checklist:frenos'));
    });
  });

  it('los identificadores no chocan aunque se tomen dos seguidas', () => {
    const ids = new Set(Array.from({ length: 200 }, () => newPhotoId(1_700_000_000_000)));
    assert.ok(ids.size > 190, `solo ${String(ids.size)} de 200`);
  });
});
