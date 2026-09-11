import { cn } from '@/lib/utils/cn';

/**
 * Barra de avance de la orden.
 *
 * El valor viene SIEMPRE de `computeProgress`, nunca de un campo manual (§33).
 */
export function ProgressBar({
  percent,
  label,
  className,
}: {
  readonly percent: number;
  readonly label?: string;
  readonly className?: string;
}) {
  const value = Math.min(100, Math.max(0, percent));

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div
        role="progressbar"
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? 'Avance de la orden'}
        className="h-1.5 w-full overflow-hidden rounded-full bg-graphite-100"
      >
        <div
          className="h-full rounded-full bg-brand-600 transition-[width] duration-500"
          style={{ width: `${value}%` }}
        />
      </div>
      <span data-numeric className="w-11 shrink-0 text-right text-xs font-medium text-fg-muted">
        {Math.round(value)} %
      </span>
    </div>
  );
}
