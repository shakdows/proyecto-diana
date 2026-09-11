/**
 * Cotización de proveedores.
 *
 * Compras pide precio a varios proveedores por CADA repuesto y elige uno por
 * línea. Elegir por línea y no por proveedor completo es deliberado: el más
 * barato en pastillas rara vez es el más rápido en discos, y obligar a un
 * único proveedor para toda la orden paga de más o entrega tarde.
 *
 * Módulo puro: sin React y sin base de datos.
 */

export type PaymentTerms = 'contado' | 'credito_15' | 'credito_30';

export const PAYMENT_LABELS: Readonly<Record<PaymentTerms, string>> = {
  contado: 'Contado',
  credito_15: 'Crédito 15 días',
  credito_30: 'Crédito 30 días',
};

export interface SupplierOffer {
  readonly supplierId: string;
  readonly supplierName: string;
  /** Precio unitario en céntimos. El dinero nunca viaja en decimales. */
  readonly unitCostCents: number;
  readonly leadTimeDays: number;
  readonly warrantyMonths: number;
  readonly paymentTerms: PaymentTerms;
  /** Un proveedor puede no tener stock para toda la cantidad pedida. */
  readonly availableQuantity: number;
}

export interface QuotedLine {
  readonly lineId: string;
  readonly description: string;
  readonly partNumber?: string;
  /** Unidades a comprar, ya descontado el almacén. */
  readonly quantity: number;
  readonly offers: readonly SupplierOffer[];
}

/** Proveedor elegido por línea. Una línea sin elección es una decisión pendiente. */
export type Selection = Readonly<Record<string, string>>;

export function offerFor(line: QuotedLine, selection: Selection): SupplierOffer | undefined {
  const supplierId = selection[line.lineId];
  if (supplierId === undefined) return undefined;
  return line.offers.find((o) => o.supplierId === supplierId);
}

/** Una oferta que no cubre la cantidad pedida obliga a partir la línea. */
export function coversQuantity(line: QuotedLine, offer: SupplierOffer): boolean {
  return offer.availableQuantity >= line.quantity;
}

export function lineTotalCents(line: QuotedLine, offer: SupplierOffer): number {
  return offer.unitCostCents * line.quantity;
}

/** La oferta más barata. Devuelve undefined si la línea no tiene ofertas. */
export function cheapestOffer(line: QuotedLine): SupplierOffer | undefined {
  return [...line.offers].sort((a, b) => a.unitCostCents - b.unitCostCents)[0];
}

/**
 * La oferta más rápida. A igualdad de plazo gana la más barata: entre dos
 * proveedores que entregan el martes, pagar de más no compra nada.
 */
export function fastestOffer(line: QuotedLine): SupplierOffer | undefined {
  return [...line.offers].sort(
    (a, b) => a.leadTimeDays - b.leadTimeDays || a.unitCostCents - b.unitCostCents,
  )[0];
}

/** Cuánto cuesta de más la opción elegida frente a la más barata. */
export function overpayCents(line: QuotedLine, offer: SupplierOffer): number {
  const cheapest = cheapestOffer(line);
  if (cheapest === undefined) return 0;
  return (offer.unitCostCents - cheapest.unitCostCents) * line.quantity;
}

export interface PurchaseTotals {
  readonly subtotalCents: number;
  readonly taxCents: number;
  readonly totalCents: number;
  readonly decidedLines: number;
  readonly pendingLines: number;
  /** Proveedores distintos: cada uno es una orden de compra y un flete. */
  readonly supplierCount: number;
  /**
   * Días hasta poder reparar: manda el repuesto MÁS LENTO, no el promedio.
   * Con nueve piezas el martes y una el viernes, se repara el viernes.
   */
  readonly leadTimeDays: number;
  readonly overpayCents: number;
}

export const TAX_RATE = 0.18;

export function totalsOf(
  lines: readonly QuotedLine[],
  selection: Selection,
): PurchaseTotals {
  let subtotalCents = 0;
  let overpay = 0;
  let leadTimeDays = 0;
  let decided = 0;
  const suppliers = new Set<string>();

  for (const line of lines) {
    const offer = offerFor(line, selection);
    if (offer === undefined) continue;
    decided += 1;
    suppliers.add(offer.supplierId);
    subtotalCents += lineTotalCents(line, offer);
    overpay += overpayCents(line, offer);
    leadTimeDays = Math.max(leadTimeDays, offer.leadTimeDays);
  }

  // El IGV se calcula UNA vez sobre el subtotal, no línea por línea: redondear
  // en cada línea desvía el importe que acaba en la orden de compra.
  const taxCents = Math.round(subtotalCents * TAX_RATE);

  return {
    subtotalCents,
    taxCents,
    totalCents: subtotalCents + taxCents,
    decidedLines: decided,
    pendingLines: lines.length - decided,
    supplierCount: suppliers.size,
    leadTimeDays,
    overpayCents: overpay,
  };
}

export interface PurchaseReadiness {
  readonly canSend: boolean;
  readonly blockers: readonly string[];
}

/**
 * Qué impide mandar la compra a autorizar.
 *
 * Compras NO autoriza su propio gasto: arma la comparación y la manda al
 * asesor. Por eso la acción final es «Enviar a autorización» y no «Comprar».
 */
export function readiness(
  lines: readonly QuotedLine[],
  selection: Selection,
): PurchaseReadiness {
  const blockers: string[] = [];

  if (lines.length === 0) {
    blockers.push('No hay repuestos que cotizar.');
    return { canSend: false, blockers };
  }

  const sinOfertas = lines.filter((l) => l.offers.length === 0).length;
  if (sinOfertas > 0) {
    blockers.push(
      sinOfertas === 1
        ? 'Un repuesto no tiene ninguna cotización.'
        : `${sinOfertas} repuestos no tienen ninguna cotización.`,
    );
  }

  const pendientes = lines.filter(
    (l) => l.offers.length > 0 && offerFor(l, selection) === undefined,
  ).length;
  if (pendientes > 0) {
    blockers.push(
      pendientes === 1
        ? 'Falta elegir proveedor para 1 repuesto.'
        : `Falta elegir proveedor para ${pendientes} repuestos.`,
    );
  }

  // Elegir un proveedor que no tiene stock suficiente entrega una orden de
  // compra que el proveedor no puede cumplir, y eso se descubre una semana
  // después, cuando el vehículo lleva siete días ocupando una bahía.
  const sinStock = lines.filter((l) => {
    const offer = offerFor(l, selection);
    return offer !== undefined && !coversQuantity(l, offer);
  }).length;
  if (sinStock > 0) {
    blockers.push(
      sinStock === 1
        ? 'Un proveedor elegido no cubre la cantidad pedida.'
        : `${sinStock} proveedores elegidos no cubren la cantidad pedida.`,
    );
  }

  return { canSend: blockers.length === 0, blockers };
}

export interface SupplierOrder {
  readonly supplierId: string;
  readonly supplierName: string;
  readonly lines: readonly { readonly line: QuotedLine; readonly offer: SupplierOffer }[];
  readonly subtotalCents: number;
  readonly leadTimeDays: number;
}

/** Una orden de compra por proveedor: es como se emite y como se recibe. */
export function ordersBySupplier(
  lines: readonly QuotedLine[],
  selection: Selection,
): readonly SupplierOrder[] {
  const order: string[] = [];
  const bySupplier = new Map<string, { line: QuotedLine; offer: SupplierOffer }[]>();

  for (const line of lines) {
    const offer = offerFor(line, selection);
    if (offer === undefined) continue;
    const existing = bySupplier.get(offer.supplierId);
    if (existing === undefined) {
      order.push(offer.supplierId);
      bySupplier.set(offer.supplierId, [{ line, offer }]);
    } else {
      existing.push({ line, offer });
    }
  }

  return order.map((supplierId) => {
    const group = bySupplier.get(supplierId) ?? [];
    return {
      supplierId,
      supplierName: group[0]?.offer.supplierName ?? '',
      lines: group,
      subtotalCents: group.reduce((n, g) => n + lineTotalCents(g.line, g.offer), 0),
      leadTimeDays: group.reduce((n, g) => Math.max(n, g.offer.leadTimeDays), 0),
    };
  });
}

export function toSoles(cents: number): number {
  return cents / 100;
}
