/**
 * La frase que encabeza el tablero.
 *
 * Ocho contadores no dicen si el taller va bien. Esta función mira el mismo
 * material y responde a la única pregunta con la que alguien abre esta
 * pantalla: ¿tengo que hacer algo ahora mismo?
 *
 * Es pura y vive fuera de la pantalla a propósito. La frase que se lee arriba
 * del todo es una AFIRMACIÓN sobre el estado del taller: si dice «operación
 * estable» con una reparación pausada desde ayer, el tablero miente. Una
 * función pura se puede probar; un `&&` dentro del JSX, no.
 */

export type SituationTone = 'estable' | 'atencion' | 'critico';

export interface Situation {
  readonly tone: SituationTone;
  readonly headline: string;
  /**
   * El arranque del titular, para destacarlo en color: «4 vehículos».
   *
   * Va aquí y no en la plantilla porque es SIEMPRE un prefijo exacto de
   * `headline`; partir la frase con un `split(' ').slice(0, 2)` en el
   * componente funciona hasta que el titular cambia de forma y entonces
   * destaca media palabra. Vacío cuando no hay cifra que destacar.
   */
  readonly emphasis: string;
  readonly detail: string;
}

export type AttentionKind = 'pausada' | 'retrasada' | 'repuestos' | 'riesgo' | 'cliente';

/** Lo mínimo que hace falta de un aviso: ni la fila ni el texto con datos. */
export interface AttentionLike {
  readonly kind: AttentionKind;
  readonly severity: 'crit' | 'warn' | 'wait';
}

/**
 * Cómo se nombra cada problema al contarlo.
 *
 * `one` y `many` separados porque «1 reparación pausada» y «2 reparaciones
 * pausadas» no se resuelven pegando una «s»: cambian dos palabras.
 */
const LABEL: Readonly<Record<AttentionKind, { readonly one: string; readonly many: string }>> = {
  pausada: { one: 'reparación pausada', many: 'reparaciones pausadas' },
  retrasada: { one: 'entrega retrasada', many: 'entregas retrasadas' },
  repuestos: { one: 'esperando repuestos', many: 'esperando repuestos' },
  riesgo: { one: 'en riesgo de retraso', many: 'en riesgo de retraso' },
  cliente: { one: 'esperando al cliente', many: 'esperando al cliente' },
};

/** Orden de lectura: lo que el taller controla va antes que lo que no. */
const ORDER: readonly AttentionKind[] = ['pausada', 'retrasada', 'repuestos', 'riesgo', 'cliente'];

/** «1 reparación pausada · 2 esperando repuestos». */
export function summarizeAttention(items: readonly AttentionLike[]): string {
  const counts = new Map<AttentionKind, number>();
  for (const item of items) counts.set(item.kind, (counts.get(item.kind) ?? 0) + 1);

  return ORDER.filter((kind) => counts.has(kind))
    .map((kind) => {
      const n = counts.get(kind) ?? 0;
      return `${String(n)} ${n === 1 ? LABEL[kind].one : LABEL[kind].many}`;
    })
    .join(' · ');
}

export interface SituationInput {
  /** Vehículos abiertos en el taller. */
  readonly activeCount: number;
  /** De esos, cuántos tienen hora estimada para hoy. */
  readonly finishingToday: number;
  readonly items: readonly AttentionLike[];
}

export function situationOf({ activeCount, finishingToday, items }: SituationInput): Situation {
  if (items.length === 0) {
    return {
      tone: 'estable',
      headline: activeCount === 0 ? 'Taller sin vehículos' : 'Operación estable',
      emphasis: '',
      detail: stableDetail(activeCount, finishingToday),
    };
  }

  // Basta UN problema grave para que el encabezado cambie de color. Promediar
  // gravedades escondería justo el caso que hay que ver.
  const tone: SituationTone = items.some((i) => i.severity === 'crit') ? 'critico' : 'atencion';

  // Un vehículo puede tener dos motivos; lo que se cuenta son VEHÍCULOS.
  const n = items.length;

  const emphasis = n === 1 ? '1 vehículo' : `${String(n)} vehículos`;

  return {
    tone,
    headline: `${emphasis} ${n === 1 ? 'necesita' : 'necesitan'} tu atención`,
    emphasis,
    detail: summarizeAttention(items),
  };
}

function stableDetail(activeCount: number, finishingToday: number): string {
  if (activeCount === 0) return 'Nada en proceso. Buen momento para recibir.';

  const activos = activeCount === 1 ? '1 vehículo activo' : `${String(activeCount)} vehículos activos`;
  const terminan =
    finishingToday === 0
      ? 'ninguno termina hoy'
      : finishingToday === 1
        ? '1 termina hoy'
        : `${String(finishingToday)} terminan hoy`;

  return `${activos} · ${terminan}`;
}

/** ¿Cae la hora estimada en el mismo día natural que «ahora»? */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/**
 * Cuántos terminan hoy.
 *
 * Una hora estimada que ya pasó sigue contando: el vehículo termina hoy, tarde.
 * Excluirla haría que un taller con retrasos dijera «ninguno termina hoy», que
 * es exactamente lo contrario de lo que ocurre.
 */
export function countFinishingToday(
  etas: readonly (Date | null)[],
  now: Date,
): number {
  return etas.filter((eta) => eta !== null && isSameDay(eta, now)).length;
}
