/**
 * Máquina de estados de la orden de servicio.
 *
 * `service_orders.status` no es un campo de texto: es el estado de una máquina
 * con transiciones explícitas. Ninguna pantalla escribe el estado directamente;
 * invoca una transición, y la transición comprueba tres cosas:
 *
 *   1. la acción está declarada para el estado actual   → InvalidTransitionError
 *   2. el actor tiene el permiso que la acción exige    → ForbiddenError
 *   3. se cumplen las guardas de negocio                → BusinessRuleError
 *
 * Los tres errores son distintos a propósito: «no puedes ahora», «no puedes tú»
 * y «faltan datos» son problemas diferentes y el usuario necesita saber cuál
 * tiene.
 *
 * Dominio PURO: sin Next.js, sin Supabase, sin base de datos. Se prueba con
 * `npm run test`. La misma tabla alimenta la validación del servidor, la
 * habilitación de botones en la interfaz y el disparador de PostgreSQL.
 *
 * Documentación: `docs/03-maquina-de-estados.md`
 */

import type { Permission } from '@/lib/auth/permissions';
import {
  BusinessRuleError,
  ForbiddenError,
  InvalidTransitionError,
} from '@/lib/errors';
import { ORDER_STATUSES, TERMINAL_STATUSES, type OrderStatus } from './order-status';
import {
  nextFinalStage,
  statusAfterFinalStage,
  withoutStage,
  type FinalStage,
} from './final-stages';

// ─────────────────────────────────────────────────────────────────────────────
// Acciones
// ─────────────────────────────────────────────────────────────────────────────

export const ORDER_ACTIONS = [
  'registrar_recepcion',
  'completar_checklist',
  'enviar_a_diagnostico',
  'iniciar_diagnostico',
  'completar_diagnostico',
  'preparar_cotizacion',
  'enviar_cotizacion',
  'cliente_abrio_enlace',
  'registrar_decision',
  'cerrar_sin_trabajos',
  'solicitar_repuestos',
  'sin_repuestos',
  'autorizar_cotizar',
  'enviar_a_autorizacion',
  'autorizar_compra',
  'rechazar_compra',
  'generar_orden_compra',
  'confirmar_envio',
  'recepcion_parcial',
  'recepcion_completa',
  'liberar_para_reparacion',
  'iniciar_trabajo',
  'pausar',
  'reanudar',
  'ampliar_cotizacion',
  'terminar_reparacion',
  'enviar_a_calidad',
  'aprobar_calidad',
  'observar_calidad',
  'retomar_reparacion',
  'enviar_a_lavado',
  'enviar_a_alineamiento',
  'finalizar_directo',
  'iniciar_lavado',
  'terminar_lavado',
  'iniciar_alineamiento',
  'terminar_alineamiento',
  'entregar',
  'cerrar',
  'cancelar',
] as const;

export type OrderAction = (typeof ORDER_ACTIONS)[number];

export const ACTION_LABELS: Readonly<Record<OrderAction, string>> = {
  registrar_recepcion: 'Registrar recepción',
  completar_checklist: 'Completar checklist',
  enviar_a_diagnostico: 'Enviar a diagnóstico',
  iniciar_diagnostico: 'Iniciar diagnóstico',
  completar_diagnostico: 'Completar diagnóstico',
  preparar_cotizacion: 'Preparar cotización',
  enviar_cotizacion: 'Enviar cotización al cliente',
  cliente_abrio_enlace: 'El cliente abrió el enlace',
  registrar_decision: 'Registrar decisión del cliente',
  cerrar_sin_trabajos: 'Cerrar sin trabajos aprobados',
  solicitar_repuestos: 'Solicitar repuestos',
  sin_repuestos: 'Continuar sin repuestos',
  autorizar_cotizar: 'Autorizar para cotizar',
  enviar_a_autorizacion: 'Enviar a autorización de compra',
  autorizar_compra: 'Autorizar compra',
  rechazar_compra: 'Rechazar compra',
  generar_orden_compra: 'Generar orden de compra',
  confirmar_envio: 'Confirmar envío al proveedor',
  recepcion_parcial: 'Registrar recepción parcial',
  recepcion_completa: 'Registrar recepción completa',
  liberar_para_reparacion: 'Liberar para reparación',
  iniciar_trabajo: 'Iniciar trabajo',
  pausar: 'Pausar',
  reanudar: 'Reanudar',
  ampliar_cotizacion: 'Ampliar cotización',
  terminar_reparacion: 'Terminar reparación',
  enviar_a_calidad: 'Enviar a control de calidad',
  aprobar_calidad: 'Aprobar control de calidad',
  observar_calidad: 'Observar control de calidad',
  retomar_reparacion: 'Retomar reparación',
  enviar_a_lavado: 'Enviar a lavado',
  enviar_a_alineamiento: 'Enviar a alineamiento',
  finalizar_directo: 'Finalizar sin servicios adicionales',
  iniciar_lavado: 'Iniciar lavado',
  terminar_lavado: 'Terminar lavado',
  iniciar_alineamiento: 'Iniciar alineamiento',
  terminar_alineamiento: 'Terminar alineamiento',
  entregar: 'Registrar entrega',
  cerrar: 'Cerrar orden',
  cancelar: 'Cancelar orden',
};

export function isOrderAction(value: string): value is OrderAction {
  return (ORDER_ACTIONS as readonly string[]).includes(value);
}

// ─────────────────────────────────────────────────────────────────────────────
// Hechos que consultan las guardas
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Instantánea de la orden. Las guardas solo leen de aquí: así son puras,
 * probables sin base de datos, y el mismo cálculo sirve para deshabilitar
 * botones en la interfaz sin volver a consultar.
 */
export interface OrderFacts {
  readonly status: OrderStatus;

  // Recepción
  readonly hasCustomer: boolean;
  readonly hasVehicle: boolean;
  readonly hasServiceType: boolean;
  readonly requiredChecklistItems: number;
  readonly resolvedChecklistItems: number;
  readonly hasCustomerSignature: boolean;
  readonly hasAdvisorSignature: boolean;

  // Diagnóstico
  readonly assignedTechnicianId: string | null;
  readonly diagnosticItemCount: number;

  // Cotización y autorización
  readonly quotationLineCount: number;
  readonly quotationLinesPriced: number;
  readonly authorizationLinkIssued: boolean;
  readonly decidedItemCount: number;
  readonly approvedItemCount: number;

  // Repuestos y compras
  readonly requiredPartsCount: number;
  readonly partsCoverageComplete: boolean;
  readonly partsRequestPending: boolean;
  readonly supplierLinesAllSelected: boolean;
  readonly purchaseWithinAuthorizerLimit: boolean;
  readonly purchaseOrderIssued: boolean;

  // Reparación
  readonly estimatedMinutes: number | null;
  readonly repairJobsTotal: number;
  readonly repairJobsDone: number;
  readonly hasOpenTimeSession: boolean;
  readonly hasFinalEvidence: boolean;

  // Calidad y etapas finales
  readonly qualityChecklistComplete: boolean;
  readonly qualityFindingCount: number;
  readonly pendingFinalStages: readonly FinalStage[];

  // Cierre
  readonly deliveryActSigned: boolean;
  readonly hasOpenTasks: boolean;
}

export interface Actor {
  readonly profileId: string;
  readonly permissions: readonly Permission[];
}

/** El sistema actuando por su cuenta: transiciones automáticas. */
export const SYSTEM_ACTOR: Actor = { profileId: 'system', permissions: [] };

// ─────────────────────────────────────────────────────────────────────────────
// Definición de las transiciones
// ─────────────────────────────────────────────────────────────────────────────

type Target = OrderStatus | ((facts: OrderFacts) => OrderStatus);

/** Devuelve la lista de requisitos NO cumplidos. Vacía significa «adelante». */
type Guard = (facts: OrderFacts, actor: Actor) => readonly string[];

interface BaseTransitionDef {
  readonly from: readonly OrderStatus[];
  readonly action: OrderAction;
  /** `null` = transición del sistema, sin permiso de usuario. */
  readonly permission: Permission | null;
  readonly guard?: Guard;
}

/**
 * Una transición con destino fijo, o una con destino dinámico que DEBE
 * declarar sus destinos posibles.
 *
 * `targets` no es redundante: la tabla `status_transitions` guarda la terna
 * (origen, acción, destino) y el disparador de PostgreSQL la valida. Sin
 * enumerar los destinos, la base solo podría comprobar que la acción existe
 * para el estado actual, no que el estado nuevo sea uno de los legítimos.
 */
type TransitionDef =
  | (BaseTransitionDef & { readonly to: OrderStatus; readonly targets?: undefined })
  | (BaseTransitionDef & {
      readonly to: (facts: OrderFacts) => OrderStatus;
      readonly targets: readonly OrderStatus[];
    });

/** Acumulador de requisitos incumplidos, para guardas legibles. */
function unmet(...checks: readonly (readonly [boolean, string])[]): readonly string[] {
  const result: string[] = [];
  for (const [satisfied, message] of checks) {
    if (!satisfied) result.push(message);
  }
  return result;
}

const TRANSITION_DEFS: readonly TransitionDef[] = [
  {
    from: ['DRAFT'],
    action: 'registrar_recepcion',
    to: 'RECEPCIONADO',
    permission: 'orders:create',
    guard: (f) =>
      unmet(
        [f.hasCustomer, 'Falta identificar al cliente.'],
        [f.hasVehicle, 'Falta identificar el vehículo.'],
      ),
  },
  {
    from: ['RECEPCIONADO'],
    action: 'completar_checklist',
    to: 'CHECKLIST_COMPLETADO',
    permission: 'receptions:write',
    guard: (f) =>
      unmet(
        [
          f.resolvedChecklistItems >= f.requiredChecklistItems,
          `Faltan ${f.requiredChecklistItems - f.resolvedChecklistItems} ítems obligatorios del checklist.`,
        ],
        [f.hasCustomerSignature, 'Falta la firma del cliente.'],
        [f.hasAdvisorSignature, 'Falta la firma del asesor.'],
      ),
  },
  {
    from: ['CHECKLIST_COMPLETADO'],
    action: 'enviar_a_diagnostico',
    to: 'PENDIENTE_DIAGNOSTICO',
    permission: 'orders:assign',
    guard: (f) => unmet([f.hasServiceType, 'Falta definir el tipo de servicio.']),
  },
  {
    from: ['PENDIENTE_DIAGNOSTICO'],
    action: 'iniciar_diagnostico',
    to: 'EN_DIAGNOSTICO',
    permission: 'diagnostics:write',
    guard: (f, a) =>
      unmet(
        [f.assignedTechnicianId !== null, 'La orden no tiene técnico asignado.'],
        [
          f.assignedTechnicianId === a.profileId,
          'Solo el técnico asignado puede iniciar el diagnóstico.',
        ],
      ),
  },
  {
    from: ['EN_DIAGNOSTICO'],
    action: 'completar_diagnostico',
    to: 'DIAGNOSTICO_COMPLETADO',
    permission: 'diagnostics:write',
    guard: (f) =>
      unmet([f.diagnosticItemCount > 0, 'Registra al menos un ítem de diagnóstico.']),
  },
  {
    from: ['DIAGNOSTICO_COMPLETADO'],
    action: 'preparar_cotizacion',
    to: 'COTIZACION_EN_PREPARACION',
    permission: 'quotations:write',
  },
  {
    from: ['COTIZACION_EN_PREPARACION'],
    action: 'enviar_cotizacion',
    to: 'COTIZACION_ENVIADA',
    permission: 'quotations:send',
    guard: (f) =>
      unmet(
        [f.quotationLineCount > 0, 'La cotización no tiene líneas.'],
        [
          f.quotationLinesPriced === f.quotationLineCount,
          'Hay líneas sin precio.',
        ],
        [f.authorizationLinkIssued, 'No se ha emitido el enlace de autorización.'],
      ),
  },
  {
    from: ['COTIZACION_ENVIADA'],
    action: 'cliente_abrio_enlace',
    to: 'ESPERANDO_CLIENTE',
    permission: null,
  },
  {
    // Puede llegar por el portal o registrarla el asesor (autorización telefónica).
    from: ['COTIZACION_ENVIADA', 'ESPERANDO_CLIENTE'],
    action: 'registrar_decision',
    to: (f) =>
      f.approvedItemCount === f.quotationLineCount ? 'APROBADO' : 'APROBACION_PARCIAL',
    targets: ['APROBADO', 'APROBACION_PARCIAL'],
    permission: null,
    guard: (f) =>
      unmet(
        [
          f.decidedItemCount === f.quotationLineCount,
          'El cliente no ha decidido todos los ítems.',
        ],
        [
          f.approvedItemCount > 0,
          'No hay ningún ítem aprobado: usa «Cerrar sin trabajos aprobados».',
        ],
      ),
  },
  {
    // Resolución de I-3: el cliente rechazó todo. El vehículo se devuelve
    // sin intervención y los ítems quedan como recomendación pendiente.
    from: ['ESPERANDO_CLIENTE'],
    action: 'cerrar_sin_trabajos',
    to: 'LISTO_PARA_ENTREGA',
    permission: 'orders:close_empty',
    guard: (f) =>
      unmet(
        [
          f.decidedItemCount === f.quotationLineCount,
          'El cliente no ha decidido todos los ítems.',
        ],
        [f.approvedItemCount === 0, 'Hay ítems aprobados: la orden debe continuar.'],
      ),
  },
  {
    from: ['APROBADO', 'APROBACION_PARCIAL'],
    action: 'solicitar_repuestos',
    to: 'SOLICITUD_REPUESTOS',
    permission: 'parts:request',
    guard: (f) =>
      unmet([
        f.requiredPartsCount > 0,
        'No hay repuestos requeridos por los trabajos aprobados.',
      ]),
  },
  {
    from: ['APROBADO', 'APROBACION_PARCIAL'],
    action: 'sin_repuestos',
    to: 'LISTO_PARA_REPARACION',
    permission: 'parts:request',
    guard: (f) =>
      unmet([
        f.requiredPartsCount === 0,
        'Hay repuestos requeridos: debe generarse la solicitud.',
      ]),
  },
  {
    from: ['SOLICITUD_REPUESTOS'],
    action: 'autorizar_cotizar',
    to: 'REPUESTOS_EN_COTIZACION',
    permission: 'parts:authorize_quote',
    guard: (f) =>
      unmet([f.partsRequestPending, 'La solicitud de repuestos no está pendiente.']),
  },
  {
    from: ['REPUESTOS_EN_COTIZACION'],
    action: 'enviar_a_autorizacion',
    to: 'COMPRA_PENDIENTE_AUTORIZACION',
    permission: 'purchases:quote',
    guard: (f) =>
      unmet([
        f.supplierLinesAllSelected,
        'Hay líneas sin proveedor seleccionado.',
      ]),
  },
  {
    from: ['COMPRA_PENDIENTE_AUTORIZACION'],
    action: 'autorizar_compra',
    to: 'COMPRA_AUTORIZADA',
    permission: 'purchases:authorize',
    guard: (f) =>
      unmet([
        f.purchaseWithinAuthorizerLimit,
        'El monto supera el límite de autorización de este usuario.',
      ]),
  },
  {
    from: ['COMPRA_PENDIENTE_AUTORIZACION'],
    action: 'rechazar_compra',
    to: 'REPUESTOS_EN_COTIZACION',
    permission: 'purchases:authorize',
  },
  {
    from: ['COMPRA_AUTORIZADA'],
    action: 'generar_orden_compra',
    to: 'ORDEN_COMPRA_GENERADA',
    permission: 'purchases:write',
  },
  {
    from: ['ORDEN_COMPRA_GENERADA'],
    action: 'confirmar_envio',
    to: 'ESPERANDO_REPUESTOS',
    permission: 'purchases:write',
    guard: (f) =>
      unmet([f.purchaseOrderIssued, 'La orden de compra no se ha emitido al proveedor.']),
  },
  {
    from: ['ESPERANDO_REPUESTOS', 'REPUESTOS_PARCIALES'],
    action: 'recepcion_parcial',
    to: 'REPUESTOS_PARCIALES',
    permission: 'purchases:receive',
    guard: (f) =>
      unmet([
        !f.partsCoverageComplete,
        'La cobertura está completa: usa «Registrar recepción completa».',
      ]),
  },
  {
    from: ['ESPERANDO_REPUESTOS', 'REPUESTOS_PARCIALES'],
    action: 'recepcion_completa',
    to: 'REPUESTOS_COMPLETOS',
    permission: 'purchases:receive',
    guard: (f) =>
      unmet([
        f.partsCoverageComplete,
        'Aún faltan repuestos por recibir.',
      ]),
  },
  {
    from: ['REPUESTOS_COMPLETOS'],
    action: 'liberar_para_reparacion',
    to: 'LISTO_PARA_REPARACION',
    permission: null,
  },
  {
    from: ['LISTO_PARA_REPARACION'],
    action: 'iniciar_trabajo',
    to: 'EN_REPARACION',
    permission: 'repairs:execute',
    guard: (f, a) =>
      unmet(
        [
          f.assignedTechnicianId === a.profileId,
          'Solo el técnico asignado puede iniciar el trabajo.',
        ],
        [
          f.estimatedMinutes !== null && f.estimatedMinutes > 0,
          'Confirma el tiempo estimado de reparación antes de iniciar.',
        ],
      ),
  },
  {
    from: ['EN_REPARACION'],
    action: 'pausar',
    to: 'REPARACION_PAUSADA',
    permission: 'repairs:execute',
  },
  {
    from: ['REPARACION_PAUSADA'],
    action: 'reanudar',
    to: 'EN_REPARACION',
    permission: 'repairs:execute',
  },
  {
    // Resolución de I-7: trabajo adicional descubierto durante la reparación.
    // Pausa automáticamente con motivo `espera_autorizacion`, para que el
    // tiempo de espera no se le impute al técnico como tiempo efectivo.
    from: ['EN_REPARACION', 'REPARACION_PAUSADA'],
    action: 'ampliar_cotizacion',
    to: 'COTIZACION_EN_PREPARACION',
    permission: 'quotations:write',
  },
  {
    from: ['EN_REPARACION'],
    action: 'terminar_reparacion',
    to: 'REPARACION_TERMINADA',
    permission: 'repairs:execute',
    guard: (f) =>
      unmet(
        [
          f.repairJobsTotal > 0 && f.repairJobsDone === f.repairJobsTotal,
          'Hay trabajos aprobados sin marcar como hechos.',
        ],
        [f.hasFinalEvidence, 'Adjunta la evidencia final de la reparación.'],
        [!f.hasOpenTimeSession, 'Hay una sesión de tiempo abierta.'],
      ),
  },
  {
    from: ['REPARACION_TERMINADA'],
    action: 'enviar_a_calidad',
    to: 'CONTROL_CALIDAD',
    permission: 'repairs:execute',
  },
  {
    from: ['CONTROL_CALIDAD'],
    action: 'aprobar_calidad',
    to: 'CONTROL_CALIDAD_APROBADO',
    permission: 'quality:approve',
    guard: (f) =>
      unmet([f.qualityChecklistComplete, 'El checklist de calidad está incompleto.']),
  },
  {
    from: ['CONTROL_CALIDAD'],
    action: 'observar_calidad',
    to: 'OBSERVADO_CONTROL_CALIDAD',
    permission: 'quality:approve',
    guard: (f) =>
      unmet([f.qualityFindingCount > 0, 'Describe al menos un hallazgo.']),
  },
  {
    from: ['OBSERVADO_CONTROL_CALIDAD'],
    action: 'retomar_reparacion',
    to: 'EN_REPARACION',
    permission: 'repairs:execute',
  },
  {
    from: ['CONTROL_CALIDAD_APROBADO'],
    action: 'enviar_a_lavado',
    to: 'PENDIENTE_LAVADO',
    permission: 'orders:advance',
    guard: (f) =>
      unmet([
        nextFinalStage(f.pendingFinalStages) === 'lavado',
        'El lavado no es la siguiente etapa configurada.',
      ]),
  },
  {
    from: ['CONTROL_CALIDAD_APROBADO'],
    action: 'enviar_a_alineamiento',
    to: 'PENDIENTE_ALINEAMIENTO',
    permission: 'orders:advance',
    guard: (f) =>
      unmet([
        nextFinalStage(f.pendingFinalStages) === 'alineamiento',
        'El alineamiento no es la siguiente etapa configurada.',
      ]),
  },
  {
    from: ['CONTROL_CALIDAD_APROBADO'],
    action: 'finalizar_directo',
    to: 'LISTO_PARA_ENTREGA',
    permission: 'orders:advance',
    guard: (f) =>
      unmet([
        f.pendingFinalStages.length === 0,
        'Quedan etapas finales configuradas pendientes.',
      ]),
  },
  {
    from: ['PENDIENTE_LAVADO'],
    action: 'iniciar_lavado',
    to: 'EN_LAVADO',
    permission: 'washing:execute',
  },
  {
    from: ['EN_LAVADO'],
    action: 'terminar_lavado',
    to: (f) => statusAfterFinalStage(withoutStage(f.pendingFinalStages, 'lavado')),
    targets: ['PENDIENTE_ALINEAMIENTO', 'LISTO_PARA_ENTREGA'],
    permission: 'washing:execute',
  },
  {
    from: ['PENDIENTE_ALINEAMIENTO'],
    action: 'iniciar_alineamiento',
    to: 'EN_ALINEAMIENTO',
    permission: 'alignment:execute',
  },
  {
    from: ['EN_ALINEAMIENTO'],
    action: 'terminar_alineamiento',
    to: (f) => statusAfterFinalStage(withoutStage(f.pendingFinalStages, 'alineamiento')),
    targets: ['PENDIENTE_LAVADO', 'LISTO_PARA_ENTREGA'],
    permission: 'alignment:execute',
  },
  {
    from: ['LISTO_PARA_ENTREGA'],
    action: 'entregar',
    to: 'ENTREGADO',
    permission: 'orders:deliver',
    guard: (f) =>
      unmet([f.deliveryActSigned, 'Falta la firma del acta de entrega.']),
  },
  {
    from: ['ENTREGADO'],
    action: 'cerrar',
    to: 'CERRADO',
    permission: 'orders:close',
    guard: (f) => unmet([!f.hasOpenTasks, 'La orden tiene tareas abiertas.']),
  },
  {
    // Disponible desde cualquier estado anterior a ENTREGADO.
    from: ORDER_STATUSES.filter(
      (s) => !TERMINAL_STATUSES.has(s) && s !== 'ENTREGADO',
    ),
    action: 'cancelar',
    to: 'CANCELADO',
    permission: 'orders:cancel',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Índice
// ─────────────────────────────────────────────────────────────────────────────

interface Transition {
  readonly from: OrderStatus;
  readonly action: OrderAction;
  readonly to: Target;
  /** Todos los estados a los que puede desembocar. */
  readonly targets: readonly OrderStatus[];
  readonly permission: Permission | null;
  readonly guard?: Guard;
}

function key(from: OrderStatus, action: OrderAction): string {
  return `${from}|${action}`;
}

const TRANSITIONS: ReadonlyMap<string, Transition> = (() => {
  const map = new Map<string, Transition>();
  for (const def of TRANSITION_DEFS) {
    for (const from of def.from) {
      const k = key(from, def.action);
      if (map.has(k)) {
        throw new Error(`Transición duplicada en la definición: ${k}`);
      }
      const targets: readonly OrderStatus[] =
        typeof def.to === 'function' ? def.targets : [def.to];
      const transition: Transition = def.guard
        ? { from, action: def.action, to: def.to, targets, permission: def.permission, guard: def.guard }
        : { from, action: def.action, to: def.to, targets, permission: def.permission };
      map.set(k, transition);
    }
  }
  return map;
})();

/** Número de pares (estado, acción) declarados. Lo usa el seed de la Fase 2. */
export const TRANSITION_COUNT = TRANSITIONS.size;

export interface TransitionRow {
  readonly from: OrderStatus;
  readonly action: OrderAction;
  readonly to: OrderStatus;
  readonly permission: Permission | null;
}

/**
 * El grafo completo, como ternas (origen, acción, destino).
 *
 * Siembra la tabla `status_transitions`, que lee el disparador de PostgreSQL.
 * Así el código y la base no pueden discrepar: la base valida contra lo que el
 * dominio declara.
 */
export function allTransitions(): readonly TransitionRow[] {
  return [...TRANSITIONS.values()].flatMap(({ from, action, targets, permission }) =>
    targets.map((to) => ({ from, action, to, permission })),
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Consulta
// ─────────────────────────────────────────────────────────────────────────────

export type TransitionCheck =
  | { readonly allowed: true; readonly to: OrderStatus }
  | {
      readonly allowed: false;
      readonly reason: 'unknown_transition' | 'forbidden' | 'unmet_requirements';
      readonly message: string;
      readonly unmet: readonly string[];
    };

function resolveTarget(to: Target, facts: OrderFacts): OrderStatus {
  return typeof to === 'function' ? to(facts) : to;
}

/**
 * ¿Puede aplicarse esta acción? Devuelve el motivo exacto si no.
 *
 * La interfaz usa esto para deshabilitar botones y explicar por qué; el
 * servidor usa `assertTransition`, que lanza. Ambos leen la misma tabla, así
 * que no pueden discrepar.
 */
export function canTransition(
  facts: OrderFacts,
  action: OrderAction,
  actor: Actor,
): TransitionCheck {
  const transition = TRANSITIONS.get(key(facts.status, action));

  if (transition === undefined) {
    return {
      allowed: false,
      reason: 'unknown_transition',
      message: `La acción «${ACTION_LABELS[action]}» no está disponible en el estado «${facts.status}».`,
      unmet: [],
    };
  }

  if (
    transition.permission !== null &&
    !actor.permissions.includes(transition.permission)
  ) {
    return {
      allowed: false,
      reason: 'forbidden',
      message: 'No tienes permiso para realizar esta acción.',
      unmet: [],
    };
  }

  const pending = transition.guard?.(facts, actor) ?? [];
  if (pending.length > 0) {
    return {
      allowed: false,
      reason: 'unmet_requirements',
      message: 'Faltan requisitos para continuar.',
      unmet: pending,
    };
  }

  return { allowed: true, to: resolveTarget(transition.to, facts) };
}

/**
 * Igual que `canTransition`, pero lanza el error del dominio que corresponda.
 * Es lo que llaman las Server Actions antes de tocar nada.
 */
export function assertTransition(
  facts: OrderFacts,
  action: OrderAction,
  actor: Actor,
): OrderStatus {
  const check = canTransition(facts, action, actor);
  if (check.allowed) return check.to;

  switch (check.reason) {
    case 'unknown_transition':
      throw new InvalidTransitionError(facts.status, action, check.message);
    case 'forbidden':
      throw new ForbiddenError(check.message);
    case 'unmet_requirements':
      throw new BusinessRuleError(check.message, check.unmet);
  }
}

export interface ActionOption {
  readonly action: OrderAction;
  readonly label: string;
  readonly to: OrderStatus;
  readonly available: boolean;
  /** Requisitos que faltan, para mostrarlos junto al botón deshabilitado. */
  readonly unmet: readonly string[];
}

/**
 * Todas las acciones declaradas para el estado actual, con su disponibilidad.
 *
 * Las que el actor no puede ejecutar por falta de permiso se omiten: mostrar un
 * botón que nunca funcionará no ayuda a nadie. Las que fallan por requisitos
 * SÍ se muestran, deshabilitadas y con la lista de lo que falta — ahí el
 * usuario sí puede hacer algo al respecto.
 */
export function availableActions(facts: OrderFacts, actor: Actor): readonly ActionOption[] {
  const options: ActionOption[] = [];

  for (const transition of TRANSITIONS.values()) {
    if (transition.from !== facts.status) continue;
    if (transition.permission === null) continue;
    if (!actor.permissions.includes(transition.permission)) continue;

    const check = canTransition(facts, transition.action, actor);
    options.push({
      action: transition.action,
      label: ACTION_LABELS[transition.action],
      to: resolveTarget(transition.to, facts),
      available: check.allowed,
      unmet: check.allowed ? [] : check.unmet,
    });
  }

  return options;
}

/** ¿Existe la transición, con independencia de permisos y guardas? */
export function transitionExists(from: OrderStatus, action: OrderAction): boolean {
  return TRANSITIONS.has(key(from, action));
}
