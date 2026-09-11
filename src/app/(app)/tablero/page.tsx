import type { Metadata } from 'next';
import { PageHeader } from '@/components/layout/page-header';
import { Panel } from '@/components/ui/panel';
import { EmptyState } from '@/components/feedback/states';
import { OrderCard } from '@/components/data/order-card';
import { OrderTable } from '@/components/data/order-table';
import { PipelineStrip, type PipelineStage } from '@/components/data/pipeline-strip';
import { demoBoard } from '@/features/demo/board';
import type { OrderStatus } from '@/features/orders/services/order-status';
import { formatTime } from '@/lib/utils/format';

export const metadata: Metadata = { title: 'Tablero' };

// El avance, la ETA y el semáforo se calculan contra la hora actual. Sin esto
// Next prerenderizaría la página y el reloj quedaría congelado en el build.
export const dynamic = 'force-dynamic';

/**
 * Etapas del tablero del asesor (§42), EN EL ORDEN DEL RECORRIDO.
 *
 * `waiting` marca dónde se espera a un tercero y no al taller: es la
 * distinción que convierte el tablero en una lista de tareas en vez de en un
 * inventario de estados.
 */
const STAGES: readonly { label: string; statuses: readonly OrderStatus[]; waiting?: boolean }[] = [
  { label: 'Recepcionados', statuses: ['RECEPCIONADO', 'CHECKLIST_COMPLETADO'] },
  { label: 'En diagnóstico', statuses: ['PENDIENTE_DIAGNOSTICO', 'EN_DIAGNOSTICO'] },
  { label: 'Esperando cliente', statuses: ['COTIZACION_ENVIADA', 'ESPERANDO_CLIENTE'], waiting: true },
  {
    label: 'Esperando repuestos',
    statuses: [
      'SOLICITUD_REPUESTOS', 'REPUESTOS_EN_COTIZACION', 'COMPRA_PENDIENTE_AUTORIZACION',
      'COMPRA_AUTORIZADA', 'ORDEN_COMPRA_GENERADA', 'ESPERANDO_REPUESTOS', 'REPUESTOS_PARCIALES',
    ],
    waiting: true,
  },
  { label: 'En reparación', statuses: ['LISTO_PARA_REPARACION', 'EN_REPARACION', 'REPARACION_PAUSADA'] },
  { label: 'Control de calidad', statuses: ['REPARACION_TERMINADA', 'CONTROL_CALIDAD', 'OBSERVADO_CONTROL_CALIDAD'] },
  { label: 'Servicios finales', statuses: ['CONTROL_CALIDAD_APROBADO', 'PENDIENTE_LAVADO', 'EN_LAVADO', 'PENDIENTE_ALINEAMIENTO', 'EN_ALINEAMIENTO'] },
  { label: 'Listos para entrega', statuses: ['LISTO_PARA_ENTREGA'] },
];

export default function TableroPage() {
  // FASE 2 sustituye esto por la función SQL de agregación que devuelve todas
  // las órdenes vivas con progreso, ETA y semáforo en una sola llamada.
  const now = new Date();
  const rows = demoBoard(now);

  const stages: readonly PipelineStage[] = STAGES.map((stage) => {
    const count = rows.filter((r) => stage.statuses.includes(r.order.status)).length;
    return stage.waiting === true
      ? { label: stage.label, count, waiting: true }
      : { label: stage.label, count };
  });

  const attention = rows.filter((r) => r.light.color === 'rojo' || r.light.color === 'amarillo');

  return (
    <>
      <PageHeader
        title="Tablero de control"
        description={
          rows.length === 0
            ? 'Sin órdenes abiertas.'
            : `${rows.length} órdenes en el taller · ${attention.length} requieren atención · actualizado a las ${formatTime(now)}`
        }
      />

      <PipelineStrip stages={stages} />

      <Panel className="overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState
            title="No hay órdenes abiertas"
            hint="Registra una recepción para abrir la primera orden del día."
          />
        ) : (
          <>
            {/* Tabla en escritorio; tarjetas en tablet y móvil, que es donde
                trabajan el asesor y el técnico (§56). */}
            <div className="hidden lg:block">
              <OrderTable rows={rows} />
            </div>
            <div className="lg:hidden">
              {rows.map((row) => (
                <OrderCard key={row.order.id} row={row} />
              ))}
            </div>
          </>
        )}
      </Panel>

      <p className="text-xs leading-relaxed text-fg-subtle">
        El avance, la hora estimada y el semáforo no son valores escritos a mano: se calculan con
        las funciones puras del dominio a partir de las sesiones de tiempo, la cobertura de
        repuestos y los trabajos completados. Las órdenes que esperan al cliente o a un proveedor
        se marcan <span className="font-medium text-wait-700">en espera</span>, no en rojo: no es
        lo mismo una orden que el taller gestiona mal que una parada por un tercero.
      </p>
    </>
  );
}
