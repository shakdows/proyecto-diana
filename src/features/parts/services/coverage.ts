/**
 * Cobertura de repuestos y recepción parcial (§29–30).
 *
 * Dos reglas que sostienen todo el módulo:
 *
 * 1. La cantidad **requerida** se deriva de los ítems APROBADOS por el cliente.
 *    Un repuesto cuyos consumidores estén todos rechazados tiene requerido 0.
 * 2. La cantidad **recibida** nunca es un contador que se incrementa: es
 *    siempre una suma sobre las filas de recepción. Un contador acumulado se
 *    desincroniza en cuanto se corrige una recepción; una suma, no.
 *
 * Dominio PURO. Documentación: `docs/10-repuestos-y-compras.md`
 */

export interface PartLine {
  readonly partId: string;
  readonly description: string;
  /** Σ cantidades de los ítems de cotización APROBADOS que lo consumen. */
  readonly required: number;
  /** Σ `purchase_receipt_items.quantity_received`. */
  readonly received: number;
}

export interface PartLineCoverage extends PartLine {
  /** 0–1. Nunca supera 1 aunque se reciba de más. */
  readonly ratio: number;
  readonly percent: number;
  readonly complete: boolean;
  readonly missing: number;
}

export interface OrderCoverage {
  readonly lines: readonly PartLineCoverage[];
  /** 0–1 ponderado por unidades. Para la barra de progreso. */
  readonly ratio: number;
  readonly percent: number;
  /**
   * `true` solo si TODAS las líneas con requerido > 0 están cubiertas.
   *
   * Distinto de `ratio === 1` a propósito: «97 % recibido» no permite empezar
   * a reparar si lo que falta es el perno que sujeta la pieza.
   */
  readonly complete: boolean;
  readonly totalRequired: number;
  readonly totalReceived: number;
  readonly pendingLines: readonly PartLineCoverage[];
}

function round(value: number, decimals = 1): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function lineCoverage(line: PartLine): PartLineCoverage {
  const required = Math.max(0, line.required);
  const received = Math.max(0, line.received);

  // Un repuesto sin requerimiento (todos sus trabajos fueron rechazados) no
  // bloquea nada y no cuenta para la cobertura.
  const ratio = required === 0 ? 1 : Math.min(1, received / required);

  return {
    ...line,
    ratio,
    percent: round(ratio * 100),
    complete: received >= required,
    missing: Math.max(0, required - received),
  };
}

export function orderCoverage(lines: readonly PartLine[]): OrderCoverage {
  const covered = lines.map(lineCoverage);
  const relevant = covered.filter((l) => l.required > 0);

  const totalRequired = relevant.reduce((sum, l) => sum + l.required, 0);
  // Se cuenta `min(recibido, requerido)`: recibir de más en una línea no puede
  // compensar lo que falta en otra.
  const totalReceived = relevant.reduce(
    (sum, l) => sum + Math.min(l.received, l.required),
    0,
  );

  const ratio = totalRequired === 0 ? 1 : totalReceived / totalRequired;

  return {
    lines: covered,
    ratio,
    percent: round(ratio * 100),
    complete: relevant.every((l) => l.complete),
    totalRequired,
    totalReceived,
    pendingLines: relevant.filter((l) => !l.complete),
  };
}

/**
 * Cantidad requerida de un repuesto a partir de los ítems que lo consumen.
 * Solo suman los aprobados: hace cumplir §60 (resolución de I-4).
 */
export interface PartConsumer {
  readonly quotationItemId: string;
  readonly quantity: number;
  readonly itemStatus: 'pendiente' | 'aprobado' | 'rechazado' | 'aprobado_con_observacion';
}

const APPROVED: ReadonlySet<PartConsumer['itemStatus']> = new Set([
  'aprobado',
  'aprobado_con_observacion',
]);

export function requiredQuantity(consumers: readonly PartConsumer[]): number {
  return consumers
    .filter((c) => APPROVED.has(c.itemStatus))
    .reduce((sum, c) => sum + c.quantity, 0);
}
