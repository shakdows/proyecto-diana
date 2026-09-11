import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/page-header';
import { Panel, PanelHeader } from '@/components/ui/panel';
import { Plate } from '@/components/ui/plate';
import { ProgressBar } from '@/components/ui/progress-bar';
import { StatusChip } from '@/components/ui/status-chip';
import { TrafficLightDot } from '@/components/ui/traffic-light';
import { DataState } from '@/components/feedback/states';
import { demoBoard, type BoardRow } from '@/features/demo/board';
import { formatDateTime } from '@/lib/utils/format';

export const metadata: Metadata = { title: 'Órdenes de servicio' };

// Misma razón que en el tablero: los tiempos se calculan contra `now`.
export const dynamic = 'force-dynamic';

export default function OrdenesPage() {
  const rows = demoBoard(new Date());

  return (
    <>
      <PageHeader
        title="Órdenes de servicio"
        description="Todo el recorrido del equipo queda registrado en una única orden."
      />

      <Panel>
        <PanelHeader
          title={`${rows.length} órdenes abiertas`}
          description="Los filtros de §58 y la búsqueda universal llegan en la Fase 4."
        />
        <DataState<BoardRow>
          data={rows}
          empty={{
            title: 'No hay órdenes',
            hint: 'Registra una recepción para abrir la primera.',
          }}
        >
          {(list) => (
            <ul className="divide-y divide-border">
              {list.map((row) => (
                <li key={row.order.id}>
                  <Link
                    href={`/ordenes/${row.order.id}`}
                    className="flex flex-col gap-3 px-5 py-4 hover:bg-surface-sunken sm:flex-row sm:items-center sm:gap-6"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <Plate value={row.order.plate} />
                      <div className="min-w-0">
                        <p className="truncate font-mono text-sm text-brand-700">
                          {row.order.code}
                        </p>
                        <p className="truncate text-sm text-fg-muted">
                          {row.order.vehicle} · {row.order.customer}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <StatusChip status={row.order.status} />
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
      </Panel>
    </>
  );
}
