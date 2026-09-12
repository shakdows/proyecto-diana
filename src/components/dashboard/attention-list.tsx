'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, Clock3 } from 'lucide-react';
import { VehicleDrawer } from '@/components/control-tower/vehicle-drawer';
import { AssetImage } from '@/components/ui/asset-image';
import { Plate } from '@/components/ui/plate';
import { actionFor } from '@/features/dashboard/services/operations';
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
 *
 * ── Filas, no tarjetas ──────────────────────────────────────────────────────
 *
 * Antes eran cinco tarjetas en dos columnas. Cinco cajas del mismo tamaño
 * obligan a comparar en zigzag y ocupan media pantalla para cinco datos. En
 * filas, la placa, el estado y el tiempo caen en la misma columna vertical y
 * se leen de arriba abajo sin mover los ojos a los lados.
 *
 * ── Dos gestos, no uno ──────────────────────────────────────────────────────
 *
 * La fila abre el cajón con la ficha; el botón va DIRECTO a donde se resuelve.
 * Quien ya sabe qué pasa no debería tener que abrir una ficha para llegar a la
 * orden de compra. El botón se detiene antes de que la fila lo oiga.
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

  return (
    <section id="atencion" className="@container scroll-mt-4">
      <header className="flex items-baseline justify-between gap-4 pb-3">
        <h2 className="font-display text-base font-semibold tracking-tight text-fg">
          Vehículos que necesitan tu atención
        </h2>
        <Link
          href="/ordenes"
          className="shrink-0 text-xs font-medium text-fg-muted transition-colors duration-150 hover:text-brand-600"
        >
          Ver todos →
        </Link>
      </header>

      <ul className="divide-y divide-border overflow-hidden rounded-panel border border-border bg-surface">
        {items.map((item) => (
          <li key={`${item.row.order.id}-${item.kind}`}>
            <AttentionRow item={item} onOpen={() => setSelectedId(item.row.order.id)} />
          </li>
        ))}
      </ul>

      <VehicleDrawer row={selected} now={now} onClose={() => setSelectedId(null)} />
    </section>
  );
}

/** El punto de color dice la gravedad sin leer; el texto la dice igualmente. */
const DOT: Readonly<Record<AttentionItem['severity'], string>> = {
  crit: 'bg-crit-600',
  warn: 'bg-warn-600',
  wait: 'bg-wait-600',
};

const TEXT: Readonly<Record<AttentionItem['severity'], string>> = {
  crit: 'text-crit-600',
  warn: 'text-warn-600',
  wait: 'text-fg-muted',
};

function AttentionRow({
  item,
  onOpen,
}: {
  readonly item: AttentionItem;
  readonly onOpen: () => void;
}) {
  const { order } = item.row;
  const action = actionFor(item.kind);

  return (
    <div
      className={cn(
        'group relative flex items-center gap-3 px-3 py-2.5 sm:gap-4 sm:px-4',
        'transition-colors duration-150 hover:bg-surface-raised',
      )}
    >
      <AssetImage
        alt={order.vehicle}
        subject={order.vehicle}
        equipmentKind={order.equipmentKind}
        fit="cover"
        rounded="control"
        className="h-10 w-14 shrink-0"
      />

      {/* La fila entera abre la ficha. Es un botón que ocupa toda la celda y
          queda por DEBAJO del enlace de acción, para que el botón de resolver
          siga siendo pulsable. */}
      <button
        type="button"
        onClick={onOpen}
        aria-haspopup="dialog"
        className="absolute inset-0 z-0"
      >
        <span className="sr-only">Ver la ficha de {order.plate}</span>
      </button>

      <span className="pointer-events-none relative z-10 grid min-w-0 flex-1 gap-x-4 gap-y-0.5 @2xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] @2xl:items-center">
        <span className="min-w-0">
          <Plate value={order.plate} size="sm" />
          <span className="mt-1 block truncate text-sm font-semibold text-fg">
            {order.vehicle}
          </span>
          {/* El cliente, no la cuenta corporativa: quien lee esto va a llamar
              a «Renting Andino S.A.», no a «Relsa», que es cómo se factura. */}
          <span className="block truncate text-xs text-fg-muted">{order.customer}</span>
        </span>

        <span className="flex min-w-0 items-center gap-2">
          <span aria-hidden className={cn('size-2 shrink-0 rounded-full', DOT[item.severity])} />
          <span className={cn('truncate text-sm font-medium', TEXT[item.severity])}>
            {item.reason}
          </span>
        </span>
      </span>

      <span className="pointer-events-none relative z-10 hidden shrink-0 items-center gap-1.5 text-xs text-fg-muted @xl:flex">
        <Clock3 aria-hidden className="size-3.5" />
        <span data-numeric>{item.elapsed}</span>
      </span>

      <Link
        href={action.href(order.id)}
        aria-label={`${action.label} · ${order.plate}`}
        className={cn(
          'relative z-10 inline-flex h-9 shrink-0 items-center gap-1.5 rounded-control',
          'border border-border-strong bg-surface-raised px-3 text-xs font-semibold text-fg',
          'transition-colors duration-150 hover:border-brand-600 hover:bg-brand-600 hover:text-white',
        )}
      >
        <span className="hidden sm:inline">{action.label}</span>
        <ArrowRight
          aria-hidden
          className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5"
        />
      </Link>
    </div>
  );
}
