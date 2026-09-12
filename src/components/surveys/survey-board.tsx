import Link from 'next/link';
import { MessageSquare, Phone, Star, TrendingUp } from 'lucide-react';
import type { ReactNode } from 'react';
import { EmptyState } from '@/components/feedback/states';
import { CSAT_QUESTIONS, bucketOf } from '@/features/delivery/services/survey';
import {
  bucketCounts,
  byAspect,
  isAnswered,
  pendingFollowUps,
  summarize,
  type SurveyResponse,
} from '@/features/surveys/services/board';
import { cn } from '@/lib/utils/cn';

const ASPECT_LABELS: Readonly<Record<string, string>> = Object.fromEntries(
  CSAT_QUESTIONS.map((q) => [q.id, q.label]),
);

/**
 * Panel de encuestas.
 *
 * Un panel de satisfacción que solo enseña un número grande es un adorno. La
 * cifra dice si el taller va bien; lo que justifica abrir esta pantalla es
 * saber **a quién hay que llamar hoy**, y por eso esa lista va antes que
 * cualquier gráfico.
 *
 * Después, el desglose por aspecto: «CSAT 3,1» no se puede arreglar; «el plazo
 * de entrega es lo peor valorado» sí.
 */
export function SurveyBoard({ responses }: { readonly responses: readonly SurveyResponse[] }) {
  const resumen = summarize(responses);
  const porLlamar = pendingFollowUps(responses);
  const aspectos = byAspect(responses);
  const reparto = bucketCounts(responses);
  const contestadas = responses.filter(isAnswered);

  return (
    <>
      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-fg lg:text-[1.75rem]">
          Encuestas
        </h1>
        <p className="mt-1 text-sm text-fg-muted">
          Lo que dijeron los clientes después de recoger su vehículo, en los últimos 30 días.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          icon={<TrendingUp />}
          tone={resumen.nps.score >= 50 ? 'ok' : resumen.nps.score >= 0 ? 'warn' : 'crit'}
          value={resumen.nps.responses === 0 ? '—' : String(resumen.nps.score)}
          label="NPS"
          hint={
            resumen.nps.responses === 0
              ? 'nadie ha contestado'
              : `${String(resumen.nps.promoters)} promotores · ${String(resumen.nps.detractors)} detractores`
          }
        />
        <Metric
          icon={<Star />}
          tone={resumen.csat === null ? 'wait' : resumen.csat >= 4 ? 'ok' : 'warn'}
          value={resumen.csat === null ? '—' : resumen.csat.toFixed(1)}
          label="Satisfacción media"
          hint="sobre 5, promediando por cliente"
        />
        <Metric
          icon={<MessageSquare />}
          tone="brand"
          value={resumen.responseRate === null ? '—' : `${String(resumen.responseRate)}%`}
          label="Tasa de respuesta"
          hint={`${String(resumen.answered)} de ${String(resumen.sent)} enviadas`}
        />
        <Metric
          icon={<Phone />}
          tone={porLlamar.length === 0 ? 'ok' : 'crit'}
          value={String(porLlamar.length)}
          label="Por llamar"
          hint={porLlamar.length === 0 ? 'nadie esperando' : 'sin contactar todavía'}
        />
      </div>

      {/* Primero la acción. El gráfico puede esperar. */}
      <section>
        <h2 className="font-display text-lg font-semibold tracking-tight text-fg">
          Necesitan una llamada
        </h2>
        {porLlamar.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              title="Nadie espera una llamada"
              hint="Aparecerán aquí los detractores y quienes hundieron algún aspecto."
            />
          </div>
        ) : (
          <ul className="mt-3 grid gap-2">
            {porLlamar.slice(0, 6).map((r) => (
              <li key={r.id}>
                <FollowUpRow response={r} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="font-display text-lg font-semibold tracking-tight text-fg">
            Qué valoran peor
          </h2>
          {aspectos.length === 0 ? (
            <div className="mt-3">
              <EmptyState title="Sin respuestas todavía" hint="" />
            </div>
          ) : (
            <ul className="mt-3 space-y-3 rounded-panel border border-border bg-surface-raised p-5">
              {aspectos.map((a) => (
                <li key={a.id}>
                  <p className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-fg">{ASPECT_LABELS[a.id] ?? a.id}</span>
                    <span data-numeric className="shrink-0 font-semibold text-fg">
                      {a.average.toFixed(1)}
                    </span>
                  </p>
                  <span
                    aria-hidden
                    className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-surface-sunken"
                  >
                    <span
                      className={cn(
                        'block h-full rounded-full',
                        a.average >= 4 ? 'bg-ok-500' : a.average >= 3 ? 'bg-warn-500' : 'bg-crit-500',
                      )}
                      style={{ width: `${String(Math.round((a.average / 5) * 100))}%` }}
                    />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section>
          <h2 className="font-display text-lg font-semibold tracking-tight text-fg">
            Reparto de clientes
          </h2>
          <div className="mt-3 rounded-panel border border-border bg-surface-raised p-5">
            {contestadas.length === 0 ? (
              <p className="text-sm text-fg-muted">Todavía no ha contestado nadie.</p>
            ) : (
              <>
                <span aria-hidden className="flex h-3 overflow-hidden rounded-full">
                  <Segment count={reparto.promotor} total={contestadas.length} className="bg-ok-500" />
                  <Segment count={reparto.pasivo} total={contestadas.length} className="bg-wait-500" />
                  <Segment count={reparto.detractor} total={contestadas.length} className="bg-crit-500" />
                </span>

                <dl className="mt-4 grid grid-cols-3 gap-3 text-center">
                  <Bucket label="Promotores" count={reparto.promotor} dot="bg-ok-500" hint="9–10" />
                  <Bucket label="Pasivos" count={reparto.pasivo} dot="bg-wait-500" hint="7–8" />
                  <Bucket label="Detractores" count={reparto.detractor} dot="bg-crit-500" hint="0–6" />
                </dl>

                <p className="mt-4 border-t border-border pt-3 text-xs leading-relaxed text-fg-subtle">
                  El NPS resta detractores a promotores: los pasivos no suman. Por eso subir de
                  8 a 9 vale más que subir de 5 a 6.
                </p>
              </>
            )}
          </div>
        </section>
      </div>

      <section>
        <h2 className="font-display text-lg font-semibold tracking-tight text-fg">
          Últimos comentarios
        </h2>
        <ul className="mt-3 grid gap-2">
          {contestadas
            .filter((r) => r.comment !== '')
            .slice(0, 5)
            .map((r) => (
              <li
                key={r.id}
                className="rounded-panel border border-border bg-surface-raised px-4 py-3"
              >
                <p className="flex flex-wrap items-center gap-x-2 text-xs text-fg-muted">
                  <span className="font-mono font-bold tracking-[0.06em] text-fg">
                    {r.plate.replace(/^(.{3})(.*)$/u, '$1-$2')}
                  </span>
                  <span className="truncate">{r.customer}</span>
                  <NpsChip score={r.npsScore} />
                  <span className="ml-auto shrink-0" data-numeric>
                    {r.answeredDaysAgo === 0 ? 'hoy' : `hace ${String(r.answeredDaysAgo ?? 0)} d`}
                  </span>
                </p>
                <p className="mt-1 text-sm leading-relaxed text-fg">«{r.comment}»</p>
              </li>
            ))}
        </ul>
      </section>
    </>
  );
}

function Segment({
  count,
  total,
  className,
}: {
  readonly count: number;
  readonly total: number;
  readonly className: string;
}) {
  if (count === 0) return null;
  return <span className={className} style={{ width: `${String((count / total) * 100)}%` }} />;
}

function Bucket({
  label,
  count,
  dot,
  hint,
}: {
  readonly label: string;
  readonly count: number;
  readonly dot: string;
  readonly hint: string;
}) {
  return (
    <div>
      <dt className="flex items-center justify-center gap-1.5 text-xs text-fg-muted">
        <span aria-hidden className={cn('size-2 rounded-full', dot)} />
        {label}
      </dt>
      <dd data-numeric className="mt-1 font-display text-xl font-semibold text-fg">
        {count}
      </dd>
      <dd data-numeric className="text-[0.6875rem] text-fg-subtle">
        {hint}
      </dd>
    </div>
  );
}

function NpsChip({ score }: { readonly score: number | null }) {
  if (score === null) return null;
  const bucket = bucketOf(score);
  return (
    <span
      data-numeric
      className={cn(
        'shrink-0 rounded-chip px-1.5 py-0.5 text-[0.6875rem] font-semibold',
        bucket === 'promotor' && 'bg-ok-100 text-ok-700',
        bucket === 'pasivo' && 'bg-wait-100 text-wait-700',
        bucket === 'detractor' && 'bg-crit-100 text-crit-700',
      )}
    >
      {score}/10
    </span>
  );
}

function FollowUpRow({ response }: { readonly response: SurveyResponse }) {
  const peor = Object.entries(response.answers)
    .filter(([, v]) => v > 0)
    .sort((a, b) => a[1] - b[1])[0];

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-panel border border-border border-l-4 border-l-crit-500 bg-surface-raised px-4 py-3">
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-mono text-xs font-bold tracking-[0.06em] text-fg">
            {response.plate.replace(/^(.{3})(.*)$/u, '$1-$2')}
          </span>
          <span className="truncate text-sm font-semibold text-fg">{response.customer}</span>
          <NpsChip score={response.npsScore} />
        </span>
        <span className="mt-0.5 block truncate text-xs text-fg-muted">
          {response.comment !== ''
            ? `«${response.comment}»`
            : peor !== undefined
              ? `Lo peor valorado: ${ASPECT_LABELS[peor[0]] ?? peor[0]} (${String(peor[1])}/5)`
              : 'Sin comentario'}
        </span>
      </span>

      <span className="shrink-0 text-xs text-fg-subtle" data-numeric>
        {response.answeredDaysAgo === 0 ? 'hoy' : `hace ${String(response.answeredDaysAgo ?? 0)} d`}
      </span>

      <Link
        href="/clientes"
        className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-control border border-border px-3 text-xs font-medium text-fg transition-colors duration-150 hover:bg-surface-sunken"
      >
        <Phone aria-hidden className="size-3.5" />
        Contactar
      </Link>
    </div>
  );
}

function Metric({
  icon,
  tone,
  value,
  label,
  hint,
}: {
  readonly icon: ReactNode;
  readonly tone: 'ok' | 'warn' | 'crit' | 'brand' | 'wait';
  readonly value: string;
  readonly label: string;
  readonly hint: string;
}) {
  const TILE = {
    ok: 'bg-ok-100 text-ok-700',
    warn: 'bg-warn-100 text-warn-700',
    crit: 'bg-crit-100 text-crit-700',
    brand: 'bg-brand-100 text-brand-700',
    wait: 'bg-wait-100 text-wait-700',
  } as const;

  return (
    <div className="flex items-center gap-4 rounded-panel border border-border bg-surface-raised p-5">
      <span
        aria-hidden
        className={cn(
          'grid size-12 shrink-0 place-items-center rounded-[0.875rem] [&>svg]:size-5',
          TILE[tone],
        )}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span
          data-numeric
          className="block font-display text-[1.75rem] font-semibold leading-none tracking-tight text-fg"
        >
          {value}
        </span>
        <span className="mt-1 block truncate text-sm text-fg-muted">{label}</span>
        <span className="mt-0.5 block truncate text-xs text-fg-subtle">{hint}</span>
      </span>
    </div>
  );
}
