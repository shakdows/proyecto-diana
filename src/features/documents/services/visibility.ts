/**
 * Qué puede contener cada documento.
 *
 * Es la misma regla que aplica `portal_get_quotation` en la base: lo que el
 * cliente recibe NO lleva costo interno, ni proveedor, ni margen, ni notas del
 * técnico. Vive aquí, en una función pura y probada, porque un PDF se manda
 * por correo y ya no se puede retirar: el error no se descubre en una revisión
 * de código, se descubre cuando el cliente pregunta por qué el taller compró
 * la pieza a 180 y se la cobró a 320.
 */

export type Audience = 'cliente' | 'interno';

export interface DocumentLine {
  readonly description: string;
  readonly quantity: number;
  readonly unitPriceCents: number;
  readonly lineTotalCents: number;
  /** Lo que el taller pagó. NUNCA sale hacia el cliente. */
  readonly internalCostCents?: number;
  readonly supplierName?: string;
  readonly technicianNote?: string;
}

export type VisibleLine = DocumentLine;

/**
 * Poda una línea según a quién va dirigido el documento.
 *
 * Se construye un objeto NUEVO con los campos permitidos en vez de borrar los
 * prohibidos del original: si mañana alguien añade `margenPorcentaje` al tipo,
 * con este enfoque no aparece en el PDF del cliente hasta que alguien lo
 * añada aquí a propósito. Con un `delete` selectivo, aparecería solo.
 */
export function lineFor(audience: Audience, line: DocumentLine): VisibleLine {
  if (audience === 'cliente') {
    return {
      description: line.description,
      quantity: line.quantity,
      unitPriceCents: line.unitPriceCents,
      lineTotalCents: line.lineTotalCents,
    };
  }
  return line;
}

export function linesFor(
  audience: Audience,
  lines: readonly DocumentLine[],
): readonly VisibleLine[] {
  return lines.map((l) => lineFor(audience, l));
}

/** Campos que jamás pueden aparecer en un documento del cliente. */
export const FORBIDDEN_FOR_CUSTOMER = [
  'internalCostCents',
  'supplierName',
  'technicianNote',
] as const;

/**
 * Comprobación defensiva antes de generar.
 *
 * Recorre el objeto ya construido y falla si encuentra una clave prohibida.
 * Es redundante con `lineFor` a propósito: la poda protege del olvido, y esto
 * protege de que alguien arme el documento por otro camino.
 */
export function assertSafeForCustomer(payload: unknown): void {
  const found = findForbidden(payload, new WeakSet());
  if (found !== null) {
    throw new Error(
      `El documento del cliente contiene un campo interno: «${found}». ` +
        "Púdalo con lineFor('cliente', …) antes de generarlo.",
    );
  }
}

function findForbidden(value: unknown, seen: WeakSet<object>): string | null {
  if (value === null || typeof value !== 'object') return null;
  if (seen.has(value)) return null;
  seen.add(value);

  if (Array.isArray(value)) {
    for (const item of value) {
      const hit = findForbidden(item, seen);
      if (hit !== null) return hit;
    }
    return null;
  }

  for (const [key, inner] of Object.entries(value)) {
    if ((FORBIDDEN_FOR_CUSTOMER as readonly string[]).includes(key)) return key;
    const hit = findForbidden(inner, seen);
    if (hit !== null) return hit;
  }
  return null;
}
