/**
 * El expediente de la orden: los hechos que la máquina de estados exige.
 *
 * ── El puente que faltaba ──────────────────────────────────────────────────
 *
 * Una orden abierta desde recepción llegaba hasta «Enviar a diagnóstico» y
 * ahí se acababa el recorrido: la siguiente acción pedía un técnico asignado
 * y NO HABÍA NINGUNA PANTALLA donde asignarlo. Lo mismo un paso más allá —sin
 * hallazgos no se cierra el diagnóstico, sin precios no se envía la
 * cotización, sin decisión del cliente no se aprueba nada— y las pantallas
 * que resuelven cada cosa solo existen para las nueve órdenes sembradas.
 *
 * El resultado era una orden real que no se podía mover, con una barra que
 * explicaba muy bien lo que faltaba y ningún sitio donde hacerlo.
 *
 * Este módulo es el expediente: UNA estructura por orden de la que salen
 * todos esos hechos. No decide nada —eso sigue siendo `canTransition`—; solo
 * guarda lo que el taller va anotando y lo traduce a `OrderFacts`.
 *
 * ── Una fila que viaja el recorrido entero ─────────────────────────────────
 *
 * El hallazgo del diagnóstico, la línea de la cotización y el trabajo que el
 * técnico marca como hecho SON LA MISMA COSA en tres momentos. Por eso hay
 * una sola lista de líneas y no tres: partirla obligaría a copiar lo de
 * arriba en lo de abajo, y ahí es donde se pierde un trabajo aprobado que
 * nadie llega a hacer.
 *
 * ⚠️ NO es la base de datos. En producción cada tramo escribe su tabla
 * —`diagnostic_findings`, `quotation_items`, `repair_jobs`— y los hechos se
 * leen con una consulta. Mientras el almacén sea el navegador, alguien tiene
 * que juntarlos, y es mejor que sea una función pura y probada.
 *
 * Dominio PURO: sin React, sin almacenamiento, sin `Date.now()` escondido.
 */

import type { Priority } from '@/features/diagnosis/services/findings';
import type { Permission, RoleCode } from '@/lib/auth/permissions';
import { FINAL_STAGES, type FinalStage } from './final-stages';
import type { OrderStatus } from './order-status';
import type { OrderAction, OrderFacts } from './state-machine';

export type LineDecision = 'pendiente' | 'aprobado' | 'rechazado';

export const DECISION_LABELS: Readonly<Record<LineDecision, string>> = {
  pendiente: 'Sin decidir',
  aprobado: 'Aprobado',
  rechazado: 'Rechazado',
};

export type LineKind = 'servicio' | 'repuesto';

/**
 * Una línea del expediente.
 *
 * Nace como hallazgo del diagnóstico, se le pone precio en la cotización, el
 * cliente la aprueba o la rechaza, y el técnico la marca hecha. La misma fila
 * en los cuatro momentos.
 */
export interface WorkfileLine {
  readonly id: string;
  readonly title: string;
  readonly kind: LineKind;
  readonly priority: Priority;
  /** Tiempo de mano de obra, en minutos. */
  readonly minutes: number;
  /** Precio total de la línea, en céntimos. Cero = todavía sin precio. */
  readonly cents: number;
  readonly decision: LineDecision;
  readonly done: boolean;
}

/** Quién tiene asignada la orden. El identificador es el que compara la guarda. */
export interface Assignee {
  readonly id: string;
  readonly name: string;
}

/** Un punto del control de calidad. */
export interface WorkfileCheck {
  readonly id: string;
  readonly label: string;
  readonly done: boolean;
}

/**
 * Lo que va anotando el taller.
 *
 * Todo lo que NO está aquí lo sigue aportando quien llama: la bahía dice si
 * el cronómetro corre y cuántas fotos hay, y la recepción dice si el acta
 * está firmada. Rellenar aquí hechos que no constan dejaría cerrar la orden
 * con datos inventados en este archivo.
 */
export interface OrderWorkfile {
  /**
   * A qué vino el vehículo.
   *
   * En recepción no se sabe —lo dice el cliente al dejarlo o el diagnóstico
   * al revisarlo—, así que la orden nace sin él y la máquina de estados no
   * deja mandarla a diagnóstico hasta que se decide. Vive AQUÍ, con el resto
   * de decisiones de la orden, y no en un lápiz junto al título: allí parecía
   * un detalle del encabezado y era un requisito para avanzar.
   */
  readonly serviceType: string;
  readonly technician: Assignee | null;
  readonly lines: readonly WorkfileLine[];
  /** El enlace de autorización que abre el cliente. */
  readonly linkIssued: boolean;
  /** Compras eligió proveedor para todas las líneas. */
  readonly supplierChosen: boolean;
  /** Quien autoriza dice que el monto está dentro de su límite. */
  readonly purchaseApproved: boolean;
  readonly purchaseOrderIssued: boolean;
  readonly partsReceived: PartsReception;
  /** Minutos confirmados antes de empezar. `null` = sin confirmar. */
  readonly estimatedMinutes: number | null;
  readonly quality: readonly WorkfileCheck[];
  readonly qualityFindings: readonly string[];
  readonly finalStages: readonly FinalStage[];
  readonly deliverySigned: boolean;
}

export type PartsReception = 'ninguno' | 'parcial' | 'completo';

export function emptyWorkfile(): OrderWorkfile {
  return {
    serviceType: '',
    technician: null,
    lines: [],
    linkIssued: false,
    supplierChosen: false,
    purchaseApproved: false,
    purchaseOrderIssued: false,
    partsReceived: 'ninguno',
    estimatedMinutes: null,
    quality: [],
    qualityFindings: [],
    finalStages: [],
    deliverySigned: false,
  };
}

/** Dónde se guarda el expediente de una orden. */
export function workfileSlot(orderId: string): string {
  return `orden.${orderId}.expediente`;
}

/* ------------------------------------------------------------------ *
 * Cuentas
 * ------------------------------------------------------------------ */

export function approvedLines(lines: readonly WorkfileLine[]): readonly WorkfileLine[] {
  return lines.filter((l) => l.decision === 'aprobado');
}

export function decidedCount(lines: readonly WorkfileLine[]): number {
  return lines.filter((l) => l.decision !== 'pendiente').length;
}

export function pricedCount(lines: readonly WorkfileLine[]): number {
  return lines.filter((l) => l.cents > 0).length;
}

/** Los repuestos que hay que conseguir: solo los de las líneas aprobadas. */
export function requiredParts(lines: readonly WorkfileLine[]): readonly WorkfileLine[] {
  return approvedLines(lines).filter((l) => l.kind === 'repuesto');
}

export function totalCents(lines: readonly WorkfileLine[]): number {
  return lines.reduce((sum, l) => sum + l.cents, 0);
}

export function proposedMinutes(lines: readonly WorkfileLine[]): number {
  return approvedLines(lines).reduce((sum, l) => sum + l.minutes, 0);
}

export function qualityComplete(checks: readonly WorkfileCheck[]): boolean {
  return checks.length > 0 && checks.every((c) => c.done);
}

/**
 * Las etapas finales YA HECHAS, leídas del historial de avance.
 *
 * No se guardan en el expediente porque no las anota nadie: las produce la
 * propia transición al terminar el lavado o el alineamiento. Derivarlas del
 * historial evita el dato duplicado que se queda a medias cuando alguien
 * deshace un paso —al deshacerlo, el paso desaparece del historial y la etapa
 * vuelve a estar pendiente sola—.
 */
export function stagesFinished(
  history: readonly { readonly action: OrderAction }[],
): readonly FinalStage[] {
  const hechas: FinalStage[] = [];
  for (const step of history) {
    if (step.action === 'terminar_lavado' && !hechas.includes('lavado')) hechas.push('lavado');
    if (step.action === 'terminar_alineamiento' && !hechas.includes('alineamiento')) {
      hechas.push('alineamiento');
    }
  }
  return hechas;
}

export function pendingStages(
  configured: readonly FinalStage[],
  finished: readonly FinalStage[],
): readonly FinalStage[] {
  return configured.filter((s) => !finished.includes(s));
}

/* ------------------------------------------------------------------ *
 * De expediente a hechos
 * ------------------------------------------------------------------ */

/**
 * Los hechos, con lo que el expediente sabe.
 *
 * Misma disciplina que `withBenchFacts`: un expediente vacío NO pisa lo
 * sembrado. Las nueve órdenes de la demostración vienen con su cotización y
 * su checklist de calidad hechos, y sobreescribirlos con ceros las dejaría
 * pidiendo otra vez trabajo que ya está hecho.
 */
export function factsFromWorkfile(
  base: OrderFacts,
  workfile: OrderWorkfile,
  finishedStages: readonly FinalStage[] = [],
): OrderFacts {
  const { lines } = workfile;
  const aprobadas = approvedLines(lines);
  const repuestos = requiredParts(lines);
  const hayLineas = lines.length > 0;

  return {
    ...base,

    /* Lo sembrado manda si el expediente no dice nada: las nueve órdenes de
       la demostración ya traen su tipo de servicio. */
    hasServiceType: workfile.serviceType.trim() !== '' || base.hasServiceType,

    assignedTechnicianId:
      workfile.technician !== null ? workfile.technician.id : base.assignedTechnicianId,

    diagnosticItemCount: hayLineas ? lines.length : base.diagnosticItemCount,

    quotationLineCount: hayLineas ? lines.length : base.quotationLineCount,
    quotationLinesPriced: hayLineas ? pricedCount(lines) : base.quotationLinesPriced,
    authorizationLinkIssued: workfile.linkIssued || base.authorizationLinkIssued,
    decidedItemCount: hayLineas ? decidedCount(lines) : base.decidedItemCount,
    approvedItemCount: hayLineas ? aprobadas.length : base.approvedItemCount,

    /*
     * Los repuestos salen de lo APROBADO, no de lo cotizado: un repuesto que
     * el cliente rechazó no se pide, y contarlo mandaría la orden a un tramo
     * de compras que no le corresponde.
     */
    requiredPartsCount: hayLineas ? repuestos.length : base.requiredPartsCount,
    /*
     * «Solicitud pendiente» es exactamente eso: hay repuestos que conseguir y
     * todavía no han llegado. No hay una casilla que marcar aparte porque no
     * hay ningún acto humano entre una cosa y la otra.
     */
    partsRequestPending:
      hayLineas
        ? repuestos.length > 0 && workfile.partsReceived !== 'completo'
        : base.partsRequestPending,
    partsCoverageComplete:
      workfile.partsReceived === 'completo' || base.partsCoverageComplete,
    supplierLinesAllSelected: workfile.supplierChosen || base.supplierLinesAllSelected,
    purchaseWithinAuthorizerLimit:
      workfile.purchaseApproved || base.purchaseWithinAuthorizerLimit,
    purchaseOrderIssued: workfile.purchaseOrderIssued || base.purchaseOrderIssued,

    estimatedMinutes: workfile.estimatedMinutes ?? base.estimatedMinutes,

    /*
     * Los trabajos de la reparación son las líneas aprobadas. Si no hay
     * ninguna, manda lo sembrado: `0 de 0 hechos` dejaría cerrar la
     * reparación sin haber tocado el vehículo.
     */
    repairJobsTotal: aprobadas.length > 0 ? aprobadas.length : base.repairJobsTotal,
    repairJobsDone:
      aprobadas.length > 0 ? aprobadas.filter((l) => l.done).length : base.repairJobsDone,

    qualityChecklistComplete:
      workfile.quality.length > 0 ? qualityComplete(workfile.quality) : base.qualityChecklistComplete,
    qualityFindingCount:
      workfile.qualityFindings.length > 0
        ? workfile.qualityFindings.length
        : base.qualityFindingCount,
    pendingFinalStages:
      workfile.finalStages.length > 0
        ? pendingStages(workfile.finalStages, finishedStages)
        : base.pendingFinalStages,

    deliveryActSigned: workfile.deliverySigned || base.deliveryActSigned,
  };
}

/* ------------------------------------------------------------------ *
 * Los pasos del expediente
 * ------------------------------------------------------------------ */

export const WORKFILE_STEPS = [
  'servicio',
  'tecnico',
  'hallazgos',
  'precios',
  'decision',
  'repuestos',
  'tiempo',
  'trabajos',
  'calidad',
  'etapas',
  'entrega',
] as const;

export type WorkfileStep = (typeof WORKFILE_STEPS)[number];

export const STEP_LABELS: Readonly<Record<WorkfileStep, string>> = {
  servicio: 'Tipo de servicio',
  tecnico: 'Asignar técnico',
  hallazgos: 'Hallazgos del diagnóstico',
  precios: 'Precios de la cotización',
  decision: 'Decisión del cliente',
  repuestos: 'Repuestos y compra',
  tiempo: 'Tiempo estimado',
  trabajos: 'Trabajos de la reparación',
  calidad: 'Control de calidad',
  etapas: 'Servicios finales',
  entrega: 'Acta de entrega',
};

/**
 * El paso que resuelve el estado actual.
 *
 * Se deriva del ESTADO, no del texto del requisito: los textos se reescriben
 * y un `includes('técnico')` se rompería en silencio la primera vez que
 * alguien mejore la redacción. Es la misma razón por la que `screenFor`
 * deriva del nombre de la acción.
 */
export function stepFor(status: OrderStatus): WorkfileStep | null {
  switch (status) {
    /* Lo primero que pide la máquina de estados: sin tipo de servicio no se
       puede mandar a diagnóstico. */
    case 'CHECKLIST_COMPLETADO':
      return 'servicio';
    case 'PENDIENTE_DIAGNOSTICO':
      return 'tecnico';
    case 'EN_DIAGNOSTICO':
      return 'hallazgos';
    case 'DIAGNOSTICO_COMPLETADO':
    case 'COTIZACION_EN_PREPARACION':
      return 'precios';
    case 'COTIZACION_ENVIADA':
    case 'ESPERANDO_CLIENTE':
      return 'decision';
    case 'APROBADO':
    case 'APROBACION_PARCIAL':
    case 'SOLICITUD_REPUESTOS':
    case 'REPUESTOS_EN_COTIZACION':
    case 'COMPRA_PENDIENTE_AUTORIZACION':
    case 'COMPRA_AUTORIZADA':
    case 'ORDEN_COMPRA_GENERADA':
    case 'ESPERANDO_REPUESTOS':
    case 'REPUESTOS_PARCIALES':
    case 'REPUESTOS_COMPLETOS':
      return 'repuestos';
    case 'LISTO_PARA_REPARACION':
      return 'tiempo';
    case 'EN_REPARACION':
    case 'REPARACION_PAUSADA':
      return 'trabajos';
    case 'CONTROL_CALIDAD':
    case 'OBSERVADO_CONTROL_CALIDAD':
      return 'calidad';
    case 'CONTROL_CALIDAD_APROBADO':
      return 'etapas';
    case 'LISTO_PARA_ENTREGA':
      return 'entrega';
    default:
      return null;
  }
}

/** ¿Este paso ya está resuelto en el expediente? */
export function stepDone(step: WorkfileStep, w: OrderWorkfile): boolean {
  switch (step) {
    case 'servicio':
      return w.serviceType.trim() !== '';
    case 'tecnico':
      return w.technician !== null;
    case 'hallazgos':
      return w.lines.length > 0;
    case 'precios':
      return w.lines.length > 0 && pricedCount(w.lines) === w.lines.length && w.linkIssued;
    case 'decision':
      return w.lines.length > 0 && decidedCount(w.lines) === w.lines.length;
    case 'repuestos':
      return requiredParts(w.lines).length === 0 || w.partsReceived === 'completo';
    case 'tiempo':
      return w.estimatedMinutes !== null && w.estimatedMinutes > 0;
    case 'trabajos': {
      const aprobadas = approvedLines(w.lines);
      return aprobadas.length > 0 && aprobadas.every((l) => l.done);
    }
    case 'calidad':
      return qualityComplete(w.quality);
    case 'etapas':
      /*
       * Ninguna etapa final configurada NO es un paso a medias: hay órdenes
       * que salen sin lavado ni alineamiento, y la máquina de estados tiene
       * «Finalizar sin servicios adicionales» justo para eso.
       */
      return true;
    case 'entrega':
      return w.deliverySigned;
    default:
      return false;
  }
}

/**
 * Cómo está un paso, con la diferencia que «hecho o pendiente» no sabe decir.
 *
 * Hay dos pasos que se dan por resueltos sin que nadie haga nada: si ninguna
 * línea aprobada lleva repuesto no hay nada que comprar, y una orden puede
 * salir sin lavado ni alineamiento. Pintarlos «Hecho» en una orden recién
 * recibida era decir que algo ya ocurrió cuando todavía no ha ocurrido nada:
 * la lista enseñaba el sexto paso en verde con los cinco anteriores
 * pendientes, que es exactamente lo que hace desconfiar de una lista.
 */
export type StepState = 'hecho' | 'sin_falta' | 'pendiente';

export const STEP_STATE_LABELS: Readonly<Record<StepState, string>> = {
  hecho: 'Hecho',
  sin_falta: 'No hace falta',
  pendiente: 'Pendiente',
};

export function stepState(step: WorkfileStep, w: OrderWorkfile): StepState {
  if (!stepDone(step, w)) return 'pendiente';
  switch (step) {
    case 'repuestos':
      return requiredParts(w.lines).length === 0 ? 'sin_falta' : 'hecho';
    case 'etapas':
      return w.finalStages.length === 0 ? 'sin_falta' : 'hecho';
    default:
      return 'hecho';
  }
}

/* ------------------------------------------------------------------ *
 * A quién se le puede asignar
 * ------------------------------------------------------------------ */

export interface Technician extends Assignee {
  readonly role: RoleCode;
  readonly roleLabel: string;
}

/**
 * Los puestos a los que se puede asignar una orden.
 *
 * No es una lista escrita a mano: son los roles que tienen el permiso de
 * ejecutar reparaciones. Escribirla a mano significaría que crear un puesto
 * nuevo de taller lo deja fuera del desplegable sin que nadie se entere.
 *
 * ⚠️ El identificador que se guarda tiene que ser EL MISMO con el que entra
 * esa persona, porque la guarda compara `assignedTechnicianId === profileId`:
 * asignar a un identificador inventado deja la orden asignada a nadie y el
 * técnico no puede empezar. En la demostración eso es `demo-<rol>`, que es lo
 * que devuelve `userForRole`; con Supabase configurado son `profiles.id`.
 */
export function assignableTechnicians(
  people: Readonly<Record<RoleCode, string>>,
  rolePermissions: Readonly<Record<RoleCode, readonly Permission[]>>,
  roleLabels: Readonly<Record<RoleCode, string>>,
  idFor: (role: RoleCode) => string,
): readonly Technician[] {
  const roles = (Object.keys(rolePermissions) as RoleCode[]).filter((role) =>
    rolePermissions[role].includes('repairs:execute'),
  );

  /*
   * El taller primero. `super_admin` y `admin` también pueden ejecutar
   * reparaciones —lo dice su lista de permisos, no este archivo—, pero
   * ofrecerlos ANTES que al técnico invita a asignar la orden a quien no la
   * va a hacer, y entonces el reparto de trabajo del taller deja de contar la
   * verdad. Salen al final, que es donde tienen que estar.
   */
  const peso = (role: RoleCode): number =>
    role === 'super_admin' || role === 'admin' ? 1 : 0;

  return roles
    .sort((a, b) => peso(a) - peso(b))
    .map((role) => ({
      id: idFor(role),
      name: people[role],
      role,
      roleLabel: roleLabels[role],
    }));
}

/* ------------------------------------------------------------------ *
 * Lectura de lo guardado
 * ------------------------------------------------------------------ */

const KINDS: ReadonlySet<string> = new Set<string>(['servicio', 'repuesto']);
const DECISIONS: ReadonlySet<string> = new Set<string>([
  'pendiente',
  'aprobado',
  'rechazado',
]);
const PRIORITIES: ReadonlySet<string> = new Set<string>([
  'critico',
  'alto',
  'medio',
  'recomendacion',
]);
const RECEPTIONS: ReadonlySet<string> = new Set<string>(['ninguno', 'parcial', 'completo']);

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function count(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.round(value)
    : 0;
}

function flag(value: unknown): boolean {
  return value === true;
}

function readLine(raw: unknown): WorkfileLine | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const id = text(r.id);
  const title = text(r.title);
  if (id === '' || title === '') return null;
  return {
    id,
    title,
    kind: KINDS.has(text(r.kind)) ? (r.kind as LineKind) : 'servicio',
    priority: PRIORITIES.has(text(r.priority)) ? (r.priority as Priority) : 'medio',
    minutes: count(r.minutes),
    cents: count(r.cents),
    decision: DECISIONS.has(text(r.decision)) ? (r.decision as LineDecision) : 'pendiente',
    done: flag(r.done),
  };
}

function readCheck(raw: unknown): WorkfileCheck | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const id = text(r.id);
  const label = text(r.label);
  if (id === '' || label === '') return null;
  return { id, label, done: flag(r.done) };
}

function readAssignee(raw: unknown): Assignee | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  const id = text(r.id);
  if (id === '') return null;
  return { id, name: text(r.name, 'Sin nombre') };
}

/**
 * Hidrata lo guardado y descarta lo que no encaje.
 *
 * Una línea corrupta se tira ELLA SOLA en vez de vaciar el expediente
 * entero: perder las otras once por una mal escrita sería peor que la propia
 * corrupción. Lo que no se puede es inventarla, porque una línea con precio
 * cero se leería como «sin precio» y bloquearía la cotización sin motivo.
 */
export function readWorkfile(stored: unknown): OrderWorkfile {
  if (typeof stored !== 'object' || stored === null) return emptyWorkfile();
  const s = stored as Record<string, unknown>;

  const lines = Array.isArray(s.lines)
    ? s.lines.map(readLine).filter((l): l is WorkfileLine => l !== null)
    : [];

  const quality = Array.isArray(s.quality)
    ? s.quality.map(readCheck).filter((c): c is WorkfileCheck => c !== null)
    : [];

  const findings = Array.isArray(s.qualityFindings)
    ? s.qualityFindings.filter((f): f is string => typeof f === 'string' && f.trim() !== '')
    : [];

  const stages = Array.isArray(s.finalStages)
    ? FINAL_STAGES.filter((stage) => (s.finalStages as unknown[]).includes(stage))
    : [];

  const minutos = s.estimatedMinutes;

  return {
    serviceType: text(s.serviceType).slice(0, 80),
    technician: readAssignee(s.technician),
    lines,
    linkIssued: flag(s.linkIssued),
    supplierChosen: flag(s.supplierChosen),
    purchaseApproved: flag(s.purchaseApproved),
    purchaseOrderIssued: flag(s.purchaseOrderIssued),
    partsReceived: RECEPTIONS.has(text(s.partsReceived))
      ? (s.partsReceived as PartsReception)
      : 'ninguno',
    estimatedMinutes:
      typeof minutos === 'number' && Number.isFinite(minutos) && minutos > 0
        ? Math.round(minutos)
        : null,
    quality,
    qualityFindings: findings,
    finalStages: stages,
    deliverySigned: flag(s.deliverySigned),
  };
}

/** ¿Hay algo anotado? Lo usa la pantalla para no prometer lo que no hay. */
export function hasWork(w: OrderWorkfile): boolean {
  return (
    w.serviceType.trim() !== '' ||
    w.technician !== null ||
    w.lines.length > 0 ||
    w.quality.length > 0 ||
    w.estimatedMinutes !== null ||
    w.deliverySigned
  );
}

/* ------------------------------------------------------------------ *
 * Ayudas para la pantalla
 * ------------------------------------------------------------------ */

/**
 * El checklist de calidad de arranque.
 *
 * Calidad tiene su propia pantalla con su catálogo; esto es el mínimo con el
 * que una orden abierta desde recepción puede pasar el control sin inventarse
 * puntos sobre la marcha. Se puede desmarcar y ampliar, pero empezar con la
 * lista vacía dejaba «El checklist de calidad está incompleto» sin nada que
 * marcar, que es el mismo callejón de antes.
 */
export const STANDARD_QUALITY_CHECKS: readonly WorkfileCheck[] = [
  { id: 'q-trabajos', label: 'Los trabajos aprobados están hechos', done: false },
  { id: 'q-fugas', label: 'Sin fugas ni holguras', done: false },
  { id: 'q-ruta', label: 'Prueba de ruta conforme', done: false },
  { id: 'q-testigos', label: 'Sin testigos encendidos en el tablero', done: false },
  { id: 'q-limpieza', label: 'Interior sin marcas del trabajo', done: false },
];

/** Céntimos a soles, para pintar. Los céntimos NO se dividen antes de guardar. */
export function toSoles(cents: number): number {
  return cents / 100;
}

/**
 * Lo que escribe una persona, a céntimos.
 *
 * Acepta la coma decimal, que es como se escribe aquí, y devuelve `null` en
 * vez de `NaN` cuando no hay número: un `NaN` guardado se lee como «sin
 * precio» y bloquea la cotización sin decir por qué.
 */
export function centsFromSoles(input: string): number | null {
  const limpio = input.trim().replace(/\s/gu, '').replace(',', '.');
  if (limpio === '') return null;
  if (!/^\d+(\.\d{0,2})?$/u.test(limpio)) return null;
  return Math.round(Number(limpio) * 100);
}

/** «2 h 30 min», que es como se dice el tiempo de un trabajo. */
export function minutesPhrase(minutes: number): string {
  if (minutes <= 0) return 'sin estimar';
  const horas = Math.floor(minutes / 60);
  const resto = minutes % 60;
  if (horas === 0) return `${resto} min`;
  if (resto === 0) return `${horas} h`;
  return `${horas} h ${resto} min`;
}
