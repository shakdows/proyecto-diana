/**
 * El acta de recepción: lo que se firma y queda.
 *
 * ── Qué es y por qué tiene código propio ───────────────────────────────────
 *
 * Es el documento que dice en qué estado entró el vehículo y quién lo
 * aceptó. Cuando el cliente vuelve dos meses después diciendo «ese golpe no
 * estaba», esto es lo que se saca. Por eso lleva un código legible y no un
 * identificador interno: alguien lo va a decir por teléfono y otro lo va a
 * buscar escribiéndolo a mano.
 *
 * ── Por qué firma y confirmación son DOS pasos ─────────────────────────────
 *
 * Porque son dos actos distintos. La firma es del CLIENTE aceptando lo que
 * dice el acta; la confirmación es del TALLER dando el ingreso por bueno y
 * abriendo la orden. Juntarlos deja al cliente firmando algo que todavía se
 * puede cambiar, que es exactamente lo que una firma no puede permitir.
 */

export interface ReceptionSignature {
  /** El trazo, como `data:image/png;base64,…`. */
  readonly dataUrl: string;
  readonly name: string;
  readonly signedAt: string;
}

/**
 * Una corrección al acta, con su rastro.
 *
 * Un acta firmada que se reescribe en silencio es PEOR que no tener acta: el
 * cliente firmó una cosa y el taller enseña otra, y el papel deja de servir
 * justo el día que hace falta. Corregir se puede —hay errores de tecleo de
 * verdad—, pero queda escrito qué se cambió y cuándo.
 */
export interface ActaCorrection {
  readonly at: string;
  readonly note: string;
  readonly by: string;
}

export interface CompletedReception {
  readonly code: string;
  readonly plate: string;
  readonly vehicle: string;
  readonly customer: string;
  readonly customerId: string | null;
  readonly closedAt: string;
  readonly checklistResolved: number;
  readonly checklistTotal: number;
  readonly damageCount: number;
  readonly photoCount: number;
  readonly customerSignature: ReceptionSignature | null;
  readonly advisorName: string;
  readonly orderCode: string;
  /** Lo que se corrigió después de cerrarla. Vacío en la mayoría. */
  readonly corrections?: readonly ActaCorrection[];
}

/**
 * El código de la recepción y el de la orden que abre.
 *
 * Dos códigos y no uno porque son dos cosas: la recepción es el acta de
 * entrada —ocurre una vez y no cambia— y la orden es el trabajo, que vive
 * semanas y cambia de estado. En un taller se pregunta por las dos cosas y
 * casi nunca a la vez.
 *
 * El correlativo sale del mismo contador para que dos recepciones del mismo
 * día no puedan compartirlo.
 */
export function receptionCode(now: Date, seq: number): string {
  return `REC-${String(now.getFullYear())}-${String(seq).padStart(4, '0')}`;
}

export function orderCodeFor(now: Date, seq: number): string {
  return `OT-${String(now.getFullYear())}-${String(seq).padStart(4, '0')}`;
}

/** El siguiente correlativo a partir de lo que ya hay. */
export function nextSequence(existing: readonly CompletedReception[]): number {
  const mayor = existing.reduce((max, r) => {
    const n = Number(r.code.split('-').pop() ?? '0');
    return Number.isFinite(n) && n > max ? n : max;
  }, 0);
  return mayor + 1;
}

export interface ActaCheck {
  readonly ready: boolean;
  /** Lo que impide cerrar, en el orden en que hay que resolverlo. */
  readonly blockers: readonly string[];
  /** Lo que conviene tener y no impide cerrar. */
  readonly warnings: readonly string[];
}

/**
 * Si la recepción se puede cerrar.
 *
 * ── Qué bloquea y qué solo avisa ───────────────────────────────────────────
 *
 * BLOQUEA lo que hace que el acta no pruebe nada: sin checklist terminado no
 * se sabe qué se revisó, y sin la firma del cliente el acta es un papel que
 * nadie aceptó. Esas dos no tienen sustituto.
 *
 * AVISA lo que puede faltar por una razón legítima: una foto de una zona que
 * no se ve, una toma general con el vehículo pegado a la pared. Bloquear por
 * eso deja el coche en el patio sin orden, que le cuesta más al taller que la
 * foto que falta.
 */
export function checkActa(input: {
  readonly checklistResolved: number;
  readonly checklistTotal: number;
  readonly signed: boolean;
  readonly damagedWithoutPhoto: number;
  readonly generalShots: number;
  readonly generalShotsTotal: number;
}): ActaCheck {
  const blockers: string[] = [];
  const warnings: string[] = [];

  const faltan = input.checklistTotal - input.checklistResolved;
  if (faltan > 0) {
    blockers.push(
      faltan === 1
        ? 'Falta un punto del checklist por revisar.'
        : `Faltan ${String(faltan)} puntos del checklist por revisar.`,
    );
  }
  if (!input.signed) blockers.push('Falta la firma del cliente.');

  if (input.damagedWithoutPhoto > 0) {
    warnings.push(
      input.damagedWithoutPhoto === 1
        ? 'Hay un daño marcado sin foto.'
        : `Hay ${String(input.damagedWithoutPhoto)} daños marcados sin foto.`,
    );
  }
  const sinTomar = input.generalShotsTotal - input.generalShots;
  if (sinTomar > 0) {
    warnings.push(
      sinTomar === 1
        ? 'Falta una toma general del vehículo.'
        : `Faltan ${String(sinTomar)} tomas generales del vehículo.`,
    );
  }

  return { ready: blockers.length === 0, blockers, warnings };
}

/** Un trazo con cuatro puntos no es una firma: es un dedo apoyado. */
export const MIN_SIGNATURE_POINTS = 12;

/**
 * Aplica una corrección dejando constancia.
 *
 * No hay forma de cambiar un acta SIN que quede el rastro, y es a propósito:
 * si existiera, se usaría. Lo que se puede corregir son datos de forma
 * —el nombre de quien firmó, el vehículo mal escrito—, nunca lo que el
 * cliente aceptó: los daños y el checklist se corrigen reabriendo la
 * recepción, que es un acto distinto y visible.
 */
export function withCorrection(
  acta: CompletedReception,
  patch: Partial<Pick<CompletedReception, 'customer' | 'vehicle' | 'plate'>>,
  by: string,
  now: Date,
): CompletedReception {
  const cambios: string[] = [];
  if (patch.customer !== undefined && patch.customer !== acta.customer) {
    cambios.push(`cliente: «${acta.customer}» → «${patch.customer}»`);
  }
  if (patch.vehicle !== undefined && patch.vehicle !== acta.vehicle) {
    cambios.push(`vehículo: «${acta.vehicle}» → «${patch.vehicle}»`);
  }
  if (patch.plate !== undefined && patch.plate !== acta.plate) {
    cambios.push(`placa: «${acta.plate}» → «${patch.plate}»`);
  }
  /* Sin cambios reales no se escribe una corrección: un historial lleno de
     «no cambió nada» esconde las que sí importan. */
  if (cambios.length === 0) return acta;

  return {
    ...acta,
    ...patch,
    corrections: [
      ...(acta.corrections ?? []),
      { at: now.toISOString(), note: cambios.join('; '), by },
    ],
  };
}

/** Si el acta se tocó después de firmarse. Lo enseña la propia acta. */
export function wasCorrected(acta: CompletedReception): boolean {
  return (acta.corrections ?? []).length > 0;
}
