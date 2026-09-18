import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { PERMISSIONS, ROLE_LABELS, ROLE_PERMISSIONS, type RoleCode } from '@/lib/auth/permissions';
import { ORDER_STATUSES } from './order-status';
import { applyAction, freshAdvance, type OrderAdvance } from './advance';
import { canTransition, type Actor, type OrderAction, type OrderFacts } from './state-machine';
import {
  AREA_LABELS,
  AREA_WHO,
  STANDARD_QUALITY_CHECKS,
  STEP_STATE_LABELS,
  WORKFILE_AREAS,
  WORKFILE_STEPS,
  areaOf,
  areaRuns,
  stepsOfArea,
  approvedLines,
  assignableTechnicians,
  centsFromSoles,
  minutesPhrase,
  toSoles,
  decidedCount,
  emptyWorkfile,
  factsFromWorkfile,
  hasWork,
  pendingStages,
  pricedCount,
  proposedMinutes,
  qualityComplete,
  readWorkfile,
  requiredParts,
  stagesFinished,
  stepDone,
  stepFor,
  stepState,
  totalCents,
  workfileSlot,
  type OrderWorkfile,
  type WorkfileLine,
} from './workfile';

/** Una orden sembrada, con todo hecho: sirve para probar que NO se pisa. */
const sembrado: OrderFacts = {
  status: 'EN_REPARACION',
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
  repairJobsDone: 3,
  hasOpenTimeSession: false,
  hasFinalEvidence: true,
  qualityChecklistComplete: true,
  qualityFindingCount: 0,
  pendingFinalStages: ['lavado'],
  deliveryActSigned: false,
  hasOpenTasks: false,
};

/** Una orden recién abierta desde recepción: nada hecho todavía. */
const recibida: OrderFacts = {
  ...sembrado,
  status: 'CHECKLIST_COMPLETADO',
  /* En recepción no se sabe a qué vino el vehículo. */
  hasServiceType: false,
  assignedTechnicianId: null,
  diagnosticItemCount: 0,
  quotationLineCount: 0,
  quotationLinesPriced: 0,
  authorizationLinkIssued: false,
  decidedItemCount: 0,
  approvedItemCount: 0,
  requiredPartsCount: 0,
  partsCoverageComplete: false,
  partsRequestPending: false,
  supplierLinesAllSelected: false,
  purchaseWithinAuthorizerLimit: false,
  purchaseOrderIssued: false,
  estimatedMinutes: null,
  repairJobsTotal: 0,
  repairJobsDone: 0,
  hasFinalEvidence: false,
  qualityChecklistComplete: false,
  pendingFinalStages: [],
};

function line(over: Partial<WorkfileLine> = {}): WorkfileLine {
  return {
    id: 'l1',
    title: 'Cambio de pastillas delanteras',
    kind: 'servicio',
    priority: 'medio',
    minutes: 60,
    cents: 18_000,
    decision: 'pendiente',
    done: false,
    ...over,
  };
}

describe('expediente · cuentas', () => {
  it('cuenta decididas, con precio y aprobadas', () => {
    const lines = [
      line({ id: 'a', decision: 'aprobado' }),
      line({ id: 'b', decision: 'rechazado' }),
      line({ id: 'c', decision: 'pendiente', cents: 0 }),
    ];
    assert.equal(decidedCount(lines), 2);
    assert.equal(pricedCount(lines), 2);
    assert.equal(approvedLines(lines).length, 1);
    assert.equal(totalCents(lines), 36_000);
  });

  it('los repuestos que se piden son solo los APROBADOS', () => {
    const lines = [
      line({ id: 'a', kind: 'repuesto', decision: 'aprobado' }),
      line({ id: 'b', kind: 'repuesto', decision: 'rechazado' }),
      line({ id: 'c', kind: 'repuesto', decision: 'pendiente' }),
    ];
    assert.equal(requiredParts(lines).length, 1);
  });

  it('el tiempo propuesto suma solo lo aprobado', () => {
    const lines = [
      line({ id: 'a', decision: 'aprobado', minutes: 60 }),
      line({ id: 'b', decision: 'aprobado', minutes: 30 }),
      line({ id: 'c', decision: 'rechazado', minutes: 120 }),
    ];
    assert.equal(proposedMinutes(lines), 90);
  });

  it('un checklist de calidad vacío no está completo', () => {
    assert.equal(qualityComplete([]), false);
    assert.equal(qualityComplete([{ id: 'q1', label: 'Prueba de ruta', done: false }]), false);
    assert.equal(qualityComplete([{ id: 'q1', label: 'Prueba de ruta', done: true }]), true);
  });
});

describe('expediente · hechos', () => {
  it('un expediente vacío no pisa nada de lo sembrado', () => {
    assert.deepEqual(factsFromWorkfile(sembrado, emptyWorkfile()), sembrado);
  });

  it('el tipo de servicio desbloquea el envío a diagnóstico', () => {
    const actor: Actor = { profileId: 'demo-asesor', permissions: PERMISSIONS };
    const sinTipo = factsFromWorkfile(recibida, emptyWorkfile());
    assert.equal(canTransition(sinTipo, 'enviar_a_diagnostico', actor).allowed, false);

    const conTipo = factsFromWorkfile(recibida, {
      ...emptyWorkfile(),
      serviceType: 'REVISIÓN DE FRENOS',
    });
    assert.equal(canTransition(conTipo, 'enviar_a_diagnostico', actor).allowed, true);
  });

  it('un expediente sin tipo no borra el de una orden sembrada', () => {
    assert.equal(factsFromWorkfile(sembrado, emptyWorkfile()).hasServiceType, true);
  });

  it('un tipo en blanco no cuenta como decidido', () => {
    const f = factsFromWorkfile(recibida, { ...emptyWorkfile(), serviceType: '   ' });
    assert.equal(f.hasServiceType, false);
  });

  it('asignar al técnico desbloquea el diagnóstico, y solo para él', () => {
    const w: OrderWorkfile = {
      ...emptyWorkfile(),
      technician: { id: 'demo-tecnico', name: 'Carlos Mendoza' },
    };
    const facts = factsFromWorkfile({ ...recibida, status: 'PENDIENTE_DIAGNOSTICO' }, w);

    const suyo: Actor = { profileId: 'demo-tecnico', permissions: PERMISSIONS };
    const ajeno: Actor = { profileId: 'demo-asesor', permissions: PERMISSIONS };

    assert.equal(canTransition(facts, 'iniciar_diagnostico', suyo).allowed, true);
    assert.equal(canTransition(facts, 'iniciar_diagnostico', ajeno).allowed, false);
  });

  it('las líneas son hallazgo, cotización y trabajo a la vez', () => {
    const w: OrderWorkfile = {
      ...emptyWorkfile(),
      lines: [
        line({ id: 'a', decision: 'aprobado', done: true }),
        line({ id: 'b', decision: 'rechazado' }),
        line({ id: 'c', cents: 0 }),
      ],
    };
    const f = factsFromWorkfile(recibida, w);

    assert.equal(f.diagnosticItemCount, 3);
    assert.equal(f.quotationLineCount, 3);
    assert.equal(f.quotationLinesPriced, 2);
    assert.equal(f.decidedItemCount, 2);
    assert.equal(f.approvedItemCount, 1);
    assert.equal(f.repairJobsTotal, 1);
    assert.equal(f.repairJobsDone, 1);
  });

  it('sin líneas aprobadas manda lo sembrado: 0 de 0 cerraría la reparación', () => {
    const w: OrderWorkfile = { ...emptyWorkfile(), lines: [line({ decision: 'rechazado' })] };
    const f = factsFromWorkfile(sembrado, w);
    assert.equal(f.repairJobsTotal, 4);
    assert.equal(f.repairJobsDone, 3);
  });

  it('la solicitud deja de estar pendiente cuando los repuestos llegan completos', () => {
    const base: OrderWorkfile = {
      ...emptyWorkfile(),
      lines: [line({ kind: 'repuesto', decision: 'aprobado' })],
    };
    assert.equal(factsFromWorkfile(recibida, base).partsRequestPending, true);
    assert.equal(
      factsFromWorkfile(recibida, { ...base, partsReceived: 'completo' }).partsRequestPending,
      false,
    );
    assert.equal(
      factsFromWorkfile(recibida, { ...base, partsReceived: 'completo' }).partsCoverageComplete,
      true,
    );
  });

  it('las etapas ya hechas salen de las pendientes', () => {
    const w: OrderWorkfile = { ...emptyWorkfile(), finalStages: ['lavado', 'alineamiento'] };
    const f = factsFromWorkfile(recibida, w, ['lavado']);
    assert.deepEqual(f.pendingFinalStages, ['alineamiento']);
  });
});

describe('expediente · etapas finales desde el historial', () => {
  it('lee las etapas terminadas de las acciones aplicadas', () => {
    const history: readonly { readonly action: OrderAction }[] = [
      { action: 'enviar_a_lavado' },
      { action: 'iniciar_lavado' },
      { action: 'terminar_lavado' },
    ];
    assert.deepEqual(stagesFinished(history), ['lavado']);
  });

  it('deshacer el paso lo quita del historial y la etapa vuelve a estar pendiente', () => {
    assert.deepEqual(stagesFinished([{ action: 'iniciar_lavado' }]), []);
    assert.deepEqual(pendingStages(['lavado', 'alineamiento'], []), ['lavado', 'alineamiento']);
    assert.deepEqual(pendingStages(['lavado'], ['lavado']), []);
  });
});

describe('expediente · pasos', () => {
  it('cada estado del recorrido tiene un paso que lo resuelve', () => {
    const conPaso = ORDER_STATUSES.filter((s) => stepFor(s) !== null);
    // Los que no tienen paso son los extremos: borrador, recepción, los de
    // servicios finales que se hacen en su propia estación, y los terminales.
    assert.deepEqual(
      ORDER_STATUSES.filter((s) => stepFor(s) === null),
      [
        'DRAFT',
        'RECEPCIONADO',
        'REPARACION_TERMINADA',
        'PENDIENTE_LAVADO',
        'EN_LAVADO',
        'PENDIENTE_ALINEAMIENTO',
        'EN_ALINEAMIENTO',
        'ENTREGADO',
        'CERRADO',
        'CANCELADO',
      ],
    );
    assert.ok(conPaso.length > 15);
  });

  it('lo primero que pide la orden recibida es el tipo de servicio', () => {
    assert.equal(stepFor('CHECKLIST_COMPLETADO'), 'servicio');
    assert.equal(stepFor('PENDIENTE_DIAGNOSTICO'), 'tecnico');
  });

  it('un paso está hecho cuando el expediente lo tiene, no cuando se ha mirado', () => {
    const w = emptyWorkfile();
    assert.equal(stepDone('servicio', w), false);
    assert.equal(stepDone('servicio', { ...w, serviceType: 'CAMBIO DE ACEITE' }), true);
    assert.equal(stepDone('tecnico', w), false);
    assert.equal(
      stepDone('tecnico', { ...w, technician: { id: 'demo-tecnico', name: 'Carlos' } }),
      true,
    );

    const conPrecio: OrderWorkfile = { ...w, lines: [line()], linkIssued: false };
    assert.equal(stepDone('precios', conPrecio), false, 'falta el enlace');
    assert.equal(stepDone('precios', { ...conPrecio, linkIssued: true }), true);

    assert.equal(stepDone('repuestos', w), true, 'sin repuestos no hay nada que pedir');
    const conRepuesto: OrderWorkfile = {
      ...w,
      lines: [line({ kind: 'repuesto', decision: 'aprobado' })],
    };
    assert.equal(stepDone('repuestos', conRepuesto), false);
    assert.equal(stepDone('repuestos', { ...conRepuesto, partsReceived: 'completo' }), true);
  });
});

describe('expediente · a quién se asigna', () => {
  const PEOPLE = Object.fromEntries(
    (Object.keys(ROLE_PERMISSIONS) as RoleCode[]).map((r) => [r, `Persona ${r}`]),
  ) as Record<RoleCode, string>;

  const roster = assignableTechnicians(
    PEOPLE,
    ROLE_PERMISSIONS,
    ROLE_LABELS,
    (role) => `demo-${role}`,
  );

  it('salen los puestos que ejecutan reparaciones, no una lista escrita a mano', () => {
    const roles = roster.map((t) => t.role);
    assert.ok(roles.includes('tecnico'));
    assert.ok(roles.includes('planchado_pintura'));
    assert.ok(!roles.includes('asesor'));
    for (const role of roles) {
      assert.ok(ROLE_PERMISSIONS[role].includes('repairs:execute'));
    }
  });

  it('el taller va primero: asignar al administrador no es lo normal', () => {
    const primeros = roster.slice(0, 2).map((t) => t.role);
    assert.ok(!primeros.includes('super_admin'), primeros.join(','));
    assert.ok(!primeros.includes('admin'), primeros.join(','));
  });

  it('el identificador es el mismo con el que esa persona entra', () => {
    const tecnico = roster.find((t) => t.role === 'tecnico');
    assert.ok(tecnico !== undefined);
    assert.equal(tecnico.id, 'demo-tecnico');
  });
});

describe('expediente · lectura de lo guardado', () => {
  it('cualquier basura devuelve el expediente vacío', () => {
    for (const raw of [null, undefined, 3, 'x', [], true]) {
      assert.deepEqual(readWorkfile(raw), emptyWorkfile());
    }
  });

  it('una línea corrupta se cae sola y las demás sobreviven', () => {
    const leido = readWorkfile({
      lines: [line({ id: 'a' }), { id: '', title: '' }, null, line({ id: 'b' })],
    });
    assert.deepEqual(
      leido.lines.map((l) => l.id),
      ['a', 'b'],
    );
  });

  it('descarta valores que no existen en vez de creérselos', () => {
    const leido = readWorkfile({
      serviceType: 'x'.repeat(500),
      technician: { id: '' },
      lines: [{ id: 'a', title: 'x', kind: 'inventado', decision: 'aprobadísimo', priority: 'ninguna' }],
      partsReceived: 'casi',
      estimatedMinutes: -5,
      finalStages: ['lavado', 'teletransporte'],
      qualityFindings: ['   ', 'Fuga en la tapa'],
    });
    // 200 y no 80: el campo lleva VARIOS motivos separados por « · ».
    assert.equal(leido.serviceType.length, 200, 'el tipo de servicio se recorta, no se cree');
    assert.equal(leido.technician, null);
    assert.equal(leido.lines[0]?.kind, 'servicio');
    assert.equal(leido.lines[0]?.decision, 'pendiente');
    assert.equal(leido.lines[0]?.priority, 'medio');
    assert.equal(leido.partsReceived, 'ninguno');
    assert.equal(leido.estimatedMinutes, null);
    assert.deepEqual(leido.finalStages, ['lavado']);
    assert.deepEqual(leido.qualityFindings, ['Fuga en la tapa']);
  });

  it('la ranura es una por orden', () => {
    assert.equal(workfileSlot('rec-2026-0001'), 'orden.rec-2026-0001.expediente');
    assert.notEqual(workfileSlot('os-154'), workfileSlot('os-155'));
  });

  it('sabe si hay algo anotado', () => {
    assert.equal(hasWork(emptyWorkfile()), false);
    assert.equal(hasWork({ ...emptyWorkfile(), lines: [line()] }), true);
    assert.equal(hasWork({ ...emptyWorkfile(), serviceType: 'CAMBIO DE ACEITE' }), true);
  });
});

/*
 * El puente entero, de una recepción cerrada a la entrega.
 *
 * Es la prueba que faltaba: cada pieza funcionaba sola y el recorrido se
 * cortaba igual, porque nadie había andado el camino completo. Aquí se anda,
 * paso a paso, con el expediente aportando exactamente lo que cada guarda
 * pide y la máquina de estados decidiendo.
 */
describe('expediente · el recorrido completo', () => {
  const TECNICO = 'demo-tecnico';

  it('lleva una orden recibida hasta CERRADO sin saltarse ninguna guarda', () => {
    let advance: OrderAdvance = freshAdvance('CHECKLIST_COMPLETADO');
    let workfile: OrderWorkfile = emptyWorkfile();
    let reloj = new Date('2026-09-17T08:00:00Z');

    const actor: Actor = { profileId: TECNICO, permissions: PERMISSIONS };

    const hechos = (): OrderFacts =>
      factsFromWorkfile(
        { ...recibida, hasFinalEvidence: true },
        workfile,
        stagesFinished(advance.history),
      );

    // Paso uno: a qué vino el vehículo. Sin esto no sale de recepción.
    workfile = { ...workfile, serviceType: 'REVISIÓN DE FRENOS' };

    const paso = (action: OrderAction): void => {
      reloj = new Date(reloj.getTime() + 60_000);
      const result = applyAction(advance, hechos(), action, actor, 'Carlos Mendoza', reloj);
      assert.ok(
        result.ok,
        `«${action}» desde ${advance.status}: ${result.ok ? '' : [result.message, ...result.unmet].join(' · ')}`,
      );
      advance = result.advance;
    };

    // Recepción → diagnóstico. El técnico todavía no está: sin asignarlo el
    // diagnóstico no empieza.
    paso('enviar_a_diagnostico');
    workfile = { ...workfile, technician: { id: TECNICO, name: 'Carlos Mendoza' } };
    paso('iniciar_diagnostico');

    // Hallazgos: dos trabajos, uno de ellos con repuesto.
    workfile = {
      ...workfile,
      lines: [
        line({ id: 'a', title: 'Cambio de pastillas', kind: 'repuesto', cents: 0 }),
        line({ id: 'b', title: 'Rectificado de discos', cents: 0 }),
      ],
    };
    paso('completar_diagnostico');
    paso('preparar_cotizacion');

    // Precios y enlace de autorización.
    workfile = {
      ...workfile,
      lines: workfile.lines.map((l) => ({ ...l, cents: 22_000 })),
      linkIssued: true,
    };
    paso('enviar_cotizacion');
    paso('cliente_abrio_enlace');

    // El cliente decide. Aprueba los dos.
    workfile = {
      ...workfile,
      lines: workfile.lines.map((l) => ({ ...l, decision: 'aprobado' as const })),
    };
    paso('registrar_decision');
    assert.equal(advance.status, 'APROBADO');

    // Hay un repuesto aprobado: la orden tiene que pasar por compras.
    paso('solicitar_repuestos');
    paso('autorizar_cotizar');
    workfile = { ...workfile, supplierChosen: true };
    paso('enviar_a_autorizacion');
    workfile = { ...workfile, purchaseApproved: true };
    paso('autorizar_compra');
    paso('generar_orden_compra');
    workfile = { ...workfile, purchaseOrderIssued: true };
    paso('confirmar_envio');
    workfile = { ...workfile, partsReceived: 'completo' };
    paso('recepcion_completa');
    paso('liberar_para_reparacion');

    // Reparación: tiempo confirmado, trabajos marcados.
    workfile = { ...workfile, estimatedMinutes: 120 };
    paso('iniciar_trabajo');
    workfile = { ...workfile, lines: workfile.lines.map((l) => ({ ...l, done: true })) };
    paso('terminar_reparacion');
    paso('enviar_a_calidad');

    // Calidad.
    workfile = {
      ...workfile,
      quality: [
        { id: 'q1', label: 'Prueba de ruta', done: true },
        { id: 'q2', label: 'Sin fugas', done: true },
      ],
    };
    paso('aprobar_calidad');

    // Servicios finales: lavado configurado.
    workfile = { ...workfile, finalStages: ['lavado'] };
    paso('enviar_a_lavado');
    paso('iniciar_lavado');
    paso('terminar_lavado');
    assert.equal(advance.status, 'LISTO_PARA_ENTREGA');

    // Entrega.
    workfile = { ...workfile, deliverySigned: true };
    paso('entregar');
    paso('cerrar');

    assert.equal(advance.status, 'CERRADO');
    assert.equal(advance.history.length, 24);
  });

  it('sin repuestos aprobados la orden salta el tramo de compras', () => {
    let advance: OrderAdvance = freshAdvance('APROBADO');
    const workfile: OrderWorkfile = {
      ...emptyWorkfile(),
      technician: { id: TECNICO, name: 'Carlos Mendoza' },
      lines: [line({ id: 'a', decision: 'aprobado', cents: 10_000 })],
    };
    const actor: Actor = { profileId: TECNICO, permissions: PERMISSIONS };
    const facts = factsFromWorkfile({ ...recibida, status: 'APROBADO' }, workfile);

    assert.equal(canTransition(facts, 'solicitar_repuestos', actor).allowed, false);

    const result = applyAction(advance, facts, 'sin_repuestos', actor, 'Carlos', new Date());
    assert.ok(result.ok);
    advance = result.advance;
    assert.equal(advance.status, 'LISTO_PARA_REPARACION');
  });
});

describe('expediente · ayudas de la pantalla', () => {
  it('lee el precio como se escribe aquí, con coma', () => {
    assert.equal(centsFromSoles('120,50'), 12_050);
    assert.equal(centsFromSoles('120.5'), 12_050);
    assert.equal(centsFromSoles(' 80 '), 8_000);
  });

  it('lo que no es un número es null, nunca NaN', () => {
    for (const raw of ['', 'abc', '-5', '1.234', '1,2,3']) {
      assert.equal(centsFromSoles(raw), null, `«${raw}»`);
    }
  });

  it('dice el tiempo como se dice en el taller', () => {
    assert.equal(minutesPhrase(0), 'sin estimar');
    assert.equal(minutesPhrase(45), '45 min');
    assert.equal(minutesPhrase(120), '2 h');
    assert.equal(minutesPhrase(150), '2 h 30 min');
  });

  it('el checklist estándar nace sin marcar', () => {
    assert.ok(STANDARD_QUALITY_CHECKS.length > 0);
    assert.ok(STANDARD_QUALITY_CHECKS.every((c) => !c.done));
    assert.equal(qualityComplete(STANDARD_QUALITY_CHECKS), false);
  });

  it('los céntimos se guardan enteros y se dividen solo para pintar', () => {
    assert.equal(toSoles(12_050), 120.5);
  });
});

describe('expediente · «hecho» y «no hace falta» no son lo mismo', () => {
  it('sin repuestos aprobados, el paso de compra no se pinta como hecho', () => {
    // Salía en verde con los cinco pasos anteriores pendientes: una lista que
    // dice que algo ocurrió cuando no ha ocurrido nada deja de creerse.
    assert.equal(stepState('repuestos', emptyWorkfile()), 'sin_falta');
    assert.equal(stepState('etapas', emptyWorkfile()), 'sin_falta');
  });

  it('con repuestos por comprar, el paso vuelve a ser trabajo de verdad', () => {
    const conRepuesto: OrderWorkfile = {
      ...emptyWorkfile(),
      lines: [line({ kind: 'repuesto', decision: 'aprobado' })],
    };
    assert.equal(stepState('repuestos', conRepuesto), 'pendiente');
    assert.equal(stepState('repuestos', { ...conRepuesto, partsReceived: 'completo' }), 'hecho');
  });

  it('una etapa final configurada y terminada sí es «hecho»', () => {
    const conLavado: OrderWorkfile = { ...emptyWorkfile(), finalStages: ['lavado'] };
    assert.equal(stepState('etapas', conLavado), 'hecho');
  });

  it('los demás pasos solo tienen dos estados', () => {
    for (const step of WORKFILE_STEPS) {
      if (step === 'repuestos' || step === 'etapas') continue;
      assert.equal(stepState(step, emptyWorkfile()), 'pendiente', step);
    }
    assert.equal(
      stepState('servicio', { ...emptyWorkfile(), serviceType: 'CAMBIO DE ACEITE' }),
      'hecho',
    );
  });

  it('cada estado tiene su palabra, y ninguna es el color', () => {
    for (const estado of ['hecho', 'sin_falta', 'pendiente'] as const) {
      assert.ok(STEP_STATE_LABELS[estado].length > 0, estado);
    }
  });
});

describe('expediente · las áreas', () => {
  it('cada paso tiene su área, y ninguna área se queda vacía', () => {
    for (const step of WORKFILE_STEPS) {
      assert.ok(WORKFILE_AREAS.includes(areaOf(step)), step);
    }
    for (const area of WORKFILE_AREAS) {
      assert.ok(stepsOfArea(area).length > 0, area);
    }
  });

  it('el técnico no pone precios ni el asesor rectifica discos', () => {
    assert.equal(areaOf('hallazgos'), 'taller');
    assert.equal(areaOf('trabajos'), 'taller');
    assert.equal(areaOf('precios'), 'asesoria');
    assert.equal(areaOf('decision'), 'asesoria');
    assert.equal(areaOf('repuestos'), 'compras');
    assert.equal(areaOf('calidad'), 'calidad');
  });

  it('los tramos van en el orden del recorrido, no en el del organigrama', () => {
    const runs = areaRuns();
    assert.deepEqual(
      runs.map((r) => r.area),
      ['asesoria', 'taller', 'asesoria', 'compras', 'taller', 'calidad', 'finales', 'asesoria'],
    );
    // Asesoría sale tres veces: el principio, la cotización y la entrega.
    assert.equal(runs.filter((r) => r.area === 'asesoria').length, 3);
  });

  it('los tramos, juntos, son exactamente los once pasos y en orden', () => {
    assert.deepEqual(areaRuns().flatMap((r) => r.steps), [...WORKFILE_STEPS]);
  });

  it('cada área dice quién trabaja en ella: el color y la palabra, no el color solo', () => {
    for (const area of WORKFILE_AREAS) {
      assert.ok(AREA_LABELS[area].length > 0, area);
      assert.ok(AREA_WHO[area].length > 0, area);
    }
  });
});
