import Link from 'next/link';
import { VehicleArt } from '@/components/art/vehicle-art';
import type { BoardRow } from '@/features/demo/board';
import {
  STAGES,
  STAGE_HREFS,
  STAGE_LABELS,
  countByStage,
  stageOf,
  type Stage,
} from '@/features/dashboard/services/stages';
import { cn } from '@/lib/utils/cn';

/**
 * El taller en seis cifras.
 *
 * Una orden pasa por 38 situaciones; nadie dirige un taller con 38 números.
 * Estas seis son las paradas reales del vehículo, y suman el total: cada
 * vehículo del taller está en una y solo una.
 *
 * Debajo de la cifra van tantas siluetas como vehículos, hasta cinco. Es lo
 * que convierte «5» en algo que se ve sin leer, que es de lo que se trata en
 * una pantalla que alguien mira de pie y de paso.
 */
export function StageCounters({ rows }: { readonly rows: readonly BoardRow[] }) {
  const counts = countByStage(rows.map((r) => r.order.status));

  return (
    <section aria-label="Vehículos por etapa" className="@container">
      <ul className="grid grid-cols-2 gap-3 @xl:grid-cols-3 @4xl:grid-cols-6">
        {STAGES.map((stage) => (
          <li key={stage}>
            <StageCard
              stage={stage}
              count={counts[stage]}
              vehicles={rows.filter((r) => stageOf(r.order.status) === stage)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

function StageCard({
  stage,
  count,
  vehicles,
}: {
  readonly stage: Stage;
  readonly count: number;
  readonly vehicles: readonly BoardRow[];
}) {
  const empty = count === 0;

  return (
    <Link
      href={STAGE_HREFS[stage]}
      className={cn(
        'flex h-full flex-col rounded-panel border border-border bg-surface-raised px-4 py-3.5',
        'transition-shadow duration-150 ease-snap hover:shadow-panel',
      )}
    >
      <span className="flex items-baseline justify-between gap-2">
        <span
          data-numeric
          className={cn(
            'font-display text-[1.75rem] font-semibold leading-none tracking-tight',
            empty ? 'text-fg-subtle' : 'text-fg',
          )}
        >
          {count}
        </span>
        <span className="truncate text-xs text-fg-muted">{STAGE_LABELS[stage]}</span>
      </span>

      {/* Las siluetas son la cifra dibujada, no decoración: se ocultan al
          lector de pantalla, que ya leyó el número. */}
      <span aria-hidden className="mt-3 flex min-h-6 items-end gap-1">
        {vehicles.slice(0, 5).map((row) => (
          <span key={row.order.id} className="block h-6 w-8 shrink-0">
            <VehicleArt vehicle={row.order.vehicle} kind={row.order.equipmentKind} fit="contain" />
          </span>
        ))}
        {count > 5 && (
          <span data-numeric className="self-center pl-1 text-[0.625rem] text-fg-subtle">
            +{count - 5}
          </span>
        )}
      </span>
    </Link>
  );
}
