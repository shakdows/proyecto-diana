import type { TrafficLight } from '@/features/repairs/services/traffic-light';
import { TRAFFIC_LIGHT_LABELS } from '@/features/repairs/services/traffic-light';
import { cn } from '@/lib/utils/cn';

/**
 * El color NUNCA es el único portador de información (§16.6): cada estado
 * lleva además forma y texto, porque en un taller hay daltónicos como en
 * cualquier sitio.
 *
 * La etiqueta corta existe para la tabla: «En espera de un tercero» partía la
 * columna en dos líneas y desalineaba las filas. El motivo completo sigue
 * disponible en el `title`.
 */
const STYLE: Readonly<
  Record<TrafficLight, { dot: string; shape: string; text: string; short: string }>
> = {
  verde: { dot: 'bg-ok-500', shape: 'rounded-full', text: 'text-ok-700', short: 'A tiempo' },
  amarillo: { dot: 'bg-warn-500', shape: 'rounded-xs rotate-45', text: 'text-warn-700', short: 'Riesgo' },
  rojo: { dot: 'bg-crit-500', shape: 'rounded-xs', text: 'text-crit-700', short: 'Retrasada' },
  gris: { dot: 'bg-wait-500', shape: 'rounded-full opacity-70', text: 'text-wait-700', short: 'En espera' },
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

  return (
    <span
      className="inline-flex items-center gap-2 whitespace-nowrap"
      title={reason ?? TRAFFIC_LIGHT_LABELS[color]}
    >
      <span
        aria-hidden
        className={cn('inline-block size-2.5 shrink-0', style.dot, style.shape)}
      />
      <span className={cn('text-xs font-medium', style.text, showLabel ? '' : 'sr-only')}>
        {style.short}
      </span>
      <span className="sr-only">{TRAFFIC_LIGHT_LABELS[color]}</span>
    </span>
  );
}
