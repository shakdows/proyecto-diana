/**
 * La inspección de ingreso: qué dijo el asesor de cada pieza.
 *
 * ── Por qué existe además del diagrama de daños ────────────────────────────
 *
 * El diagrama guarda `DamageMark = { zone, kind }`, y eso solo sabe decir
 * «esta zona está dañada». No distingue dos cosas que en una recepción son
 * MUY distintas:
 *
 *   · «la miré y está bien»  — el asesor la revisó y da fe;
 *   · «no la he mirado»      — nadie ha pasado por ahí.
 *
 * La ausencia de marca significaba las dos a la vez. Aquí se separan, que es
 * justo lo que exige la regla: «sin inspeccionar» es un estado propio y NO
 * equivale a «conforme».
 *
 * ── Una sola fuente de verdad ──────────────────────────────────────────────
 *
 * El registro de inspección MANDA, y los `DamageMark` se DERIVAN de él
 * (`damageFromRecord`). No se mantienen dos almacenes sincronizados a mano:
 * el segundo siempre es el que se queda viejo. Así el acta, el recuento de
 * daños y la ficha de la orden siguen leyendo lo de siempre sin enterarse de
 * este cambio.
 *
 * ── Una pieza es UNA pieza ─────────────────────────────────────────────────
 *
 * El capó se ve desde arriba, de frente y de lado. El registro está indexado
 * por `partId`, nunca por vista: no existe `capo-superior`. Las vistas solo
 * REFERENCIAN la pieza.
 *
 * Dominio PURO: sin React, sin almacenamiento, sin `Date.now()` escondido.
 */

import {
  DAMAGE_KINDS,
  kindInfo,
  ZONES,
  type DamageKind,
  type DamageMark,
  type ZoneId,
} from '@/features/reception/services/damage-map';
import { plateKey } from '@/features/reception/services/slots';
import type { InspectionStatus } from './hotspots';

/**
 * Lo que el asesor puede DECIR de una pieza.
 *
 * Tres, y ninguna es «sin inspeccionar»: eso no se elige, es lo que hay
 * mientras no se haya dicho nada. Poder marcar «sin inspeccionar» a mano
 * permitiría deshacer, y para deshacer está quitar el registro.
 */
export const PART_ACTIONS = ['conforme', 'observacion', 'pendiente'] as const;

export type PartAction = (typeof PART_ACTIONS)[number];

export const ACTION_LABELS: Readonly<Record<PartAction, string>> = {
  conforme: 'Conforme',
  observacion: 'Con observación',
  pendiente: 'Pendiente de revisar',
};

export interface PartRecord {
  readonly action: PartAction;
  /** Solo cuando hay observación. Reutiliza los tipos de daño existentes. */
  readonly kind?: DamageKind;
  readonly note?: string;
  /** Epoch en milisegundos. */
  readonly at: number;
  readonly by: string;
}

export type InspectionRecord = Readonly<Record<string, PartRecord>>;

export const EMPTY_RECORD: InspectionRecord = {};

/**
 * Dónde se guarda la inspección de un vehículo.
 *
 * Por la placa CANÓNICA, igual que los daños y las fotos: «ABC-123» y
 * «ABC123» son el mismo vehículo, y guardarlos por separado es como no
 * guardarlos.
 */
export function inspectionSlot(plate: string): string {
  return `recepcion.${plateKey(plate)}.inspeccion`;
}

/* ------------------------------------------------------------------ *
 * Escribir
 * ------------------------------------------------------------------ */

export interface SetPartInput {
  readonly action: PartAction;
  readonly kind?: DamageKind;
  readonly note?: string;
}

/**
 * Anota lo que se vio en una pieza.
 *
 * Una observación SIN tipo no se guarda como observación: sin saber de qué
 * clase es, el parte no dice nada y el acta no puede describirlo. Quien llama
 * comprueba antes con `canSave`.
 */
export function setPart(
  record: InspectionRecord,
  partId: string,
  input: SetPartInput,
  now: Date,
  by: string,
): InspectionRecord {
  const limpio = input.note?.trim() ?? '';

  const entrada: PartRecord = {
    action: input.action,
    ...(input.action === 'observacion' && input.kind !== undefined ? { kind: input.kind } : {}),
    ...(limpio === '' ? {} : { note: limpio }),
    at: now.getTime(),
    by,
  };

  return { ...record, [partId]: entrada };
}

/** Quita lo anotado: la pieza vuelve a «sin inspeccionar». */
export function clearPart(record: InspectionRecord, partId: string): InspectionRecord {
  if (!Object.hasOwn(record, partId)) return record;
  const copia = { ...record };
  delete copia[partId];
  return copia;
}

/** ¿Se puede guardar lo que hay en el panel? */
export function canSave(input: SetPartInput): boolean {
  if (input.action !== 'observacion') return true;
  return input.kind !== undefined;
}

/* ------------------------------------------------------------------ *
 * Leer
 * ------------------------------------------------------------------ */

/**
 * El estado que se pinta para una pieza.
 *
 * ── La regla que protege esto ──────────────────────────────────────────────
 *
 * Una pieza de la que nadie dijo nada sale «sin inspeccionar» MIENTRAS la
 * recepción esté abierta. Solo al cerrarla formalmente —y solo entonces—
 * pasa a «conforme». Marcarla en verde antes es exactamente la mentira que
 * un checklist existe para evitar.
 */
export function statusOf(
  record: InspectionRecord,
  partId: string,
  receptionClosed: boolean,
): InspectionStatus {
  const entrada = record[partId];

  if (entrada === undefined) return receptionClosed ? 'ok' : 'pendiente';

  switch (entrada.action) {
    case 'conforme':
      return 'ok';
    case 'pendiente':
      return 'revisar';
    case 'observacion':
      return entrada.kind !== undefined && kindInfo(entrada.kind).severity === 'grave'
        ? 'problema'
        : 'revisar';
  }
}

/** Lo que se lee en la ficha de la pieza: el tipo de daño, o lo escrito. */
export function noteOf(record: InspectionRecord, partId: string): string | undefined {
  const entrada = record[partId];
  if (entrada === undefined) return undefined;
  if (entrada.note !== undefined) return entrada.note;
  if (entrada.kind !== undefined) return kindInfo(entrada.kind).label;
  return undefined;
}

/* ------------------------------------------------------------------ *
 * Derivar lo que el resto del sistema ya lee
 * ------------------------------------------------------------------ */

function isZoneId(value: string): value is ZoneId {
  return ZONES.some((z) => z.id === value);
}

/**
 * Los daños, tal y como los espera todo lo que ya existe.
 *
 * El acta, el recuento del borrador y la ficha de la orden leen
 * `DamageMark[]`. Se derivan de aquí en vez de guardarse aparte: con dos
 * almacenes, el día que alguien corrija una observación sin tocar el otro, el
 * acta y la pantalla dirán cosas distintas del mismo vehículo.
 *
 * Solo salen las piezas que SON zona del diagrama: una llanta o el tablero no
 * caben en `DamageMark`, y meterlas con un identificador inventado rompería
 * `zoneLabel` y el parte escrito.
 */
export function damageFromRecord(record: InspectionRecord): readonly DamageMark[] {
  const out: DamageMark[] = [];
  for (const [partId, entrada] of Object.entries(record)) {
    if (entrada.action !== 'observacion' || entrada.kind === undefined) continue;
    if (!isZoneId(partId)) continue;
    out.push({ zone: partId, kind: entrada.kind });
  }
  /* Orden estable: el del diagrama, que es como se lee un vehículo. */
  const orden = new Map(ZONES.map((z, i) => [z.id, i]));
  return out.sort((a, b) => (orden.get(a.zone) ?? 0) - (orden.get(b.zone) ?? 0));
}

/**
 * Recupera una recepción empezada ANTES de que existiera este registro.
 *
 * Quien dejó daños marcados con el diagrama anterior no puede perderlos
 * porque el formato cambió. Se traducen a observaciones; lo que no estaba
 * marcado sigue sin inspeccionar, que es la verdad: el diagrama antiguo no
 * sabía distinguirlo.
 */
export function recordFromDamage(
  marks: readonly DamageMark[],
  now: Date,
  by: string,
): InspectionRecord {
  const out: Record<string, PartRecord> = {};
  for (const m of marks) {
    out[m.zone] = { action: 'observacion', kind: m.kind, at: now.getTime(), by };
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Cerrar
 * ------------------------------------------------------------------ */

/**
 * Las piezas que hay que haber mirado antes de cerrar.
 *
 * Son las quince zonas del diagrama: exactamente las que el parte de daños
 * sabe describir y las que el cliente firma. Las demás —llantas, faros,
 * tablero— se pueden inspeccionar y no bloquean: exigir cuarenta piezas
 * convertiría cada recepción en un trámite que se aprende a saltar.
 */
export const REQUIRED_PARTS: readonly string[] = ZONES.map((z) => z.id);

/** Las obligatorias de las que todavía nadie dijo nada. */
export function pendingRequired(record: InspectionRecord): readonly string[] {
  return REQUIRED_PARTS.filter((id) => record[id] === undefined);
}

/** ¿Se puede dar por terminada la inspección? */
export function canFinish(record: InspectionRecord): boolean {
  return pendingRequired(record).length === 0;
}

/** «Aún quedan 2 zonas por revisar.» */
export function pendingPhrase(record: InspectionRecord): string | null {
  const faltan = pendingRequired(record).length;
  if (faltan === 0) return null;
  return faltan === 1
    ? 'Aún queda 1 zona por revisar.'
    : `Aún quedan ${faltan} zonas por revisar.`;
}

/* ------------------------------------------------------------------ *
 * Resumen
 * ------------------------------------------------------------------ */

export interface RecordSummary {
  /** Piezas inspeccionables, contadas UNA vez cada una. */
  readonly total: number;
  readonly revisadas: number;
  readonly conformes: number;
  readonly observaciones: number;
  readonly pendientes: number;
  readonly sinInspeccionar: number;
  readonly percent: number;
}

/**
 * El resumen, contado por pieza.
 *
 * `parts` son los identificadores distintos que se pueden inspeccionar, NO
 * los puntos dibujados: el capó sale en tres vistas y sigue siendo un capó.
 */
export function summarizeRecord(
  record: InspectionRecord,
  parts: readonly string[],
): RecordSummary {
  const unicas = [...new Set(parts)];
  let conformes = 0;
  let observaciones = 0;
  let pendientes = 0;
  let sinInspeccionar = 0;

  for (const id of unicas) {
    const entrada = record[id];
    if (entrada === undefined) sinInspeccionar += 1;
    else if (entrada.action === 'conforme') conformes += 1;
    else if (entrada.action === 'observacion') observaciones += 1;
    else pendientes += 1;
  }

  const revisadas = unicas.length - sinInspeccionar;
  return {
    total: unicas.length,
    revisadas,
    conformes,
    observaciones,
    pendientes,
    sinInspeccionar,
    percent: unicas.length === 0 ? 0 : Math.round((revisadas / unicas.length) * 100),
  };
}

/**
 * El avance NO es calidad.
 *
 * «14 de 17 revisadas» dice cuánto se ha mirado, no cuánto está bien. Se
 * escriben aparte a propósito: juntarlos en un solo porcentaje hace que un
 * vehículo destrozado y revisado entero parezca estar al 100 %.
 */
export function progressPhrase(s: RecordSummary): string {
  return `${s.revisadas} / ${s.total} zonas revisadas`;
}

/** Los tipos de observación que se ofrecen. Son los del diagrama, sin inventar. */
export const OBSERVATION_KINDS = DAMAGE_KINDS;

/** Hidrata lo guardado y descarta lo que no se reconoce, sin lanzar. */
export function readRecord(stored: unknown): InspectionRecord {
  if (typeof stored !== 'object' || stored === null || Array.isArray(stored)) return EMPTY_RECORD;
  const out: Record<string, PartRecord> = {};

  for (const [id, raw] of Object.entries(stored as Record<string, unknown>)) {
    if (typeof raw !== 'object' || raw === null) continue;
    const r = raw as Record<string, unknown>;
    if (typeof r.action !== 'string' || !(PART_ACTIONS as readonly string[]).includes(r.action)) {
      continue;
    }
    const kind =
      typeof r.kind === 'string' && DAMAGE_KINDS.some((k) => k.id === r.kind)
        ? (r.kind as DamageKind)
        : undefined;

    out[id] = {
      action: r.action as PartAction,
      ...(kind === undefined ? {} : { kind }),
      ...(typeof r.note === 'string' && r.note.trim() !== '' ? { note: r.note } : {}),
      at: typeof r.at === 'number' && Number.isFinite(r.at) ? r.at : 0,
      by: typeof r.by === 'string' ? r.by : 'Desconocido',
    };
  }

  return out;
}
