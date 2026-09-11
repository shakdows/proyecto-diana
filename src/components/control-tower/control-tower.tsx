'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { AssetImage } from '@/components/ui/asset-image';
import { VehicleDrawer } from './vehicle-drawer';
import { ProgressBar } from '@/components/ui/progress-bar';
import { StatusChip } from '@/components/ui/status-chip';
import { EmptyState } from '@/components/feedback/states';
import { vocabularyFor } from '@/features/equipment/services/equipment-kind';
import type { BoardRow } from '@/features/demo/board';
import { formatDayTime, formatNumber } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

/**
 * Vehículos en proceso.
 *
 * La lista ocupa el ancho entero y el detalle sale en un cajón lateral, solo
 * cuando alguien lo pide.
 *
 * Antes había una tarjeta fija al costado. Costaba un tercio de la pantalla
 * permanente para hablar de UN vehículo, y ese tercio se lo quitaba a los ocho
 * de la lista: a 1280 px la fila se quedaba sin sitio para el modelo y el
 * cliente. Un detalle que no se ha pedido no debería cobrar alquiler.
 *
 * Nada queda seleccionado al cargar: la pantalla abre mostrando el taller, no
 * el primer vehículo por orden alfabético del azar.
 */
export function ControlTower({
  rows,
  now,
}: {
  readonly rows: readonly BoardRow[];
  readonly now: Date;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = rows.find((r) => r.order.id === selectedId) ?? null;

  return (
    <>
      {/* ⚠️ `@container`: la fila decide por SU ancho, no por el de la ventana.
          A 1280 px la rejilla ya parte en dos columnas y esta lista se queda
          con 612 px, pero `lg:`/`md:` seguían siendo ciertos y la fila
          mostraba avance y hora estimada como si tuviera la pantalla entera.
          Las columnas fijas sumaban más que el ancho disponible, así que la
          única elástica —el modelo y el cliente— se aplastaba a cero: la fila
          decía «ABC-123» y nada más, y la hora estimada se montaba encima del
          botón. Con consultas de contenedor eso no puede volver a pasar en
          ningún ancho, ni aquí ni donde se reutilice la lista. */}
      <section className="@container min-w-0 rounded-panel border border-border bg-surface-raised">
        <header className="flex items-center justify-between gap-4 px-5 py-4">
          <h2 className="font-display text-lg font-semibold tracking-tight text-fg">
            Vehículos en proceso
          </h2>
          <Link
            href="/ordenes"
            className="shrink-0 text-sm font-medium text-brand-600 transition-colors hover:text-brand-700"
          >
            Ver todos
          </Link>
        </header>

        {rows.length === 0 ? (
          <EmptyState
            title="No hay vehículos en proceso"
            hint="Registra una recepción para abrir la primera orden."
          />
        ) : (
          <ul className="space-y-2 px-3 pb-3">
            {rows.map((row) => (
              <li key={row.order.id}>
                <VehicleRow
                  row={row}
                  now={now}
                  selected={row.order.id === selectedId}
                  onSelect={() => setSelectedId(row.order.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <VehicleDrawer row={selected} now={now} onClose={() => setSelectedId(null)} />
    </>
  );
}

function VehicleRow({
  row,
  now,
  selected,
  onSelect,
}: {
  readonly row: BoardRow;
  readonly now: Date;
  readonly selected: boolean;
  readonly onSelect: () => void;
}) {
  const { order, eta } = row;
  const vocab = vocabularyFor(order.equipmentKind);

  return (
    <div
      className={cn(
        'group relative flex items-center gap-3 rounded-panel border px-3 py-3',
        'transition-colors duration-150 ease-snap',
        selected
          ? 'border-brand-200 bg-brand-50'
          : 'border-border bg-surface-raised hover:bg-surface-sunken',
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        aria-haspopup="dialog"
        aria-expanded={selected}
        aria-label={`Ver la ficha de ${order.plate}, ${order.vehicle}`}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <AssetImage
          alt={order.vehicle}
          subject={order.vehicle}
          equipmentKind={order.equipmentKind}
          fit="cover"
          rounded="control"
          className="h-12 w-16 shrink-0"
        />

        <span className="w-[5.5rem] shrink-0">
          <span className="inline-flex rounded-chip border border-border-strong bg-surface px-2 py-1 font-mono text-xs font-bold tracking-[0.06em] text-fg">
            {order.plate.replace(/^(.{3})(.*)$/u, '$1-$2')}
          </span>
        </span>

        <span className="min-w-[7rem] flex-1">
          <span className="block truncate text-sm font-semibold text-fg">{order.vehicle}</span>
          <span className="block truncate text-xs text-fg-subtle">
            {order.modelYear} · {order.customer}
          </span>
        </span>

        <span className="hidden w-32 shrink-0 @xl:block">
          <StatusChip status={order.status} />
        </span>

        <span className="hidden w-36 shrink-0 items-center gap-2 @3xl:flex">
          <ProgressBar
            percent={row.progressPercent}
            label={`Avance de ${order.code}`}
            showValue={false}
          />
          <span data-numeric className="shrink-0 text-xs font-semibold text-fg">
            {Math.round(row.progressPercent)}%
          </span>
        </span>

        <span className="hidden w-20 shrink-0 text-right @4xl:block">
          {eta.etaAt === null ? (
            <span className="text-xs text-fg-subtle">Sin ETA</span>
          ) : (
            <>
              <span className="block text-[0.625rem] uppercase tracking-wide text-fg-subtle">
                ETA
              </span>
              <span data-numeric className="block text-sm font-semibold text-fg">
                {formatDayTime(eta.etaAt, now)}
              </span>
            </>
          )}
        </span>
      </button>

      <Link
        href={`/ordenes/${order.id}`}
        aria-label={`Abrir la orden ${order.code}`}
        className={cn(
          'grid size-9 shrink-0 place-items-center rounded-control transition-colors duration-150',
          selected
            ? 'bg-brand-600 text-white hover:bg-brand-700'
            : 'bg-surface-sunken text-fg-muted hover:bg-graphite-200 hover:text-fg',
        )}
      >
        <ArrowRight aria-hidden className="size-4" />
      </Link>

      <span className="sr-only">
        {order.serviceType} · {formatNumber(order.usage)} {vocab.usageUnit}
      </span>
    </div>
  );
}
