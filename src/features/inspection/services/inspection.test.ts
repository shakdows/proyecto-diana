import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { CANVAS, ZONES, type DamageMark } from '@/features/reception/services/damage-map';
import {
  DEFAULT_VIEW,
  VIEWS,
  VIEW_IDS,
  isViewId,
  nextView,
  viewById,
} from './views';
import {
  STATUSES,
  alertsByView,
  bySeverity,
  hotspotsForView,
  isStatus,
  statusInfo,
  summarize,
  summaryPhrase,
  type Hotspot,
} from './hotspots';
import { PLACEMENTS, allSpotIds, labelOf, placementsForView, viewsShowing } from './placement';
import { buildHotspots, damagePhotoAnchor, statusForDamage } from './from-damage';

describe('las vistas', () => {
  it('son cinco y la primera es el plano general', () => {
    assert.equal(VIEWS.length, 5);
    assert.equal(DEFAULT_VIEW, 'superior');
    assert.equal(VIEW_IDS[0], 'superior');
  });

  it('se recorren en círculo con el teclado', () => {
    assert.equal(nextView('superior', -1), 'interior');
    assert.equal(nextView('interior', 1), 'superior');
    assert.equal(nextView('superior', 1), 'lateral');
  });

  it('reconoce lo que es una vista y lo que no', () => {
    assert.equal(isViewId('lateral'), true);
    assert.equal(isViewId('cenital'), false);
  });

  it('cada vista dice qué se comprueba desde ella', () => {
    for (const v of VIEWS) {
      assert.ok(v.hint.length > 0, v.id);
      assert.equal(viewById(v.id).label, v.label);
    }
  });
});

describe('los estados', () => {
  it('«sin inspeccionar» es un estado propio, no «conforme»', () => {
    assert.ok(STATUSES.some((s) => s.id === 'pendiente'));
    assert.notEqual(statusInfo('pendiente').id, statusInfo('ok').id);
  });

  it('NINGUNO depende solo del color: todos llevan una marca legible', () => {
    for (const s of STATUSES) {
      assert.ok(s.mark.trim().length > 0, `«${s.id}» no tiene marca`);
      assert.ok(s.label.trim().length > 0, `«${s.id}» no tiene etiqueta`);
    }
  });

  it('lo grave pesa menos al ordenar, para salir primero', () => {
    assert.ok(statusInfo('problema').rank < statusInfo('revisar').rank);
    assert.ok(statusInfo('revisar').rank < statusInfo('ok').rank);
    assert.ok(statusInfo('ok').rank < statusInfo('pendiente').rank);
  });

  it('rechaza un estado inventado', () => {
    assert.equal(isStatus('problema'), true);
    assert.equal(isStatus('regular'), false);
  });
});

describe('dónde se pinta cada punto', () => {
  it('toda coordenada cae dentro del lienzo', () => {
    for (const p of PLACEMENTS) {
      assert.ok(p.x >= 0 && p.x <= 100, `${p.view}/${p.id} tiene x = ${p.x}`);
      assert.ok(p.y >= 0 && p.y <= 100, `${p.view}/${p.id} tiene y = ${p.y}`);
    }
  });

  it('no hay dos puntos iguales en la misma vista', () => {
    const vistos = new Set<string>();
    for (const p of PLACEMENTS) {
      const clave = `${p.view}:${p.id}`;
      assert.ok(!vistos.has(clave), `«${clave}» está repetido`);
      vistos.add(clave);
    }
  });

  it('todas las vistas tienen puntos', () => {
    for (const v of VIEW_IDS) {
      assert.ok(placementsForView(v).length > 0, `la vista «${v}» está vacía`);
    }
  });

  it('toda zona de carrocería que se dibuja EXISTE en el diagrama de daños', () => {
    // Si alguien renombra una zona allí, esto falla aquí en vez de dejar un
    // punto que nunca se enciende.
    const reales = new Set(ZONES.map((z) => z.id));
    for (const p of PLACEMENTS) {
      if (p.zone === undefined) continue;
      assert.ok(reales.has(p.zone), `«${p.zone}» no es una zona del diagrama`);
      assert.equal(p.id, p.zone, 'una zona de carrocería usa su propio identificador');
    }
  });

  it('las quince zonas del diagrama están todas en la vista superior', () => {
    const arriba = new Set(placementsForView('superior').map((p) => p.zone));
    for (const z of ZONES) {
      assert.ok(arriba.has(z.id), `falta «${z.id}» en la vista superior`);
    }
    assert.equal(placementsForView('superior').length, ZONES.length);
  });

  it('la vista superior coincide con el centro de cada zona del diagrama', () => {
    // El dibujo de arriba NO es libre: es el mismo lienzo del diagrama de
    // daños en porcentaje. Si allí se mueve una zona, aquí hay que moverla.
    for (const p of placementsForView('superior')) {
      const z = ZONES.find((zz) => zz.id === p.zone);
      assert.ok(z !== undefined);
      const cx = ((z.x + z.w / 2) / CANVAS.width) * 100;
      const cy = ((z.y + z.h / 2) / CANVAS.height) * 100;
      assert.ok(Math.abs(cx - p.x) < 0.6, `${p.id}: x ${p.x} vs ${cx.toFixed(1)}`);
      assert.ok(Math.abs(cy - p.y) < 0.6, `${p.id}: y ${p.y} vs ${cy.toFixed(1)}`);
    }
  });

  it('izquierda y derecha son DEL VEHÍCULO, no de la pantalla', () => {
    const faroI = PLACEMENTS.find((p) => p.id === 'faro-i');
    const faroD = PLACEMENTS.find((p) => p.id === 'faro-d');
    assert.ok(faroI !== undefined && faroD !== undefined);
    // De frente al vehículo, SU izquierda cae a la derecha de la pantalla.
    assert.ok(faroI.x > faroD.x, 'de frente, el faro izquierdo va a la derecha');

    const farolI = PLACEMENTS.find((p) => p.id === 'farol-i');
    const farolD = PLACEMENTS.find((p) => p.id === 'farol-d');
    assert.ok(farolI !== undefined && farolD !== undefined);
    // Por detrás, SU izquierda cae a la izquierda de la pantalla.
    assert.ok(farolI.x < farolD.x, 'por detrás, el farol izquierdo va a la izquierda');
  });

  it('un punto que sale en dos vistas lo dice', () => {
    assert.deepEqual([...viewsShowing('capo')].sort(), ['frontal', 'lateral', 'superior']);
    assert.deepEqual(viewsShowing('tablero'), ['interior']);
    assert.deepEqual(viewsShowing('inventado'), []);
  });

  it('los identificadores distintos no cuentan dos veces el mismo punto', () => {
    assert.ok(allSpotIds().length < PLACEMENTS.length);
    assert.equal(new Set(allSpotIds()).size, allSpotIds().length);
  });

  it('la etiqueta sale del catálogo y no del identificador', () => {
    assert.equal(labelOf('capo'), 'Capó');
    assert.equal(labelOf('nada'), 'nada');
  });
});

describe('traducir lo que anotó la recepción', () => {
  const rotura: DamageMark = { zone: 'puerta-di', kind: 'rotura' };
  const rayon: DamageMark = { zone: 'capo', kind: 'rayon' };

  it('una rotura es un problema; un rayón, algo que revisar', () => {
    assert.equal(statusForDamage(rotura), 'problema');
    assert.equal(statusForDamage(rayon), 'revisar');
    assert.equal(statusForDamage({ zone: 'capo', kind: 'abolladura' }), 'revisar');
    assert.equal(statusForDamage({ zone: 'capo', kind: 'faltante' }), 'problema');
  });

  it('con la recepción SIN cerrar, lo no marcado está sin inspeccionar', () => {
    const puntos = buildHotspots({ damage: [], reviewed: false });
    assert.ok(puntos.length > 0);
    assert.ok(puntos.every((h) => h.status === 'pendiente'));
  });

  it('con la recepción cerrada, lo no marcado sí está conforme', () => {
    const puntos = buildHotspots({ damage: [], reviewed: true });
    assert.ok(puntos.every((h) => h.status === 'ok'));
  });

  it('el daño gana sobre «conforme» aunque la recepción esté cerrada', () => {
    const puntos = buildHotspots({ damage: [rotura], reviewed: true });
    const puerta = puntos.filter((h) => h.id === 'puerta-di');
    assert.ok(puerta.length > 0);
    assert.ok(puerta.every((h) => h.status === 'problema'));
  });

  it('la misma zona en dos vistas cuenta la MISMA historia', () => {
    const puntos = buildHotspots({ damage: [rayon], reviewed: true });
    const capo = puntos.filter((h) => h.id === 'capo');
    assert.equal(capo.length, 3, 'el capó se ve desde arriba, de lado y de frente');
    assert.equal(new Set(capo.map((h) => h.status)).size, 1);
    assert.equal(new Set(capo.map((h) => h.note)).size, 1);
  });

  it('sin observación escrita, la del daño sirve de resumen', () => {
    const [capo] = buildHotspots({ damage: [rayon], reviewed: true }).filter((h) => h.id === 'capo');
    assert.equal(capo?.note, 'Rayón');
  });

  it('una observación escrita manda sobre la del daño', () => {
    const puntos = buildHotspots({
      damage: [rayon],
      reviewed: true,
      notes: { capo: 'Rayón de 12 cm junto al faro derecho.' },
    });
    const capo = puntos.find((h) => h.id === 'capo');
    assert.equal(capo?.note, 'Rayón de 12 cm junto al faro derecho.');
  });

  it('sin destino NO se inventa un enlace', () => {
    const puntos = buildHotspots({ damage: [], reviewed: true });
    assert.ok(puntos.every((h) => h.href === undefined));

    const conDestino = buildHotspots({
      damage: [],
      reviewed: true,
      hrefFor: (id) => (id === 'capo' ? '/ordenes/os-154' : undefined),
    });
    assert.equal(conDestino.find((h) => h.id === 'capo')?.href, '/ordenes/os-154');
    assert.equal(conDestino.find((h) => h.id === 'techo')?.href, undefined);
  });

  it('las fotos y los vídeos llegan por punto', () => {
    const puntos = buildHotspots({
      damage: [rotura],
      reviewed: true,
      photos: { 'puerta-di': 3 },
      videos: { 'puerta-di': 1 },
    });
    const puerta = puntos.find((h) => h.id === 'puerta-di');
    assert.equal(puerta?.photos, 3);
    assert.equal(puerta?.videos, 1);
  });

  it('la ranura de fotos es la que escribe la recepción', () => {
    assert.equal(damagePhotoAnchor('ABC123', 'capo'), 'danos:ABC123:capo');
  });

  /*
   * La prueba que protege la decisión de fondo: lo que se GUARDA no lleva
   * coordenadas. Si alguien mete `x`/`y` en el registro, el dibujo pasa a ser
   * dato y rediseñar la silueta movería daños ya anotados.
   */
  it('lo que identifica a un punto NUNCA es su coordenada', () => {
    const puntos = buildHotspots({ damage: [rotura], reviewed: true });
    for (const h of puntos) {
      assert.equal(typeof h.id, 'string');
      assert.ok(!h.id.includes(String(h.x)), `«${h.id}» lleva la coordenada dentro`);
    }
    const ids = new Set(puntos.map((h) => h.id));
    assert.ok(ids.has('capo') && ids.has('puerta-di'));
  });
});

describe('resumen y reparto', () => {
  const puntos: readonly Hotspot[] = [
    { id: 'a', view: 'superior', x: 1, y: 1, label: 'A', status: 'problema' },
    { id: 'b', view: 'superior', x: 2, y: 2, label: 'B', status: 'revisar' },
    { id: 'c', view: 'lateral', x: 3, y: 3, label: 'C', status: 'ok' },
    { id: 'd', view: 'lateral', x: 4, y: 4, label: 'D', status: 'pendiente' },
  ];

  it('cuenta lo que importa y separa lo revisado de lo pendiente', () => {
    const s = summarize(puntos);
    assert.deepEqual(s, { total: 4, problema: 1, revisar: 1, pendiente: 1, revisados: 3 });
  });

  it('una pieza que sale en tres vistas cuenta UNA vez', () => {
    // El capó se ve desde arriba, de lado y de frente. Contando dibujos, un
    // capó rayado salía como «3 por revisar», que asusta y es falso.
    const capo: readonly Hotspot[] = [
      { id: 'capo', view: 'superior', x: 1, y: 1, label: 'Capó', status: 'revisar' },
      { id: 'capo', view: 'lateral', x: 2, y: 2, label: 'Capó', status: 'revisar' },
      { id: 'capo', view: 'frontal', x: 3, y: 3, label: 'Capó', status: 'revisar' },
    ];
    assert.deepEqual(summarize(capo), {
      total: 1, problema: 0, revisar: 1, pendiente: 0, revisados: 1,
    });
    assert.equal(summaryPhrase(summarize(capo)), '1 por revisar');
  });

  it('si dos vistas discreparan, manda lo más grave', () => {
    const mezcla: readonly Hotspot[] = [
      { id: 'capo', view: 'superior', x: 1, y: 1, label: 'Capó', status: 'ok' },
      { id: 'capo', view: 'frontal', x: 2, y: 2, label: 'Capó', status: 'problema' },
    ];
    assert.equal(summarize(mezcla).problema, 1);
    assert.equal(summarize(mezcla).total, 1);
  });

  it('el resumen de lo sembrado dice la verdad: dos piezas, no seis', () => {
    const reales = buildHotspots({
      damage: [
        { zone: 'puerta-di', kind: 'rotura' },
        { zone: 'capo', kind: 'rayon' },
      ],
      reviewed: true,
    });
    const s = summarize(reales);
    assert.equal(s.problema, 1, 'una puerta rota');
    assert.equal(s.revisar, 1, 'un capó rayado');
  });

  it('la frase dice lo que hay que mirar, no lo que está bien', () => {
    assert.equal(summaryPhrase(summarize(puntos)), '1 con problema · 1 por revisar · 1 sin inspeccionar');
    assert.equal(summaryPhrase(summarize([{ ...puntos[2] } as Hotspot])), '1 punto, conforme');
    assert.equal(summaryPhrase(summarize([])), 'Sin puntos de inspección.');
  });

  it('avisa por vista solo de lo que tiene algo que mirar', () => {
    assert.deepEqual(alertsByView(puntos), { superior: 2 });
  });

  it('filtra por vista', () => {
    assert.equal(hotspotsForView(puntos, 'lateral').length, 2);
    assert.equal(hotspotsForView(puntos, 'interior').length, 0);
  });

  it('ordena lo grave primero y de forma estable', () => {
    const orden = bySeverity(puntos).map((h) => h.id);
    assert.deepEqual(orden, ['a', 'b', 'c', 'd']);
  });

  it('no muta la lista que recibe', () => {
    const copia = [...puntos];
    bySeverity(puntos);
    assert.deepEqual(puntos, copia);
  });
});
