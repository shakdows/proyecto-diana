import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { ATTENTION_KINDS, actionFor, upcomingDeliveries } from './operations';
import { attentionItems, demoBoard } from '@/features/demo/board';
import { stageOf } from './stages';

const NOW = new Date('2026-09-12T10:00:00-05:00');

describe('la acción de cada problema', () => {
  it('cada clase de aviso tiene su acción, y ninguna se repite en destino', () => {
    const labels = ATTENTION_KINDS.map((k) => actionFor(k).label);
    assert.equal(new Set(labels).size, labels.length, 'dos avisos con la misma etiqueta');
  });

  it('el destino es donde se resuelve, no la ficha genérica', () => {
    assert.equal(actionFor('repuestos').href('os-1'), '/ordenes/os-1/repuestos');
    assert.equal(actionFor('cliente').href('os-1'), '/ordenes/os-1/cotizacion');
  });

  it('todo aviso de la demostración encuentra su acción', () => {
    for (const item of attentionItems(demoBoard(NOW), NOW)) {
      const action = actionFor(item.kind);
      assert.ok(action.label.length > 0, item.kind);
      assert.match(action.href(item.row.order.id), /^\/ordenes\//u);
    }
  });
});

describe('las próximas entregas', () => {
  const rows = demoBoard(NOW);

  it('salen ordenadas, de lo más cercano a lo más lejano', () => {
    const times = upcomingDeliveries(rows, NOW, 10).map((d) => d.at.getTime());
    assert.deepEqual(times, [...times].sort((a, b) => a - b));
  });

  it('nunca anuncia una hora que ya pasó', () => {
    for (const d of upcomingDeliveries(rows, NOW, 10)) {
      assert.ok(d.at.getTime() >= NOW.getTime(), `${d.plate} promete en el pasado`);
    }
  });

  it('una orden sin promesa no se cuela con una hora inventada', () => {
    const sinPromesa = rows.filter((r) => r.promisedAt === null).map((r) => r.order.id);
    assert.ok(sinPromesa.length > 0, 'la demostración necesita una orden sin promesa');

    const anunciadas = new Set(upcomingDeliveries(rows, NOW, 99).map((d) => d.id));
    for (const id of sinPromesa) assert.ok(!anunciadas.has(id), id);
  });

  it('un vehículo que ya salió del taller no vuelve a anunciarse', () => {
    const fuera = new Set(
      rows.filter((r) => stageOf(r.order.status) === null).map((r) => r.order.id),
    );
    for (const d of upcomingDeliveries(rows, NOW, 99)) assert.ok(!fuera.has(d.id), d.id);
  });

  it('«listo» distingue lo que ya está preparado de lo que aún se trabaja', () => {
    for (const d of upcomingDeliveries(rows, NOW, 99)) {
      const row = rows.find((r) => r.order.id === d.id);
      assert.equal(d.ready, stageOf(row?.order.status ?? 'DRAFT') === 'listos', d.plate);
    }
  });
});

describe('las horas prometidas de la demostración', () => {
  it('no caen todas a la misma hora', () => {
    const horas = new Set(
      demoBoard(NOW)
        .map((r) => r.promisedAt)
        .filter((d): d is Date => d !== null)
        .map((d) => d.toISOString().slice(11, 16)),
    );

    /* Antes todas se llevaban al cierre de la jornada. Fila a fila era
       plausible; en una lista de próximas entregas, las cuatro decían
       «Hoy 17:00» y parecía un contador roto. */
    assert.ok(horas.size > 1, `todas las promesas caen a las ${[...horas][0] ?? '—'}`);
  });

  it('ninguna promete fuera del horario de atención', () => {
    for (const row of demoBoard(NOW)) {
      if (row.promisedAt === null) continue;
      const hh = Number(
        new Intl.DateTimeFormat('en-GB', {
          timeZone: 'America/Lima',
          hour: '2-digit',
          hour12: false,
        }).format(row.promisedAt),
      );
      assert.ok(hh >= 8 && hh <= 18, `${row.order.plate} promete a las ${String(hh)}`);
    }
  });

  it('redondear no cambia de lado el semáforo', () => {
    for (const row of demoBoard(NOW)) {
      if (row.promisedAt === null || row.order.promisedInMinutes === null) continue;
      const vencida = row.promisedAt.getTime() < NOW.getTime();
      assert.equal(
        vencida,
        row.order.promisedInMinutes < 0,
        `${row.order.plate} cambió de lado al redondear`,
      );
    }
  });
});

describe('la variedad de las promesas no depende de la hora a la que se mire', () => {
  it('a cualquier hora del día hay más de una hora distinta', () => {
    for (const hora of ['01:35', '08:00', '13:00', '19:30', '23:50']) {
      const ahora = new Date(`2026-09-12T${hora}:00-05:00`);
      const horas = new Set(
        demoBoard(ahora)
          .map((r) => r.promisedAt)
          .filter((d): d is Date => d !== null)
          .map((d) => d.toISOString()),
      );
      assert.ok(horas.size > 1, `mirando a las ${hora} todas las promesas coinciden`);
    }
  });
});
