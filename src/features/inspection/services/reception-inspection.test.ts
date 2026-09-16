import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ZONES, type DamageMark } from '@/features/reception/services/damage-map';
import {
  damageSlot,
  legacyDamageSlot,
  partPhotoAnchor,
  plateKey,
  signatureSlot,
  signerSlot,
} from '@/features/reception/services/slots';
import { allSpotIds, PLACEMENTS } from './placement';
import {
  ACTION_LABELS,
  EMPTY_RECORD,
  OBSERVATION_KINDS,
  PART_ACTIONS,
  REQUIRED_PARTS,
  canFinish,
  canSave,
  clearPart,
  damageFromRecord,
  inspectionSlot,
  noteOf,
  pendingPhrase,
  pendingRequired,
  progressPhrase,
  readRecord,
  recordFromDamage,
  setPart,
  statusOf,
  summarizeRecord,
  type InspectionRecord,
} from './reception-inspection';

const AHORA = new Date('2026-09-16T10:24:00Z');
const ASESOR = 'Andrea López';

function conUna(partId: string, input: Parameters<typeof setPart>[2]): InspectionRecord {
  return setPart(EMPTY_RECORD, partId, input, AHORA, ASESOR);
}

describe('«sin inspeccionar» es un estado propio', () => {
  it('una pieza de la que nadie dijo nada NO está conforme', () => {
    assert.equal(statusOf(EMPTY_RECORD, 'capo', false), 'pendiente');
    assert.notEqual(statusOf(EMPTY_RECORD, 'capo', false), 'ok');
  });

  it('no se puede ELEGIR «sin inspeccionar»: se elige quitando lo anotado', () => {
    assert.ok(!(PART_ACTIONS as readonly string[]).includes('sin-inspeccionar'));
    const r = conUna('capo', { action: 'conforme' });
    assert.equal(statusOf(r, 'capo', false), 'ok');
    assert.equal(statusOf(clearPart(r, 'capo'), 'capo', false), 'pendiente');
  });

  it('inspeccionar una pieza NO marca las demás', () => {
    const r = conUna('capo', { action: 'conforme' });
    assert.equal(statusOf(r, 'techo', false), 'pendiente');
  });
});

describe('solo al cerrar la recepción lo no marcado pasa a conforme', () => {
  it('con la recepción ABIERTA sigue sin inspeccionar', () => {
    assert.equal(statusOf(EMPTY_RECORD, 'techo', false), 'pendiente');
  });

  it('con la recepción CERRADA sí queda revisado y bien', () => {
    assert.equal(statusOf(EMPTY_RECORD, 'techo', true), 'ok');
  });

  it('cerrar NO borra una observación: el daño sigue ahí', () => {
    const r = conUna('puerta-di', { action: 'observacion', kind: 'rotura' });
    assert.equal(statusOf(r, 'puerta-di', true), 'problema');
  });

  it('cerrar tampoco convierte en conforme lo marcado como pendiente', () => {
    const r = conUna('capo', { action: 'pendiente' });
    assert.equal(statusOf(r, 'capo', true), 'revisar');
  });
});

describe('anotar una pieza', () => {
  it('guarda quién y cuándo, que es lo que respalda el parte', () => {
    const r = conUna('capo', { action: 'conforme' });
    assert.equal(r.capo?.by, ASESOR);
    assert.equal(r.capo?.at, AHORA.getTime());
  });

  it('una observación grave es problema; una leve, algo que revisar', () => {
    assert.equal(statusOf(conUna('capo', { action: 'observacion', kind: 'rotura' }), 'capo', false), 'problema');
    assert.equal(statusOf(conUna('capo', { action: 'observacion', kind: 'rayon' }), 'capo', false), 'revisar');
  });

  it('una observación SIN tipo no se puede guardar', () => {
    assert.equal(canSave({ action: 'observacion' }), false);
    assert.equal(canSave({ action: 'observacion', kind: 'rayon' }), true);
    assert.equal(canSave({ action: 'conforme' }), true);
    assert.equal(canSave({ action: 'pendiente' }), true);
  });

  it('el comentario se limpia, y si queda vacío no se guarda', () => {
    const r = conUna('capo', { action: 'observacion', kind: 'rayon', note: '   ' });
    assert.equal(r.capo?.note, undefined);
    const conNota = conUna('capo', { action: 'observacion', kind: 'rayon', note: '  Rayón de 12 cm  ' });
    assert.equal(conNota.capo?.note, 'Rayón de 12 cm');
  });

  it('el tipo solo se guarda cuando hay observación', () => {
    const r = conUna('capo', { action: 'conforme', kind: 'rotura' });
    assert.equal(r.capo?.kind, undefined);
  });

  it('volver a anotar la misma pieza la SUSTITUYE, no la duplica', () => {
    let r = conUna('capo', { action: 'observacion', kind: 'rayon' });
    r = setPart(r, 'capo', { action: 'conforme' }, AHORA, ASESOR);
    assert.equal(Object.keys(r).length, 1);
    assert.equal(r.capo?.action, 'conforme');
  });

  it('no muta el registro que recibe', () => {
    const antes = conUna('capo', { action: 'conforme' });
    setPart(antes, 'techo', { action: 'conforme' }, AHORA, ASESOR);
    assert.equal(Object.keys(antes).length, 1);
    clearPart(antes, 'capo');
    assert.equal(Object.keys(antes).length, 1);
  });

  it('quitar una pieza que no estaba devuelve el MISMO registro', () => {
    const r = conUna('capo', { action: 'conforme' });
    assert.equal(clearPart(r, 'techo'), r);
  });

  it('lo que se lee de la pieza: lo escrito, o el tipo de daño', () => {
    assert.equal(noteOf(conUna('capo', { action: 'observacion', kind: 'rayon' }), 'capo'), 'Rayón');
    assert.equal(
      noteOf(conUna('capo', { action: 'observacion', kind: 'rayon', note: 'Junto al faro' }), 'capo'),
      'Junto al faro',
    );
    assert.equal(noteOf(EMPTY_RECORD, 'capo'), undefined);
    assert.equal(noteOf(conUna('capo', { action: 'conforme' }), 'capo'), undefined);
  });

  it('las etiquetas de las tres acciones existen', () => {
    for (const a of PART_ACTIONS) assert.ok(ACTION_LABELS[a].length > 0, a);
  });

  it('los tipos de observación son los del diagrama, sin inventar ninguno', () => {
    assert.deepEqual([...OBSERVATION_KINDS], [...OBSERVATION_KINDS]);
    assert.ok(OBSERVATION_KINDS.length > 0);
  });
});

describe('una pieza es UNA pieza, aunque salga en varias vistas', () => {
  it('el registro se indexa por pieza, nunca por vista', () => {
    const r = conUna('capo', { action: 'observacion', kind: 'rayon' });
    assert.deepEqual(Object.keys(r), ['capo']);
    assert.ok(!Object.keys(r).some((k) => k.includes('superior') || k.includes('frontal')));
  });

  it('el capó sale en cuatro vistas y todas leen el MISMO estado', () => {
    const r = conUna('capo', { action: 'observacion', kind: 'rotura' });
    const vistas = PLACEMENTS.filter((p) => p.id === 'capo');
    assert.ok(vistas.length >= 3, 'el capó debe verse desde varias vistas');
    for (const v of vistas) {
      assert.equal(statusOf(r, v.id, false), 'problema', `la vista «${v.view}» discrepa`);
    }
  });

  it('el resumen cuenta piezas: un capó rayado es UNA observación', () => {
    const r = conUna('capo', { action: 'observacion', kind: 'rayon' });
    const s = summarizeRecord(r, allSpotIds());
    assert.equal(s.observaciones, 1);
    assert.equal(s.revisadas, 1);
  });

  it('el resumen NO cuenta apariciones visuales', () => {
    const r = conUna('capo', { action: 'observacion', kind: 'rayon' });
    const porDibujos = summarizeRecord(r, PLACEMENTS.map((p) => p.id));
    const porPiezas = summarizeRecord(r, allSpotIds());
    assert.equal(porDibujos.total, porPiezas.total, 'las repeticiones no inflan el total');
    assert.equal(porDibujos.observaciones, 1);
  });
});

describe('derivar los daños que el resto del sistema ya lee', () => {
  it('una observación sobre una zona produce su marca de daño', () => {
    const r = conUna('puerta-di', { action: 'observacion', kind: 'rotura' });
    assert.deepEqual(damageFromRecord(r), [{ zone: 'puerta-di', kind: 'rotura' }]);
  });

  it('lo conforme y lo pendiente NO son daños', () => {
    let r = conUna('capo', { action: 'conforme' });
    r = setPart(r, 'techo', { action: 'pendiente' }, AHORA, ASESOR);
    assert.deepEqual(damageFromRecord(r), []);
  });

  it('una pieza que NO es zona del diagrama no se cuela como daño', () => {
    // Una llanta o el tablero no caben en `DamageMark`: meterlos con un
    // identificador inventado rompería el parte escrito.
    const r = conUna('llanta-di', { action: 'observacion', kind: 'rotura' });
    assert.deepEqual(damageFromRecord(r), []);
  });

  it('salen en el orden del diagrama, que es como se lee un vehículo', () => {
    let r = conUna('paragolpes-trasero', { action: 'observacion', kind: 'rayon' });
    r = setPart(r, 'capo', { action: 'observacion', kind: 'rayon' }, AHORA, ASESOR);
    assert.deepEqual(damageFromRecord(r).map((d) => d.zone), ['capo', 'paragolpes-trasero']);
  });

  it('una observación sin tipo tampoco produce daño', () => {
    const r = conUna('capo', { action: 'observacion' });
    assert.deepEqual(damageFromRecord(r), []);
  });
});

describe('recuperar una recepción empezada con el diagrama anterior', () => {
  const viejos: readonly DamageMark[] = [
    { zone: 'capo', kind: 'rayon' },
    { zone: 'puerta-di', kind: 'rotura' },
  ];

  it('los daños marcados antes NO se pierden', () => {
    const r = recordFromDamage(viejos, AHORA, ASESOR);
    assert.equal(statusOf(r, 'capo', false), 'revisar');
    assert.equal(statusOf(r, 'puerta-di', false), 'problema');
  });

  it('lo que no estaba marcado sigue sin inspeccionar, que es la verdad', () => {
    // El diagrama antiguo no sabía distinguir «revisado» de «sin mirar».
    const r = recordFromDamage(viejos, AHORA, ASESOR);
    assert.equal(statusOf(r, 'techo', false), 'pendiente');
  });

  it('el viaje de ida y vuelta no cambia los daños', () => {
    assert.deepEqual(damageFromRecord(recordFromDamage(viejos, AHORA, ASESOR)), viejos);
  });
});

describe('cerrar la inspección', () => {
  it('las obligatorias son las quince zonas del diagrama', () => {
    assert.equal(REQUIRED_PARTS.length, ZONES.length);
    for (const z of ZONES) assert.ok(REQUIRED_PARTS.includes(z.id), z.id);
  });

  it('no se puede terminar con zonas sin mirar', () => {
    assert.equal(canFinish(EMPTY_RECORD), false);
    assert.equal(pendingRequired(EMPTY_RECORD).length, ZONES.length);
  });

  it('dice cuántas faltan, en singular y en plural', () => {
    let r = EMPTY_RECORD;
    for (const z of ZONES.slice(0, ZONES.length - 2)) {
      r = setPart(r, z.id, { action: 'conforme' }, AHORA, ASESOR);
    }
    assert.equal(pendingPhrase(r), 'Aún quedan 2 zonas por revisar.');

    r = setPart(r, ZONES[ZONES.length - 2]!.id, { action: 'conforme' }, AHORA, ASESOR);
    assert.equal(pendingPhrase(r), 'Aún queda 1 zona por revisar.');
  });

  it('con todas miradas se puede terminar, y ya no avisa', () => {
    let r = EMPTY_RECORD;
    for (const z of ZONES) r = setPart(r, z.id, { action: 'conforme' }, AHORA, ASESOR);
    assert.equal(canFinish(r), true);
    assert.equal(pendingPhrase(r), null);
  });

  it('marcar «pendiente» CUENTA como mirada: se decidió volver luego', () => {
    let r = EMPTY_RECORD;
    for (const z of ZONES) r = setPart(r, z.id, { action: 'pendiente' }, AHORA, ASESOR);
    assert.equal(canFinish(r), true);
  });

  it('las piezas que no son zona no bloquean el cierre', () => {
    let r = EMPTY_RECORD;
    for (const z of ZONES) r = setPart(r, z.id, { action: 'conforme' }, AHORA, ASESOR);
    assert.equal(canFinish(r), true, 'llantas y tablero no son obligatorias');
    assert.ok(allSpotIds().length > REQUIRED_PARTS.length);
  });
});

describe('el resumen y el avance', () => {
  it('separa lo revisado de lo conforme: avance NO es calidad', () => {
    let r = conUna('capo', { action: 'observacion', kind: 'rotura' });
    r = setPart(r, 'techo', { action: 'conforme' }, AHORA, ASESOR);
    r = setPart(r, 'porton', { action: 'pendiente' }, AHORA, ASESOR);

    const s = summarizeRecord(r, ['capo', 'techo', 'porton', 'luneta']);
    assert.deepEqual(s, {
      total: 4,
      revisadas: 3,
      conformes: 1,
      observaciones: 1,
      pendientes: 1,
      sinInspeccionar: 1,
      percent: 75,
    });
    assert.equal(progressPhrase(s), '3 / 4 zonas revisadas');
  });

  it('un registro vacío es 0 %, no 100 %', () => {
    const s = summarizeRecord(EMPTY_RECORD, ['capo', 'techo']);
    assert.equal(s.percent, 0);
    assert.equal(s.sinInspeccionar, 2);
  });

  it('sin piezas no divide entre cero', () => {
    assert.equal(summarizeRecord(EMPTY_RECORD, []).percent, 0);
  });
});

describe('persistencia', () => {
  it('cada vehículo guarda en su ranura, escriba como escriba la placa', () => {
    assert.equal(inspectionSlot('ABC123'), 'recepcion.ABC123.inspeccion');
    assert.equal(inspectionSlot('ABC-123'), inspectionSlot('ABC123'));
    assert.notEqual(inspectionSlot('ABC123'), inspectionSlot('XYZ987'));
  });

  it('recupera lo guardado tal cual', () => {
    const r = conUna('capo', { action: 'observacion', kind: 'rayon', note: 'Junto al faro' });
    assert.deepEqual(readRecord(JSON.parse(JSON.stringify(r))), r);
  });

  it('descarta filas irreconocibles sin tirar las buenas', () => {
    const leido = readRecord({
      capo: { action: 'conforme', at: 1, by: 'A' },
      techo: { action: 'inventada', at: 1, by: 'A' },
      porton: 'no es un objeto',
    });
    assert.deepEqual(Object.keys(leido), ['capo']);
  });

  it('un tipo de daño que no existe se ignora, y la pieza sobrevive', () => {
    const leido = readRecord({ capo: { action: 'observacion', kind: 'meteorito', at: 1, by: 'A' } });
    assert.equal(leido.capo?.action, 'observacion');
    assert.equal(leido.capo?.kind, undefined);
  });

  it('nunca lanza ante basura', () => {
    for (const basura of [null, undefined, 0, 'texto', [], [1, 2]]) {
      assert.deepEqual(readRecord(basura), EMPTY_RECORD);
    }
  });
});

describe('la placa no puede partir el almacén en dos', () => {
  it('«ABC-123» y «ABC123» son el mismo vehículo', () => {
    // El fallo real: la recepción recibía la placa con guion —como se lee en
    // el vehículo— y la orden sin él —como está en el registro—. Cada pantalla
    // funcionaba consigo misma y la inspección no llegaba nunca a la orden.
    assert.equal(plateKey('ABC-123'), 'ABC123');
    assert.equal(plateKey('abc 123'), 'ABC123');
    assert.equal(damageSlot('ABC-123'), damageSlot('ABC123'));
    assert.equal(partPhotoAnchor('ABC-123', 'capo'), partPhotoAnchor('abc123', 'capo'));
  });

  it('vehículos distintos siguen separados', () => {
    assert.notEqual(damageSlot('ABC123'), damageSlot('XYZ987'));
    assert.notEqual(partPhotoAnchor('ABC123', 'capo'), partPhotoAnchor('ABC123', 'techo'));
  });

  it('la ranura anterior se puede leer para no perder lo empezado', () => {
    assert.equal(legacyDamageSlot('ABC-123'), 'recepcion.ABC-123.danos');
    assert.notEqual(legacyDamageSlot('ABC-123'), damageSlot('ABC-123'));
  });

  it('la firma y el firmante viajan con la misma placa canónica', () => {
    assert.equal(signatureSlot('ABC-123'), signatureSlot('ABC123'));
    assert.equal(signerSlot('ABC-123'), signerSlot('ABC123'));
  });
});
