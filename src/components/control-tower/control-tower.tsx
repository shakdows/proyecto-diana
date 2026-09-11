'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight, Camera, FileText, MoreHorizontal, Phone } from 'lucide-react';
import { AssetImage } from '@/components/ui/asset-image';
import { ProgressBar } from '@/components/ui/progress-bar';
import { StatusChip } from '@/components/ui/status-chip';
import { TrafficLightDot } from '@/components/ui/traffic-light';
import { EmptyState } from '@/components/feedback/states';
import { CorporateBadge } from '@/components/ui/plate';
import { vocabularyFor } from '@/features/equipment/services/equipment-kind';
import type { BoardRow } from '@/features/demo/board';
import { formatDayTime, formatNumber } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

/**
 * Vehículos en proceso, con detalle fijo al costado.
 *
 * La fila seleccionada no abre un panel que tape la lista: alimenta la tarjeta
 * de la derecha, que está siempre visible. El asesor recorre la lista con el
 * cliente al teléfono y va viendo el detalle sin perder de vista en qué punto
 * de la lista estaba.
 *
 * La primera fila queda seleccionada al cargar, para que la tarjeta nunca
 * aparezca vacía pidiendo que alguien haga algo antes de servir para nada.
 */
export function ControlTower({
  rows,
  now,
}: {
  readonly rows: readonly BoardRow[];
  readonly now: Date;
}) {
  const [selectedId, setSelectedId] = useState(rows[0]?.order.id ?? '');
  const selected = rows.find((r) => r.order.id === selectedId) ?? rows[0];

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_21rem]">
      <section className="min-w-0 rounded-panel border border-border bg-surface-raised">
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
                  selected={row.order.id === selected?.order.id}
                  onSelect={() => setSelectedId(row.order.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="min-w-0 space-y-5">
        {selected !== undefined && <QuickDetail row={selected} />}
        <ServicePromo />
      </div>
    </div>
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
        aria-pressed={selected}
        aria-label={`Ver el detalle de ${order.plate}, ${order.vehicle}`}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <AssetImage
          alt={`Fotografía de ${order.vehicle}`}
          rounded="control"
          className="size-14 shrink-0"
        />

        <span className="w-[5.5rem] shrink-0">
          <span className="inline-flex rounded-chip border border-border-strong bg-surface px-2 py-1 font-mono text-xs font-bold tracking-[0.06em] text-fg">
            {order.plate.replace(/^(.{3})(.*)$/u, '$1-$2')}
          </span>
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-fg">{order.vehicle}</span>
          <span className="block truncate text-xs text-fg-subtle">
            {order.modelYear} · {order.customer}
          </span>
        </span>

        <span className="hidden w-32 shrink-0 sm:block">
          <StatusChip status={order.status} />
        </span>

        <span className="hidden w-36 shrink-0 items-center gap-2 md:flex">
          <ProgressBar
            percent={row.progressPercent}
            label={`Avance de ${order.code}`}
            showValue={false}
          />
          <span data-numeric className="shrink-0 text-xs font-semibold text-fg">
            {Math.round(row.progressPercent)}%
          </span>
        </span>

        <span className="hidden w-20 shrink-0 text-right lg:block">
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

/** Ficha del vehículo seleccionado, con las tres acciones que más se usan. */
function QuickDetail({ row }: { readonly row: BoardRow }) {
  const { order, light } = row;

  return (
    <section className="rounded-panel border border-border bg-surface-raised p-5">
      <header className="flex items-center justify-between gap-3">
        <h2 className="font-display text-base font-semibold tracking-tight text-fg">
          Detalle rápido
        </h2>
        <MoreHorizontal aria-hidden className="size-4 text-fg-subtle" />
      </header>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span className="inline-flex rounded-chip border border-border-strong bg-surface px-2.5 py-1 font-mono text-sm font-bold tracking-[0.06em] text-fg">
          {order.plate.replace(/^(.{3})(.*)$/u, '$1-$2')}
        </span>
        <StatusChip status={order.status} />
      </div>

      <p className="mt-3 text-sm font-medium text-fg">
        {order.vehicle} · {order.modelYear}
      </p>
      <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-sm text-fg-muted">
        <span>Cliente: {order.customer}</span>
        {order.corporateClient !== null && <CorporateBadge name={order.corporateClient} />}
      </p>

      <div className="mt-4 flex items-center gap-3">
        <ProgressBar
          percent={row.progressPercent}
          label={`Avance de ${order.code}`}
          showValue={false}
        />
        <span data-numeric className="shrink-0 text-sm font-semibold text-fg">
          {Math.round(row.progressPercent)}%
        </span>
      </div>

      <p className="mt-3">
        <TrafficLightDot color={light.color} reason={light.reason} showLabel />
      </p>

      <div className="mt-5 grid grid-cols-3 gap-2 border-t border-border pt-4">
        <QuickAction href={`/ordenes/${order.id}`} icon={<FileText />} label="Ver orden" />
        <QuickAction href={`/ordenes/${order.id}`} icon={<Camera />} label="Evidencias" />
        <QuickAction href={`/clientes`} icon={<Phone />} label="Contactar" />
      </div>
    </section>
  );
}

function QuickAction({
  href,
  icon,
  label,
}: {
  readonly href: string;
  readonly icon: React.ReactNode;
  readonly label: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1.5 rounded-control py-2 text-center transition-colors duration-150 hover:bg-surface-sunken"
    >
      <span
        aria-hidden
        className="grid size-9 place-items-center rounded-control bg-surface-sunken text-fg-muted [&>svg]:size-4"
      >
        {icon}
      </span>
      <span className="text-[0.6875rem] text-fg-muted">{label}</span>
    </Link>
  );
}

/** Bloque de marca. Es lo único de la pantalla que no informa de la operación. */
function ServicePromo() {
  return (
    <section className="relative overflow-hidden rounded-panel bg-graphite-950 p-5 text-graphite-200">
      <div
        aria-hidden
        className="absolute inset-y-0 right-0 w-1/2 bg-linear-to-l from-brand-900/50 to-transparent"
      />
      <div className="relative">
        <p className="font-display text-lg font-semibold leading-snug tracking-tight text-white">
          Un servicio
          <br />
          de calidad te lleva
          <br />
          más lejos.
        </p>
        <span aria-hidden className="mt-3 block h-0.5 w-10 rounded-full bg-brand-500" />
        <p className="mt-3 text-xs text-graphite-400">
          Más que un taller, somos tu aliado en el camino.
        </p>
      </div>
    </section>
  );
}
