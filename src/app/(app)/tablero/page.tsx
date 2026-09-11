import type { Metadata } from 'next';
import Link from 'next/link';
import { CalendarDays, Car, Clock, Flag, Plus, Wrench } from 'lucide-react';
import type { ReactNode } from 'react';
import { AssetImage } from '@/components/ui/asset-image';
import { ControlTower } from '@/components/control-tower/control-tower';
import { demoBoard } from '@/features/demo/board';
import type { OrderStatus } from '@/features/orders/services/order-status';
import { formatDate, formatTime } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

export const metadata: Metadata = { title: 'Tablero' };

/* Los tiempos se calculan contra `now`: la página no puede prerrenderizarse o
   se quedaría con el reloj del momento de la compilación. */
export const dynamic = 'force-dynamic';

function greeting(hour: number): string {
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export default function TableroPage() {
  const now = new Date();
  const rows = demoBoard(now);

  const countOf = (statuses: readonly OrderStatus[]): number =>
    rows.filter((r) => statuses.includes(r.order.status)).length;

  const enRecepcion = countOf([
    'DRAFT',
    'RECEPCIONADO',
    'CHECKLIST_COMPLETADO',
    'PENDIENTE_DIAGNOSTICO',
    'EN_DIAGNOSTICO',
  ]);
  const enTaller = countOf(['LISTO_PARA_REPARACION', 'EN_REPARACION', 'REPARACION_TERMINADA']);
  const enEspera = rows.filter((r) => r.light.color === 'gris').length;
  const listos = countOf(['LISTO_PARA_ENTREGA', 'PENDIENTE_LAVADO', 'EN_LAVADO']);
  const total = Math.max(1, rows.length);

  return (
    <>
      {/* Cabecera: saludo, frase de marca, vehículo y la acción principal. */}
      <section className="relative overflow-hidden rounded-panel border border-border bg-surface-raised">
        <div
          aria-hidden
          className="absolute inset-0 bg-linear-to-r from-transparent via-transparent to-brand-50"
        />
        <div className="relative flex flex-wrap items-center gap-6 px-6 py-6 lg:flex-nowrap">
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-[1.75rem] font-semibold tracking-tight text-fg lg:text-[2rem]">
              {greeting(now.getHours())},{' '}
              <span className="text-brand-600">Andrea</span>
            </h1>
            <p className="mt-1 text-base text-fg-muted">
              Listos para seguir moviendo historias
            </p>
            <p className="mt-4 max-w-md border-l-2 border-brand-500 pl-3 text-sm italic leading-relaxed text-fg-subtle">
              «Cada vehículo que atendemos es la confianza de un cliente que sigue adelante.»
            </p>
          </div>

          {/* El de la primera orden, no un coche genérico: la cabecera enseña
              el taller de hoy, no una ilustración de catálogo. */}
          <AssetImage
            alt={
              rows[0] === undefined
                ? 'Vehículo del taller'
                : `Ilustración de ${rows[0].order.vehicle}`
            }
            subject={rows[0]?.order.vehicle ?? 'sedan'}
            equipmentKind={rows[0]?.order.equipmentKind ?? 'vehiculo'}
            className="hidden h-32 w-64 shrink-0 lg:block"
          />

          <div className="flex shrink-0 flex-col items-start gap-4 lg:items-end">
            <p className="flex items-start gap-2.5">
              <CalendarDays aria-hidden className="mt-0.5 size-4 shrink-0 text-fg-subtle" />
              <span className="leading-tight">
                <span className="block text-sm font-medium text-fg">{formatDate(now)}</span>
                <span data-numeric className="block text-xs text-fg-subtle">
                  Última actualización: {formatTime(now)}
                </span>
              </span>
            </p>

            <Link
              href="/recepcion/nueva"
              className="inline-flex h-12 items-center gap-2 rounded-[0.875rem] bg-brand-600 px-5 text-sm font-semibold text-white shadow-raise transition-colors duration-150 hover:bg-brand-700 active:scale-[0.98]"
            >
              <Plus aria-hidden className="size-5" />
              Nueva recepción
            </Link>
          </div>
        </div>
      </section>

      {/* Indicadores. La barra es la proporción sobre el total, no adorno. */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Car />}
          tone="brand"
          value={enRecepcion}
          label="En recepción"
          share={enRecepcion / total}
          href="/recepcion"
        />
        <StatCard
          icon={<Wrench />}
          tone="ok"
          value={enTaller}
          label="En taller"
          share={enTaller / total}
          href="/taller"
        />
        <StatCard
          icon={<Clock />}
          tone="warn"
          value={enEspera}
          label="En espera"
          share={enEspera / total}
          href="/ordenes"
        />
        <StatCard
          icon={<Flag />}
          tone="ready"
          value={listos}
          label="Listos para entrega"
          share={listos / total}
          href="/ordenes"
        />
      </div>

      <ControlTower rows={rows} now={now} />
    </>
  );
}

/**
 * Indicador.
 *
 * El azulejo de color identifica la etapa de un vistazo; la cifra es lo que se
 * lee. La barra de abajo dice qué parte del taller está en ese punto, que es
 * la pregunta que sigue a «ocho»: ¿ocho de cuántos?
 */
function StatCard({
  icon,
  tone,
  value,
  label,
  share,
  href,
}: {
  readonly icon: ReactNode;
  readonly tone: 'brand' | 'ok' | 'warn' | 'ready';
  readonly value: number;
  readonly label: string;
  readonly share: number;
  readonly href: string;
}) {
  const TILE = {
    brand: 'bg-brand-100 text-brand-700',
    ok: 'bg-ok-100 text-ok-700',
    warn: 'bg-warn-100 text-warn-700',
    ready: 'bg-wait-100 text-wait-700',
  } as const;

  const BAR = {
    brand: 'bg-brand-600',
    ok: 'bg-ok-500',
    warn: 'bg-warn-500',
    ready: 'bg-wait-500',
  } as const;

  return (
    <Link
      href={href}
      className="group rounded-panel border border-border bg-surface-raised p-5 transition-shadow duration-150 ease-snap hover:shadow-panel"
    >
      <div className="flex items-center gap-4">
        <span
          aria-hidden
          className={cn(
            'grid size-14 shrink-0 place-items-center rounded-[0.875rem] [&>svg]:size-6',
            TILE[tone],
          )}
        >
          {icon}
        </span>

        <span className="min-w-0 flex-1">
          <span
            data-numeric
            className="block font-display text-[2rem] font-semibold leading-none tracking-tight text-fg"
          >
            {value}
          </span>
          <span className="mt-1 block truncate text-sm text-fg-muted">{label}</span>
        </span>
      </div>

      <span aria-hidden className="mt-4 block h-1.5 w-full overflow-hidden rounded-full bg-graphite-100">
        <span
          className={cn('block h-full rounded-full', BAR[tone])}
          style={{ width: `${Math.round(Math.min(1, share) * 100)}%` }}
        />
      </span>
    </Link>
  );
}
