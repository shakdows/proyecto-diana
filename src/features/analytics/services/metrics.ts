/**
 * Agregación de indicadores del panel.
 *
 * Módulo puro. En la Fase 15 los mismos números salen de UNA función SQL con
 * RLS aplicada, para que el cliente corporativo vea su propia agregación sin
 * que el frontend tenga que filtrar nada: si el filtrado viviera aquí,
 * bastaría con abrir las herramientas del navegador para ver las cifras de
 * otra empresa.
 */

import { bucketOf, npsOf } from '@/features/delivery/services/survey';

export interface OrderRecord {
  readonly orderId: string;
  readonly closedAt: Date;
  readonly corporateClient: string | null;
  readonly branch: string;
  readonly advisor: string;
  readonly brand: string;
  readonly serviceType: string;
  /** Ciclo total en horas, de recepción a entrega. */
  readonly cycleHours: number;
  /** Si se entregó dentro de la hora prometida. */
  readonly onTime: boolean;
  readonly revenueCents: number;
  /** NPS de la encuesta, `null` si no respondió. */
  readonly npsScore: number | null;
  readonly csatAverage: number | null;
}

export interface Filters {
  readonly corporateClient?: string;
  readonly branch?: string;
  readonly advisor?: string;
  readonly brand?: string;
  readonly serviceType?: string;
}

export function applyFilters(
  records: readonly OrderRecord[],
  filters: Filters,
): readonly OrderRecord[] {
  return records.filter(
    (r) =>
      (filters.corporateClient === undefined ||
        (r.corporateClient ?? 'Particulares') === filters.corporateClient) &&
      (filters.branch === undefined || r.branch === filters.branch) &&
      (filters.advisor === undefined || r.advisor === filters.advisor) &&
      (filters.brand === undefined || r.brand === filters.brand) &&
      (filters.serviceType === undefined || r.serviceType === filters.serviceType),
  );
}

export function inRange(
  records: readonly OrderRecord[],
  from: Date,
  to: Date,
): readonly OrderRecord[] {
  return records.filter((r) => r.closedAt >= from && r.closedAt < to);
}

export interface Kpis {
  readonly orders: number;
  readonly revenueCents: number;
  /** Ticket medio. 0 órdenes da 0, no NaN. */
  readonly averageTicketCents: number;
  /** Porcentaje entregado a tiempo, 0–100. */
  readonly onTimePercent: number;
  readonly averageCycleHours: number;
  readonly nps: number;
  readonly npsResponses: number;
  readonly csat: number;
  /** Cuántas encuestas se respondieron sobre órdenes cerradas, 0–100. */
  readonly responseRatePercent: number;
}

function mean(values: readonly number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function computeKpis(records: readonly OrderRecord[]): Kpis {
  const orders = records.length;
  const revenueCents = records.reduce((n, r) => n + r.revenueCents, 0);

  const scores = records
    .map((r) => r.npsScore)
    .filter((s): s is number => s !== null);
  const csats = records
    .map((r) => r.csatAverage)
    .filter((s): s is number => s !== null);

  return {
    orders,
    revenueCents,
    // Sin órdenes el ticket medio es 0, no una división entre cero.
    averageTicketCents: orders === 0 ? 0 : Math.round(revenueCents / orders),
    onTimePercent:
      orders === 0 ? 0 : round1((records.filter((r) => r.onTime).length / orders) * 100),
    averageCycleHours: round1(mean(records.map((r) => r.cycleHours))),
    nps: npsOf(scores).score,
    npsResponses: scores.length,
    csat: round1(mean(csats)),
    responseRatePercent: orders === 0 ? 0 : round1((scores.length / orders) * 100),
  };
}

export interface Delta {
  readonly absolute: number;
  /** Variación porcentual. `null` cuando el periodo anterior era cero. */
  readonly percent: number | null;
  readonly direction: 'sube' | 'baja' | 'igual';
}

/**
 * Comparación contra el periodo anterior.
 *
 * Si el periodo anterior fue 0, la variación porcentual es `null`, no
 * «+100 %» ni «∞»: pasar de 0 a 3 órdenes no es un aumento del cien por
 * ciento, es que antes no había nada con qué comparar.
 */
export function deltaOf(current: number, previous: number): Delta {
  const absolute = round1(current - previous);
  const direction = absolute > 0 ? 'sube' : absolute < 0 ? 'baja' : 'igual';
  const percent = previous === 0 ? null : round1(((current - previous) / Math.abs(previous)) * 100);
  return { absolute, percent, direction };
}

/** Ventana anterior del mismo tamaño, pegada a la actual. */
export function previousWindow(from: Date, to: Date): { readonly from: Date; readonly to: Date } {
  const span = to.getTime() - from.getTime();
  return { from: new Date(from.getTime() - span), to: from };
}

export interface Slice {
  readonly label: string;
  readonly orders: number;
  readonly revenueCents: number;
  readonly nps: number;
  readonly onTimePercent: number;
}

/**
 * Desglose por una dimensión.
 *
 * Las órdenes sin cliente corporativo se agrupan como «Particulares» en vez
 * de descartarse: un desglose cuyas partes no suman el total hace dudar de
 * todos los demás números de la pantalla.
 */
export function breakdownBy(
  records: readonly OrderRecord[],
  dimension: 'corporateClient' | 'branch' | 'advisor' | 'brand' | 'serviceType',
): readonly Slice[] {
  const groups = new Map<string, OrderRecord[]>();

  for (const r of records) {
    const raw = r[dimension];
    const key = raw === null ? 'Particulares' : raw;
    const existing = groups.get(key);
    if (existing === undefined) groups.set(key, [r]);
    else existing.push(r);
  }

  return [...groups.entries()]
    .map(([label, rows]) => {
      const k = computeKpis(rows);
      return {
        label,
        orders: k.orders,
        revenueCents: k.revenueCents,
        nps: k.nps,
        onTimePercent: k.onTimePercent,
      };
    })
    .sort((a, b) => b.revenueCents - a.revenueCents || a.label.localeCompare(b.label, 'es'));
}

export interface DayPoint {
  readonly date: Date;
  readonly orders: number;
  readonly revenueCents: number;
}

/**
 * Serie diaria dentro de la ventana.
 *
 * Incluye los días SIN órdenes. Omitirlos hace que una línea de tiempo se
 * comprima y que un fin de semana cerrado parezca un martes flojo.
 */
export function dailySeries(
  records: readonly OrderRecord[],
  from: Date,
  to: Date,
): readonly DayPoint[] {
  const byDay = new Map<string, OrderRecord[]>();
  for (const r of records) {
    const key = dayKey(r.closedAt);
    const existing = byDay.get(key);
    if (existing === undefined) byDay.set(key, [r]);
    else existing.push(r);
  }

  const out: DayPoint[] = [];
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  // Tope defensivo: una ventana absurda no debe colgar el render.
  for (let guard = 0; cursor < to && guard < 400; guard += 1) {
    const rows = byDay.get(dayKey(cursor)) ?? [];
    out.push({
      date: new Date(cursor),
      orders: rows.length,
      revenueCents: rows.reduce((n, r) => n + r.revenueCents, 0),
    });
    cursor.setDate(cursor.getDate() + 1);
  }
  return out;
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export interface NpsMix {
  readonly promoters: number;
  readonly passives: number;
  readonly detractors: number;
  readonly withoutResponse: number;
}

export function npsMix(records: readonly OrderRecord[]): NpsMix {
  let promoters = 0;
  let passives = 0;
  let detractors = 0;
  let withoutResponse = 0;

  for (const r of records) {
    if (r.npsScore === null) {
      withoutResponse += 1;
      continue;
    }
    const bucket = bucketOf(r.npsScore);
    if (bucket === 'promotor') promoters += 1;
    else if (bucket === 'pasivo') passives += 1;
    else detractors += 1;
  }

  return { promoters, passives, detractors, withoutResponse };
}

/** Valores distintos de una dimensión, para poblar los filtros. */
export function optionsFor(
  records: readonly OrderRecord[],
  dimension: 'corporateClient' | 'branch' | 'advisor' | 'brand' | 'serviceType',
): readonly string[] {
  const set = new Set<string>();
  for (const r of records) {
    const raw = r[dimension];
    set.add(raw === null ? 'Particulares' : raw);
  }
  return [...set].sort((a, b) => a.localeCompare(b, 'es'));
}

export function toSoles(cents: number): number {
  return cents / 100;
}
