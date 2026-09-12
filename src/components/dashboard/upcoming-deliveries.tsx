import Link from 'next/link';
import { Plate } from '@/components/ui/plate';
import type { Delivery } from '@/features/dashboard/services/operations';
import { DEFAULT_LOCALE, DEFAULT_TIME_ZONE } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

/**
 * Lo que sale pronto.
 *
 * Tres o cuatro líneas, sin más. Es una lista de consulta —«¿qué tengo que
 * tener preparado antes de comer?»— y todo lo que se le añada la convierte en
 * otra tabla que compite con la de atención.
 *
 * El punto verde distingue lo que ya está listo de lo que todavía se está
 * trabajando. Sin esa diferencia, la lista promete cuatro entregas como si
 * las cuatro estuvieran hechas.
 */
export function UpcomingDeliveries({ deliveries }: { readonly deliveries: readonly Delivery[] }) {
  return (
    <section className="rounded-panel border border-border bg-surface">
      <header className="flex items-baseline justify-between gap-4 border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-fg">Próximas entregas</h2>
        <Link
          href="/seguimiento"
          className="shrink-0 text-xs font-medium text-fg-muted transition-colors duration-150 hover:text-brand-600"
        >
          Ver todas →
        </Link>
      </header>

      {deliveries.length === 0 ? (
        <p className="px-4 py-6 text-center text-sm text-fg-muted">
          Ninguna entrega comprometida por delante.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {deliveries.map((d) => (
            <li key={d.id}>
              <Link
                href={`/ordenes/${d.id}`}
                className="flex items-start gap-2.5 px-4 py-2.5 transition-colors duration-150 hover:bg-surface-raised"
              >
                <span
                  aria-hidden
                  className={cn(
                    'mt-1.5 size-2 shrink-0 rounded-full',
                    d.ready ? 'bg-ok-600' : 'bg-brand-600',
                  )}
                />
                {/* Dos renglones, no tres columnas: en la columna lateral
                    —unos 220 px— la placa y la hora se comían el modelo y
                    todas las filas decían «Toy…». */}
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <Plate value={d.plate} size="sm" />
                    <span data-numeric className="shrink-0 text-xs text-fg-muted">
                      {whenLabel(d.at)}
                    </span>
                  </span>
                  <span className="mt-1 block truncate text-sm text-fg">{d.vehicle}</span>
                </span>
                <span className="sr-only">
                  {d.ready ? 'Listo para entrega' : 'Todavía en el taller'}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * «Hoy 12:00», «Mañana 10:00», «Vie 15:30».
 *
 * El día se nombra en la zona del TALLER. Con el día del servidor —que corre
 * en UTC— una entrega de hoy a las siete de la tarde en Lima saldría como
 * «mañana», que es justo el error que hace que alguien no la prepare.
 */
function whenLabel(at: Date): string {
  const hour = new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    timeZone: DEFAULT_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(at);

  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone: DEFAULT_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const today = day.format(new Date());
  const target = day.format(at);
  if (target === today) return `Hoy ${hour}`;

  const tomorrow = day.format(new Date(Date.now() + 86_400_000));
  if (target === tomorrow) return `Mañana ${hour}`;

  const weekday = new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    timeZone: DEFAULT_TIME_ZONE,
    weekday: 'short',
  }).format(at);
  return `${weekday} ${hour}`;
}
