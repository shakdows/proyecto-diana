/**
 * Control de calidad.
 *
 * La regla que decide todo el módulo: **lo revisa alguien distinto de quien
 * lo hizo**. Un técnico que se aprueba su propio trabajo no está controlando
 * nada; está firmando. Por eso `separationOfDuties` es un bloqueo del dominio
 * y no un aviso de la pantalla: ocultar el botón en el frontend no es control.
 *
 * Módulo puro: sin React y sin base de datos.
 */

export type CheckResult = 'pendiente' | 'conforme' | 'no_conforme';

export interface QualityCheck {
  readonly id: string;
  readonly label: string;
  /** Trabajo al que pertenece la comprobación. */
  readonly workTitle: string;
  /**
   * Una comprobación crítica no admite «no aplica» ni aprobación con
   * observación: o está conforme o el vehículo no sale.
   */
  readonly critical: boolean;
}

export interface CheckRuling {
  readonly result: CheckResult;
  readonly note?: string;
  readonly photoCount?: number;
}

export type Rulings = Readonly<Record<string, CheckRuling>>;

export const PENDING: CheckRuling = { result: 'pendiente' };

export function rulingFor(check: QualityCheck, rulings: Rulings): CheckRuling {
  return rulings[check.id] ?? PENDING;
}

export function countBy(
  checks: readonly QualityCheck[],
  rulings: Rulings,
  result: CheckResult,
): number {
  return checks.filter((c) => rulingFor(c, rulings).result === result).length;
}

export function failedChecks(
  checks: readonly QualityCheck[],
  rulings: Rulings,
): readonly QualityCheck[] {
  return checks.filter((c) => rulingFor(c, rulings).result === 'no_conforme');
}

/**
 * Separación de funciones: quien inspecciona no puede ser quien reparó.
 *
 * Se compara por identificador, no por nombre: dos personas pueden llamarse
 * igual y la misma persona puede escribir su nombre de tres formas.
 */
export function separationOfDuties(inspectorId: string, technicianId: string): boolean {
  return inspectorId !== '' && inspectorId !== technicianId;
}

export interface InspectionReadiness {
  readonly canResolve: boolean;
  readonly blockers: readonly string[];
}

export function readiness(
  checks: readonly QualityCheck[],
  rulings: Rulings,
  inspectorId: string,
  technicianId: string,
): InspectionReadiness {
  const blockers: string[] = [];

  if (checks.length === 0) {
    blockers.push('Esta orden no tiene comprobaciones de calidad.');
    return { canResolve: false, blockers };
  }

  if (!separationOfDuties(inspectorId, technicianId)) {
    // Primero y en singular: mientras esto falle, lo demás da igual.
    blockers.push('Quien reparó no puede aprobar su propio trabajo.');
    return { canResolve: false, blockers };
  }

  const pendientes = countBy(checks, rulings, 'pendiente');
  if (pendientes > 0) {
    blockers.push(
      pendientes === 1
        ? 'Falta revisar 1 comprobación.'
        : `Faltan revisar ${pendientes} comprobaciones.`,
    );
  }

  /*
   * Un «no conforme» sin nota y sin foto no sirve para que el técnico sepa
   * qué corregir, y el vehículo vuelve a calidad con el mismo defecto.
   */
  const sinPrueba = failedChecks(checks, rulings).filter((c) => {
    const r = rulingFor(c, rulings);
    return (r.note ?? '').trim() === '' || (r.photoCount ?? 0) === 0;
  }).length;
  if (sinPrueba > 0) {
    blockers.push(
      sinPrueba === 1
        ? 'Un rechazo no tiene nota y foto.'
        : `${sinPrueba} rechazos no tienen nota y foto.`,
    );
  }

  return { canResolve: blockers.length === 0, blockers };
}

export type Outcome = 'aprobado' | 'observado';

/**
 * Resultado de la inspección.
 *
 * Basta UN «no conforme» para observar la orden, sea crítico o no: si algo no
 * está bien, no está bien. La criticidad sirve para priorizar el retrabajo,
 * no para dejarlo pasar.
 */
export function outcomeOf(
  checks: readonly QualityCheck[],
  rulings: Rulings,
): Outcome | null {
  if (checks.length === 0) return null;
  if (countBy(checks, rulings, 'pendiente') > 0) return null;
  return failedChecks(checks, rulings).length > 0 ? 'observado' : 'aprobado';
}

export function nextStatusAfter(
  checks: readonly QualityCheck[],
  rulings: Rulings,
): 'CONTROL_CALIDAD_APROBADO' | 'OBSERVADO_CONTROL_CALIDAD' | null {
  const outcome = outcomeOf(checks, rulings);
  if (outcome === null) return null;
  return outcome === 'aprobado' ? 'CONTROL_CALIDAD_APROBADO' : 'OBSERVADO_CONTROL_CALIDAD';
}

/** Agrupa por trabajo para revisar en el mismo orden en que se reparó. */
export function groupByWork(
  checks: readonly QualityCheck[],
): readonly { readonly workTitle: string; readonly checks: readonly QualityCheck[] }[] {
  const order: string[] = [];
  const byWork = new Map<string, QualityCheck[]>();

  for (const check of checks) {
    const existing = byWork.get(check.workTitle);
    if (existing === undefined) {
      order.push(check.workTitle);
      byWork.set(check.workTitle, [check]);
    } else {
      existing.push(check);
    }
  }

  return order.map((workTitle) => ({ workTitle, checks: byWork.get(workTitle) ?? [] }));
}
