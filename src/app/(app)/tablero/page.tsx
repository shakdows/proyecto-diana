import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  CircleCheckBig,
  ClipboardList,
  Search,
  TriangleAlert,
  Wrench,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { KpiCard, MetricDelta } from '@/components/ui/kpi-card';
import { Plate } from '@/components/ui/plate';
import { PipelineStrip, type PipelineStage } from '@/components/data/pipeline-strip';
import { ControlTower } from '@/components/control-tower/control-tower';
import { attentionItems, demoActivity, demoBoard } from '@/features/demo/board';
import type { OrderStatus } from '@/features/orders/services/order-status';
import { formatDate, formatTime } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

export const metadata: Metadata = { title: 'Centro de operaciones' };

/*
 * Los tiempos se calculan contra `now`, así que la página NO puede
 * prerrenderizarse: se quedaría con el reloj del momento de la compilación.
 */
export const dynamic = 'force-dynamic';

/** Etapas del recorrido, en el orden en que las recorre el vehículo. */
const STAGES: readonly {
  key: string;
  label: string;
  statuses: readonly OrderStatus[];
  waiting?: boolean;
}[] = [
  { key: 'recepcion', label: 'Recepción', statuses: ['DRAFT', 'RECEPCIONADO', 'CHECKLIST_COMPLETADO'] },
  {
    key: 'diagnostico',
    label: 'Diagnóstico',
    statuses: ['PENDIENTE_DIAGNOSTICO', 'EN_DIAGNOSTICO', 'DIAGNOSTICO_COMPLETADO'],
  },
  {
    key: 'cliente',
    label: 'Cliente',
    statuses: [
      'COTIZACION_EN_PREPARACION',
      'COTIZACION_ENVIADA',
      'ESPERANDO_CLIENTE',
      'APROBACION_PARCIAL',
      'APROBADO',
    ],
    waiting: true,
  },
  {
    key: 'repuestos',
    label: 'Repuestos',
    statuses: [
      'SOLICITUD_REPUESTOS',
      'REPUESTOS_EN_COTIZACION',
      'COMPRA_PENDIENTE_AUTORIZACION',
      'COMPRA_AUTORIZADA',
      'ORDEN_COMPRA_GENERADA',
      'ESPERANDO_REPUESTOS',
      'REPUESTOS_PARCIALES',
      'REPUESTOS_COMPLETOS',
    ],
    waiting: true,
  },
  {
    key: 'reparacion',
    label: 'Reparación',
    statuses: [
      'LISTO_PARA_REPARACION',
      'EN_REPARACION',
      'REPARACION_PAUSADA',
      'REPARACION_TERMINADA',
    ],
  },
  { key: 'calidad', label: 'Calidad', statuses: ['CONTROL_CALIDAD', 'OBSERVADO_CONTROL_CALIDAD', 'CONTROL_CALIDAD_APROBADO'] },
  {
    key: 'finales',
    label: 'Servicios finales',
    statuses: ['PENDIENTE_LAVADO', 'EN_LAVADO', 'PENDIENTE_ALINEAMIENTO', 'EN_ALINEAMIENTO'],
  },
  { key: 'entrega', label: 'Entrega', statuses: ['LISTO_PARA_ENTREGA'] },
];

function greeting(hour: number): string {
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export default function TableroPage() {
  const now = new Date();
  const rows = demoBoard(now);
  const attention = attentionItems(rows, now);
  const activity = demoActivity();

  const countOf = (statuses: readonly OrderStatus[]): number =>
    rows.filter((r) => statuses.includes(r.order.status)).length;

  const stages: readonly PipelineStage[] = STAGES.map((stage) => ({
    key: stage.key,
    label: stage.label,
    count: countOf(stage.statuses),
    href: '/ordenes',
    ...(stage.waiting === true ? { waiting: true as const } : {}),
  }));

  const inRepair = countOf(['EN_REPARACION', 'REPARACION_PAUSADA', 'LISTO_PARA_REPARACION']);
  const ready = countOf(['LISTO_PARA_ENTREGA', 'PENDIENTE_LAVADO', 'EN_LAVADO']);
  const delayed = rows.filter((r) => r.light.color === 'rojo').length;
  const share = rows.length === 0 ? 0 : Math.round((inRepair / rows.length) * 100);

  return (
    <>
      {/* BLOQUE 1 · Cabecera operativa */}
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-fg lg:text-[1.75rem]">
            {greeting(now.getHours())}, Andrea
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-fg-muted">
            Centro de operaciones automotrices. Supervisa el avance del taller y prioriza los
            vehículos que requieren atención.
          </p>
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-subtle">
            <span>{formatDate(now)}</span>
            <span aria-hidden>·</span>
            <span data-numeric>Actualizado a las {formatTime(now)}</span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="secondary" type="button">
            <Search aria-hidden className="size-4" />
            Buscar vehículo
          </Button>
          <Button variant="primary" type="button">
            <ClipboardList aria-hidden className="size-4" />
            Nueva recepción
          </Button>
        </div>
      </header>

      {/* BLOQUE 2 · Indicadores */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Órdenes activas"
          value={rows.length}
          icon={<ClipboardList />}
          emphasis="primary"
          delta={<MetricDelta value={4} intent="neutral" suffix="hoy" />}
        />
        <KpiCard
          label="En reparación"
          value={inRepair}
          icon={<Wrench />}
          tone="wait"
          footnote={`${share} % de la operación`}
        />
        <KpiCard
          label="Requieren atención"
          value={attention.length}
          icon={<TriangleAlert />}
          tone={attention.length > 0 ? 'crit' : 'ok'}
          footnote={delayed > 0 ? `${delayed} ya retrasadas` : 'ninguna retrasada'}
        />
        <KpiCard
          label="Listos para entrega"
          value={ready}
          icon={<CircleCheckBig />}
          tone="ok"
          footnote="servicios finales incluidos"
        />
      </div>

      {/* BLOQUE 3 · Flujo */}
      <PipelineStrip stages={stages} />

      {/* BLOQUES 4-6 · Torre de control, con avisos y actividad al costado */}
      {/*
        El reparto 8/4 solo se activa a partir de 109.375rem (1750 px). Por
        debajo, ocho columnas de datos en dos tercios de pantalla dejan la
        columna del trabajo en «CA…» y el semáforo cortado: la tabla deja de
        poder leerse justo en la pantalla que existe para leerla de un vistazo.
        Más abajo, la torre va a ancho completo y los dos paneles se reparten.

        El límite va en REM, no en píxeles. Tailwind v4 ordena los breakpoints
        arbitrarios en px ANTES que los nombrados, que son rem: escrito
        `min-[1750px]` el bloque salía antes que `lg` en la hoja y, a 1920 px,
        `lg:grid-cols-2` ganaba por orden. Los dos paneles quedaban uno al lado
        del otro dentro de una columna de 537 px, truncando todo. En rem se
        ordena donde le toca. Comprobado sobre el CSS generado.
      */}
      <div className="grid gap-6 min-[109.375rem]:grid-cols-12">
        <div className="min-w-0 min-[109.375rem]:col-span-8">
          <ControlTower rows={rows} now={now} />
        </div>

        <div className="grid min-w-0 gap-6 lg:grid-cols-2 min-[109.375rem]:col-span-4 min-[109.375rem]:grid-cols-1">
          <AttentionPanel items={attention} />
          <ActivityPanel entries={activity} now={now} />
        </div>
      </div>
    </>
  );
}

function AttentionPanel({
  items,
}: {
  readonly items: ReturnType<typeof attentionItems>;
}) {
  return (
    <section className="rounded-panel border border-border bg-surface-raised">
      <header className="flex items-center justify-between gap-3 px-5 py-4">
        <h2 className="font-display text-base font-semibold tracking-tight text-fg">
          Requieren atención
        </h2>
        <span
          data-numeric
          className="rounded-chip bg-crit-100 px-2 py-0.5 text-xs font-semibold text-crit-700"
        >
          {items.length}
        </span>
      </header>

      {items.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-fg-muted">
          Todo el taller está dentro de los tiempos previstos.
        </p>
      ) : (
        <ul className="border-t border-border">
          {items.map(({ row, reason, elapsed, severity }) => (
            <li key={row.order.id}>
              <Link
                href={`/ordenes/${row.order.id}`}
                className="flex items-center gap-3 border-b border-border px-5 py-3.5 transition-colors duration-150 last:border-b-0 hover:bg-surface-sunken"
              >
                <span
                  aria-hidden
                  className={cn(
                    'h-9 w-0.5 shrink-0 rounded-full',
                    severity === 'crit' && 'bg-crit-500',
                    severity === 'warn' && 'bg-warn-500',
                    severity === 'wait' && 'bg-wait-500',
                  )}
                />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <Plate value={row.order.plate} size="sm" />
                    <span className="font-mono text-xs text-fg-subtle">
                      {row.order.code.replace('OS-2026-000', 'OS-')}
                    </span>
                  </span>
                  <span className="mt-1 block text-sm text-fg">{reason}</span>
                </span>
                <span className="shrink-0 text-right">
                  <span data-numeric className="block text-xs font-medium text-fg-muted">
                    {elapsed}
                  </span>
                  <span className="text-[0.625rem] text-fg-subtle">así</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ActivityPanel({
  entries,
  now,
}: {
  readonly entries: ReturnType<typeof demoActivity>;
  readonly now: Date;
}) {
  return (
    <section className="rounded-panel border border-border bg-surface-raised">
      <header className="flex items-center justify-between gap-3 px-5 py-4">
        <h2 className="font-display text-base font-semibold tracking-tight text-fg">
          Actividad del taller
        </h2>
        <Link
          href="/ordenes"
          className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:text-brand-800"
        >
          Ver órdenes
          <ArrowRight aria-hidden className="size-3" />
        </Link>
      </header>

      <ol className="border-t border-border px-5 py-4">
        {entries.map((entry, index) => (
          <li key={entry.id} className="relative flex gap-3 pb-4 last:pb-0">
            {index < entries.length - 1 && (
              <span
                aria-hidden
                className="absolute left-[0.3125rem] top-3 h-full w-px bg-border"
              />
            )}
            <span
              aria-hidden
              className={cn(
                'relative mt-1.5 size-2.5 shrink-0 rounded-full ring-4 ring-surface-raised',
                entry.tone === 'ok' && 'bg-ok-500',
                entry.tone === 'warn' && 'bg-warn-500',
                entry.tone === 'brand' && 'bg-brand-600',
                entry.tone === 'neutral' && 'bg-graphite-300',
              )}
            />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-baseline gap-x-2">
                <time
                  data-numeric
                  className="font-mono text-xs text-fg-subtle"
                  dateTime={new Date(now.getTime() - entry.minutesAgo * 60_000).toISOString()}
                >
                  {formatTime(new Date(now.getTime() - entry.minutesAgo * 60_000))}
                </time>
                <Link
                  href={`/ordenes/${entry.orderId}`}
                  className="font-mono text-xs text-brand-700 hover:underline"
                >
                  {entry.orderCode.replace('OS-2026-000', 'OS-')}
                </Link>
              </p>
              <p className="mt-0.5 text-sm text-fg-muted">{entry.text}</p>
              <p className="text-xs text-fg-subtle">{entry.actor}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
