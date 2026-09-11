/**
 * Autorización del asesor sobre la solicitud de repuestos.
 *
 * El asesor decide línea por línea: aprueba, recorta la cantidad o la
 * rechaza. Es el último punto donde una orden puede quedarse dentro del
 * importe que el cliente ya autorizó, y por eso el tope aprobado se compara
 * SIEMPRE contra ese importe, no contra el presupuesto interno del taller.
 */

import type { RequestLine } from './request';

export type LineDecision = 'pendiente' | 'aprobado' | 'rechazado';

export interface LineRuling {
  readonly decision: LineDecision;
  /** Cantidad autorizada. Si es menor que la pedida, es un recorte explícito. */
  readonly quantity: number;
  readonly reason?: string;
}

export type Rulings = Readonly<Record<string, LineRuling>>;

export function rulingFor(line: RequestLine, rulings: Rulings): LineRuling {
  return rulings[line.id] ?? { decision: 'pendiente', quantity: line.quantity };
}

/** Una cantidad recortada es una decisión distinta de "aprobado tal cual". */
export function isTrimmed(line: RequestLine, rulings: Rulings): boolean {
  const r = rulingFor(line, rulings);
  return r.decision === 'aprobado' && r.quantity < line.quantity;
}

export function approvedLines(
  lines: readonly RequestLine[],
  rulings: Rulings,
): readonly RequestLine[] {
  return lines.filter((l) => rulingFor(l, rulings).decision === 'aprobado');
}

export function rejectedLines(
  lines: readonly RequestLine[],
  rulings: Rulings,
): readonly RequestLine[] {
  return lines.filter((l) => rulingFor(l, rulings).decision === 'rechazado');
}

export function pendingLines(
  lines: readonly RequestLine[],
  rulings: Rulings,
): readonly RequestLine[] {
  return lines.filter((l) => rulingFor(l, rulings).decision === 'pendiente');
}

export interface AuthorizationReadiness {
  readonly canAuthorize: boolean;
  readonly blockers: readonly string[];
}

export function readiness(
  lines: readonly RequestLine[],
  rulings: Rulings,
): AuthorizationReadiness {
  const blockers: string[] = [];

  if (lines.length === 0) {
    blockers.push('La solicitud no tiene repuestos.');
    return { canAuthorize: false, blockers };
  }

  const pendientes = pendingLines(lines, rulings).length;
  if (pendientes > 0) {
    blockers.push(
      pendientes === 1
        ? 'Falta decidir 1 repuesto.'
        : `Faltan decidir ${pendientes} repuestos.`,
    );
  }

  // Un rechazo o un recorte sin motivo llega a Compras y al técnico como un
  // "no" sin explicación, y vuelve en forma de llamada.
  const sinMotivo = lines.filter((l) => {
    const r = rulingFor(l, rulings);
    const necesitaMotivo = r.decision === 'rechazado' || isTrimmed(l, rulings);
    return necesitaMotivo && (r.reason ?? '').trim() === '';
  }).length;
  if (sinMotivo > 0) {
    blockers.push(
      sinMotivo === 1
        ? 'Un repuesto rechazado o recortado no explica el motivo.'
        : `${sinMotivo} repuestos rechazados o recortados no explican el motivo.`,
    );
  }

  const aprobadas = approvedLines(lines, rulings).filter(
    (l) => rulingFor(l, rulings).quantity > 0,
  ).length;
  if (pendientes === 0 && aprobadas === 0 && rejectedLines(lines, rulings).length < lines.length) {
    blockers.push('No hay ningún repuesto aprobado con cantidad mayor que cero.');
  }

  return { canAuthorize: blockers.length === 0, blockers };
}

export type Outcome = 'aprobado_todo' | 'aprobado_parcial' | 'rechazado_todo';

/**
 * Resultado de la autorización. Devuelve null mientras quede algo pendiente:
 * "a medias" no es un resultado, es una solicitud sin responder.
 */
export function outcomeOf(lines: readonly RequestLine[], rulings: Rulings): Outcome | null {
  if (lines.length === 0) return null;
  if (pendingLines(lines, rulings).length > 0) return null;

  const rechazadas = rejectedLines(lines, rulings).length;
  if (rechazadas === lines.length) return 'rechazado_todo';

  const recortadas = lines.filter((l) => isTrimmed(l, rulings)).length;
  if (rechazadas === 0 && recortadas === 0) return 'aprobado_todo';
  return 'aprobado_parcial';
}

/**
 * Estado al que pasa la orden tras autorizar.
 *
 * Si no queda nada que comprar la orden NO pasa por Compras: mandar a
 * cotizar una lista vacía deja la orden esperando a un proveedor que nunca
 * recibió nada.
 */
export function nextStatusAfter(
  lines: readonly RequestLine[],
  rulings: Rulings,
): 'REPUESTOS_EN_COTIZACION' | 'REPUESTOS_COMPLETOS' | null {
  const outcome = outcomeOf(lines, rulings);
  if (outcome === null) return null;

  const unidadesAComprar = approvedLines(lines, rulings).reduce((n, l) => {
    const autorizada = rulingFor(l, rulings).quantity;
    return n + Math.max(0, Math.min(autorizada, l.quantity) - l.inStock);
  }, 0);

  return unidadesAComprar > 0 ? 'REPUESTOS_EN_COTIZACION' : 'REPUESTOS_COMPLETOS';
}
