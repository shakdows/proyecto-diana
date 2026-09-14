'use client';

import Link from 'next/link';
import { FileCheck2 } from 'lucide-react';
import { DataState } from '@/components/feedback/states';
import { Plate } from '@/components/ui/plate';
import { ProgressBar } from '@/components/ui/progress-bar';
import { TrafficLightDot } from '@/components/ui/traffic-light';
import { LiveOrderStatusChip } from '@/components/order/live-status-chip';
import type { BoardRow } from '@/features/demo/board';
import { useReceptionOrders } from '@/features/orders/use-reception-orders';
import { SIN_DEFINIR } from '@/features/orders/services/from-reception';
import { useHydrated } from '@/lib/demo/store';
import { formatDateTime } from '@/lib/utils/format';

/**
 * La lista de órdenes, con las que abrió la recepción.
 *
 * ── Lo que faltaba ─────────────────────────────────────────────────────────
 *
 * Cerrar una recepción emite el código de una orden —`OT-2026-0001`— y esa
 * orden no aparecía aquí: esta lista solo leía los datos sembrados. Quien
 * recibía un vehículo, lo revisaba entero, lo fotografiaba y lo hacía firmar
 * no volvía a ver ese vehículo NUNCA. El recorrido se cortaba exactamente
 * donde empieza el trabajo.
 *
 * Las recibidas van ARRIBA y marcadas: son las que alguien acaba de meter en
 * el taller y las que hay que mover, no las nueve de la demostración.
 */
export function OrdersList({ seeded }: { readonly seeded: readonly BoardRow[] }) {
  const recibidas = useReceptionOrders();
  const hydrated = useHydrated();

  /*
   * Durante el renderizado en servidor no hay `localStorage`: se pinta lo
   * sembrado, que es exactamente lo que ya se pintaba. Sin esto habría
   * discrepancia de hidratación.
   */
  const filas = hydrated
    ? [...recibidas.map((r) => ({ row: r.row, acta: r.acta.code })), ...seeded.map((row) => ({ row, acta: null }))]
    : seeded.map((row) => ({ row, acta: null }));

  return (
    <>
      <p className="px-5 pb-4 pt-1 text-sm text-fg-muted">
        {filas.length} {filas.length === 1 ? 'orden abierta' : 'órdenes abiertas'}
        {hydrated && recibidas.length > 0 && (
          <span className="text-fg-subtle">
            {' '}
            · {recibidas.length} {recibidas.length === 1 ? 'recibida' : 'recibidas'} en este
            dispositivo
          </span>
        )}
      </p>

      <DataState<{ row: BoardRow; acta: string | null }>
        data={filas}
        empty={{
          title: 'No hay órdenes',
          hint: 'Registra una recepción para abrir la primera.',
        }}
      >
        {(list) => (
          <ul className="divide-y divide-border">
            {list.map(({ row, acta }) => (
              <li key={row.order.id}>
                <Link
                  href={`/ordenes/${row.order.id}`}
                  className="flex flex-col gap-3 px-5 py-4 hover:bg-surface-sunken sm:flex-row sm:items-center sm:gap-6"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                    <Plate value={row.order.plate} />
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 truncate font-mono text-sm text-brand-700">
                        {row.order.code}
                        {acta !== null && (
                          <span className="inline-flex shrink-0 items-center gap-1 rounded-chip bg-brand-600/10 px-2 py-0.5 font-sans text-[0.6875rem] font-semibold text-brand-700">
                            <FileCheck2 aria-hidden className="size-3" />
                            Recibida
                          </span>
                        )}
                      </p>
                      <p className="truncate text-sm text-fg-muted">
                        {row.order.vehicle} · {row.order.customer}
                      </p>
                      {row.order.serviceType === SIN_DEFINIR && (
                        <p className="truncate text-xs text-warn-700">
                          Falta definir el tipo de servicio
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <LiveOrderStatusChip orderId={row.order.id} status={row.order.status} />
                    <TrafficLightDot color={row.light.color} reason={row.light.reason} />
                  </div>

                  <div className="w-full sm:w-56">
                    <ProgressBar
                      percent={row.progressPercent}
                      label={`Avance de ${row.order.code}`}
                    />
                    <p className="mt-1 text-xs text-fg-subtle">
                      Abierta el {formatDateTime(row.openedAt)}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </DataState>
    </>
  );
}
