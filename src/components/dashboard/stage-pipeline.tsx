import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import {
  STAGES,
  STAGE_HREFS,
  STAGE_LABELS,
  countByStage,
  type Stage,
} from '@/features/dashboard/services/stages';
import type { BoardRow } from '@/features/demo/board';
import { cn } from '@/lib/utils/cn';

/**
 * El flujo del taller, de izquierda a derecha.
 *
 * Antes eran seis tarjetas iguales en una rejilla. Seis cajas del mismo peso
 * dicen «aquí hay seis números» y no dicen lo único que importa: que son
 * PASOS, que van en ese orden, y que si el tercero tiene el doble que los
 * demás ahí está el atasco. Los conectores no son adorno: son la diferencia
 * entre leer seis cifras y leer un recorrido.
 *
 * El color es el de la etapa, no el de su cifra: una etapa no se pone roja
 * porque tenga muchos vehículos —tener tres en reparación es lo normal—. El
 * problema concreto vive en la lista de atención, que es donde se puede hacer
 * algo al respecto.
 */

const TONE: Readonly<Record<Stage, string>> = {
  recepcion: 'bg-brand-600/15 text-brand-500 ring-brand-600/30',
  diagnostico: 'bg-brand-600/15 text-brand-500 ring-brand-600/30',
  repuestos: 'bg-warn-600/15 text-warn-600 ring-warn-600/30',
  reparacion: 'bg-crit-600/15 text-crit-600 ring-crit-600/30',
  calidad: 'bg-wait-600/20 text-wait-700 ring-wait-600/30',
  listos: 'bg-ok-600/15 text-ok-600 ring-ok-600/30',
};

export function StagePipeline({ rows }: { readonly rows: readonly BoardRow[] }) {
  const counts = countByStage(rows.map((r) => r.order.status));

  return (
    <section
      aria-label="Flujo del taller"
      className="rounded-panel border border-border bg-surface px-2 py-3 sm:px-4"
    >
      {/* Una sola fila siempre. En estrecho se desplaza en horizontal en vez
          de partirse: un recorrido partido en dos renglones deja de leerse
          como un recorrido. */}
      <ol className="flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {STAGES.map((stage, index) => (
          <li key={stage} className="flex shrink-0 items-center">
            <Link
              href={STAGE_HREFS[stage]}
              className={cn(
                /* `relative` no es decorativo: el texto `sr-only` de abajo va
                   en posición absoluta, y sin un ancestro posicionado DENTRO
                   del carrusel su bloque contenedor acaba siendo el de la
                   página. Ahí se coloca en la posición sin desplazar —cerca
                   de x=900— y estira el documento: la página entera ganaba
                   una barra de desplazamiento horizontal en móvil por un
                   elemento de un píxel que nadie ve. */
                'relative flex min-w-0 items-center gap-2.5 rounded-control px-2.5 py-1.5',
                'transition-colors duration-150 hover:bg-surface-raised',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'grid size-9 shrink-0 place-items-center rounded-full ring-1 ring-inset',
                  'font-display text-sm font-bold tabular-nums',
                  TONE[stage],
                )}
              >
                {counts[stage]}
              </span>

              <span className="whitespace-nowrap text-sm font-medium text-fg">
                {STAGE_LABELS[stage]}
                <span className="sr-only">
                  : {counts[stage]} {counts[stage] === 1 ? 'vehículo' : 'vehículos'}
                </span>
              </span>
            </Link>

            {index < STAGES.length - 1 && (
              <ChevronRight aria-hidden className="mx-0.5 size-4 shrink-0 text-fg-subtle" />
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}
