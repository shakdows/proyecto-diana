import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowDownRight, ArrowRight, ArrowUpRight, Minus } from 'lucide-react';
import { BarChart, ChartCard, DonutChart, Legend, LineChart } from '@/components/charts/charts';
import {
  applyFilters,
  breakdownBy,
  computeKpis,
  dailySeries,
  deltaOf,
  inRange,
  npsMix,
  optionsFor,
  previousWindow,
  toSoles,
  type Filters,
} from '@/features/analytics/services/metrics';
import { demoHistory } from '@/features/analytics/demo';
import { formatCurrency, formatNumber } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

export const metadata: Metadata = { title: 'Panel' };
export const dynamic = 'force-dynamic';

const PERIODOS = [
  { days: 7, label: '7 días' },
  { days: 30, label: '30 días' },
  { days: 90, label: '90 días' },
] as const;

const DIMENSIONES = [
  { key: 'corporateClient', label: 'Empresa' },
  { key: 'branch', label: 'Sede' },
  { key: 'advisor', label: 'Asesor' },
  { key: 'brand', label: 'Marca' },
  { key: 'serviceType', label: 'Servicio' },
] as const;

type SearchParams = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined): string | undefined =>
  Array.isArray(v) ? v[0] : v;

/**
 * Panel de indicadores.
 *
 * TODO el estado vive en la URL. Es lo que hace que el enlace sea compartible
 * —«mira los frenos de Mitsui en Ate este mes» es una dirección, no una
 * secuencia de clics que el otro tiene que repetir— y lo que permitirá que el
 * PDF de la Fase 16 se genere con exactamente el mismo estado.
 *
 * Es un Server Component: la agregación ocurre en el servidor y al navegador
 * solo llegan los números ya calculados. En la Fase 15 eso pasa a ser una
 * función SQL con RLS, de modo que un cliente corporativo no pueda ver la
 * agregación de otro ni abriendo las herramientas del navegador.
 */
export default async function PanelPage({
  searchParams,
}: {
  readonly searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const now = new Date();

  const days = Number(one(params.dias) ?? 30);
  const period = PERIODOS.find((p) => p.days === days) ?? PERIODOS[1];

  const filters: Filters = {
    ...(one(params.empresa) === undefined ? {} : { corporateClient: one(params.empresa) }),
    ...(one(params.sede) === undefined ? {} : { branch: one(params.sede) }),
    ...(one(params.asesor) === undefined ? {} : { advisor: one(params.asesor) }),
    ...(one(params.marca) === undefined ? {} : { brand: one(params.marca) }),
    ...(one(params.servicio) === undefined ? {} : { serviceType: one(params.servicio) }),
  };

  const history = demoHistory(now);
  const to = now;
  const from = new Date(now.getTime() - period.days * 86_400_000);
  const prev = previousWindow(from, to);

  const filtered = applyFilters(history, filters);
  const current = inRange(filtered, from, to);
  const previous = inRange(filtered, prev.from, prev.to);

  const kpis = computeKpis(current);
  const before = computeKpis(previous);

  const mix = npsMix(current);
  const serie = dailySeries(current, from, to);
  const dimension = (one(params.desglose) ?? 'corporateClient') as (typeof DIMENSIONES)[number]['key'];
  const breakdown = breakdownBy(current, dimension).slice(0, 8);

  const href = (change: Record<string, string | undefined>): string => {
    const next = new URLSearchParams();
    const base: Record<string, string | undefined> = {
      dias: String(period.days),
      empresa: one(params.empresa),
      sede: one(params.sede),
      asesor: one(params.asesor),
      marca: one(params.marca),
      servicio: one(params.servicio),
      desglose: one(params.desglose),
      ...change,
    };
    for (const [k, v] of Object.entries(base)) {
      if (v !== undefined && v !== '') next.set(k, v);
    }
    const qs = next.toString();
    return qs === '' ? '/panel' : `/panel?${qs}`;
  };

  const activos = Object.keys(filters).length;

  return (
    <div className="space-y-5">
      <header className="rounded-panel border border-border bg-surface-raised p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-fg">Panel</h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-fg-muted">
              Órdenes cerradas en los últimos {period.label}, comparadas con los{' '}
              {period.label} anteriores. Los filtros viven en la dirección: copia el enlace y
              quien lo abra verá exactamente esto.
            </p>
          </div>

          <nav aria-label="Periodo" className="flex gap-2">
            {PERIODOS.map((p) => (
              <Link
                key={p.days}
                href={href({ dias: String(p.days) })}
                aria-current={p.days === period.days ? 'page' : undefined}
                className={cn(
                  'inline-flex h-10 items-center rounded-control border px-3.5 text-sm font-medium transition-colors',
                  p.days === period.days
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : 'border-border-strong bg-surface text-fg-muted hover:bg-surface-sunken',
                )}
              >
                {p.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3 border-t border-border pt-5">
          {DIMENSIONES.map((d) => {
            const key = ({
              corporateClient: 'empresa',
              branch: 'sede',
              advisor: 'asesor',
              brand: 'marca',
              serviceType: 'servicio',
            } as const)[d.key];
            const value = one(params[key]);
            const options = optionsFor(history, d.key);

            return (
              <div key={d.key} className="flex min-w-0 items-center gap-2">
                <span className="shrink-0 text-xs uppercase tracking-[0.06em] text-fg-subtle">
                  {d.label}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <Link
                    href={href({ [key]: undefined })}
                    className={cn(
                      'rounded-chip border px-2.5 py-1 text-xs font-medium transition-colors',
                      value === undefined
                        ? 'border-fg bg-fg text-white'
                        : 'border-border-strong bg-surface text-fg-muted hover:bg-surface-sunken',
                    )}
                  >
                    Todas
                  </Link>
                  {options.map((o) => (
                    <Link
                      key={o}
                      href={href({ [key]: o })}
                      className={cn(
                        'rounded-chip border px-2.5 py-1 text-xs font-medium transition-colors',
                        value === o
                          ? 'border-brand-600 bg-brand-50 text-brand-700'
                          : 'border-border-strong bg-surface text-fg-muted hover:bg-surface-sunken',
                      )}
                    >
                      {o}
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}

          {activos > 0 && (
            <Link
              href={href({
                empresa: undefined,
                sede: undefined,
                asesor: undefined,
                marca: undefined,
                servicio: undefined,
              })}
              className="text-sm font-medium text-brand-600 transition-colors hover:text-brand-700"
            >
              Quitar {activos === 1 ? 'el filtro' : `los ${activos} filtros`}
            </Link>
          )}
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Órdenes cerradas"
          value={formatNumber(kpis.orders)}
          delta={deltaOf(kpis.orders, before.orders)}
          format={(n) => formatNumber(n)}
        />
        <Kpi
          label="Facturación"
          value={formatCurrency(toSoles(kpis.revenueCents))}
          delta={deltaOf(toSoles(kpis.revenueCents), toSoles(before.revenueCents))}
          format={(n) => formatCurrency(n)}
        />
        <Kpi
          label="Entrega a tiempo"
          value={`${kpis.onTimePercent} %`}
          delta={deltaOf(kpis.onTimePercent, before.onTimePercent)}
          format={(n) => `${n} pp`}
        />
        <Kpi
          label="NPS"
          value={String(kpis.nps)}
          hint={`${kpis.npsResponses} respuestas · ${kpis.responseRatePercent} % de respuesta`}
          delta={deltaOf(kpis.nps, before.nps)}
          format={(n) => `${n} pts`}
        />
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <ChartCard
          title="Órdenes cerradas por día"
          description="Los días sin actividad se muestran: un domingo cerrado no es un martes flojo."
        >
          <LineChart
            label={`Órdenes cerradas por día en los últimos ${period.label}`}
            data={serie.map((p) => ({
              label: p.date.toLocaleDateString('es-PE', { day: '2-digit', month: 'short' }),
              value: p.orders,
            }))}
            format={(n) => formatNumber(Math.round(n))}
          />
        </ChartCard>

        <ChartCard
          title="Composición del NPS"
          description="Sobre las órdenes del periodo, no solo sobre quien respondió."
        >
          <DonutChart
            label="Reparto de promotores, pasivos, detractores y sin respuesta"
            centerValue={String(kpis.nps)}
            centerLabel="NPS"
            data={[
              { label: 'Promotores', value: mix.promoters, className: 'fill-ok-600' },
              { label: 'Pasivos', value: mix.passives, className: 'fill-wait-500' },
              { label: 'Detractores', value: mix.detractors, className: 'fill-crit-600' },
              { label: 'Sin respuesta', value: mix.withoutResponse, className: 'fill-graphite-200' },
            ]}
          />
          <Legend
            items={[
              { label: 'Promotores', value: formatNumber(mix.promoters), className: 'bg-ok-600' },
              { label: 'Pasivos', value: formatNumber(mix.passives), className: 'bg-wait-500' },
              { label: 'Detractores', value: formatNumber(mix.detractors), className: 'bg-crit-600' },
              {
                label: 'Sin respuesta',
                value: formatNumber(mix.withoutResponse),
                className: 'bg-graphite-200',
              },
            ]}
          />
        </ChartCard>
      </div>

      <ChartCard
        title="Facturación por dimensión"
        description="Las partes suman el total: las órdenes sin empresa se agrupan como particulares."
        action={
          <nav aria-label="Desglose" className="flex flex-wrap gap-1.5">
            {DIMENSIONES.map((d) => (
              <Link
                key={d.key}
                href={href({ desglose: d.key })}
                aria-current={d.key === dimension ? 'true' : undefined}
                className={cn(
                  'rounded-chip border px-2.5 py-1 text-xs font-medium transition-colors',
                  d.key === dimension
                    ? 'border-brand-600 bg-brand-50 text-brand-700'
                    : 'border-border-strong bg-surface text-fg-muted hover:bg-surface-sunken',
                )}
              >
                {d.label}
              </Link>
            ))}
          </nav>
        }
      >
        <BarChart
          label={`Facturación por ${DIMENSIONES.find((d) => d.key === dimension)?.label.toLowerCase()}`}
          data={breakdown.map((s) => ({ label: s.label, value: toSoles(s.revenueCents) }))}
          format={(n) => (n >= 1000 ? `${Math.round(n / 1000)} k` : String(Math.round(n)))}
          height={240}
        />

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[34rem] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-[0.06em] text-fg-subtle">
                <th scope="col" className="py-2.5 pr-3">
                  {DIMENSIONES.find((d) => d.key === dimension)?.label}
                </th>
                <th scope="col" className="w-24 py-2.5 pr-3 text-right">Órdenes</th>
                <th scope="col" className="w-32 py-2.5 pr-3 text-right">Facturación</th>
                <th scope="col" className="w-24 py-2.5 pr-3 text-right">A tiempo</th>
                <th scope="col" className="w-20 py-2.5 text-right">NPS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {breakdown.map((s) => (
                <tr key={s.label}>
                  <td className="py-2.5 pr-3 text-fg">{s.label}</td>
                  <td data-numeric className="py-2.5 pr-3 text-right text-fg-muted">
                    {formatNumber(s.orders)}
                  </td>
                  <td data-numeric className="py-2.5 pr-3 text-right font-medium text-fg">
                    {formatCurrency(toSoles(s.revenueCents))}
                  </td>
                  <td data-numeric className="py-2.5 pr-3 text-right text-fg-muted">
                    {s.onTimePercent} %
                  </td>
                  <td
                    data-numeric
                    className={cn(
                      'py-2.5 text-right font-medium',
                      s.nps >= 50 ? 'text-ok-600' : s.nps >= 0 ? 'text-fg' : 'text-crit-600',
                    )}
                  >
                    {s.nps}
                  </td>
                </tr>
              ))}
              {breakdown.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-fg-subtle">
                    Ninguna orden cerrada con estos filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </ChartCard>

      <div className="grid gap-5 lg:grid-cols-2">
        <ChartCard title="Ciclo medio" description="De recepción a entrega, en horas.">
          <p className="flex items-baseline gap-3">
            <span
              data-numeric
              className="font-display text-4xl font-semibold tracking-tight text-fg"
            >
              {kpis.averageCycleHours} h
            </span>
            <DeltaChip
              delta={deltaOf(kpis.averageCycleHours, before.averageCycleHours)}
              format={(n) => `${n} h`}
              /* Menos horas de ciclo es mejor: la flecha hacia abajo va en verde. */
              lowerIsBetter
            />
          </p>
          <p className="mt-2 text-sm text-fg-muted">
            Antes: {before.averageCycleHours} h en {formatNumber(before.orders)} órdenes.
          </p>
        </ChartCard>

        <ChartCard title="Ticket medio" description="Facturación entre órdenes cerradas.">
          <p className="flex items-baseline gap-3">
            <span
              data-numeric
              className="font-display text-4xl font-semibold tracking-tight text-fg"
            >
              {formatCurrency(toSoles(kpis.averageTicketCents))}
            </span>
            <DeltaChip
              delta={deltaOf(
                toSoles(kpis.averageTicketCents),
                toSoles(before.averageTicketCents),
              )}
              format={(n) => formatCurrency(n)}
            />
          </p>
          <p className="mt-2 text-sm text-fg-muted">
            CSAT medio del periodo: {kpis.csat} / 5.
          </p>
        </ChartCard>
      </div>

      <p className="flex items-start gap-2 rounded-panel border border-border bg-surface-raised px-5 py-4 text-sm leading-relaxed text-fg-muted">
        <ArrowRight aria-hidden className="mt-0.5 size-4 shrink-0 text-brand-600" />
        Estas cifras salen de un histórico de ejemplo determinista. En la Fase 15 las produce una
        sola función SQL de agregación con RLS aplicada, de modo que un cliente corporativo no
        pueda ver la agregación de otro ni abriendo las herramientas del navegador.
      </p>
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  delta,
  format,
}: {
  readonly label: string;
  readonly value: string;
  readonly hint?: string;
  readonly delta: ReturnType<typeof deltaOf>;
  readonly format: (n: number) => string;
}) {
  return (
    <div className="rounded-panel border border-border bg-surface-raised p-5">
      <p className="text-xs uppercase tracking-[0.06em] text-fg-subtle">{label}</p>
      <p
        data-numeric
        className="mt-2 font-display text-3xl font-semibold tracking-tight text-fg"
      >
        {value}
      </p>
      <div className="mt-2.5">
        <DeltaChip delta={delta} format={format} />
      </div>
      {hint !== undefined && <p className="mt-2 text-xs text-fg-subtle">{hint}</p>}
    </div>
  );
}

function DeltaChip({
  delta,
  format,
  lowerIsBetter = false,
}: {
  readonly delta: ReturnType<typeof deltaOf>;
  readonly format: (n: number) => string;
  readonly lowerIsBetter?: boolean;
}) {
  if (delta.direction === 'igual') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-fg-subtle">
        <Minus aria-hidden className="size-3.5" />
        Sin cambio
      </span>
    );
  }

  const bueno = lowerIsBetter ? delta.direction === 'baja' : delta.direction === 'sube';
  const Icon = delta.direction === 'sube' ? ArrowUpRight : ArrowDownRight;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-sm font-medium',
        bueno ? 'text-ok-600' : 'text-crit-600',
      )}
    >
      <Icon aria-hidden className="size-3.5" />
      <span data-numeric>
        {delta.absolute > 0 ? '+' : ''}
        {format(delta.absolute)}
        {/*
          Sin base anterior no se escribe un porcentaje: pasar de 0 a 3 no es
          «+100 %», es que antes no había nada con qué comparar.
        */}
        {delta.percent !== null && ` · ${delta.percent > 0 ? '+' : ''}${delta.percent} %`}
      </span>
    </span>
  );
}
