/**
 * Avanzar la orden: aplicar transiciones de verdad.
 *
 * ── Por qué existe ─────────────────────────────────────────────────────────
 *
 * La máquina de estados (`state-machine.ts`) sabía desde el principio QUÉ se
 * puede hacer en cada estado y qué falta cuando no se puede. Lo que no había
 * era nadie que lo HICIERA: la barra de la orden pintaba «Terminar
 * reparación» y el botón no tenía nada detrás. Un botón que no hace nada es
 * peor que un botón ausente, porque quien lo pulsa se queda esperando.
 *
 * Este módulo es la mitad que faltaba: aplica la acción, guarda a qué estado
 * se llegó y deja RASTRO de quién la aplicó y cuándo.
 *
 * ── Qué NO es ──────────────────────────────────────────────────────────────
 *
 * No es la transición de producción. En producción la aplica una Server
 * Action que llama a `assertTransition`, escribe `service_orders.status`
 * dentro de una transacción y el disparador de PostgreSQL la valida otra vez
 * contra `status_transitions`. Aquí no hay base de datos todavía, así que el
 * resultado vive en el navegador —por dispositivo, sin compartir—.
 *
 * Lo que SÍ es igual en los dos casos: la decisión. Ni esta capa ni la
 * pantalla deciden nada; las dos preguntan a `canTransition` y acatan. Cuando
 * llegue Postgres se sustituye el guardado y la regla no se toca.
 *
 * Dominio PURO: sin React, sin `localStorage`, sin fechas implícitas.
 */

import type { Permission, RoleCode } from '@/lib/auth/permissions';
import type { OrderStatus } from './order-status';
import {
  ACTION_LABELS,
  canTransition,
  type Actor,
  type OrderAction,
  type OrderFacts,
} from './state-machine';

/** Una transición ya aplicada. El rastro, no solo el resultado. */
export interface AppliedTransition {
  readonly action: OrderAction;
  readonly from: OrderStatus;
  readonly to: OrderStatus;
  /** Epoch en milisegundos: se serializa sin sorpresas de huso horario. */
  readonly at: number;
  /** Quién la aplicó. En producción es `profiles.id`. */
  readonly by: string;
  readonly byName: string;
}

/**
 * Lo que se guarda de una orden.
 *
 * `base` es el estado del que se partió. Va guardado A PROPÓSITO: si el dato
 * sembrado cambia —otra versión de la demostración, otro estado inicial—, lo
 * guardado ya no describe esta orden y hay que tirarlo. Sin `base`, una orden
 * resembrada en `CONTROL_CALIDAD` seguiría mostrando el `ENTREGADO` que
 * alguien dejó guardado en la versión anterior.
 */
export interface OrderAdvance {
  readonly base: OrderStatus;
  readonly status: OrderStatus;
  readonly history: readonly AppliedTransition[];
}

/** Dónde se guarda el avance de una orden. */
export function advanceSlot(orderId: string): string {
  return `orden.${orderId}.avance`;
}

export function freshAdvance(base: OrderStatus): OrderAdvance {
  return { base, status: base, history: [] };
}

export function hasAdvanced(advance: OrderAdvance): boolean {
  return advance.history.length > 0;
}

export function lastTransition(advance: OrderAdvance): AppliedTransition | null {
  return advance.history.at(-1) ?? null;
}

/**
 * Hechos con el estado al que se ha llegado.
 *
 * Solo cambia el estado: el resto de hechos los sigue aportando quien llama,
 * que es el único que sabe cuántos trabajos hay marcados o si el cronómetro
 * corre. Mentir aquí sobre esos hechos haría que la orden se dejara cerrar
 * con trabajos sin hacer.
 */
export function factsAt(facts: OrderFacts, advance: OrderAdvance): OrderFacts {
  return facts.status === advance.status ? facts : { ...facts, status: advance.status };
}

export type AdvanceResult =
  | { readonly ok: true; readonly advance: OrderAdvance; readonly applied: AppliedTransition }
  | { readonly ok: false; readonly message: string; readonly unmet: readonly string[] };

/**
 * Aplica una acción. No decide: pregunta a la máquina de estados y acata.
 *
 * Se le pasa `now` en lugar de llamar a `Date.now()` dentro para que la
 * prueba pueda fijar el instante; lo mismo que hace el resto del dominio.
 */
export function applyAction(
  advance: OrderAdvance,
  facts: OrderFacts,
  action: OrderAction,
  actor: Actor,
  actorName: string,
  now: Date,
): AdvanceResult {
  const current = factsAt(facts, advance);
  const check = canTransition(current, action, actor);

  if (!check.allowed) {
    return { ok: false, message: check.message, unmet: check.unmet };
  }

  const applied: AppliedTransition = {
    action,
    from: current.status,
    to: check.to,
    at: now.getTime(),
    by: actor.profileId,
    byName: actorName,
  };

  return {
    ok: true,
    applied,
    advance: {
      base: advance.base,
      status: check.to,
      history: [...advance.history, applied],
    },
  };
}

/**
 * Deshace la última transición.
 *
 * No es «cancelar la orden»: es el arreglo de quien pulsó el botón de al
 * lado. Sin esto, un toque accidental en una tablet deja la orden en un
 * estado del que a veces no hay camino de vuelta declarado —«Entregar» no
 * tiene inversa— y la única salida sería borrar el almacén entero.
 *
 * El paso deshecho NO se borra del historial en producción: allí se registra
 * como un evento de corrección en `audit_logs`. Aquí se quita de la lista
 * porque el historial ES el almacén.
 */
export function undoLast(advance: OrderAdvance): OrderAdvance {
  const previous = lastTransition(advance);
  if (previous === null) return advance;
  return {
    base: advance.base,
    status: previous.from,
    history: advance.history.slice(0, -1),
  };
}

/* ------------------------------------------------------------------ *
 * Lectura de lo guardado
 * ------------------------------------------------------------------ */

function isStatus(value: unknown, known: ReadonlySet<string>): value is OrderStatus {
  return typeof value === 'string' && known.has(value);
}

function readTransition(raw: unknown, known: ReadonlySet<string>): AppliedTransition | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.action !== 'string' || !(r.action in ACTION_LABELS)) return null;
  if (!isStatus(r.from, known) || !isStatus(r.to, known)) return null;
  if (typeof r.at !== 'number' || !Number.isFinite(r.at)) return null;
  return {
    action: r.action as OrderAction,
    from: r.from,
    to: r.to,
    at: r.at,
    by: typeof r.by === 'string' ? r.by : 'desconocido',
    byName: typeof r.byName === 'string' ? r.byName : 'Desconocido',
  };
}

/**
 * Hidrata lo guardado y decide si sirve.
 *
 * Ante cualquier duda devuelve el avance limpio: un dato corrupto no puede
 * dejar la orden mostrando un estado inventado. Y si el estado sembrado ya no
 * es el que se guardó, lo guardado describe otra orden: se descarta.
 */
export function readAdvance(
  base: OrderStatus,
  stored: unknown,
  knownStatuses: readonly OrderStatus[],
): OrderAdvance {
  const known = new Set<string>(knownStatuses);
  if (typeof stored !== 'object' || stored === null) return freshAdvance(base);

  const s = stored as Record<string, unknown>;
  if (s.base !== base) return freshAdvance(base);
  if (!isStatus(s.status, known)) return freshAdvance(base);
  if (!Array.isArray(s.history)) return freshAdvance(base);

  const history: AppliedTransition[] = [];
  for (const raw of s.history) {
    const step = readTransition(raw, known);
    if (step === null) return freshAdvance(base);
    history.push(step);
  }

  /*
   * La cadena tiene que cerrar: el primer paso sale de `base`, cada uno
   * empieza donde terminó el anterior y el último llega a `status`. Un
   * historial que no cierra es un almacén manipulado a mano, y preferimos
   * volver al estado sembrado antes que pintar una historia falsa.
   */
  let cursor = base;
  for (const step of history) {
    if (step.from !== cursor) return freshAdvance(base);
    cursor = step.to;
  }
  if (cursor !== s.status) return freshAdvance(base);

  return { base, status: s.status, history };
}

/* ------------------------------------------------------------------ *
 * Dónde se resuelve lo que falta
 * ------------------------------------------------------------------ */

export interface ActionScreen {
  readonly href: string;
  readonly label: string;
}

/**
 * La pantalla donde se hace lo que la acción exige.
 *
 * Enseñar «Falta: adjunta la evidencia final» sin decir dónde se adjunta deja
 * al asesor buscando por el menú. El destino se deriva de la ACCIÓN, no del
 * texto del requisito: los textos se reescriben y un `includes('evidencia')`
 * se rompería en silencio la primera vez que alguien mejore la redacción.
 */
export function screenFor(action: OrderAction, orderId: string): ActionScreen | null {
  switch (action) {
    case 'completar_checklist':
      return { href: '/recepcion/nueva', label: 'Recepción' };
    case 'iniciar_trabajo':
    case 'pausar':
    case 'reanudar':
    case 'terminar_reparacion':
      return { href: '/taller/reparacion', label: 'Bahía de reparación' };
    case 'preparar_cotizacion':
    case 'enviar_cotizacion':
    case 'ampliar_cotizacion':
    case 'registrar_decision':
    case 'cerrar_sin_trabajos':
      return { href: `/ordenes/${orderId}/cotizacion`, label: 'Cotización' };
    case 'solicitar_repuestos':
    case 'sin_repuestos':
    case 'autorizar_cotizar':
      return { href: `/ordenes/${orderId}/repuestos`, label: 'Autorización de repuestos' };
    case 'enviar_a_autorizacion':
    case 'autorizar_compra':
    case 'rechazar_compra':
    case 'generar_orden_compra':
    case 'confirmar_envio':
      return { href: `/compras/${orderId}`, label: 'Compras' };
    case 'recepcion_parcial':
    case 'recepcion_completa':
      return { href: `/compras/${orderId}/recepcion`, label: 'Recepción de repuestos' };
    case 'aprobar_calidad':
    case 'observar_calidad':
      return { href: `/calidad/${orderId}`, label: 'Control de calidad' };
    case 'entregar':
      return { href: `/ordenes/${orderId}/entrega`, label: 'Entrega' };
    default:
      return null;
  }
}

/**
 * Las acciones que HACEN AVANZAR, en el orden en que se ofrecen.
 *
 * No es un adorno: en `EN_REPARACION` la máquina ofrece cuatro acciones
 * legales —terminar, pausar, ampliar cotización, cancelar— y solo una de
 * ellas lleva el vehículo hacia la puerta. Sin este orden, la barra pinta
 * «Cancelar orden» con el mismo peso que «Terminar reparación».
 */
const ADVANCING: readonly OrderAction[] = [
  'registrar_recepcion',
  'completar_checklist',
  'enviar_a_diagnostico',
  'iniciar_diagnostico',
  'completar_diagnostico',
  'preparar_cotizacion',
  'enviar_cotizacion',
  'registrar_decision',
  'solicitar_repuestos',
  'sin_repuestos',
  'autorizar_cotizar',
  'enviar_a_autorizacion',
  'autorizar_compra',
  'generar_orden_compra',
  'confirmar_envio',
  'recepcion_completa',
  'recepcion_parcial',
  'liberar_para_reparacion',
  'iniciar_trabajo',
  'reanudar',
  'terminar_reparacion',
  'enviar_a_calidad',
  'aprobar_calidad',
  'enviar_a_lavado',
  'enviar_a_alineamiento',
  'iniciar_lavado',
  'terminar_lavado',
  'iniciar_alineamiento',
  'terminar_alineamiento',
  'finalizar_directo',
  'entregar',
  'cerrar',
];

/** Cuánto pesa una acción a la hora de ordenarla. Menor es más importante. */
export function advanceRank(action: OrderAction): number {
  const index = ADVANCING.indexOf(action);
  return index === -1 ? ADVANCING.length : index;
}

/** ¿Esta acción lleva el vehículo hacia la puerta? */
export function isAdvancing(action: OrderAction): boolean {
  return ADVANCING.includes(action);
}

/** «Terminar reparación · pasa a Reparación terminada» */
export function transitionPhrase(
  action: OrderAction,
  to: OrderStatus,
  statusLabel: (s: OrderStatus) => string,
): string {
  return `${ACTION_LABELS[action]} · pasa a ${statusLabel(to)}`;
}

/* ------------------------------------------------------------------ *
 * A quién le toca
 * ------------------------------------------------------------------ */

export interface NextStepOwner {
  readonly action: OrderAction;
  readonly to: OrderStatus;
  readonly permission: Permission;
  /** Los puestos que tienen ese permiso, por si quien mira no es ninguno. */
  readonly roles: readonly RoleCode[];
}

/**
 * El siguiente paso, exista o no el permiso de quien mira.
 *
 * `availableActions` omite —con razón— lo que el actor no puede ejecutar:
 * pintarle al asesor un «Terminar reparación» que nunca va a funcionar no
 * ayuda. Pero entonces la barra le decía «no hay ningún paso que haga avanzar
 * la orden con tu rol», y ahí se acababa. El asesor que abre la orden para
 * saber por qué el vehículo sigue dentro necesita la otra mitad: QUIÉN tiene
 * que darlo.
 *
 * Esto no enseña botones ajenos ni deja pulsarlos. Solo dice de quién es el
 * turno, que es justo lo que hace falta para ir a buscarlo.
 */
export function nextStepOwner(
  status: OrderStatus,
  transitions: readonly {
    readonly from: OrderStatus;
    readonly action: OrderAction;
    readonly to: OrderStatus;
    readonly permission: Permission | null;
  }[],
  rolePermissions: Readonly<Record<RoleCode, readonly Permission[]>>,
): NextStepOwner | null {
  const candidatas = transitions
    .filter((t) => t.from === status && t.permission !== null && isAdvancing(t.action))
    .sort((a, b) => advanceRank(a.action) - advanceRank(b.action));

  const elegida = candidatas[0];
  if (elegida === undefined || elegida.permission === null) return null;

  const permission = elegida.permission;
  const roles = (Object.keys(rolePermissions) as RoleCode[]).filter((role) =>
    rolePermissions[role].includes(permission),
  );

  return { action: elegida.action, to: elegida.to, permission, roles };
}

/**
 * Los puestos, en palabras, sin la lista entera.
 *
 * `super_admin` y `admin` tienen casi todos los permisos, así que aparecen en
 * cada respuesta y no informan de nada: «le toca al técnico o al
 * administrador» es ruido cuando lo que hace falta es ir a buscar al técnico.
 */
export function ownerPhrase(
  owner: NextStepOwner,
  label: (role: RoleCode) => string,
): string {
  const operativos = owner.roles.filter((r) => r !== 'super_admin' && r !== 'admin');
  const lista = (operativos.length > 0 ? operativos : owner.roles).map(label);
  if (lista.length === 0) return 'Nadie tiene ese permiso configurado.';
  if (lista.length === 1) return `Le toca a ${lista[0]}.`;
  return `Le toca a ${lista.slice(0, -1).join(', ')} o ${lista.at(-1)}.`;
}
