import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ORDER_STATUSES } from '@/features/orders/services/order-status';
import { STAGES, STAGE_HREFS, STAGE_LABELS, countByStage, stageOf } from './stages';

describe('mapeo de situación a etapa', () => {
  it('cubre TODAS las situaciones del dominio', () => {
    // Esta es la prueba que importa. Si mañana alguien añade una situación
    // nueva y no decide su etapa, el vehículo desaparecería del recuento sin
    // que nada avisara: ni error, ni hueco, solo un número más bajo.
    for (const status of ORDER_STATUSES) {
      const stage = stageOf(status);
      assert.ok(
        stage === null || STAGES.includes(stage),
        `«${status}» no cae en ninguna etapa conocida`,
      );
    }
  });

  it('deja fuera exactamente lo que ya no está en el taller', () => {
    const fuera = ORDER_STATUSES.filter((s) => stageOf(s) === null);
    assert.deepEqual([...fuera], ['ENTREGADO', 'CERRADO', 'CANCELADO']);
  });

  it('cada etapa tiene al menos una situación', () => {
    // Una etapa vacía siempre mostraría cero y ocuparía sitio para nada.
    for (const stage of STAGES) {
      assert.ok(
        ORDER_STATUSES.some((s) => stageOf(s) === stage),
        `la etapa «${stage}» no la alcanza ninguna situación`,
      );
    }
  });

  it('lo comercial cuenta como repuestos', () => {
    // Desde la nave, esperar la aprobación del cliente y esperar la pieza son
    // la misma situación: no se puede trabajar en el vehículo.
    assert.equal(stageOf('ESPERANDO_CLIENTE'), 'repuestos');
    assert.equal(stageOf('ESPERANDO_REPUESTOS'), 'repuestos');
    assert.equal(stageOf('COTIZACION_ENVIADA'), 'repuestos');
  });

  it('la reparación pausada sigue siendo reparación', () => {
    assert.equal(stageOf('REPARACION_PAUSADA'), 'reparacion');
  });

  it('lavado y alineamiento van con los listos', () => {
    assert.equal(stageOf('EN_LAVADO'), 'listos');
    assert.equal(stageOf('PENDIENTE_ALINEAMIENTO'), 'listos');
    assert.equal(stageOf('LISTO_PARA_ENTREGA'), 'listos');
  });
});

describe('recuento por etapa', () => {
  it('agrupa y no pierde a nadie', () => {
    const counts = countByStage([
      'RECEPCIONADO',
      'EN_DIAGNOSTICO',
      'ESPERANDO_REPUESTOS',
      'EN_REPARACION',
      'REPARACION_PAUSADA',
      'CONTROL_CALIDAD',
      'EN_LAVADO',
    ]);
    assert.deepEqual(counts, {
      recepcion: 1,
      diagnostico: 1,
      repuestos: 1,
      reparacion: 2,
      calidad: 1,
      listos: 1,
    });
  });

  it('no cuenta lo que ya salió del taller', () => {
    const counts = countByStage(['ENTREGADO', 'CERRADO', 'CANCELADO', 'RECEPCIONADO']);
    assert.equal(counts.recepcion, 1);
    assert.equal(
      Object.values(counts).reduce((a, b) => a + b, 0),
      1,
    );
  });

  it('sin órdenes, todas las etapas en cero', () => {
    const counts = countByStage([]);
    assert.equal(
      Object.values(counts).reduce((a, b) => a + b, 0),
      0,
    );
  });
});

describe('etiquetas y destinos', () => {
  it('cada etapa tiene nombre y sitio adonde ir', () => {
    for (const stage of STAGES) {
      assert.ok(STAGE_LABELS[stage].length > 0);
      assert.ok(STAGE_HREFS[stage].startsWith('/'));
    }
  });
});
