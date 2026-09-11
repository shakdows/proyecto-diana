import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

/**
 * Indicador con comparación.
 *
 * La regla que evita el muro de doce cajas iguales (§16): un tablero tiene UN
 * indicador principal y varios secundarios. Si todos pesan lo mismo, el ojo no
 * tiene por dónde empezar y la pantalla deja de informar.
 *
 * La flecha NUNCA decide sola si algo va bien. «Esperando repuestos +3» sube y
 * es malo; «listos para entrega +3» sube y es bueno. Por eso el sentido va
 * aparte, en `intent`, y quien escribe la pantalla lo declara.
 */

export type DeltaIntent = 'good' | 'bad' | 'neutral';

export function MetricDelta({
  value,
  intent = 'neutral',
  suffix,
  className,
}: {
  readonly value: number;
  readonly intent?: DeltaIntent;
  readonly suffix?: string;
  readonly className?: string;
}) {
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : ArrowRight;
  const sign = value > 0 ? '+' : '';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 text-xs font-medium',
        intent === 'good' && 'text-ok-600',
        intent === 'bad' && 'text-crit-600',
        intent === 'neutral' && 'text-fg-subtle',
        className,
      )}
    >
      <Icon aria-hidden className="size-3.5" />
      <span data-numeric>
        {sign}
        {value}
      </span>
      {suffix !== undefined && <span className="ml-0.5 font-normal">{suffix}</span>}
    </span>
  );
}

export function KpiCard({
  label,
  value,
  unit,
  icon,
  delta,
  footnote,
  tone = 'neutral',
  emphasis = 'secondary',
  className,
}: {
  readonly label: string;
  readonly value: string | number;
  readonly unit?: string;
  readonly icon?: ReactNode;
  readonly delta?: ReactNode;
  readonly footnote?: string;
  readonly tone?: 'neutral' | 'ok' | 'warn' | 'crit' | 'wait';
  readonly emphasis?: 'primary' | 'secondary';
  readonly className?: string;
}) {
  const primary = emphasis === 'primary';

  return (
    <article
      className={cn(
        'flex flex-col justify-between rounded-panel border border-border bg-surface-raised',
        'transition-shadow duration-150 ease-snap hover:shadow-panel',
        primary ? 'gap-5 p-6' : 'gap-3 p-5',
        className,
      )}
    >
      <header className="flex items-start justify-between gap-3">
        <h3
          className={cn(
            'font-medium text-fg-muted',
            primary ? 'text-sm' : 'text-xs uppercase tracking-[0.08em]',
          )}
        >
          {label}
        </h3>
        {icon !== undefined && (
          <span
            aria-hidden
            className={cn(
              'grid size-8 shrink-0 place-items-center rounded-control [&>svg]:size-4',
              tone === 'neutral' && 'bg-graphite-100 text-graphite-600',
              tone === 'ok' && 'bg-ok-100 text-ok-700',
              tone === 'warn' && 'bg-warn-100 text-warn-700',
              tone === 'crit' && 'bg-crit-100 text-crit-700',
              tone === 'wait' && 'bg-wait-100 text-wait-700',
            )}
          >
            {icon}
          </span>
        )}
      </header>

      <div>
        <p className="flex items-baseline gap-1.5">
          <span
            data-numeric
            className={cn(
              'font-display font-semibold tracking-tight text-fg',
              primary ? 'text-5xl' : 'text-3xl',
            )}
          >
            {value}
          </span>
          {unit !== undefined && (
            <span className="text-sm font-medium text-fg-subtle">{unit}</span>
          )}
        </p>

        {(delta !== undefined || footnote !== undefined) && (
          <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
            {delta}
            {footnote !== undefined && (
              <span className="text-xs text-fg-subtle">{footnote}</span>
            )}
          </p>
        )}
      </div>
    </article>
  );
}
