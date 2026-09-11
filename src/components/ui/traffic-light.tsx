import type { TrafficLight } from '@/features/repairs/services/traffic-light';
import { TRAFFIC_LIGHT_LABELS } from '@/features/repairs/services/traffic-light';
import { cn } from '@/lib/utils/cn';

/**
 * El color NUNCA es el único portador de información (§16.6): cada estado
 * lleva además forma y texto, porque en un taller hay daltónicos como en
 * cualquier sitio.
 */
const STYLE: Readonly<Record<TrafficLight, { dot: string; shape: string; symbol: string }>> = {
  verde: { dot: 'bg-ok-500', shape: 'rounded-full', symbol: '●' },
  amarillo: { dot: 'bg-warn-500', shape: 'rounded-xs rotate-45', symbol: '◆' },
  rojo: { dot: 'bg-crit-500', shape: 'rounded-xs', symbol: '■' },
  gris: { dot: 'bg-wait-500', shape: 'rounded-full opacity-70', symbol: '○' },
};

export function TrafficLightDot({
  color,
  reason,
  showLabel = false,
}: {
  readonly color: TrafficLight;
  readonly reason?: string;
  readonly showLabel?: boolean;
}) {
  const style = STYLE[color];
  const label = TRAFFIC_LIGHT_LABELS[color];

  return (
    <span className="inline-flex items-center gap-2" title={reason ?? label}>
      <span
        aria-hidden
        className={cn('inline-block size-2.5 shrink-0', style.dot, style.shape)}
      />
      <span className={cn('text-xs text-fg-muted', showLabel ? '' : 'sr-only')}>
        {label}
      </span>
    </span>
  );
}
