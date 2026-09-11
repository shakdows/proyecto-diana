import Link from 'next/link';
import { cn } from '@/lib/utils/cn';

/**
 * El taller de un vistazo.
 *
 * Antes eran ocho tarjetas idénticas donde un 0 pesaba visualmente lo mismo
 * que un 12. Aquí el recuento vacío se apaga y el que tiene carga se destaca:
 * el asesor busca DÓNDE está atascado el trabajo, no el inventario de etapas.
 *
 * El orden es el del recorrido del vehículo, así que la etapa con acumulación
 * se lee como un cuello de botella y no como una casilla más.
 */
export interface PipelineStage {
  readonly label: string;
  readonly count: number;
  readonly href?: string;
  /** Marca las etapas donde se espera a un tercero, no al taller. */
  readonly waiting?: boolean;
}

export function PipelineStrip({ stages }: { readonly stages: readonly PipelineStage[] }) {
  const busiest = Math.max(...stages.map((s) => s.count), 0);

  return (
    <nav aria-label="Órdenes por etapa">
      <ol className="grid grid-cols-2 gap-px overflow-hidden rounded-panel border border-border bg-border sm:grid-cols-4 2xl:grid-cols-8">
        {stages.map((stage) => {
          const empty = stage.count === 0;
          const peak = !empty && stage.count === busiest;
          const body = (
            <>
              <span
                data-numeric
                className={cn(
                  'font-display text-2xl leading-none font-semibold tabular-nums',
                  empty ? 'text-graphite-300' : peak ? 'text-brand-700' : 'text-fg',
                )}
              >
                {stage.count}
              </span>
              <span
                className={cn(
                  'mt-1.5 text-xs leading-tight',
                  empty ? 'text-graphite-300' : 'text-fg-muted',
                )}
              >
                {stage.label}
              </span>
              {stage.waiting === true && !empty && (
                <span className="mt-1 inline-flex items-center gap-1 text-[0.6875rem] text-wait-600">
                  <span aria-hidden className="inline-block size-1.5 rounded-full bg-wait-500" />
                  depende de un tercero
                </span>
              )}
            </>
          );

          return (
            <li key={stage.label} className="bg-surface-raised">
              {stage.href === undefined || empty ? (
                <div className="flex h-full flex-col px-4 py-3">{body}</div>
              ) : (
                <Link
                  href={stage.href}
                  className="flex h-full flex-col px-4 py-3 transition-colors hover:bg-surface-sunken"
                >
                  {body}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
