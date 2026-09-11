import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { PERMISSIONS, type Permission } from '@/lib/auth/permissions';
import {
  BusinessRuleError,
  ForbiddenError,
  InvalidTransitionError,
} from '@/lib/errors';
import {
  ORDER_STATUSES,
  TERMINAL_STATUSES,
  isOrderStatus,
  type OrderStatus,
} from './order-status';
import {
  ORDER_ACTIONS,
  TRANSITION_COUNT,
  allTransitions,
  assertTransition,
  availableActions,
  canTransition,
  transitionExists,
  type Actor,
  type OrderFacts,
} from './state-machine';

/** Actor con todos los permisos: aísla las guardas del RBAC. */
const god: Actor = { profileId: 'tec-1', permissions: PERMISSIONS };

function actorWith(...permissions: Permission[]): Actor {
  return { profileId: 'tec-1', permissions };
}

/** Orden que cumple todas las guardas; cada prueba rompe solo lo que mide. */
function facts(overrides: Partial<OrderFacts> = {}): OrderFacts {
  return {
    status: 'DRAFT',
    hasCustomer: true,
    hasVehicle: true,
    hasServiceType: true,
    requiredChecklistItems: 10,
    resolvedChecklistItems: 10,
    hasCustomerSignature: true,
    hasAdvisorSignature: true,
    assignedTechnicianId: 'tec-1',
    diagnosticItemCount: 4,
    quotationLineCount: 4,
    quotationLinesPriced: 4,
    authorizationLinkIssued: true,
    decidedItemCount: 4,
    approvedItemCount: 4,
    requiredPartsCount: 3,
    partsCoverageComplete: true,
    partsRequestPending: true,
    supplierLinesAllSelected: true,
    purchaseWithinAuthorizerLimit: true,
    purchaseOrderIssued: true,
    estimatedMinutes: 210,
    repairJobsTotal: 4,
    repairJobsDone: 4,
    hasOpenTimeSession: false,
    hasFinalEvidence: true,
    qualityChecklistComplete: true,
    qualityFindingCount: 1,
    pendingFinalStages: [],
    deliveryActSigned: true,
    hasOpenTasks: false,
    ...overrides,
  };
}

describe('integridad del grafo', () => {
  it('mantiene las cifras que declara la documentación', () => {
    // docs/03-maquina-de-estados.md §3.4. Si el grafo cambia, esta prueba
    // falla y obliga a actualizar el documento: las cifras no se mantienen
    // a mano.
    assert.equal(ORDER_STATUSES.length, 34, 'estados');
    assert.equal(ORDER_ACTIONS.length, 40, 'acciones');
    assert.equal(TRANSITION_COUNT, 76, 'pares (estado, acción)');
    assert.equal(
      allTransitions().filter((t) => t.action === 'cancelar').length,
      31,
      'cancelar disponible en 31 estados',
    );
  });

  it('declara transiciones y todas apuntan a estados válidos', () => {
    assert.ok(TRANSITION_COUNT > 0);
    for (const { from, action } of allTransitions()) {
      assert.ok(isOrderStatus(from), `estado de origen desconocido: ${from}`);
      assert.ok(
        (ORDER_ACTIONS as readonly string[]).includes(action),
        `acción desconocida: ${action}`,
      );
    }
  });

  it('todo estado no terminal tiene al menos una salida', () => {
    for (const status of ORDER_STATUSES) {
      if (TERMINAL_STATUSES.has(status)) continue;
      const outgoing = ORDER_ACTIONS.filter((a) => transitionExists(status, a));
      assert.ok(outgoing.length > 0, `${status} no tiene ninguna transición de salida`);
    }
  });

  it('los estados terminales no tienen salida', () => {
    for (const status of TERMINAL_STATUSES) {
      for (const action of ORDER_ACTIONS) {
        assert.equal(
          transitionExists(status, action),
          false,
          `${status} no debería permitir ${action}`,
        );
      }
    }
  });

  it('cancelar está disponible en todo estado anterior a ENTREGADO', () => {
    for (const status of ORDER_STATUSES) {
      const expected = !TERMINAL_STATUSES.has(status) && status !== 'ENTREGADO';
      assert.equal(
        transitionExists(status, 'cancelar'),
        expected,
        `cancelar en ${status} debería ser ${expected}`,
      );
    }
  });

  it('todo estado no terminal es alcanzable desde DRAFT', () => {
    // Recorrido en anchura sobre el grafo, ignorando permisos y guardas.
    const reached = new Set<OrderStatus>(['DRAFT']);
    const queue: OrderStatus[] = ['DRAFT'];

    while (queue.length > 0) {
      const current = queue.shift() as OrderStatus;
      for (const action of ORDER_ACTIONS) {
        if (!transitionExists(current, action)) continue;
        // Se prueban ambos desenlaces de las transiciones con destino dinámico.
        for (const variant of [
          facts({ status: current, approvedItemCount: 4, quotationLineCount: 4 }),
          facts({ status: current, approvedItemCount: 2, quotationLineCount: 4 }),
          facts({ status: current, pendingFinalStages: ['lavado', 'alineamiento'] }),
          facts({ status: current, pendingFinalStages: ['alineamiento'] }),
          facts({ status: current, partsCoverageComplete: false }),
          facts({ status: current, requiredPartsCount: 0 }),
        ]) {
          const check = canTransition(variant, action, god);
          const target =
            check.allowed === true
              ? check.to
              : undefined;
          if (target !== undefined && !reached.has(target)) {
            reached.add(target);
            queue.push(target);
          }
        }
      }
    }

    const unreachable = ORDER_STATUSES.filter((s) => !reached.has(s));
    assert.deepEqual(unreachable, [], `estados inalcanzables: ${unreachable.join(', ')}`);
  });
});

describe('las tres comprobaciones', () => {
  it('rechaza una acción no declarada para el estado', () => {
    const check = canTransition(facts({ status: 'DRAFT' }), 'entregar', god);
    assert.equal(check.allowed, false);
    assert.equal(check.allowed === false && check.reason, 'unknown_transition');
    assert.throws(
      () => assertTransition(facts({ status: 'DRAFT' }), 'entregar', god),
      InvalidTransitionError,
    );
  });

  it('rechaza por falta de permiso, aunque la transición exista', () => {
    const sinPermiso = actorWith('orders:read');
    const check = canTransition(facts({ status: 'DRAFT' }), 'registrar_recepcion', sinPermiso);
    assert.equal(check.allowed, false);
    assert.equal(check.allowed === false && check.reason, 'forbidden');
    assert.throws(
      () => assertTransition(facts({ status: 'DRAFT' }), 'registrar_recepcion', sinPermiso),
      ForbiddenError,
    );
  });

  it('rechaza por requisitos incumplidos y los enumera', () => {
    const sinFirmas = facts({
      status: 'RECEPCIONADO',
      resolvedChecklistItems: 7,
      hasCustomerSignature: false,
      hasAdvisorSignature: false,
    });
    const check = canTransition(sinFirmas, 'completar_checklist', god);

    assert.equal(check.allowed, false);
    assert.equal(check.allowed === false && check.reason, 'unmet_requirements');
    assert.equal(check.allowed === false && check.unmet.length, 3);
    assert.ok(
      check.allowed === false && check.unmet.some((m) => m.includes('3 ítems obligatorios')),
    );

    assert.throws(() => assertTransition(sinFirmas, 'completar_checklist', god), BusinessRuleError);
  });

  it('permite la transición cuando todo se cumple', () => {
    const check = canTransition(facts({ status: 'RECEPCIONADO' }), 'completar_checklist', god);
    assert.equal(check.allowed, true);
    assert.equal(check.allowed === true && check.to, 'CHECKLIST_COMPLETADO');
  });
});

describe('decisión del cliente', () => {
  it('aprobar todo lleva a APROBADO', () => {
    const to = assertTransition(
      facts({ status: 'ESPERANDO_CLIENTE', decidedItemCount: 4, approvedItemCount: 4 }),
      'registrar_decision',
      god,
    );
    assert.equal(to, 'APROBADO');
  });

  it('aprobar una parte lleva a APROBACION_PARCIAL', () => {
    const to = assertTransition(
      facts({ status: 'ESPERANDO_CLIENTE', decidedItemCount: 4, approvedItemCount: 2 }),
      'registrar_decision',
      god,
    );
    assert.equal(to, 'APROBACION_PARCIAL');
  });

  it('no deja registrar la decisión si quedan ítems sin decidir', () => {
    const check = canTransition(
      facts({ status: 'ESPERANDO_CLIENTE', decidedItemCount: 3, approvedItemCount: 3 }),
      'registrar_decision',
      god,
    );
    assert.equal(check.allowed, false);
  });

  it('rechazarlo todo obliga a usar cerrar_sin_trabajos (I-3)', () => {
    const todoRechazado = facts({
      status: 'ESPERANDO_CLIENTE',
      decidedItemCount: 4,
      approvedItemCount: 0,
    });

    const decision = canTransition(todoRechazado, 'registrar_decision', god);
    assert.equal(decision.allowed, false);
    assert.ok(
      decision.allowed === false &&
        decision.unmet.some((m) => m.includes('Cerrar sin trabajos')),
    );

    assert.equal(assertTransition(todoRechazado, 'cerrar_sin_trabajos', god), 'LISTO_PARA_ENTREGA');
  });

  it('no permite cerrar sin trabajos si hay alguno aprobado', () => {
    const check = canTransition(
      facts({ status: 'ESPERANDO_CLIENTE', decidedItemCount: 4, approvedItemCount: 1 }),
      'cerrar_sin_trabajos',
      god,
    );
    assert.equal(check.allowed, false);
  });
});

describe('guardas de taller', () => {
  it('solo el técnico asignado inicia el diagnóstico', () => {
    const orden = facts({ status: 'PENDIENTE_DIAGNOSTICO', assignedTechnicianId: 'tec-9' });
    const check = canTransition(orden, 'iniciar_diagnostico', god);
    assert.equal(check.allowed, false);
    assert.ok(
      check.allowed === false && check.unmet.some((m) => m.includes('técnico asignado')),
    );
  });

  it('no se puede iniciar el trabajo sin tiempo estimado', () => {
    const check = canTransition(
      facts({ status: 'LISTO_PARA_REPARACION', estimatedMinutes: null }),
      'iniciar_trabajo',
      god,
    );
    assert.equal(check.allowed, false);
  });

  it('no se termina la reparación con una sesión de tiempo abierta', () => {
    const check = canTransition(
      facts({ status: 'EN_REPARACION', hasOpenTimeSession: true }),
      'terminar_reparacion',
      god,
    );
    assert.equal(check.allowed, false);
    assert.ok(
      check.allowed === false && check.unmet.some((m) => m.includes('sesión de tiempo abierta')),
    );
  });

  it('la ampliación de cotización sale de la reparación (I-7)', () => {
    assert.equal(
      assertTransition(facts({ status: 'EN_REPARACION' }), 'ampliar_cotizacion', god),
      'COTIZACION_EN_PREPARACION',
    );
    assert.equal(
      assertTransition(facts({ status: 'REPARACION_PAUSADA' }), 'ampliar_cotizacion', god),
      'COTIZACION_EN_PREPARACION',
    );
  });

  it('calidad observada devuelve la orden a reparación', () => {
    assert.equal(
      assertTransition(facts({ status: 'OBSERVADO_CONTROL_CALIDAD' }), 'retomar_reparacion', god),
      'EN_REPARACION',
    );
  });
});

describe('repuestos', () => {
  it('sin repuestos requeridos se salta el abastecimiento', () => {
    assert.equal(
      assertTransition(facts({ status: 'APROBADO', requiredPartsCount: 0 }), 'sin_repuestos', god),
      'LISTO_PARA_REPARACION',
    );
  });

  it('con repuestos requeridos no se puede saltar el abastecimiento', () => {
    const check = canTransition(
      facts({ status: 'APROBADO', requiredPartsCount: 3 }),
      'sin_repuestos',
      god,
    );
    assert.equal(check.allowed, false);
  });

  it('la recepción completa exige cobertura completa', () => {
    assert.equal(
      canTransition(
        facts({ status: 'REPUESTOS_PARCIALES', partsCoverageComplete: false }),
        'recepcion_completa',
        god,
      ).allowed,
      false,
    );
    assert.equal(
      assertTransition(
        facts({ status: 'REPUESTOS_PARCIALES', partsCoverageComplete: true }),
        'recepcion_completa',
        god,
      ),
      'REPUESTOS_COMPLETOS',
    );
  });

  it('compras no puede autorizar su propia compra', () => {
    const compras = actorWith('purchases:quote', 'purchases:write', 'purchases:receive');
    const check = canTransition(
      facts({ status: 'COMPRA_PENDIENTE_AUTORIZACION' }),
      'autorizar_compra',
      compras,
    );
    assert.equal(check.allowed, false);
    assert.equal(check.allowed === false && check.reason, 'forbidden');
  });
});

describe('etapas finales configurables', () => {
  it('encadena lavado y luego alineamiento', () => {
    const to = assertTransition(
      facts({ status: 'EN_LAVADO', pendingFinalStages: ['lavado', 'alineamiento'] }),
      'terminar_lavado',
      god,
    );
    assert.equal(to, 'PENDIENTE_ALINEAMIENTO');
  });

  it('si el lavado era la última etapa, pasa a entrega', () => {
    const to = assertTransition(
      facts({ status: 'EN_LAVADO', pendingFinalStages: ['lavado'] }),
      'terminar_lavado',
      god,
    );
    assert.equal(to, 'LISTO_PARA_ENTREGA');
  });

  it('sin etapas configuradas se finaliza directo', () => {
    assert.equal(
      assertTransition(
        facts({ status: 'CONTROL_CALIDAD_APROBADO', pendingFinalStages: [] }),
        'finalizar_directo',
        god,
      ),
      'LISTO_PARA_ENTREGA',
    );
  });

  it('no se finaliza directo si quedan etapas pendientes', () => {
    assert.equal(
      canTransition(
        facts({ status: 'CONTROL_CALIDAD_APROBADO', pendingFinalStages: ['lavado'] }),
        'finalizar_directo',
        god,
      ).allowed,
      false,
    );
  });

  it('no se envía a lavado si la etapa configurada es otra', () => {
    assert.equal(
      canTransition(
        facts({ status: 'CONTROL_CALIDAD_APROBADO', pendingFinalStages: ['alineamiento'] }),
        'enviar_a_lavado',
        god,
      ).allowed,
      false,
    );
  });
});

describe('availableActions', () => {
  it('omite lo que el actor no puede ejecutar y conserva lo que le falta resolver', () => {
    const asesor = actorWith('receptions:write', 'orders:cancel');
    const orden = facts({ status: 'RECEPCIONADO', hasCustomerSignature: false });

    const options = availableActions(orden, asesor);
    const codes = options.map((o) => o.action).sort();
    assert.deepEqual(codes, ['cancelar', 'completar_checklist']);

    const checklist = options.find((o) => o.action === 'completar_checklist');
    assert.ok(checklist);
    assert.equal(checklist.available, false);
    assert.ok(checklist.unmet.some((m) => m.includes('firma del cliente')));
  });

  it('no propone acciones del sistema', () => {
    const options = availableActions(facts({ status: 'COTIZACION_ENVIADA' }), god);
    assert.equal(
      options.some((o) => o.action === 'cliente_abrio_enlace'),
      false,
    );
  });
});

describe('recorrido completo del vehículo', () => {
  it('va de DRAFT a CERRADO pasando por compras, calidad y lavado', () => {
    const camino = [
      ['registrar_recepcion', 'RECEPCIONADO'],
      ['completar_checklist', 'CHECKLIST_COMPLETADO'],
      ['enviar_a_diagnostico', 'PENDIENTE_DIAGNOSTICO'],
      ['iniciar_diagnostico', 'EN_DIAGNOSTICO'],
      ['completar_diagnostico', 'DIAGNOSTICO_COMPLETADO'],
      ['preparar_cotizacion', 'COTIZACION_EN_PREPARACION'],
      ['enviar_cotizacion', 'COTIZACION_ENVIADA'],
      ['cliente_abrio_enlace', 'ESPERANDO_CLIENTE'],
      ['registrar_decision', 'APROBACION_PARCIAL'],
      ['solicitar_repuestos', 'SOLICITUD_REPUESTOS'],
      ['autorizar_cotizar', 'REPUESTOS_EN_COTIZACION'],
      ['enviar_a_autorizacion', 'COMPRA_PENDIENTE_AUTORIZACION'],
      ['autorizar_compra', 'COMPRA_AUTORIZADA'],
      ['generar_orden_compra', 'ORDEN_COMPRA_GENERADA'],
      ['confirmar_envio', 'ESPERANDO_REPUESTOS'],
      ['recepcion_parcial', 'REPUESTOS_PARCIALES'],
      ['recepcion_completa', 'REPUESTOS_COMPLETOS'],
      ['liberar_para_reparacion', 'LISTO_PARA_REPARACION'],
      ['iniciar_trabajo', 'EN_REPARACION'],
      ['pausar', 'REPARACION_PAUSADA'],
      ['reanudar', 'EN_REPARACION'],
      ['terminar_reparacion', 'REPARACION_TERMINADA'],
      ['enviar_a_calidad', 'CONTROL_CALIDAD'],
      ['aprobar_calidad', 'CONTROL_CALIDAD_APROBADO'],
      ['enviar_a_lavado', 'PENDIENTE_LAVADO'],
      ['iniciar_lavado', 'EN_LAVADO'],
      ['terminar_lavado', 'LISTO_PARA_ENTREGA'],
      ['entregar', 'ENTREGADO'],
      ['cerrar', 'CERRADO'],
    ] as const;

    let status: OrderStatus = 'DRAFT';

    for (const [action, expected] of camino) {
      // Cobertura incompleta hasta la recepción total; lavado como única etapa final.
      const partial = action === 'recepcion_parcial';
      const current = facts({
        status,
        approvedItemCount: 2,
        quotationLineCount: 4,
        decidedItemCount: 4,
        partsCoverageComplete: !partial,
        pendingFinalStages: status === 'EN_LAVADO' ? ['lavado'] : ['lavado'],
      });

      status = assertTransition(current, action, god);
      assert.equal(status, expected, `tras ${action}`);
    }
  });
});
