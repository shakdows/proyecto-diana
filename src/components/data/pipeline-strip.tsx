import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

/**
 * Flujo del taller.
 *
 * No es un stepper de formulario: un stepper dice «vas por el paso 3 de 7» de
 * UN trámite. Esto dice cuántos vehículos hay ATASCADOS en cada punto del
 * recorrido, que es otra pregunta —la que contesta dónde está el cuello de
 * botella hoy—.
 *
 * Por eso cada etapa lleva barra proporcional al total: doce en repuestos y
 * uno en calidad no son «dos etapas», son un problema de compras. Un contador
 * en cero se apaga en vez de desaparecer, porque su ausencia también informa.
 */

export interface PipelineStage {
  readonly key: string;
  readonly label: string;
  readonly count: number;
  readonly href: string;
  /** Marca las etapas donde el taller espera a un tercero. */
  readonly waiting?: boolean;
}

export function PipelineStrip({ stages }: { readonly stages: readonly PipelineStage[] }) {
  const max = Math.max(1, ...stages.map((s) => s.count));
  const busiest = stages.reduce((a, b) => (b.count > a.count ? b : a), stages[0] as PipelineStage);

  return (
    <section className="rounded-panel border border-border bg-surface-raised p-5">
      <header className="mb-4 flex items-baseline justify-between gap-4">
        <h2 className="font-display text-base font-semibold tracking-tight text-fg">
          Flujo del taller
        </h2>
        <p className="text-sm text-fg-muted">
          {busiest.count > 0 ? (
            <>
              Mayor acumulación en{' '}
              <span className="font-medium text-fg">{busiest.label.toLowerCase()}</span>
            </>
          ) : (
            'Sin acumulación en ninguna etapa'
          )}
        </p>
      </header>

      <ol className="flex flex-wrap items-stretch gap-y-3">
        {stages.map((stage, index) => {
          const empty = stage.count === 0;
          const hottest = stage.key === busiest.key && stage.count > 0;

          return (
            <li key={stage.key} className="flex min-w-0 flex-1 items-stretch">
              <Link
                href={stage.href}
                className={cn(
                  'group min-w-0 flex-1 rounded-control px-2 py-2',
                  'transition-colors duration-150 ease-snap hover:bg-surface-sunken',
                )}
              >
                <span
                  data-numeric
                  className={cn(
                    'block font-display text-2xl font-semibold tracking-tight',
                    empty && 'text-graphite-300',
                    !empty && hottest && 'text-brand-700',
                    !empty && !hottest && 'text-fg',
                  )}
                >
                  {stage.count}
                </span>

                <span
                  aria-hidden
                  className="mt-1.5 block h-1 w-full overflow-hidden rounded-full bg-graphite-100"
                >
                  <span
                    className={cn(
                      'block h-full rounded-full transition-[width] duration-200 ease-snap',
                      stage.waiting === true ? 'bg-wait-500' : hottest ? 'bg-brand-600' : 'bg-graphite-400',
                    )}
                    style={{ width: `${Math.round((stage.count / max) * 100)}%` }}
                  />
                </span>

                <span
                  className={cn(
                    'mt-1.5 block truncate text-xs',
                    empty ? 'text-graphite-300' : 'text-fg-muted',
                  )}
                >
                  {stage.label}
                </span>
                {stage.waiting === true && (
                  <span className="mt-0.5 block truncate text-[0.625rem] text-wait-600">
                    depende de un tercero
                  </span>
                )}
              </Link>

              {index < stages.length - 1 && (
                <ChevronRight
                  aria-hidden
                  className="mt-3 size-4 shrink-0 self-start text-graphite-200"
                />
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
