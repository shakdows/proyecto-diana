/**
 * Recepción de repuestos.
 *
 * Llega la caja del proveedor y alguien cuenta lo que hay dentro. Dos reglas
 * sostienen el módulo:
 *
 * 1. Lo RECHAZADO no cubre nada. Un disco rayado dentro de la caja no es un
 *    disco: si contara como recibido, la orden pasaría a «repuestos
 *    completos» y el técnico descubriría la pieza inservible con el vehículo
 *    ya desarmado.
 * 2. La cobertura se calcula sumando recepciones, nunca incrementando un
 *    contador. Un contador se desincroniza en cuanto se corrige una
 *    recepción; una suma, no. (Ver `coverage.ts`.)
 *
 * Módulo puro: sin React y sin base de datos.
 */

import { orderCoverage, type PartLine } from './coverage';

export type RejectReason = 'danado' | 'no_corresponde' | 'incompleto' | 'otro';

export const REJECT_LABELS: Readonly<Record<RejectReason, string>> = {
  danado: 'Llegó dañado',
  no_corresponde: 'No corresponde al pedido',
  incompleto: 'Empaque incompleto',
  otro: 'Otro motivo',
};

export interface ReceivableLine {
  readonly lineId: string;
  readonly description: string;
  readonly partNumber?: string;
  readonly supplierName: string;
  /** Unidades que se compraron a este proveedor. */
  readonly ordered: number;
  /** Unidades ya aceptadas en recepciones anteriores. */
  readonly alreadyReceived: number;
}

export interface LineEntry {
  readonly accepted: number;
  readonly rejected: number;
  readonly reason?: RejectReason;
  readonly note?: string;
}

export type Entries = Readonly<Record<string, LineEntry>>;

export const EMPTY_ENTRY: LineEntry = { accepted: 0, rejected: 0 };

export function entryFor(line: ReceivableLine, entries: Entries): LineEntry {
  return entries[line.lineId] ?? EMPTY_ENTRY;
}

/** Lo que falta por recibir de una línea antes de esta recepción. */
export function pendingBefore(line: ReceivableLine): number {
  return Math.max(0, line.ordered - line.alreadyReceived);
}

/** Lo que faltaría después de aceptar lo de esta recepción. */
export function pendingAfter(line: ReceivableLine, entries: Entries): number {
  return Math.max(0, pendingBefore(line) - entryFor(line, entries).accepted);
}

export function isLineComplete(line: ReceivableLine, entries: Entries): boolean {
  return pendingAfter(line, entries) === 0;
}

export interface ReceptionReadiness {
  readonly canConfirm: boolean;
  readonly blockers: readonly string[];
}

export function readiness(
  lines: readonly ReceivableLine[],
  entries: Entries,
): ReceptionReadiness {
  const blockers: string[] = [];

  if (lines.length === 0) {
    blockers.push('No hay repuestos por recibir.');
    return { canConfirm: false, blockers };
  }

  const movimiento = lines.reduce((n, l) => {
    const e = entryFor(l, entries);
    return n + e.accepted + e.rejected;
  }, 0);
  if (movimiento === 0) {
    // Una recepción vacía no es una entrega: es alguien pulsando un botón.
    blockers.push('Registra al menos una unidad recibida o rechazada.');
  }

  const excedidas = lines.filter(
    (l) => entryFor(l, entries).accepted > pendingBefore(l),
  ).length;
  if (excedidas > 0) {
    blockers.push(
      excedidas === 1
        ? 'Una línea acepta más unidades de las pedidas.'
        : `${excedidas} líneas aceptan más unidades de las pedidas.`,
    );
  }

  // Un rechazo sin motivo no sirve para reclamar al proveedor ni para explicar
  // al cliente por qué su vehículo sigue en el taller.
  const sinMotivo = lines.filter((l) => {
    const e = entryFor(l, entries);
    return e.rejected > 0 && e.reason === undefined;
  }).length;
  if (sinMotivo > 0) {
    blockers.push(
      sinMotivo === 1
        ? 'Un rechazo no indica el motivo.'
        : `${sinMotivo} rechazos no indican el motivo.`,
    );
  }

  const otroSinNota = lines.filter((l) => {
    const e = entryFor(l, entries);
    return e.reason === 'otro' && (e.note ?? '').trim() === '';
  }).length;
  if (otroSinNota > 0) {
    blockers.push('«Otro motivo» necesita una nota que lo explique.');
  }

  return { canConfirm: blockers.length === 0, blockers };
}

export interface ReceptionSummary {
  readonly acceptedUnits: number;
  readonly rejectedUnits: number;
  readonly completedLines: number;
  readonly pendingLines: number;
  /** Cobertura de la orden CONTANDO solo lo aceptado. */
  readonly percent: number;
  readonly complete: boolean;
  readonly missingUnits: number;
}

export function summarize(
  lines: readonly ReceivableLine[],
  entries: Entries,
): ReceptionSummary {
  /*
   * Lo rechazado NO entra en `received`. Contarlo daría una orden «completa»
   * con piezas inservibles en el estante.
   */
  const partLines: readonly PartLine[] = lines.map((l) => ({
    partId: l.lineId,
    description: l.description,
    required: l.ordered,
    received: l.alreadyReceived + entryFor(l, entries).accepted,
  }));

  const coverage = orderCoverage(partLines);

  return {
    acceptedUnits: lines.reduce((n, l) => n + entryFor(l, entries).accepted, 0),
    rejectedUnits: lines.reduce((n, l) => n + entryFor(l, entries).rejected, 0),
    completedLines: lines.filter((l) => isLineComplete(l, entries)).length,
    pendingLines: lines.filter((l) => !isLineComplete(l, entries)).length,
    percent: coverage.percent,
    complete: coverage.complete,
    missingUnits: coverage.pendingLines.reduce((n, l) => n + l.missing, 0),
  };
}

/**
 * Estado de la orden después de confirmar la recepción.
 *
 * `REPUESTOS_COMPLETOS` exige que TODAS las líneas estén cubiertas, no que el
 * porcentaje sea alto: al 97 % no se empieza a reparar si lo que falta es el
 * perno que sujeta la pieza.
 */
export function statusAfter(
  lines: readonly ReceivableLine[],
  entries: Entries,
): 'REPUESTOS_COMPLETOS' | 'REPUESTOS_PARCIALES' {
  return summarize(lines, entries).complete
    ? 'REPUESTOS_COMPLETOS'
    : 'REPUESTOS_PARCIALES';
}

/** Rellena la recepción con «llegó todo lo pendiente», el caso habitual. */
export function acceptAll(lines: readonly ReceivableLine[]): Entries {
  return Object.fromEntries(
    lines
      .filter((l) => pendingBefore(l) > 0)
      .map((l) => [l.lineId, { accepted: pendingBefore(l), rejected: 0 }]),
  );
}
