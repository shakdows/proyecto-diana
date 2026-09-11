import { displayPlate } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

/**
 * Código de equipo (o placa, en unidades matriculadas).
 *
 * Monoespaciada a propósito: es un código de ancho fijo y se lee y se compara
 * mejor alineado (§16.2).
 */
export function Plate({
  value,
  className,
}: {
  readonly value: string;
  readonly className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-chip border border-border-strong',
        'whitespace-nowrap bg-surface px-2 py-0.5 font-mono text-sm font-semibold tracking-wider text-fg',
        className,
      )}
    >
      {displayPlate(value)}
    </span>
  );
}

/** Código de orden, cotización u OC. Mismo criterio que la placa. */
export function Code({
  value,
  className,
}: {
  readonly value: string;
  readonly className?: string;
}) {
  return (
    <span className={cn('font-mono text-sm tracking-tight text-fg-muted', className)}>
      {value}
    </span>
  );
}
