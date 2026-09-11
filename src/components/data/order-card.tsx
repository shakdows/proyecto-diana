import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { Plate } from '@/components/ui/plate';
import { ProgressBar } from '@/components/ui/progress-bar';
import { StatusChip } from '@/components/ui/status-chip';
import { TrafficLightDot } from '@/components/ui/traffic-light';
import type { BoardRow } from '@/features/demo/board';
import { formatMinutes } from '@/features/repairs/services/time-tracking';
import { formatDayTime, formatNumber } from '@/lib/utils/format';

/**
 * Una orden como tarjeta, para tablet y móvil.
 *
 * §56 pone al asesor en una tablet de 768 px y al técnico en tablet o móvil.
 * Una tabla de diez columnas ahí obliga a arrastrar de lado para leer una
 * sola fila, que es justo lo que no puede hacer alguien de pie en el taller
 * con el cliente delante. La tarjeta entra entera en pantalla y se toca
 * completa.
 */
export function OrderCard({ row, now }: { readonly row: BoardRow; readonly now: Date }) {
  const { order } = row;

  return (
    <Link
      href={`/ordenes/${order.id}`}
      className="block border-b border-border p-4 transition-colors last:border-b-0 hover:bg-surface-sunken active:bg-surface-sunken"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Plate value={order.plate} />
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-fg">{order.serviceType}</p>
            <p className="truncate text-xs text-fg-muted">
              {order.vehicle}
              <span data-numeric className="text-fg-subtle">
                {' · '}
                {formatNumber(order.horometerHours)} h
              </span>
            </p>
            <p className="font-mono text-xs text-fg-subtle">{order.code}</p>
          </div>
        </div>
        <ChevronRight aria-hidden className="mt-1 size-4 shrink-0 text-graphite-300" />
      </div>

      <p className="mt-2 truncate text-sm text-fg-muted">
        {order.customer}
        {order.corporateClient !== null && (
          <span className="ml-2 text-xs text-fg-subtle">{order.corporateClient}</span>
        )}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
        <StatusChip status={order.status} />
        <TrafficLightDot color={row.light.color} reason={row.light.reason} showLabel />
        {order.technician !== null && (
          <span className="text-xs text-fg-subtle">{order.technician}</span>
        )}
      </div>

      <div className="mt-3">
        <ProgressBar percent={row.progressPercent} label={`Avance de ${order.code}`} />
      </div>

      <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs">
        <div className="flex gap-1.5 whitespace-nowrap">
          <dt className="text-fg-subtle">
            {row.eta.overrunMinutes > 0 ? 'Excedido' : 'Restante'}
          </dt>
          <dd data-numeric className="font-medium text-fg">
            {row.eta.indeterminate
              ? '—'
              : formatMinutes(
                  row.eta.overrunMinutes > 0 ? row.eta.overrunMinutes : row.eta.remainingMinutes,
                )}
          </dd>
        </div>
        <div className="flex gap-1.5 whitespace-nowrap">
          <dt className="text-fg-subtle">Entrega</dt>
          <dd data-numeric className="font-medium text-fg">
            {row.eta.etaAt === null ? '—' : formatDayTime(row.eta.etaAt, now)}
          </dd>
        </div>
        {row.promisedAt !== null && (
          <div className="flex gap-1.5 whitespace-nowrap">
            <dt className="text-fg-subtle">Prometida</dt>
            <dd data-numeric className="font-medium text-fg">
              {formatDayTime(row.promisedAt, now)}
            </dd>
          </div>
        )}
      </dl>
    </Link>
  );
}
