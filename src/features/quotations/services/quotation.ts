/**
 * Cotización y autorización por ítem.
 *
 * DOS decisiones que no son negociables:
 *
 * 1. El dinero se guarda en CÉNTIMOS ENTEROS, nunca en decimales. En coma
 *    flotante, 0.1 + 0.2 no es 0.3, y una cotización de veinte líneas acumula
 *    céntimos de error que el cliente ve en el total y el taller no sabe
 *    explicar. Se formatea a soles solo al pintar.
 *
 * 2. El cliente decide LÍNEA POR LÍNEA. Puede aprobar las pastillas, rechazar
 *    los discos y dejar el alineamiento pendiente. Una cotización no es un
 *    contrato de «todo o nada», y tratarla así fuerza al cliente a aceptar
 *    trabajo que no quiere o a rechazar el que sí necesita.
 *
 * Dominio PURO.
 */

import type { Priority } from '@/features/diagnosis/services/findings';

/** Impuesto general a las ventas. SEMILLA: en la Fase 5 sale de `app_settings`. */
export const TAX_RATE = 0.18;

export interface QuoteLine {
  readonly id: string;
  readonly title: string;
  readonly detail: string;
  readonly priority: Priority;
  /** Repuestos, en céntimos. */
  readonly partsCents: number;
  /** Mano de obra, en céntimos. */
  readonly labourCents: number;
  readonly photoCount: number;
}

export type LineDecision = 'pendiente' | 'aprobado' | 'rechazado';

export type Decisions = Readonly<Record<string, LineDecision>>;

export function lineTotalCents(line: QuoteLine): number {
  return line.partsCents + line.labourCents;
}

export interface QuoteTotals {
  readonly partsCents: number;
  readonly labourCents: number;
  readonly subtotalCents: number;
  readonly taxCents: number;
  readonly totalCents: number;
  readonly lineCount: number;
}

/**
 * Totales de un conjunto de líneas.
 *
 * El impuesto se calcula sobre el SUBTOTAL ya sumado, no línea a línea. Sumar
 * impuestos redondeados de cada línea da un total distinto del que sale de
 * redondear una vez, y esa diferencia aparece impresa en el acta.
 */
export function totalsOf(lines: readonly QuoteLine[]): QuoteTotals {
  let partsCents = 0;
  let labourCents = 0;

  for (const line of lines) {
    partsCents += line.partsCents;
    labourCents += line.labourCents;
  }

  const subtotalCents = partsCents + labourCents;
  const taxCents = Math.round(subtotalCents * TAX_RATE);

  return {
    partsCents,
    labourCents,
    subtotalCents,
    taxCents,
    totalCents: subtotalCents + taxCents,
    lineCount: lines.length,
  };
}

export function approvedLines(
  lines: readonly QuoteLine[],
  decisions: Decisions,
): readonly QuoteLine[] {
  return lines.filter((line) => decisions[line.id] === 'aprobado');
}

export function rejectedLines(
  lines: readonly QuoteLine[],
  decisions: Decisions,
): readonly QuoteLine[] {
  return lines.filter((line) => decisions[line.id] === 'rechazado');
}

export function pendingLines(
  lines: readonly QuoteLine[],
  decisions: Decisions,
): readonly QuoteLine[] {
  return lines.filter((line) => (decisions[line.id] ?? 'pendiente') === 'pendiente');
}

/** Lo que el cliente está a punto de autorizar. */
export function approvedTotals(
  lines: readonly QuoteLine[],
  decisions: Decisions,
): QuoteTotals {
  return totalsOf(approvedLines(lines, decisions));
}

export type AuthorizationOutcome = 'aprobado_todo' | 'aprobado_parcial' | 'rechazado_todo';

/**
 * ¿Se puede confirmar la autorización?
 *
 * Se exige que TODAS las líneas estén decididas. Dejar una pendiente y
 * confirmar produce una orden ambigua: el técnico no sabe si ese trabajo
 * entra, y en la práctica acaba preguntando por teléfono —que es justo lo que
 * la autorización por enlace venía a evitar.
 *
 * Rechazarlo TODO es una respuesta válida y tiene su propio desenlace: el
 * vehículo se devuelve sin trabajo, y el sistema necesita saberlo para no
 * dejar la orden esperando a un cliente que ya contestó.
 */
export function canConfirm(lines: readonly QuoteLine[], decisions: Decisions): boolean {
  if (lines.length === 0) return false;
  return pendingLines(lines, decisions).length === 0;
}

export function outcomeOf(
  lines: readonly QuoteLine[],
  decisions: Decisions,
): AuthorizationOutcome | null {
  if (!canConfirm(lines, decisions)) return null;

  const approved = approvedLines(lines, decisions).length;
  if (approved === 0) return 'rechazado_todo';
  if (approved === lines.length) return 'aprobado_todo';
  return 'aprobado_parcial';
}

/** Céntimos a soles, para pintar. El dominio nunca guarda este número. */
export function toSoles(cents: number): number {
  return cents / 100;
}
