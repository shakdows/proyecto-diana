/**
 * La jornada del técnico (§12).
 *
 * El problema que resuelve: un técnico abre la pantalla con las manos sucias y
 * treinta segundos, y lo que necesita saber es UNA cosa —qué toca ahora—. Una
 * bandeja con tres accesos genéricos («diagnóstico», «repuestos»,
 * «reparación») le hace elegir la sección y después buscar la orden dentro.
 * Eso es trabajo administrativo que el sistema ya puede hacer solo: el estado
 * de la orden determina cuál es la única acción que avanza el trabajo.
 *
 * Por eso aquí no hay botones fijos. `nextStep` pregunta a la máquina de
 * estados qué transiciones existen para el estado actual, se queda con la que
 * avanza —no con la que pausa ni con la que cancela— y devuelve su etiqueta,
 * su disponibilidad y, si está bloqueada, qué falta. Cambiar la máquina de
 * estados cambia este botón, que es exactamente lo que se quiere: no puede
 * ofrecerse una acción que el servidor vaya a rechazar.
 *
 * Dominio PURO: sin Next.js, sin base de datos, sin componentes.
 */

import { PAUSE_REASONS } from '../../../../db/seed/catalog';
import type { OrderStatus } from '@/features/orders/services/order-status';
import {
  ACTION_LABELS,
  availableActions,
  type Actor,
  type OrderAction,
  type OrderFacts,
} from '@/features/orders/services/state-machine';
import { DEFAULT_TIME_ZONE } from '@/lib/utils/format';
import type { TimeSession, TimeTotals } from './time-tracking';

// ─────────────────────────────────────────────────────────────────────────────
// Entrada
// ─────────────────────────────────────────────────────────────────────────────

/** La pausa abierta de una orden, ya resuelta contra el catálogo. */
export interface OpenPause {
  readonly reason: string;
  readonly label: string;
  /** Depende de un tercero: reanudar no está en manos del técnico. */
  readonly blocks: boolean;
  readonly since: Date;
}

/**
 * Lo mínimo que hace falta para decidir qué toca.
 *
 * Es un tipo propio y no la fila del tablero a propósito: el tablero es una
 * pantalla, y esto tiene que poder probarse sin construir una.
 */
export interface DayJob {
  readonly id: string;
  readonly code: string;
  readonly plate: string;
  readonly vehicle: string;
  readonly serviceType: string;
  readonly customer: string;
  readonly status: OrderStatus;
  readonly facts: OrderFacts;
  readonly sessions: readonly TimeSession[];
  readonly totals: TimeTotals;
  readonly estimatedMinutes: number;
  readonly promisedAt: Date | null;
  readonly openPause: OpenPause | null;
  /** Fin de la última sesión de trabajo. Decide qué se terminó HOY. */
  readonly lastWorkEndedAt: Date | null;
  readonly jobsTotal: number;
  readonly jobsDone: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// La acción que avanza
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Las acciones que hacen AVANZAR el trabajo, en orden de preferencia.
 *
 * `pausar` y `cancelar` no están: son salidas, no avances. `pausar` se ofrece
 * aparte, como acción secundaria, y solo mientras el cronómetro corre.
 *
 * El orden importa en `EN_REPARACION`, donde conviven «terminar» y «ampliar
 * cotización»: terminar es lo que se espera del trabajo; ampliar es la
 * excepción que ocurre cuando aparece algo nuevo.
 */
const ADVANCING: readonly OrderAction[] = [
  'retomar_reparacion',
  'reanudar',
  'iniciar_diagnostico',
  'completar_diagnostico',
  'iniciar_trabajo',
  'terminar_reparacion',
  'enviar_a_calidad',
];

export type StepTone = 'brand' | 'ok' | 'warn' | 'crit' | 'muted';

export interface NextStep {
  /** `null` cuando el técnico no tiene ninguna acción en este estado. */
  readonly action: OrderAction | null;
  readonly label: string;
  readonly enabled: boolean;
  /** Requisitos incumplidos, en las palabras de la máquina de estados. */
  readonly blockedBy: readonly string[];
  readonly tone: StepTone;
}

/**
 * Quién tiene la pelota cuando no la tiene el técnico.
 *
 * Un estado sin acción del técnico no es lo mismo que un estado sin
 * información: decir «no puedes hacer nada» y callar quién debe moverse deja
 * al técnico sin saber a quién preguntar.
 */
const WAITING_ON: Partial<Readonly<Record<OrderStatus, string>>> = {
  COTIZACION_EN_PREPARACION: 'el asesor',
  COTIZACION_ENVIADA: 'el cliente',
  ESPERANDO_CLIENTE: 'el cliente',
  APROBADO: 'el asesor',
  APROBACION_PARCIAL: 'el asesor',
  SOLICITUD_REPUESTOS: 'compras',
  REPUESTOS_EN_COTIZACION: 'compras',
  COMPRA_PENDIENTE_AUTORIZACION: 'la autorización de compra',
  COMPRA_AUTORIZADA: 'compras',
  ORDEN_COMPRA_GENERADA: 'el proveedor',
  ESPERANDO_REPUESTOS: 'el proveedor',
  REPUESTOS_PARCIALES: 'el proveedor',
  CONTROL_CALIDAD: 'control de calidad',
  PENDIENTE_LAVADO: 'lavado',
  EN_LAVADO: 'lavado',
  PENDIENTE_ALINEAMIENTO: 'alineamiento',
  EN_ALINEAMIENTO: 'alineamiento',
  LISTO_PARA_ENTREGA: 'la entrega',
};

/**
 * «a» + «el cliente» → «al cliente».
 *
 * En español no existe «a el». Sin esto la pantalla decía «Esperando a el
 * cliente», que es el tipo de detalle por el que un sistema deja de parecer
 * escrito por alguien que habla el idioma.
 */
export function waitingPhrase(who: string): string {
  return who.startsWith('el ') ? `al ${who.slice(3)}` : `a ${who}`;
}

/**
 * A quién se espera, o `null` si la orden está en manos del técnico.
 *
 * Sale del ESTADO y no de la pausa. Son dos cosas distintas y mezclarlas
 * producía «Esperando a espera de autorización»: un motivo de pausa no es
 * alguien a quien esperar, es por qué está parado. La pausa la cuenta
 * `job.openPause`, que la pantalla dice con sus propias palabras.
 */
export function waitingOn(job: DayJob): string | null {
  return WAITING_ON[job.status] ?? null;
}

function toneFor(action: OrderAction, enabled: boolean): StepTone {
  if (!enabled) return 'warn';
  switch (action) {
    case 'terminar_reparacion':
    case 'enviar_a_calidad':
    case 'completar_diagnostico':
      return 'ok';
    case 'retomar_reparacion':
      return 'crit';
    default:
      return 'brand';
  }
}

/**
 * El único botón de esta orden.
 *
 * Sale de `availableActions`, así que hereda sus dos reglas: las acciones sin
 * permiso no aparecen —un botón que nunca va a funcionar no ayuda— y las que
 * fallan por requisitos sí, deshabilitadas y con la lista de lo que falta,
 * porque ahí el técnico sí puede hacer algo.
 */
export function nextStep(job: DayJob, actor: Actor): NextStep {
  /*
   * «Terminar reparación» exige que no haya sesión de tiempo abierta. Es
   * correcto en el servidor —no se cierra una orden dejando el cronómetro
   * corriendo—, pero como requisito de pantalla es absurdo: el técnico
   * terminaría siempre con el cronómetro en marcha, y el botón que necesita
   * saldría deshabilitado pidiéndole que pare el reloj primero.
   *
   * Lo que hace el botón ES parar el reloj y después transicionar, así que
   * ese requisito lo resuelve él mismo y no cuenta como impedimento. Los
   * demás —trabajos sin marcar, evidencia sin adjuntar— sí: esos el sistema
   * no los puede resolver solo.
   */
  const options = availableActions(
    job.totals.hasOpenSession ? { ...job.facts, hasOpenTimeSession: false } : job.facts,
    actor,
  );

  for (const action of ADVANCING) {
    const option = options.find((o) => o.action === action);
    if (option === undefined) continue;
    return {
      action,
      label: ACTION_LABELS[action],
      enabled: option.available,
      blockedBy: option.unmet,
      tone: toneFor(action, option.available),
    };
  }

  const who = waitingOn(job);
  return {
    action: null,
    label: who === null ? 'Sin acción disponible' : `Esperando ${waitingPhrase(who)}`,
    enabled: false,
    blockedBy: [],
    tone: 'muted',
  };
}

/** La acción secundaria: pausar mientras el cronómetro corre. */
export function pauseStep(job: DayJob, actor: Actor): NextStep | null {
  if (!job.totals.hasOpenSession || job.totals.isPaused) return null;
  const option = availableActions(job.facts, actor).find((o) => o.action === 'pausar');
  if (option === undefined) return null;
  return {
    action: 'pausar',
    label: ACTION_LABELS.pausar,
    enabled: option.available,
    blockedBy: option.unmet,
    tone: 'muted',
  };
}

export function pauseLabel(code: string): string {
  return PAUSE_REASONS.find((r) => r.code === code)?.label ?? code;
}

export function pauseBlocks(code: string): boolean {
  return PAUSE_REASONS.find((r) => r.code === code)?.blocksEta ?? false;
}

// ─────────────────────────────────────────────────────────────────────────────
// La jornada
// ─────────────────────────────────────────────────────────────────────────────

export type DayBucket = 'ahora' | 'siguiente' | 'esperando' | 'terminado';

export interface DayEntry {
  readonly job: DayJob;
  readonly step: NextStep;
  /** Pausar, solo mientras el cronómetro corre. */
  readonly pause: NextStep | null;
  readonly bucket: DayBucket;
  /** A quién se espera, si no es al técnico. */
  readonly waiting: string | null;
}

export interface DayPlan {
  /** El trabajo con el cronómetro corriendo. Como mucho uno. */
  readonly current: DayEntry | null;
  /** Lo que puede empezar ahora mismo. */
  readonly next: readonly DayEntry[];
  /** Parado por un tercero, con el motivo. */
  readonly waiting: readonly DayEntry[];
  /** Lo que terminó hoy. */
  readonly finishedToday: readonly DayEntry[];
}

/**
 * Estados en los que la parte del técnico ya está hecha.
 *
 * `REPARACION_TERMINADA` y todo lo que viene después: la orden sigue viva,
 * pero no en sus manos.
 */
const HANDED_OVER: ReadonlySet<OrderStatus> = new Set<OrderStatus>([
  'REPARACION_TERMINADA',
  'CONTROL_CALIDAD',
  'CONTROL_CALIDAD_APROBADO',
  'PENDIENTE_LAVADO',
  'EN_LAVADO',
  'PENDIENTE_ALINEAMIENTO',
  'EN_ALINEAMIENTO',
  'LISTO_PARA_ENTREGA',
  'ENTREGADO',
  'CERRADO',
]);

/**
 * Día del calendario en la zona del taller.
 *
 * «Hoy» no es «en las últimas 24 horas»: un trabajo que terminó anoche a las
 * once no es parte de la jornada de hoy, y contarlo infla el recuento con el
 * que el técnico mide su día.
 */
const TIMEZONE = DEFAULT_TIME_ZONE;

function dayKey(date: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export function finishedToday(job: DayJob, now: Date): boolean {
  if (!HANDED_OVER.has(job.status)) return false;
  if (job.lastWorkEndedAt === null) return false;
  return dayKey(job.lastWorkEndedAt) === dayKey(now);
}

/** El cronómetro corre: hay sesión abierta y no es una pausa. */
export function isRunning(job: DayJob): boolean {
  return job.totals.hasOpenSession && !job.totals.isPaused;
}

function bucketFor(job: DayJob, step: NextStep, now: Date): DayBucket {
  if (isRunning(job)) return 'ahora';
  if (finishedToday(job, now)) return 'terminado';
  /* Una pausa por espera de repuestos deja el botón «Reanudar» disponible
     —la máquina de estados no lo prohíbe, y a veces llega el aviso por
     teléfono antes que el repuesto—, pero el trabajo no está en manos del
     técnico: va a «Esperando», con el motivo delante. */
  if (job.openPause?.blocks === true) return 'esperando';
  if (step.action !== null) return 'siguiente';
  return 'esperando';
}

/**
 * Orden dentro de cada bloque: lo que vence antes, primero.
 *
 * Las órdenes sin promesa van al final, no al principio: no tener hora
 * comprometida no las hace urgentes, y ordenarlas como si `null` fuera cero
 * las pondría por delante de todo lo que sí corre prisa.
 */
function byUrgency(a: DayEntry, b: DayEntry): number {
  const left = a.job.promisedAt?.getTime() ?? Number.POSITIVE_INFINITY;
  const right = b.job.promisedAt?.getTime() ?? Number.POSITIVE_INFINITY;
  if (left !== right) return left - right;
  return a.job.code.localeCompare(b.job.code);
}

export function planDay(
  jobs: readonly DayJob[],
  actor: Actor,
  now: Date,
): DayPlan {
  const entries = jobs.map<DayEntry>((job) => {
    const step = nextStep(job, actor);
    return {
      job,
      step,
      pause: pauseStep(job, actor),
      bucket: bucketFor(job, step, now),
      waiting: waitingOn(job),
    };
  });

  const running = entries.filter((e) => e.bucket === 'ahora').sort(byUrgency);

  /* Un técnico no puede tener dos cronómetros corriendo: en producción lo
     impide un índice único sobre las sesiones abiertas. Si aun así llegan
     dos, la segunda no se pierde —se muestra como lo siguiente—, porque
     esconder trabajo asignado es peor que enseñar una inconsistencia. */
  const [current = null, ...extra] = running;

  const rest = entries.filter((e) => e.bucket !== 'ahora');

  return {
    current,
    next: [...extra, ...rest.filter((e) => e.bucket === 'siguiente')].sort(byUrgency),
    waiting: rest.filter((e) => e.bucket === 'esperando').sort(byUrgency),
    finishedToday: rest.filter((e) => e.bucket === 'terminado').sort(byUrgency),
  };
}

/**
 * Minutos efectivos trabajados HOY.
 *
 * No es la suma de los totales de cada orden: esos totales cuentan desde que
 * la sesión se abrió, y una reparación que empezó ayer por la tarde le
 * regalaría al técnico horas que no ha trabajado hoy. Cada tramo se recorta
 * a la jornada antes de sumarlo.
 */
export function minutesWorkedToday(plan: DayPlan, now: Date): number {
  const start = startOfDay(now);
  let minutes = 0;

  for (const entry of allEntries(plan)) {
    for (const session of entry.job.sessions) {
      if (session.kind !== 'trabajo') continue;
      const from = Math.max(session.startedAt.getTime(), start.getTime());
      const to = (session.endedAt ?? now).getTime();
      if (to > from) minutes += (to - from) / 60_000;
    }
  }

  return Math.round(minutes);
}

function allEntries(plan: DayPlan): readonly DayEntry[] {
  return [
    ...(plan.current === null ? [] : [plan.current]),
    ...plan.next,
    ...plan.waiting,
    ...plan.finishedToday,
  ];
}

/**
 * Medianoche en la zona del taller, expresada como instante.
 *
 * `setHours(0,0,0,0)` usaría la zona del servidor, que en Vercel es UTC: la
 * jornada empezaría a las 19:00 del día anterior en Lima.
 */
function startOfDay(now: Date): Date {
  return new Date(`${dayKey(now)}T00:00:00${offsetOf(now)}`);
}

/** Desfase de la zona del taller en el instante dado, como `-05:00`. */
function offsetOf(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIMEZONE,
    timeZoneName: 'longOffset',
  }).formatToParts(now);
  const name = parts.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT-05:00';
  return name.replace('GMT', '') || '+00:00';
}

// ─────────────────────────────────────────────────────────────────────────────
// A dónde lleva el botón
// ─────────────────────────────────────────────────────────────────────────────

/**
 * La pantalla donde se hace cada acción.
 *
 * Está aquí y no en el componente porque es parte de la decisión: elegir la
 * acción sin saber dónde se ejecuta deja un botón que no lleva a ninguna
 * parte. Lo que no tiene banco de trabajo propio cae en la ficha de la orden,
 * que siempre existe.
 */
const WORKBENCH: Partial<Readonly<Record<OrderAction, string>>> = {
  iniciar_diagnostico: '/taller/diagnostico',
  completar_diagnostico: '/taller/diagnostico',
  iniciar_trabajo: '/taller/reparacion',
  reanudar: '/taller/reparacion',
  retomar_reparacion: '/taller/reparacion',
  terminar_reparacion: '/taller/reparacion',
  pausar: '/taller/reparacion',
};

export function stepHref(action: OrderAction | null, orderId: string): string {
  if (action === 'enviar_a_calidad') return `/calidad/${orderId}`;
  return WORKBENCH[action ?? 'cerrar'] ?? `/ordenes/${orderId}`;
}
