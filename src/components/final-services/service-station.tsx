'use client';

import { useMemo } from 'react';
import { usePersistentState } from '@/lib/demo/store';
import Link from 'next/link';
import {
  ArrowRight,
  Check,
  Clock,
  Droplets,
  Gauge,
  Play,
  TriangleAlert,
} from 'lucide-react';
import { AssetImage } from '@/components/ui/asset-image';
import { Plate } from '@/components/ui/plate';
import { STATUS_LABELS } from '@/features/orders/services/order-status';
import {
  byUrgency,
  finish,
  finished,
  inProgress,
  isOverrunning,
  SERVICE_LABELS,
  start,
  startCheck,
  statusAfter,
  summarize,
  waiting,
  type QueueEntry,
  type ServiceKind,
} from '@/features/final-services/services/station';
import { formatMinutes } from '@/features/repairs/services/time-tracking';
import { cn } from '@/lib/utils/cn';

/**
 * Estación de servicios finales: lavado o alineamiento.
 *
 * Una sola pantalla para las dos porque comparten forma —una cola, un
 * vehículo en proceso, marcas de inicio y fin— y duplicarla garantizaría que
 * dentro de un mes solo una de las dos tenga el aviso de «se está alargando».
 *
 * Lo que NO comparten es el orden: el alineamiento va antes que el lavado,
 * porque su prueba en pista ensucia el vehículo. Eso vive en el dominio.
 */
export function ServiceStation({
  kind,
  initialQueue,
}: {
  readonly kind: ServiceKind;
  readonly initialQueue: readonly QueueEntry[];
}) {
  const [queue, setQueue] = usePersistentState<readonly QueueEntry[]>(
    `estacion.${kind}`,
    initialQueue,
  );

  const current = inProgress(queue);
  const pendientes = useMemo(() => byUrgency(waiting(queue)), [queue]);
  const listos = useMemo(() => finished(queue), [queue]);
  const totals = useMemo(() => summarize(queue), [queue]);

  const Icon = kind === 'lavado' ? Droplets : Gauge;

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-5 rounded-panel border border-border bg-surface-raised p-6">
        <div className="min-w-0">
          <h1 className="flex items-center gap-3 font-display text-2xl font-semibold tracking-tight text-fg">
            <span
              aria-hidden
              className="grid size-10 place-items-center rounded-control bg-brand-50 text-brand-600"
            >
              <Icon className="size-5" />
            </span>
            {SERVICE_LABELS[kind]}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-fg-muted">
            {kind === 'alineamiento'
              ? 'Solo entran vehículos con calidad aprobada. Al terminar, el vehículo pasa a lavado: la prueba en pista lo ensucia.'
              : 'Solo entran vehículos con calidad aprobada. Es la última estación antes de la entrega.'}
          </p>
        </div>

        <dl className="flex flex-wrap gap-6">
          <Stat label="En espera" value={totals.waiting} />
          <Stat label="En proceso" value={totals.inProgress} />
          <Stat label="Terminados hoy" value={totals.finishedToday} tone="ok" />
          <Stat label="Con hora vencida" value={totals.overdue} tone={totals.overdue > 0 ? 'crit' : undefined} />
        </dl>
      </header>

      {/* El vehículo en proceso, grande y solo. Es lo único que se está haciendo. */}
      {current === undefined ? (
        <section className="rounded-panel border border-dashed border-border-strong bg-surface-raised px-6 py-10 text-center">
          <span
            aria-hidden
            className="mx-auto grid size-14 place-items-center rounded-full bg-surface-sunken text-fg-subtle"
          >
            <Icon className="size-7" />
          </span>
          <h2 className="mt-4 font-display text-lg font-semibold tracking-tight text-fg">
            Bahía libre
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-fg-muted">
            {pendientes.length === 0
              ? 'No hay vehículos esperando. Cuando calidad apruebe una orden, aparecerá aquí.'
              : 'Empieza por el primero de la cola: está ordenada por hora prometida.'}
          </p>
        </section>
      ) : (
        <section
          className={cn(
            'rounded-panel border p-6',
            isOverrunning(current) ? 'border-warn-500/50 bg-warn-100/30' : 'border-brand-600/40 bg-brand-50',
          )}
        >
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-fg-subtle">
            En proceso ahora
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-5">
            <AssetImage
              alt={`Ilustración de ${current.vehicle}`}
              subject={current.vehicle}
              fit="cover"
              rounded="control"
              className="h-20 w-32 shrink-0"
            />

            <div className="min-w-0 flex-1">
              <p className="font-display text-xl font-semibold tracking-tight text-fg">
                {current.vehicle}
              </p>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <Plate value={current.plate} />
                <span data-numeric className="font-mono text-xs text-fg-subtle">
                  {current.orderCode}
                </span>
                <span className="text-sm text-fg-muted">{current.customer}</span>
              </p>
              <p
                className={cn(
                  'mt-2.5 inline-flex items-center gap-2 text-sm',
                  isOverrunning(current) ? 'font-medium text-warn-700' : 'text-fg-muted',
                )}
              >
                <Clock aria-hidden className="size-4" />
                <span data-numeric>
                  {formatMinutes(current.startedMinutesAgo ?? 0)} en la bahía
                </span>
                {isOverrunning(current) && (
                  <span data-numeric>
                    · lo normal son {formatMinutes(current.typicalMinutes)}
                  </span>
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setQueue((q) => finish(q, current.orderId))}
              className={cn(
                'inline-flex h-14 shrink-0 items-center gap-2 rounded-control bg-ok-600 px-6 text-base font-semibold text-white',
                'transition-[background-color,transform] duration-150 ease-snap hover:bg-ok-700 active:scale-[0.98]',
              )}
            >
              <Check aria-hidden className="size-5" />
              Terminar {SERVICE_LABELS[kind].toLowerCase()}
            </button>
          </div>

          {/* A dónde va después: el operario no debería tener que preguntarlo. */}
          <p className="mt-4 flex items-center gap-2 border-t border-border pt-4 text-sm text-fg-muted">
            <ArrowRight aria-hidden className="size-4 text-brand-600" />
            Al terminar pasa a{' '}
            <strong className="font-medium text-fg">
              {STATUS_LABELS[statusAfter(kind, current.remainingServices)]}
            </strong>
          </p>
        </section>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="overflow-hidden rounded-panel border border-border bg-surface-raised">
          <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
            <h2 className="font-display text-base font-semibold tracking-tight text-fg">
              En espera
            </h2>
            <span data-numeric className="text-sm text-fg-muted">
              {pendientes.length}
            </span>
          </header>

          {pendientes.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-fg-subtle">
              Nada pendiente en esta estación.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {pendientes.map((item) => {
                const check = startCheck(queue, item.orderId);
                const vencido = item.promisedInMinutes !== null && item.promisedInMinutes < 0;

                return (
                  <li key={item.orderId} className="flex flex-wrap items-center gap-4 px-5 py-4">
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2">
                        <Plate value={item.plate} size="sm" />
                        <span className="truncate text-sm font-medium text-fg">
                          {item.vehicle}
                        </span>
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                        <span className="text-fg-muted">{item.customer}</span>
                        <span
                          data-numeric
                          className={cn(
                            'inline-flex items-center gap-1.5',
                            vencido ? 'font-medium text-crit-600' : 'text-fg-subtle',
                          )}
                        >
                          <Clock aria-hidden className="size-3.5" />
                          {item.promisedInMinutes === null
                            ? 'Sin hora comprometida'
                            : vencido
                              ? `Vencida hace ${formatMinutes(-item.promisedInMinutes)}`
                              : `Entrega en ${formatMinutes(item.promisedInMinutes)}`}
                        </span>
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={!check.canStart}
                      title={check.reason}
                      onClick={() => setQueue((q) => start(q, item.orderId))}
                      className={cn(
                        'inline-flex h-11 shrink-0 items-center gap-2 rounded-control px-4 text-sm font-semibold',
                        'transition-[background-color,transform] duration-150 ease-snap active:scale-[0.98]',
                        'bg-brand-600 text-white hover:bg-brand-700',
                        'disabled:pointer-events-none disabled:bg-surface-sunken disabled:text-fg-subtle',
                      )}
                    >
                      <Play aria-hidden className="size-4" />
                      Empezar
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {/*
            El motivo por el que no se puede empezar se dice UNA vez debajo de
            la lista, no repetido en cada fila: es siempre el mismo y ocuparía
            más sitio que la cola.
          */}
          {current !== undefined && pendientes.length > 0 && (
            <p className="flex items-start gap-2 border-t border-border bg-surface-sunken px-5 py-3 text-sm text-fg-muted">
              <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-warn-600" />
              Termina primero {current.plate}. Dos vehículos a la vez dejan uno olvidado en la
              bahía con el reloj corriendo.
            </p>
          )}
        </section>

        <section className="overflow-hidden rounded-panel border border-border bg-surface-raised">
          <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
            <h2 className="font-display text-base font-semibold tracking-tight text-fg">
              Terminados hoy
            </h2>
            <span data-numeric className="text-sm text-fg-muted">
              {listos.length}
            </span>
          </header>

          {listos.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-fg-subtle">
              Todavía no has terminado ninguno hoy.
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {listos.map((item) => (
                <li key={item.orderId} className="flex items-center gap-4 px-5 py-4">
                  <span
                    aria-hidden
                    className="grid size-8 shrink-0 place-items-center rounded-full bg-ok-100 text-ok-600"
                  >
                    <Check className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2">
                      <Plate value={item.plate} size="sm" />
                      <span className="truncate text-sm text-fg-muted">{item.vehicle}</span>
                    </p>
                    <p className="mt-1 text-sm text-fg-subtle">
                      {STATUS_LABELS[statusAfter(kind, item.remainingServices)]}
                    </p>
                  </div>
                  <Link
                    href={`/ordenes/${item.orderId}`}
                    className="shrink-0 text-sm font-medium text-brand-600 transition-colors hover:text-brand-700"
                  >
                    Ver orden
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  readonly label: string;
  readonly value: number;
  readonly tone?: 'ok' | 'crit';
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-[0.06em] text-fg-subtle">{label}</dt>
      <dd
        data-numeric
        className={cn(
          'mt-1 font-display text-2xl font-semibold tracking-tight',
          tone === 'ok' && 'text-ok-600',
          tone === 'crit' && 'text-crit-600',
          tone === undefined && 'text-fg',
        )}
      >
        {value}
      </dd>
    </div>
  );
}
