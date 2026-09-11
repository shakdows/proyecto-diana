/**
 * Solicitud de repuestos.
 *
 * La escribe el TÉCNICO cuando el cliente ya autorizó el trabajo, y la
 * autoriza el ASESOR antes de que Compras salga a cotizar. Son dos firmas
 * distintas a propósito: el técnico sabe qué pieza hace falta, el asesor
 * sabe cuánto puede gastar esta orden sin volver a llamar al cliente.
 *
 * Este módulo es puro: sin React y sin base de datos, para poder probar las
 * reglas —que son donde se pierde el dinero— sin levantar nada.
 */

export type Urgency = 'normal' | 'urgente';

export interface RequestLine {
  readonly id: string;
  /** Trabajo cotizado que justifica la pieza. Sin esto nadie sabe para qué es. */
  readonly workId: string;
  readonly workTitle: string;
  readonly description: string;
  /** Número de parte del fabricante. Opcional: el técnico no siempre lo tiene. */
  readonly partNumber?: string;
  readonly quantity: number;
  readonly urgency: Urgency;
  readonly note?: string;
  /** Si el almacén ya lo tiene, no hay nada que comprar. */
  readonly inStock: number;
}

export const URGENCY_LABELS: Readonly<Record<Urgency, string>> = {
  normal: 'Normal',
  urgente: 'Urgente',
};

/** Lo que falta comprar de una línea: lo pedido menos lo que ya está en almacén. */
export function toBuy(line: RequestLine): number {
  return Math.max(0, line.quantity - line.inStock);
}

/** Una línea cubierta por almacén no genera compra, pero sí reserva. */
export function isCoveredByStock(line: RequestLine): boolean {
  return toBuy(line) === 0;
}

export interface RequestReadiness {
  readonly canSubmit: boolean;
  readonly blockers: readonly string[];
}

/**
 * Qué impide enviar la solicitud al asesor.
 *
 * Devolvemos los motivos en texto, no un booleano: un botón desactivado sin
 * explicación hace que el técnico pruebe a pulsarlo tres veces y luego baje
 * a preguntar al mostrador.
 */
export function readiness(lines: readonly RequestLine[]): RequestReadiness {
  const blockers: string[] = [];

  if (lines.length === 0) {
    blockers.push('Agrega al menos un repuesto.');
  }

  const sinDescripcion = lines.filter((l) => l.description.trim() === '').length;
  if (sinDescripcion > 0) {
    blockers.push(
      sinDescripcion === 1
        ? 'Hay un repuesto sin descripción.'
        : `Hay ${sinDescripcion} repuestos sin descripción.`,
    );
  }

  // Cantidad: entera y positiva. "2.5 pastillas" no se puede pedir a un
  // proveedor, y un 0 es una línea que alguien olvidó borrar.
  const cantidadInvalida = lines.filter(
    (l) => !Number.isInteger(l.quantity) || l.quantity <= 0,
  ).length;
  if (cantidadInvalida > 0) {
    blockers.push(
      cantidadInvalida === 1
        ? 'Hay un repuesto con cantidad inválida.'
        : `Hay ${cantidadInvalida} repuestos con cantidad inválida.`,
    );
  }

  // Una urgencia sin motivo escrito deja a Compras adivinando a quién
  // pagarle flete express y por qué.
  const urgenteSinNota = lines.filter(
    (l) => l.urgency === 'urgente' && (l.note ?? '').trim() === '',
  ).length;
  if (urgenteSinNota > 0) {
    blockers.push(
      urgenteSinNota === 1
        ? 'Un repuesto urgente no explica por qué lo es.'
        : `${urgenteSinNota} repuestos urgentes no explican por qué lo son.`,
    );
  }

  return { canSubmit: blockers.length === 0, blockers };
}

export interface RequestSummary {
  readonly lineCount: number;
  readonly unitCount: number;
  /** Unidades que hay que comprar de verdad. */
  readonly toBuyCount: number;
  /** Líneas que el almacén cubre por completo. */
  readonly fromStockLines: number;
  readonly urgentLines: number;
  /** Trabajos distintos que dependen de esta solicitud. */
  readonly workCount: number;
}

export function summarize(lines: readonly RequestLine[]): RequestSummary {
  return {
    lineCount: lines.length,
    unitCount: lines.reduce((n, l) => n + Math.max(0, l.quantity), 0),
    toBuyCount: lines.reduce((n, l) => n + toBuy(l), 0),
    fromStockLines: lines.filter(isCoveredByStock).length,
    urgentLines: lines.filter((l) => l.urgency === 'urgente').length,
    workCount: new Set(lines.map((l) => l.workId)).size,
  };
}

/** Agrupa por trabajo para que la solicitud se lea como el presupuesto. */
export function groupByWork(
  lines: readonly RequestLine[],
): readonly { readonly workId: string; readonly workTitle: string; readonly lines: readonly RequestLine[] }[] {
  const order: string[] = [];
  const byWork = new Map<string, RequestLine[]>();

  for (const line of lines) {
    const existing = byWork.get(line.workId);
    if (existing === undefined) {
      order.push(line.workId);
      byWork.set(line.workId, [line]);
    } else {
      existing.push(line);
    }
  }

  return order.map((workId) => {
    const group = byWork.get(workId) ?? [];
    return { workId, workTitle: group[0]?.workTitle ?? '', lines: group };
  });
}
