import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  MAX_NOTE,
  atFromId,
  checkNote,
  cleanNote,
  newestFirst,
  noteFrom,
  noteSlot,
  readNotes,
  type WorkshopNote,
} from './notes';

const AHORA = new Date('2026-09-14T15:30:00Z');

describe('limpiar el texto', () => {
  it('colapsa espacios sin destruir los párrafos', () => {
    assert.equal(cleanNote('  Pastillas   gastadas \n\n\n  Revisar discos  '), 'Pastillas gastadas\n\nRevisar discos');
  });

  it('deja vacío lo que solo era espacio', () => {
    assert.equal(cleanNote('   \n\t  '), '');
  });
});

describe('validar', () => {
  it('el campo vacío no es un error: es un campo vacío', () => {
    assert.deepEqual(checkNote('   '), { valid: false, error: null });
  });

  it('avisa de lo demasiado corto y de lo demasiado largo', () => {
    assert.equal(checkNote('ok').valid, false);
    assert.ok(checkNote('ok').error !== null);
    assert.equal(checkNote('x'.repeat(MAX_NOTE + 1)).valid, false);
    assert.equal(checkNote('x'.repeat(MAX_NOTE)).valid, true);
  });
});

describe('crear', () => {
  it('guarda el texto limpio, el autor y el instante', () => {
    const note = noteFrom('  Se cambió   el líquido  ', 'Carlos Mendoza', AHORA, 0.5);
    assert.ok(note !== null);
    assert.equal(note.text, 'Se cambió el líquido');
    assert.equal(note.author, 'Carlos Mendoza');
    assert.equal(note.at, AHORA.getTime());
  });

  it('no crea nada de un texto que no vale', () => {
    assert.equal(noteFrom('ok', 'Carlos', AHORA, 0.5), null);
  });

  it('dos notas del mismo milisegundo no comparten identificador', () => {
    const a = noteFrom('Primera nota', 'C', AHORA, 0.11);
    const b = noteFrom('Segunda nota', 'C', AHORA, 0.87);
    assert.notEqual(a?.id, b?.id);
  });
});

describe('leer lo guardado', () => {
  it('recupera lo que escribió la pantalla', () => {
    const note = noteFrom('Pastillas cambiadas', 'Carlos', AHORA, 0.4) as WorkshopNote;
    assert.deepEqual(readNotes([note]), [note]);
  });

  it('recupera la fecha del identificador si la fila es de un formato anterior', () => {
    const viejo = { id: `nota-${AHORA.getTime()}-abc`, text: 'Sin fecha', author: 'Carlos' };
    const [leida] = readNotes([viejo]);
    assert.equal(leida?.at, AHORA.getTime());
  });

  it('descarta filas irreconocibles sin tirar las buenas', () => {
    const note = noteFrom('Pastillas cambiadas', 'Carlos', AHORA, 0.4) as WorkshopNote;
    const leidas = readNotes([null, 7, { id: 'x' }, { id: 'nota-0-a', text: 'y' }, note]);
    assert.equal(leidas.length, 1);
    assert.equal(leidas[0]?.id, note.id);
  });

  it('nunca lanza ante basura', () => {
    for (const basura of [null, undefined, 0, 'texto', {}]) {
      assert.deepEqual(readNotes(basura), []);
    }
  });
});

describe('orden y ranura', () => {
  it('la más reciente primero', () => {
    const notes: WorkshopNote[] = [
      { id: 'a', text: 'vieja', at: 1000, author: 'C' },
      { id: 'b', text: 'nueva', at: 3000, author: 'C' },
      { id: 'c', text: 'media', at: 2000, author: 'C' },
    ];
    assert.deepEqual(newestFirst(notes).map((n) => n.id), ['b', 'c', 'a']);
  });

  it('no muta la lista que recibe', () => {
    const notes: WorkshopNote[] = [
      { id: 'a', text: 'vieja', at: 1000, author: 'C' },
      { id: 'b', text: 'nueva', at: 3000, author: 'C' },
    ];
    newestFirst(notes);
    assert.equal(notes[0]?.id, 'a');
  });

  it('cada orden guarda en su ranura', () => {
    assert.equal(noteSlot('os-154'), 'orden.os-154.notas');
    assert.notEqual(noteSlot('os-154'), noteSlot('os-158'));
  });

  it('el identificador devuelve su instante', () => {
    assert.equal(atFromId('nota-1757000000000-abc'), 1757000000000);
    assert.equal(atFromId('otra-cosa'), null);
  });
});
