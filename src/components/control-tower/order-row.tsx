'use client';

import Link from 'next/link';
import { ChevronRight, Ellipsis } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { CorporateBadge, Plate } from '@/components/ui/plate';
import { ProgressBar } from '@/components/ui/progress-bar';
import { StatusChip } from '@/components/ui/status-chip';
import { TrafficLightDot } from '@/components/ui/traffic-light';
import { vocabularyFor } from '@/features/equipment/services/equipment-kind';
import type { BoardRow } from '@/features/demo/board';
import { formatMinutes } from '@/features/repairs/services/time-tracking';
import { formatDayTime, formatNumber } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

/**
 * Rejilla de la torre de control.
 *
 * Ocho columnas fijas y una flexible declaradas UNA vez, compartidas por la
 * cabecera y por todas las filas. Con anchos por celda la cabecera se
 * desalinea del contenido en cuanto una razón social crece, y una tabla
 * desalineada deja de poder barrerse en vertical, que es su único trabajo.
 */
export const ROW_GRID =
  'grid grid-cols-[8.5rem_minmax(11rem,1fr)_9rem_9.5rem_8.5rem_5.5rem_6.75rem_2.25rem] items-center gap-x-4';

export function OrderRowHeader() {
  return (
    <div
      className={cn(
        ROW_GRID,
        'border-b border-border px-5 py-2.5 text-xs font-medium uppercase tracking-[0.06em] text-fg-subtle',
      )}
    >
      <span>Identificación</span>
      <span>Trabajo</span>
      <span>Cliente</span>
      <span>Estado</span>
      <span>Avance</span>
      <span className="text-right">Entrega</span>
      <span>Alerta</span>
      <span className="sr-only">Acciones</span>
    </div>
  );
}

/**
 * Una orden como fila de la torre de control.
 *
 * Alta a propósito (~84 px): cada columna carga DOS hechos relacionados, y los
 * dos caben sin apretarse. Una fila de 40 px obliga a repartir esos hechos en
 * columnas sueltas y el asesor acaba leyendo en zigzag.
 *
 * El cuerpo de la fila ABRE el panel lateral —consultar sin perder la lista es
 * lo que se hace veinte veces por turno— y el galón de la derecha es un enlace
 * de verdad a la orden completa, con su `href`: así sigue funcionando abrir en
 * pestaña nueva, que un `onClick` sobre un `div` habría roto.
 */
export function OrderRow({
  row,
  now,
  onOpen,
}: {
  readonly row: BoardRow;
  readonly now: Date;
  readonly onOpen: (row: BoardRow) => void;
}) {
  const { order, light, eta } = row;
  const vocab = vocabularyFor(order.equipmentKind);

  return (
    <div className="group relative border-b border-border last:border-b-0 transition-colors duration-150 hover:bg-surface-sunken">
      <button
        type="button"
        onClick={() => onOpen(row)}
        aria-label={`Ver detalle de ${order.code}, ${order.vehicle}`}
        className={cn(ROW_GRID, 'w-full px-5 py-3.5 text-left')}
      >
        {/* 1 · Identificación */}
        <span className="flex flex-col items-start gap-1">
          <Plate value={order.plate} />
          <span className="font-mono text-xs text-fg-subtle">{order.code}</span>
        </span>

        {/* 2 · Trabajo y vehículo */}
        <span className="min-w-0">
          <span
            title={order.serviceType}
            className="block truncate text-sm font-semibold tracking-tight text-fg group-hover:text-brand-700"
          >
            {order.serviceType}
          </span>
          <span className="block truncate text-sm text-fg-muted">{order.vehicle}</span>
          <span data-numeric className="block truncate text-xs text-fg-subtle">
            {order.modelYear} · {formatNumber(order.usage)} {vocab.usageUnit}
          </span>
        </span>

        {/* 3 · Cliente */}
        <span className="min-w-0">
          <span title={order.customer} className="block truncate text-sm text-fg">
            {order.customer}
          </span>
          {order.corporateClient !== null && (
            <CorporateBadge name={order.corporateClient} className="mt-1" />
          )}
        </span>

        {/* 4 · Estado y responsable */}
        <span className="flex min-w-0 flex-col items-start gap-1.5">
          <StatusChip status={order.status} />
          {order.technician !== null ? (
            <span className="flex min-w-0 items-center gap-1.5">
              <Avatar name={order.technician} size="sm" />
              <span className="truncate text-xs text-fg-subtle">{order.technician}</span>
            </span>
          ) : (
            <span className="text-xs text-fg-subtle">Sin asignar</span>
          )}
        </span>

        {/* 5 · Avance. El porcentaje solo no dice si llega hoy; el restante sí. */}
        <span className="min-w-0">
          <span data-numeric className="block text-sm font-semibold text-fg">
            {Math.round(row.progressPercent)} %
          </span>
          <ProgressBar
            percent={row.progressPercent}
            label={`Avance de ${order.code}`}
            showValue={false}
            className="mt-1"
          />
          <span className="mt-1 block truncate text-xs text-fg-subtle">
            {eta.indeterminate
              ? 'Sin estimación'
              : eta.overrunMinutes > 0
                ? `Excedido ${formatMinutes(eta.overrunMinutes)}`
                : `Faltan ${formatMinutes(eta.remainingMinutes)}`}
          </span>
        </span>

        {/* 6 · Entrega */}
        <span className="text-right">
          <span data-numeric className="block whitespace-nowrap text-sm font-semibold text-fg">
            {eta.etaAt === null ? '—' : formatDayTime(eta.etaAt, now)}
          </span>
          <span data-numeric className="block whitespace-nowrap text-xs text-fg-subtle">
            {row.promisedAt === null
              ? 'sin promesa'
              : formatDayTime(row.promisedAt, now).replace(' · ', ' ')}
          </span>
        </span>

        {/* 7 · Semáforo */}
        <span>
          <TrafficLightDot color={light.color} reason={light.reason} showLabel />
        </span>

        <span />
      </button>

      {/* Enlace real, fuera del botón: dos controles interactivos no pueden
          anidarse, y este necesita `href` para abrirse en pestaña nueva. */}
      <Link
        href={`/ordenes/${order.id}`}
        aria-label={`Abrir la orden ${order.code} completa`}
        className="absolute right-4 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-control text-graphite-300 transition-colors duration-150 hover:bg-surface hover:text-brand-600"
      >
        <ChevronRight aria-hidden className="size-4" />
      </Link>
    </div>
  );
}

/** La misma orden como tarjeta, para tablet y móvil. */
export function OrderCard({
  row,
  now,
  onOpen,
}: {
  readonly row: BoardRow;
  readonly now: Date;
  readonly onOpen: (row: BoardRow) => void;
}) {
  const { order, light, eta } = row;
  const vocab = vocabularyFor(order.equipmentKind);

  return (
    <div className="border-b border-border last:border-b-0">
      <button
        type="button"
        onClick={() => onOpen(row)}
        className="w-full px-4 py-4 text-left transition-colors duration-150 active:bg-surface-sunken"
      >
        <span className="flex items-start justify-between gap-3">
          <span className="flex min-w-0 items-center gap-2.5">
            <Plate value={order.plate} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold text-fg">
                {order.serviceType}
              </span>
              <span className="block truncate text-xs text-fg-muted">
                {order.vehicle} · {order.modelYear}
              </span>
            </span>
          </span>
          <Ellipsis aria-hidden className="mt-1 size-4 shrink-0 text-graphite-300" />
        </span>

        <span className="mt-2.5 flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
          <StatusChip status={order.status} />
          <TrafficLightDot color={light.color} reason={light.reason} showLabel />
          {order.corporateClient !== null && <CorporateBadge name={order.corporateClient} />}
        </span>

        <span className="mt-3 flex items-center gap-3">
          <ProgressBar
            percent={row.progressPercent}
            label={`Avance de ${order.code}`}
            showValue={false}
          />
          <span data-numeric className="shrink-0 text-sm font-semibold text-fg">
            {Math.round(row.progressPercent)} %
          </span>
        </span>

        <span className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-fg-subtle">
          <span className="truncate">{order.customer}</span>
          <span data-numeric>
            {formatNumber(order.usage)} {vocab.usageUnit}
          </span>
          <span data-numeric>
            {eta.etaAt === null ? 'Sin entrega estimada' : `Entrega ${formatDayTime(eta.etaAt, now)}`}
          </span>
        </span>
      </button>
    </div>
  );
}
