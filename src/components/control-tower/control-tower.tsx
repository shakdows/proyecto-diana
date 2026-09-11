'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowRight, SlidersHorizontal } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { CorporateBadge, Plate } from '@/components/ui/plate';
import { ProgressBar } from '@/components/ui/progress-bar';
import { StatusChip } from '@/components/ui/status-chip';
import { TrafficLightDot } from '@/components/ui/traffic-light';
import { Drawer } from '@/components/overlay/modal';
import { EmptyState } from '@/components/feedback/states';
import { Timeline, type TimelineEvent } from '@/components/ui/timeline';
import { vocabularyFor } from '@/features/equipment/services/equipment-kind';
import type { BoardRow } from '@/features/demo/board';
import { formatMinutes } from '@/features/repairs/services/time-tracking';
import { formatDayTime, formatNumber, formatTime } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import { OrderCard, OrderRow, OrderRowHeader } from './order-row';

/**
 * Torre de control.
 *
 * Los tres filtros de arriba no son decoración: son las tres preguntas que un
 * asesor se hace al llegar —«qué hay», «qué se me está yendo de las manos»,
 * «qué ya llegó tarde»—. Cada uno lleva su recuento, de modo que el filtro
 * informa aunque no se pulse.
 */

type Filter = 'todos' | 'atencion' | 'retrasados';

export function ControlTower({
  rows,
  now,
}: {
  readonly rows: readonly BoardRow[];
  readonly now: Date;
}) {
  const [filter, setFilter] = useState<Filter>('todos');
  const [selected, setSelected] = useState<BoardRow | null>(null);

  const counts = useMemo(
    () => ({
      todos: rows.length,
      // «Atención» incluye lo rojo y lo ámbar, pero NO el gris: una orden que
      // espera al cliente no se arregla corriendo, se arregla llamando.
      atencion: rows.filter((r) => r.light.color === 'rojo' || r.light.color === 'amarillo').length,
      retrasados: rows.filter((r) => r.light.color === 'rojo').length,
    }),
    [rows],
  );

  const visible = useMemo(() => {
    if (filter === 'atencion') {
      return rows.filter((r) => r.light.color === 'rojo' || r.light.color === 'amarillo');
    }
    if (filter === 'retrasados') return rows.filter((r) => r.light.color === 'rojo');
    return rows;
  }, [rows, filter]);

  const tabs: readonly { id: Filter; label: string }[] = [
    { id: 'todos', label: 'Todos' },
    { id: 'atencion', label: 'Requieren atención' },
    { id: 'retrasados', label: 'Retrasados' },
  ];

  return (
    <section className="overflow-hidden rounded-panel border border-border bg-surface-raised">
      <header className="flex flex-wrap items-start justify-between gap-4 px-5 py-4">
        <div>
          <h2 className="font-display text-base font-semibold tracking-tight text-fg">
            Control Tower
          </h2>
          <p className="mt-0.5 text-sm text-fg-muted">
            Seguimiento en tiempo real de los vehículos en proceso.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div role="tablist" aria-label="Filtrar órdenes" className="flex rounded-control bg-surface-sunken p-0.5">
            {tabs.map((tab) => {
              const active = tab.id === filter;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  type="button"
                  aria-selected={active}
                  onClick={() => setFilter(tab.id)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-[0.4rem] px-3 py-1.5 text-xs font-medium',
                    'transition-colors duration-150 ease-snap',
                    active
                      ? 'bg-surface text-fg shadow-raise'
                      : 'text-fg-muted hover:text-fg',
                  )}
                >
                  {tab.label}
                  <span
                    data-numeric
                    className={cn(
                      'rounded-chip px-1.5 py-0.5 text-[0.625rem] font-semibold',
                      active ? 'bg-brand-50 text-brand-700' : 'bg-graphite-100 text-fg-subtle',
                    )}
                  >
                    {counts[tab.id]}
                  </span>
                </button>
              );
            })}
          </div>

          <Button variant="secondary" size="sm" type="button">
            <SlidersHorizontal aria-hidden className="size-3.5" />
            Filtros
          </Button>
        </div>
      </header>

      {visible.length === 0 ? (
        <EmptyState
          title={
            filter === 'retrasados'
              ? 'Ninguna orden va retrasada'
              : 'Ninguna orden requiere atención'
          }
          hint="Todo el taller está dentro de los tiempos previstos."
          action={
            <Button variant="secondary" size="sm" type="button" onClick={() => setFilter('todos')}>
              Ver todas las órdenes
            </Button>
          }
        />
      ) : (
        <>
          <div className="hidden overflow-x-auto xl:block">
            <div className="min-w-[72rem]">
              <OrderRowHeader />
              {visible.map((row) => (
                <OrderRow key={row.order.id} row={row} now={now} onOpen={setSelected} />
              ))}
            </div>
          </div>

          <div className="border-t border-border xl:hidden">
            {visible.map((row) => (
              <OrderCard key={row.order.id} row={row} now={now} onOpen={setSelected} />
            ))}
          </div>
        </>
      )}

      <OrderDrawer row={selected} now={now} onClose={() => setSelected(null)} />
    </section>
  );
}

/**
 * Detalle rápido.
 *
 * Existe para no navegar cuando solo hay que mirar. El asesor tiene al cliente
 * al teléfono preguntando por su camioneta: abre, lee, cierra y sigue en la
 * lista donde estaba. Ir a la ficha completa y volver le cuesta el sitio.
 */
function OrderDrawer({
  row,
  now,
  onClose,
}: {
  readonly row: BoardRow | null;
  readonly now: Date;
  readonly onClose: () => void;
}) {
  if (row === null) {
    // El diálogo sigue montado y cerrado: desmontarlo se salta la animación de
    // salida y el navegador pierde el foco que tenía que devolver a la fila.
    return (
      <Drawer open={false} onClose={onClose} title="">
        {null}
      </Drawer>
    );
  }

  const { order, light, eta, totals } = row;
  const vocab = vocabularyFor(order.equipmentKind);

  const events: readonly TimelineEvent[] = order.sessions.map((session, i) => ({
    id: `s${i}`,
    at: formatTime(session.startedAt),
    title: session.kind === 'trabajo' ? 'Trabajo iniciado' : 'Pausa registrada',
    detail: session.pauseReason,
    tone: session.kind === 'trabajo' ? 'brand' : 'warn',
  }));

  return (
    <Drawer
      open
      onClose={onClose}
      title={order.serviceType}
      description={`${order.code} · ${order.vehicle}`}
      footer={
        <Link
          href={`/ordenes/${order.id}`}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-control bg-brand-600 px-4 text-sm font-medium text-white transition-colors duration-150 hover:bg-brand-700"
        >
          Abrir la orden completa
          <ArrowRight aria-hidden className="size-4" />
        </Link>
      }
    >
      <div className="flex items-center gap-3">
        <Plate value={order.plate} size="lg" />
        <div className="min-w-0">
          <p className="text-sm font-medium text-fg">{order.vehicle}</p>
          <p data-numeric className="text-xs text-fg-subtle">
            {order.modelYear} · {formatNumber(order.usage)} {vocab.usageUnit}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <StatusChip status={order.status} />
        <TrafficLightDot color={light.color} reason={light.reason} showLabel />
      </div>

      <div className="mt-5">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-fg-muted">Avance</span>
          <span data-numeric className="font-display text-2xl font-semibold text-fg">
            {row.progressPercent} %
          </span>
        </div>
        <ProgressBar percent={row.progressPercent} label={`Avance de ${order.code}`} className="mt-2" />
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border pt-5 text-sm">
        <Detail label="Cliente">
          <span className="text-fg">{order.customer}</span>
          {order.corporateClient !== null && (
            <CorporateBadge name={order.corporateClient} className="ml-1.5" />
          )}
        </Detail>
        <Detail label="Asesor">{order.advisor}</Detail>
        <Detail label="Técnico">
          {order.technician === null ? (
            <span className="text-fg-subtle">Sin asignar</span>
          ) : (
            <span className="inline-flex items-center gap-1.5">
              <Avatar name={order.technician} size="sm" />
              {order.technician}
            </span>
          )}
        </Detail>
        <Detail label="Tiempo efectivo">
          <span data-numeric>{formatMinutes(totals.effectiveMinutes)}</span>
        </Detail>
        <Detail label="Entrega estimada">
          <span data-numeric>
            {eta.etaAt === null ? 'En espera de un tercero' : formatDayTime(eta.etaAt, now)}
          </span>
        </Detail>
        <Detail label="Entrega prometida">
          <span data-numeric>
            {row.promisedAt === null ? '—' : formatDayTime(row.promisedAt, now)}
          </span>
        </Detail>
      </dl>

      {events.length > 0 && (
        <div className="mt-5 border-t border-border pt-5">
          <h3 className="mb-3 text-xs font-medium uppercase tracking-[0.06em] text-fg-subtle">
            Sesiones de trabajo
          </h3>
          <Timeline events={events} />
        </div>
      )}
    </Drawer>
  );
}

function Detail({
  label,
  children,
}: {
  readonly label: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-fg-subtle">{label}</dt>
      <dd className="mt-0.5 truncate text-sm text-fg-muted">{children}</dd>
    </div>
  );
}
