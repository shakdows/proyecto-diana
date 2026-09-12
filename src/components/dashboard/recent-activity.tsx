import Link from 'next/link';
import type { ActivityEntry } from '@/features/demo/board';
import { formatMinutes } from '@/features/repairs/services/time-tracking';
import { cn } from '@/lib/utils/cn';

/**
 * Lo último que ha pasado en el taller.
 *
 * Cierra la pantalla en vez de abrirla: es contexto, no una tarea. Va al final
 * y ocupa poco a propósito —cinco líneas—, porque un registro de actividad
 * largo se convierte en algo que nadie lee y que además empuja hacia abajo lo
 * que sí hay que mirar.
 *
 * En producción sale de `order_events`, que escribe un disparador de la base:
 * está completa por construcción, no porque la aplicación se acuerde de
 * anotar cada cosa.
 */
export function RecentActivity({ entries }: { readonly entries: readonly ActivityEntry[] }) {
  if (entries.length === 0) return null;

  const DOT = {
    neutral: 'bg-wait-500',
    ok: 'bg-ok-500',
    warn: 'bg-warn-500',
    brand: 'bg-brand-600',
  } as const;

  return (
    <section>
      <h2 className="pb-3 font-display text-base font-semibold tracking-tight text-fg">
        Actividad reciente
      </h2>

      <ul className="divide-y divide-border overflow-hidden rounded-panel border border-border bg-surface-raised">
        {entries.slice(0, 5).map((entry) => (
          <li key={entry.id}>
            <Link
              href={`/ordenes/${entry.orderId}`}
              className="flex items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-surface-sunken"
            >
              <span
                aria-hidden
                className={cn('size-2 shrink-0 rounded-full', DOT[entry.tone])}
              />
              <span className="min-w-0 flex-1">
                {/* Dos líneas en vez de recorte: en la columna lateral la
                    mitad de los textos se quedaban en «Reparación reanudada
                    tr…», que no dice nada. */}
                <span className="line-clamp-2 block text-sm leading-snug text-fg">
                  {entry.text}
                </span>
                <span className="block truncate text-xs text-fg-subtle">
                  <span data-numeric>{entry.orderCode}</span> · {entry.actor}
                </span>
              </span>
              <span
                data-numeric
                className="shrink-0 text-xs text-fg-subtle"
                /* Cuánto hace, no a qué hora: «hace 12 min» se entiende sin
                   mirar el reloj de la pared ni pensar en husos horarios. */
              >
                hace {formatMinutes(entry.minutesAgo)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
