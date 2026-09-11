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
 * Control tower (§43), para pantalla grande.
 *
 * Seis columnas, no diez. Cada una carga DOS datos relacionados —equipo y
 * trabajo, cliente y cuenta, estado y técnico, estimada y prometida— en vez
 * de repartirlos en columnas sueltas. El asesor recorre la tabla de arriba
 * abajo buscando qué necesita acción hoy; diez columnas de igual peso le
 * obligan a leer en zigzag.
 *
 * La primera columna la encabeza el TRABAJO («REPOSICION MOTOR»), no el
 * número de orden: es lo que distingue dos excavadoras iguales en el patio y
 * lo que el jefe de taller busca al barrer la lista. El número de orden
 * queda debajo, que es donde se usa —para citarlo, no para reconocerlo.
 *
 * `whitespace-nowrap` en lo que no debe partirse mantiene todas las filas a
 * la misma altura, que es lo que permite barrer la columna de alerta de un
 * vistazo.
 */
export function OrderTable({
  rows,
  now,
}: {
  readonly rows: readonly BoardRow[];
  readonly now: Date;
}) {
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">
        Órdenes de servicio en curso, con estado, avance y hora estimada de entrega
      </caption>
      <thead>
        <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-subtle">
          <th scope="col" className="px-3 py-2.5 font-medium">Equipo y trabajo</th>
          <th scope="col" className="w-36 px-3 py-2.5 font-medium">Cliente</th>
          <th scope="col" className="px-3 py-2.5 font-medium">Estado</th>
          <th scope="col" className="w-56 px-3 py-2.5 font-medium">Avance</th>
          <th scope="col" className="px-3 py-2.5 text-right font-medium">Entrega</th>
          <th scope="col" className="px-3 py-2.5 font-medium">Alerta</th>
          <th scope="col" className="w-8 px-2 py-2.5"><span className="sr-only">Abrir</span></th>
        </tr>
      </thead>
      <tbody className="divide-y divide-border">
        {rows.map((row) => {
          const { order } = row;
          return (
            <tr key={order.id} className="group transition-colors hover:bg-surface-sunken">
              <td className="px-3 py-3">
                <Link
                  href={`/ordenes/${order.id}`}
                  className="flex items-center gap-2.5 rounded-control"
                >
                  <Plate value={order.plate} />
                  <span className="min-w-0">
                    <span className="block whitespace-nowrap font-medium text-fg group-hover:text-brand-700">
                      {order.serviceType}
                    </span>
                    <span className="block whitespace-nowrap text-xs text-fg-muted">
                      {order.vehicle}
                      <span data-numeric className="text-fg-subtle">
                        {' · '}
                        {formatNumber(order.horometerHours)} h
                      </span>
                    </span>
                    <span className="block font-mono text-xs text-fg-subtle">{order.code}</span>
                  </span>
                </Link>
              </td>

              <td className="px-3 py-3">
                {/* Truncado, no envuelto: una razón social larga no puede
                    estirar la fila y romper el barrido vertical. El nombre
                    completo sigue disponible al posar el cursor. */}
                <span className="block max-w-36 truncate text-fg" title={order.customer}>
                  {order.customer}
                </span>
                <span className="block max-w-36 truncate text-xs text-fg-subtle">
                  {order.corporateClient ?? 'Cliente del taller'}
                </span>
              </td>

              <td className="px-3 py-3">
                <StatusChip status={order.status} />
                <span className="mt-1 block whitespace-nowrap text-xs text-fg-subtle">
                  {order.technician ?? 'Sin técnico'}
                </span>
              </td>

              <td className="px-3 py-3">
                <ProgressBar percent={row.progressPercent} label={`Avance de ${order.code}`} />
                <span className="mt-1 block whitespace-nowrap text-xs text-fg-subtle">
                  {row.eta.indeterminate
                    ? 'Sin estimación'
                    : row.eta.overrunMinutes > 0
                      ? `Excedido en ${formatMinutes(row.eta.overrunMinutes)}`
                      : `Faltan ${formatMinutes(row.eta.remainingMinutes)}`}
                </span>
              </td>

              <td className="px-3 py-3 text-right whitespace-nowrap">
                <span data-numeric className="block font-medium text-fg">
                  {row.eta.etaAt === null ? '—' : formatDayTime(row.eta.etaAt, now)}
                </span>
                <span data-numeric className="block text-xs text-fg-subtle">
                  {row.promisedAt === null
                    ? 'sin fecha prometida'
                    : `prometida ${formatDayTime(row.promisedAt, now).replace(' · ', ' ')}`}
                </span>
              </td>

              <td className="px-3 py-3">
                <TrafficLightDot color={row.light.color} reason={row.light.reason} showLabel />
              </td>

              <td className="px-2 py-3">
                <ChevronRight
                  aria-hidden
                  className="size-4 text-graphite-200 transition-colors group-hover:text-brand-600"
                />
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
