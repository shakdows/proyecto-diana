'use client';

import { useState } from 'react';
import { AlertTriangle, Clock3, PauseCircle } from 'lucide-react';
import { VehicleDrawer } from '@/components/control-tower/vehicle-drawer';
import { AssetImage } from '@/components/ui/asset-image';
import type { AttentionItem } from '@/features/demo/board';
import { cn } from '@/lib/utils/cn';

/**
 * Los vehículos que piden acción hoy.
 *
 * `attentionItems()` llevaba escrito y probado desde la Fase 1, pero solo
 * alimentaba el número rojo de la campana: el taller sabía CUÁNTOS problemas
 * tenía y en ninguna pantalla podía ver CUÁLES eran. Este bloque es esa lista.
 *
 * Va antes que «vehículos en proceso» porque responde a una pregunta anterior:
 * primero qué se ha torcido, después qué hay en marcha. Si no hay nada, el
 * bloque desaparece entero en vez de dejar un marco vacío diciendo «sin
 * novedades»: un hueco que solo aparece cuando importa se nota mucho más.
 */
export function AttentionList({
  items,
  now,
}: {
  readonly items: readonly AttentionItem[];
  readonly now: Date;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = items.find((i) => i.row.order.id === selectedId)?.row ?? null;

  if (items.length === 0) return null;

  const SEVERITY = {
    crit: {
      icon: <AlertTriangle />,
      tile: 'bg-crit-100 text-crit-700',
      edge: 'border-l-crit-500',
      text: 'text-crit-700',
    },
    warn: {
      icon: <Clock3 />,
      tile: 'bg-warn-100 text-warn-700',
      edge: 'border-l-warn-500',
      text: 'text-warn-700',
    },
    wait: {
      icon: <PauseCircle />,
      tile: 'bg-wait-100 text-wait-700',
      edge: 'border-l-wait-500',
      text: 'text-wait-700',
    },
  } as const;

  return (
    <section className="@container">
      <h2 className="font-display text-lg font-semibold tracking-tight text-fg">
        Vehículos que necesitan tu atención
      </h2>

      <ul className="mt-3 grid gap-3 @3xl:grid-cols-2">
        {items.map((item) => {
          const { order } = item.row;
          const tone = SEVERITY[item.severity];

          return (
            <li key={`${order.id}-${item.kind}`}>
              <button
                type="button"
                onClick={() => setSelectedId(order.id)}
                aria-haspopup="dialog"
                aria-expanded={selectedId === order.id}
                className={cn(
                  'flex w-full items-center gap-3 rounded-panel border border-border border-l-4 bg-surface-raised px-4 py-3.5 text-left',
                  'transition-shadow duration-150 ease-snap hover:shadow-panel',
                  tone.edge,
                )}
              >
                <AssetImage
                  alt={order.vehicle}
                  subject={order.vehicle}
                  equipmentKind={order.equipmentKind}
                  fit="cover"
                  rounded="control"
                  className="h-11 w-14 shrink-0"
                />

                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-baseline gap-x-2">
                    <span className="font-mono text-xs font-bold tracking-[0.06em] text-fg">
                      {order.plate.replace(/^(.{3})(.*)$/u, '$1-$2')}
                    </span>
                    <span className="truncate text-sm font-semibold text-fg">{order.vehicle}</span>
                  </span>
                  <span className={cn('mt-0.5 block truncate text-sm font-medium', tone.text)}>
                    {item.reason}
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-fg-subtle">
                    {order.customer} · {item.elapsed}
                  </span>
                </span>

                <span
                  aria-hidden
                  className={cn(
                    'grid size-9 shrink-0 place-items-center rounded-control [&>svg]:size-[1.125rem]',
                    tone.tile,
                  )}
                >
                  {tone.icon}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <VehicleDrawer row={selected} now={now} onClose={() => setSelectedId(null)} />
    </section>
  );
}
