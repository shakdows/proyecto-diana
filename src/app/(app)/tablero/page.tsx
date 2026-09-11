import type { Metadata } from 'next';
import { PageHeader } from '@/components/layout/page-header';
import { Panel } from '@/components/ui/panel';
import { ProgressBar } from '@/components/ui/progress-bar';
import { StatusChip } from '@/components/ui/status-chip';
import { TrafficLightDot } from '@/components/ui/traffic-light';
import { Plate } from '@/components/ui/plate';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/feedback/states';
import { demoBoard, type BoardRow } from '@/features/demo/board';
import { STATUS_LABELS } from '@/features/orders/services/order-status';
import { formatMinutes } from '@/features/repairs/services/time-tracking';
import { formatTime } from '@/lib/utils/format';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Tablero' };

// El avance, la ETA y el semáforo se calculan contra la hora actual. Sin esto
// Next prerenderizaría la página y el reloj quedaría congelado en el build.
export const dynamic = 'force-dynamic';

/** Tarjetas de resumen del tablero del asesor (§42). */
const BUCKETS = [
  { label: 'Recepcionados', statuses: ['RECEPCIONADO', 'CHECKLIST_COMPLETADO'] },
  { label: 'En diagnóstico', statuses: ['PENDIENTE_DIAGNOSTICO', 'EN_DIAGNOSTICO'] },
  { label: 'Esperando cliente', statuses: ['COTIZACION_ENVIADA', 'ESPERANDO_CLIENTE'] },
  { label: 'Esperando repuestos', statuses: ['ESPERANDO_REPUESTOS', 'REPUESTOS_PARCIALES'] },
  { label: 'En reparación', statuses: ['EN_REPARACION', 'REPARACION_PAUSADA'] },
  { label: 'Calidad', statuses: ['CONTROL_CALIDAD', 'OBSERVADO_CONTROL_CALIDAD'] },
  { label: 'Servicios finales', statuses: ['PENDIENTE_LAVADO', 'EN_LAVADO', 'PENDIENTE_ALINEAMIENTO', 'EN_ALINEAMIENTO'] },
  { label: 'Listos para entrega', statuses: ['LISTO_PARA_ENTREGA'] },
] as const;

function EtaCell({ row }: { readonly row: BoardRow }) {
  if (row.eta.indeterminate) {
    return <span className="text-fg-subtle">En espera</span>;
  }
  return (
    <span data-numeric>
      {row.eta.etaAt === null ? '—' : formatTime(row.eta.etaAt)}
    </span>
  );
}

export default function TableroPage() {
  // FASE 2 sustituye esto por la función SQL de agregación que devuelve todas
  // las órdenes vivas con progreso, ETA y semáforo en una sola llamada.
  const now = new Date();
  const rows = demoBoard(now);

  const counts = BUCKETS.map((bucket) => ({
    label: bucket.label,
    count: rows.filter((r) => (bucket.statuses as readonly string[]).includes(r.order.status))
      .length,
  }));

  return (
    <>
      <PageHeader
        title="Tablero de control"
        description="Todas las órdenes vivas del taller, con su avance real, la hora estimada de término y el semáforo calculado automáticamente."
        actions={<Badge tone="warn">Datos de demostración · Fase 1</Badge>}
      />

      <section aria-label="Resumen por etapa">
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-8">
          {counts.map((bucket) => (
            <li
              key={bucket.label}
              className="rounded-panel border border-border bg-surface-raised px-4 py-3 shadow-raise"
            >
              <p data-numeric className="font-display text-2xl font-semibold text-fg">
                {bucket.count}
              </p>
              <p className="mt-0.5 text-xs leading-tight text-fg-subtle">{bucket.label}</p>
            </li>
          ))}
        </ul>
      </section>

      <Panel>
        {rows.length === 0 ? (
          <EmptyState
            title="No hay órdenes abiertas"
            hint="Registra una recepción para abrir la primera orden del día."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[72rem] text-sm">
              <caption className="sr-only">
                Órdenes de servicio en curso, con estado, avance y hora estimada de entrega
              </caption>
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-fg-subtle">
                  <th scope="col" className="px-4 py-3 font-medium">Orden</th>
                  <th scope="col" className="px-4 py-3 font-medium">Placa</th>
                  <th scope="col" className="px-4 py-3 font-medium">Vehículo</th>
                  <th scope="col" className="px-4 py-3 font-medium">Cliente</th>
                  <th scope="col" className="px-4 py-3 font-medium">Técnico</th>
                  <th scope="col" className="px-4 py-3 font-medium">Estado</th>
                  <th scope="col" className="w-52 px-4 py-3 font-medium">Progreso</th>
                  <th scope="col" className="px-4 py-3 font-medium">Restante</th>
                  <th scope="col" className="px-4 py-3 font-medium">Estimada</th>
                  <th scope="col" className="px-4 py-3 font-medium">Alerta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((row) => (
                  <tr key={row.order.id} className="hover:bg-surface-sunken">
                    <td className="px-4 py-3">
                      <Link
                        href={`/ordenes/${row.order.id}`}
                        className="font-mono text-sm text-brand-700 hover:underline"
                      >
                        {row.order.code}
                      </Link>
                    </td>
                    <td className="px-4 py-3"><Plate value={row.order.plate} /></td>
                    <td className="px-4 py-3 text-fg">{row.order.vehicle}</td>
                    <td className="px-4 py-3">
                      <span className="text-fg">{row.order.customer}</span>
                      {row.order.corporateClient !== null && (
                        <span className="ml-2 text-xs text-fg-subtle">
                          {row.order.corporateClient}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-fg-muted">{row.order.technician ?? '—'}</td>
                    <td className="px-4 py-3"><StatusChip status={row.order.status} /></td>
                    <td className="px-4 py-3">
                      <ProgressBar
                        percent={row.progressPercent}
                        label={`Avance de ${row.order.code}`}
                      />
                    </td>
                    <td data-numeric className="px-4 py-3 text-fg-muted">
                      {row.eta.indeterminate ? '—' : formatMinutes(row.eta.remainingMinutes)}
                    </td>
                    <td className="px-4 py-3 text-fg-muted"><EtaCell row={row} /></td>
                    <td className="px-4 py-3">
                      <TrafficLightDot color={row.light.color} reason={row.light.reason} showLabel />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <p className="text-xs text-fg-subtle">
        El avance, la hora estimada y el semáforo no son valores escritos a mano: se calculan con
        las funciones puras del dominio a partir de las sesiones de tiempo, la cobertura de
        repuestos y los trabajos completados. Estados en espera de un tercero —
        {' '}
        {STATUS_LABELS.ESPERANDO_REPUESTOS.toLowerCase()}, {STATUS_LABELS.ESPERANDO_CLIENTE.toLowerCase()}
        {' '}— se marcan en gris, no en rojo.
      </p>
    </>
  );
}
