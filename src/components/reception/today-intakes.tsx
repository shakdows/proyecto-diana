import Link from 'next/link';
import { ArrowRight, Check } from 'lucide-react';
import { AssetImage } from '@/components/ui/asset-image';
import { EmptyState } from '@/components/feedback/states';
import {
  STAGE_LABELS,
  arrivedAt,
  formatPlate,
  type IntakeStage,
  type TodayIntake,
} from '@/features/reception/services/intake';
import { formatTime } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

/**
 * Lo que ha entrado hoy.
 *
 * Solo hoy. Una lista que arrastra los ingresos de ayer deja de ser «lo que
 * tengo en el mostrador» y se convierte en un histórico, que es otra pantalla
 * —seguimiento— y sirve para otra cosa.
 *
 * Cada fila lleva su acción: seguir la recepción a medias o ver la orden ya
 * generada. Sin acción, la lista solo informa, y quien está de pie en el
 * mostrador no viene a informarse.
 */
export function TodayIntakes({
  intakes,
  now,
}: {
  readonly intakes: readonly TodayIntake[];
  readonly now: Date;
}) {
  return (
    <section>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-display text-lg font-semibold tracking-tight text-fg">
          Recepciones de hoy
        </h2>
        {intakes.length > 0 && (
          <span data-numeric className="text-sm text-fg-muted">
            {intakes.length} {intakes.length === 1 ? 'vehículo' : 'vehículos'}
          </span>
        )}
      </div>

      {intakes.length === 0 ? (
        <div className="mt-3">
          <EmptyState
            title="Todavía no ha entrado ningún vehículo hoy"
            hint="El primero aparecerá aquí en cuanto abras su recepción."
          />
        </div>
      ) : (
        <ul className="mt-3 grid gap-2">
          {intakes.map((intake) => (
            <li key={intake.orderId}>
              <IntakeRow intake={intake} now={now} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const TONE: Readonly<Record<IntakeStage, string>> = {
  en_recepcion: 'bg-brand-100 text-brand-700',
  checklist: 'bg-warn-100 text-warn-700',
  orden_generada: 'bg-ok-100 text-ok-700',
};

function IntakeRow({ intake, now }: { readonly intake: TodayIntake; readonly now: Date }) {
  const generada = intake.stage === 'orden_generada';
  /*
   * La fila de una recepción CERRADA AQUÍ lleva a su acta, no a la orden.
   *
   * Llevaba a `/ordenes/OT-2026-0001` y eso era un 404: sin base de datos esa
   * orden no existe en ninguna parte, y era yo quien puse ese enlace. El acta
   * sí existe —está en este navegador— y además es lo que se busca al pulsar:
   * qué se anotó, qué fotos hay y quién firmó.
   */
  const href =
    intake.actaCode !== undefined
      ? `/recepcion/acta/${encodeURIComponent(intake.actaCode)}`
      : generada
        ? `/ordenes/${intake.orderId}`
        : '/recepcion/nueva/checklist';

  return (
    <Link
      href={href}
      className="@container flex items-center gap-3 rounded-panel border border-border bg-surface-raised px-4 py-3 transition-shadow duration-150 ease-snap hover:shadow-panel"
    >
      <AssetImage
        alt={intake.vehicle}
        subject={intake.vehicle}
        equipmentKind={intake.equipmentKind}
        fit="cover"
        rounded="control"
        className="h-11 w-14 shrink-0"
      />

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-mono text-xs font-bold tracking-[0.06em] text-fg">
            {formatPlate(intake.plate)}
          </span>
          <span className="truncate text-sm font-semibold text-fg">{intake.vehicle}</span>
        </span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-fg-muted">
          <span className="truncate">{intake.customer}</span>
          {intake.corporateClient !== null && (
            <span className="rounded-chip bg-surface-sunken px-1.5 py-0.5">
              {intake.corporateClient}
            </span>
          )}
        </span>
      </span>

      <span data-numeric className="hidden w-14 shrink-0 text-sm text-fg-muted sm:block">
        {formatTime(arrivedAt(now, intake.arrivedMinutesAgo))}
      </span>

      {/* El avance del checklist solo tiene sentido mientras se está haciendo.
          Con la orden ya generada es ruido: dice 38/38 en todas las filas. */}
      <span className="hidden w-24 shrink-0 text-xs md:block">
        {generada ? (
          <span className="flex items-center gap-1 text-ok-700">
            <Check aria-hidden className="size-3.5" />
            Completa
          </span>
        ) : (
          <span data-numeric className="text-fg-muted">
            Checklist {intake.checklistDone}/{intake.checklistTotal}
          </span>
        )}
      </span>

      <span
        className={cn(
          'hidden shrink-0 rounded-chip px-2 py-1 text-xs font-medium lg:block',
          TONE[intake.stage],
        )}
      >
        {STAGE_LABELS[intake.stage]}
      </span>

      <ArrowRight aria-hidden className="size-4 shrink-0 text-fg-subtle" />
    </Link>
  );
}
