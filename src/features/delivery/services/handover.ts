/**
 * Entrega del vehículo.
 *
 * Es el único paso irreversible del flujo: una vez que el vehículo sale del
 * taller, lo que no se comprobó ya no se comprueba. Por eso las reglas son
 * duras y ninguna admite «lo arreglamos después».
 *
 * Módulo puro: sin React y sin base de datos.
 */

export type PickupPerson = 'titular' | 'autorizado';

export type PaymentMethod = 'efectivo' | 'tarjeta' | 'transferencia' | 'credito_corporativo';

export const PAYMENT_METHOD_LABELS: Readonly<Record<PaymentMethod, string>> = {
  efectivo: 'Efectivo',
  tarjeta: 'Tarjeta',
  transferencia: 'Transferencia',
  credito_corporativo: 'Crédito corporativo',
};

export interface HandoverFacts {
  readonly totalCents: number;
  readonly paidCents: number;
  readonly method: PaymentMethod | null;
  /** Solo las cuentas corporativas pueden salir con saldo pendiente. */
  readonly hasCorporateCredit: boolean;
  readonly pickupPerson: PickupPerson;
  readonly authorizedName: string;
  /** Últimos 3 dígitos del documento. El completo NUNCA se pide aquí. */
  readonly authorizedDocLast3: string;
  readonly signatureCaptured: boolean;
  readonly keysReturned: boolean;
  readonly documentsReturned: boolean;
  /** Kilometraje u horómetro al recibir el vehículo. */
  readonly usageAtReception: number;
  /** Al entregarlo. Nunca puede ser menor. */
  readonly usageAtDelivery: number | null;
}

export function balanceCents(facts: HandoverFacts): number {
  return Math.max(0, facts.totalCents - facts.paidCents);
}

export function isPaid(facts: HandoverFacts): boolean {
  return balanceCents(facts) === 0;
}

export interface HandoverReadiness {
  readonly canDeliver: boolean;
  readonly blockers: readonly string[];
}

export function readiness(facts: HandoverFacts): HandoverReadiness {
  const blockers: string[] = [];

  /*
   * El dinero primero. Un vehículo entregado con saldo pendiente y sin línea
   * de crédito se cobra por teléfono durante las siguientes tres semanas, si
   * es que se cobra.
   */
  if (!isPaid(facts) && !facts.hasCorporateCredit) {
    blockers.push('Queda saldo pendiente y esta cuenta no tiene crédito corporativo.');
  }

  if (facts.method === null) {
    blockers.push('Registra la forma de pago.');
  } else if (facts.method === 'credito_corporativo' && !facts.hasCorporateCredit) {
    blockers.push('Esta cuenta no tiene crédito corporativo.');
  }

  /*
   * Quien recoge no siempre es el titular. Si es otra persona hay que poder
   * decir QUIÉN se llevó el vehículo: «lo recogió un señor» no es un registro.
   * Del documento solo se guardan tres dígitos; el completo ni se pide ni se
   * pinta (docs/04 §4.9).
   */
  if (facts.pickupPerson === 'autorizado') {
    if (facts.authorizedName.trim() === '') {
      blockers.push('Falta el nombre de quien recoge el vehículo.');
    }
    if (!/^\d{3}$/u.test(facts.authorizedDocLast3)) {
      blockers.push('Faltan los últimos 3 dígitos del documento de quien recoge.');
    }
  }

  if (facts.usageAtDelivery === null) {
    blockers.push('Falta registrar el kilometraje de salida.');
  } else if (facts.usageAtDelivery < facts.usageAtReception) {
    // Un odómetro no retrocede. O está mal tecleado, o hay algo que explicar.
    blockers.push('El kilometraje de salida no puede ser menor que el de entrada.');
  }

  if (!facts.keysReturned) blockers.push('Confirma la entrega de llaves.');
  if (!facts.documentsReturned) blockers.push('Confirma la entrega de documentos.');

  // La firma va la última: es el acto que cierra todo lo anterior, y pedirla
  // antes de tener el resto en orden obliga a pedirla dos veces.
  if (!facts.signatureCaptured) blockers.push('Falta la firma de conformidad.');

  return { canDeliver: blockers.length === 0, blockers };
}

/** Kilómetros u horas recorridos dentro del taller. */
export function usageDelta(facts: HandoverFacts): number | null {
  if (facts.usageAtDelivery === null) return null;
  return Math.max(0, facts.usageAtDelivery - facts.usageAtReception);
}

export function toSoles(cents: number): number {
  return cents / 100;
}
