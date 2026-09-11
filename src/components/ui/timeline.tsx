import { cn } from '@/lib/utils/cn';

/**
 * Línea de tiempo del vehículo.
 *
 * Es una lista ordenada de verdad (`<ol>`), no una pila de divs: el orden ES el
 * contenido, y quien la escuche debe oír «1 de 8» y no ocho párrafos sueltos.
 *
 * Lo reciente pesa más. Los eventos antiguos se atenúan en vez de desaparecer,
 * porque en una discusión con un cliente sobre por qué su máquina lleva seis
 * días en el taller, el evento de hace cinco días es justo el que hay que
 * poder señalar.
 */

export interface TimelineEvent {
  readonly id: string;
  readonly at: string;
  readonly title: string;
  readonly detail?: string;
  readonly actor?: string;
  readonly tone?: 'neutral' | 'ok' | 'warn' | 'crit' | 'wait' | 'brand';
}

export function Timeline({
  events,
  /** Cuántos eventos del final se muestran a plena intensidad. */
  highlightLast = 2,
  className,
}: {
  readonly events: readonly TimelineEvent[];
  readonly highlightLast?: number;
  readonly className?: string;
}) {
  const firstHighlighted = Math.max(0, events.length - highlightLast);

  return (
    <ol className={cn('relative', className)}>
      {events.map((event, index) => {
        const recent = index >= firstHighlighted;
        const last = index === events.length - 1;
        const tone = event.tone ?? 'neutral';

        return (
          <li key={event.id} className="relative flex gap-3 pb-5 last:pb-0">
            {/* El hilo se corta en el último punto para no dejar un rabo suelto. */}
            {!last && (
              <span
                aria-hidden
                className="absolute left-[0.3125rem] top-3 h-full w-px bg-border"
              />
            )}

            <span
              aria-hidden
              className={cn(
                'relative mt-1.5 size-2.5 shrink-0 rounded-full ring-4 ring-surface-raised',
                tone === 'neutral' && (recent ? 'bg-graphite-500' : 'bg-graphite-300'),
                tone === 'brand' && 'bg-brand-600',
                tone === 'ok' && 'bg-ok-500',
                tone === 'warn' && 'bg-warn-500',
                tone === 'crit' && 'bg-crit-500',
                tone === 'wait' && 'bg-wait-500',
              )}
            />

            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-baseline gap-x-2">
                <time
                  data-numeric
                  className={cn(
                    'font-mono text-xs',
                    recent ? 'text-fg-muted' : 'text-fg-subtle',
                  )}
                >
                  {event.at}
                </time>
                <span
                  className={cn(
                    'text-sm',
                    recent ? 'font-medium text-fg' : 'text-fg-muted',
                  )}
                >
                  {event.title}
                </span>
              </p>
              {event.detail !== undefined && (
                <p className="mt-0.5 text-sm text-fg-subtle">{event.detail}</p>
              )}
              {event.actor !== undefined && (
                <p className="mt-0.5 text-xs text-fg-subtle">{event.actor}</p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
