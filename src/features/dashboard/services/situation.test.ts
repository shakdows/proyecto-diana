import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  countFinishingToday,
  isSameDay,
  situationOf,
  summarizeAttention,
  type AttentionLike,
} from './situation';

const crit = (kind: AttentionLike['kind']): AttentionLike => ({ kind, severity: 'crit' });
const warn = (kind: AttentionLike['kind']): AttentionLike => ({ kind, severity: 'warn' });
const wait = (kind: AttentionLike['kind']): AttentionLike => ({ kind, severity: 'wait' });

describe('taller sin problemas', () => {
  it('lo dice y cuenta lo que hay', () => {
    const s = situationOf({ activeCount: 8, finishingToday: 3, items: [] });
    assert.equal(s.tone, 'estable');
    assert.equal(s.headline, 'Operación estable');
    assert.equal(s.detail, '8 vehículos activos · 3 terminan hoy');
  });

  it('con uno solo no dice «1 vehículos»', () => {
    const s = situationOf({ activeCount: 1, finishingToday: 1, items: [] });
    assert.equal(s.detail, '1 vehículo activo · 1 termina hoy');
  });

  it('si hoy no termina ninguno, lo dice en vez de callarlo', () => {
    const s = situationOf({ activeCount: 5, finishingToday: 0, items: [] });
    assert.equal(s.detail, '5 vehículos activos · ninguno termina hoy');
  });

  it('el taller vacío no es «operación estable»', () => {
    // Decir «estable» con el taller parado es una frase que suena bien y no
    // informa. Sin vehículos, lo útil es que hay hueco para recibir.
    const s = situationOf({ activeCount: 0, finishingToday: 0, items: [] });
    assert.equal(s.tone, 'estable');
    assert.equal(s.headline, 'Taller sin vehículos');
    assert.equal(s.detail, 'Nada en proceso. Buen momento para recibir.');
  });
});

describe('taller con problemas', () => {
  it('cuenta vehículos, no clases de problema', () => {
    const s = situationOf({
      activeCount: 8,
      finishingToday: 2,
      items: [warn('repuestos'), warn('repuestos'), wait('cliente')],
    });
    assert.equal(s.headline, '3 vehículos necesitan tu atención');
  });

  it('con uno solo concuerda el verbo', () => {
    const s = situationOf({ activeCount: 8, finishingToday: 2, items: [warn('riesgo')] });
    assert.equal(s.headline, '1 vehículo necesita tu atención');
  });

  it('un solo caso grave tiñe todo el encabezado', () => {
    // Promediar gravedades escondería justo el caso que hay que ver.
    const s = situationOf({
      activeCount: 9,
      finishingToday: 1,
      items: [wait('cliente'), wait('cliente'), crit('pausada')],
    });
    assert.equal(s.tone, 'critico');
  });

  it('sin nada grave, el tono es de aviso y no de alarma', () => {
    const s = situationOf({
      activeCount: 9,
      finishingToday: 1,
      items: [warn('repuestos'), wait('cliente')],
    });
    assert.equal(s.tone, 'atencion');
  });

  it('el detalle enumera los motivos, no los vehículos', () => {
    const s = situationOf({
      activeCount: 8,
      finishingToday: 2,
      items: [warn('repuestos'), warn('riesgo')],
    });
    assert.equal(s.detail, '1 esperando repuestos · 1 en riesgo de retraso');
  });
});

describe('resumen de motivos', () => {
  it('pluraliza cambiando las dos palabras, no pegando una ese', () => {
    assert.equal(summarizeAttention([crit('pausada'), crit('pausada')]), '2 reparaciones pausadas');
    assert.equal(summarizeAttention([crit('retrasada'), crit('retrasada')]), '2 entregas retrasadas');
  });

  it('deja invariables las que ya son frase', () => {
    assert.equal(summarizeAttention([warn('repuestos'), warn('repuestos')]), '2 esperando repuestos');
  });

  it('ordena por lo que el taller controla, no por cuántos hay', () => {
    // Cinco cotizaciones sin respuesta no son más urgentes que una reparación
    // parada: lo primero que se lee tiene que ser sobre lo que uno puede actuar.
    const items = [wait('cliente'), wait('cliente'), wait('cliente'), crit('pausada')];
    assert.equal(summarizeAttention(items), '1 reparación pausada · 3 esperando al cliente');
  });

  it('sin avisos, no hay texto', () => {
    assert.equal(summarizeAttention([]), '');
  });
});

describe('cuántos terminan hoy', () => {
  const now = new Date('2026-09-11T15:00:00');

  it('cuenta las horas estimadas del mismo día', () => {
    const etas = [new Date('2026-09-11T17:30:00'), new Date('2026-09-12T09:00:00'), null];
    assert.equal(countFinishingToday(etas, now), 1);
  });

  it('una hora estimada que ya pasó sigue siendo hoy', () => {
    // Excluirla haría que un taller con retrasos dijera «ninguno termina hoy»,
    // que es justo lo contrario de lo que pasa.
    assert.equal(countFinishingToday([new Date('2026-09-11T09:00:00')], now), 1);
  });

  it('no confunde el mismo día de otro mes', () => {
    assert.equal(countFinishingToday([new Date('2026-10-11T15:00:00')], now), 0);
    assert.equal(countFinishingToday([new Date('2025-09-11T15:00:00')], now), 0);
  });

  it('sin hora estimada no cuenta', () => {
    assert.equal(countFinishingToday([null, null], now), 0);
  });
});

describe('mismo día', () => {
  it('distingue año, mes y día', () => {
    assert.equal(isSameDay(new Date('2026-09-11T00:00:00'), new Date('2026-09-11T23:59:59')), true);
    assert.equal(isSameDay(new Date('2026-09-11T23:59:59'), new Date('2026-09-12T00:00:00')), false);
  });
});

describe('la parte destacada del titular', () => {
  it('es siempre un prefijo exacto de la frase', () => {
    const casos = [
      situationOf({ activeCount: 0, finishingToday: 0, items: [] }),
      situationOf({ activeCount: 8, finishingToday: 3, items: [] }),
      situationOf({
        activeCount: 8,
        finishingToday: 3,
        items: [{ kind: 'pausada', severity: 'crit' }],
      }),
      situationOf({
        activeCount: 8,
        finishingToday: 3,
        items: [
          { kind: 'pausada', severity: 'crit' },
          { kind: 'repuestos', severity: 'warn' },
        ],
      }),
    ];

    for (const s of casos) {
      assert.ok(
        s.headline.startsWith(s.emphasis),
        `«${s.emphasis}» no encabeza «${s.headline}»`,
      );
    }
  });

  it('sin nada que atender no hay cifra que destacar', () => {
    assert.equal(situationOf({ activeCount: 8, finishingToday: 3, items: [] }).emphasis, '');
  });

  it('destaca la cifra y el sustantivo, concordando', () => {
    const uno = situationOf({
      activeCount: 8,
      finishingToday: 1,
      items: [{ kind: 'pausada', severity: 'crit' }],
    });
    assert.equal(uno.emphasis, '1 vehículo');
    assert.equal(uno.headline, '1 vehículo necesita tu atención');

    const dos = situationOf({
      activeCount: 8,
      finishingToday: 1,
      items: [
        { kind: 'pausada', severity: 'crit' },
        { kind: 'cliente', severity: 'wait' },
      ],
    });
    assert.equal(dos.emphasis, '2 vehículos');
    assert.equal(dos.headline, '2 vehículos necesitan tu atención');
  });
});
