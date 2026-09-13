'use client';

import { useMemo } from 'react';
import { usePersistentState } from '@/lib/demo/store';
import Link from 'next/link';
import {
  BellRing,
  Check,
  Clock,
  KeyRound,
  PhoneCall,
  TriangleAlert,
} from 'lucide-react';
import { AssetImage } from '@/components/ui/asset-image';
import { Plate } from '@/components/ui/plate';
import { CorporateBadge } from '@/components/ui/plate';
import { formatCurrency } from '@/lib/utils/format';
import { formatMinutes } from '@/features/repairs/services/time-tracking';
import { toSoles } from '@/features/delivery/services/handover';
import { cn } from '@/lib/utils/cn';

export interface ReadyVehicle {
  readonly orderId: string;
  readonly orderCode: string;
  readonly vehicle: string;
  readonly plate: string;
  readonly customer: string;
  readonly corporateClient: string | null;
  readonly phone: string;
  readonly totalCents: number;
  readonly paidCents: number;
  readonly hasCorporateCredit: boolean;
  /** Minutos desde que quedó listo. */
  readonly readyMinutesAgo: number;
  /** Minutos desde que se avisó al cliente. `null` = sin avisar. */
  readonly notifiedMinutesAgo: number | null;
}

/**
 * Vehículos listos para entrega.
 *
 * La pantalla existe por una razón concreta: un vehículo terminado que nadie
 * ha avisado ocupa sitio, preocupa al cliente y no cobra. Por eso lo primero
 * que se ve no es el total facturado sino **cuánto lleva esperando sin que
 * se le avise a nadie**.
 */
export function ReadyQueue({ initial }: { readonly initial: readonly ReadyVehicle[] }) {
  const [vehicles, setVehicles] = usePersistentState<readonly ReadyVehicle[]>(
    'vehiculos-listos',
    initial,
  );

  /*
   * Arriba lo que lleva más tiempo listo SIN avisar. Ordenar por antigüedad a
   * secas pondría primero un vehículo avisado hace dos horas, cuyo cliente ya
   * viene de camino, por delante de uno terminado hace veinte minutos del que
   * nadie sabe nada.
   */
  const sorted = useMemo(
    () =>
      [...vehicles].sort((a, b) => {
        const aAviso = a.notifiedMinutesAgo === null ? 1 : 0;
        const bAviso = b.notifiedMinutesAgo === null ? 1 : 0;
        if (aAviso !== bAviso) return bAviso - aAviso;
        return b.readyMinutesAgo - a.readyMinutesAgo;
      }),
    [vehicles],
  );

  const sinAvisar = vehicles.filter((v) => v.notifiedMinutesAgo === null).length;
  const porCobrar = vehicles.filter(
    (v) => v.totalCents - v.paidCents > 0 && !v.hasCorporateCredit,
  ).length;

  const notify = (orderId: string): void => {
    setVehicles((prev) =>
      prev.map((v) => (v.orderId === orderId ? { ...v, notifiedMinutesAgo: 0 } : v)),
    );
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start justify-between gap-5 rounded-panel border border-border bg-surface-raised p-6">
        <div className="min-w-0">
          <h1 className="flex items-center gap-3 font-display text-2xl font-semibold tracking-tight text-fg">
            <span
              aria-hidden
              className="grid size-10 place-items-center rounded-control bg-ok-100 text-ok-600"
            >
              <KeyRound className="size-5" />
            </span>
            Vehículos listos
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-fg-muted">
            Terminados y esperando a su dueño. Un vehículo listo que nadie ha avisado ocupa sitio,
            preocupa al cliente y no cobra.
          </p>
        </div>

        <dl className="flex flex-wrap gap-6">
          <Stat label="Listos" value={vehicles.length} />
          <Stat label="Sin avisar" value={sinAvisar} tone={sinAvisar > 0 ? 'crit' : 'ok'} />
          <Stat label="Con saldo" value={porCobrar} tone={porCobrar > 0 ? 'warn' : undefined} />
        </dl>
      </header>

      {vehicles.length === 0 ? (
        <section className="rounded-panel border border-dashed border-border-strong bg-surface-raised px-6 py-12 text-center">
          <span
            aria-hidden
            className="mx-auto grid size-14 place-items-center rounded-full bg-surface-sunken text-fg-subtle"
          >
            <KeyRound className="size-7" />
          </span>
          <h2 className="mt-4 font-display text-lg font-semibold tracking-tight text-fg">
            Ningún vehículo esperando
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-fg-muted">
            Cuando una orden termine sus servicios finales aparecerá aquí para avisar al cliente.
          </p>
        </section>
      ) : (
        <ul className="space-y-4">
          {sorted.map((v) => {
            const saldo = Math.max(0, v.totalCents - v.paidCents);
            const debe = saldo > 0 && !v.hasCorporateCredit;
            const avisado = v.notifiedMinutesAgo !== null;

            return (
              <li
                key={v.orderId}
                className={cn(
                  'rounded-panel border bg-surface-raised p-5',
                  avisado ? 'border-border' : 'border-warn-500/40',
                )}
              >
                <div className="flex flex-wrap items-start gap-5">
                  <AssetImage
                    alt={v.vehicle}
                    subject={v.vehicle}
                    fit="cover"
                    rounded="control"
                    className="h-20 w-32 shrink-0"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="font-display text-lg font-semibold tracking-tight text-fg">
                      {v.vehicle}
                    </p>
                    <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      <Plate value={v.plate} size="sm" />
                      <span data-numeric className="font-mono text-xs text-fg-subtle">
                        {v.orderCode}
                      </span>
                    </p>
                    <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                      <span className="text-fg-muted">{v.customer}</span>
                      {v.corporateClient !== null && <CorporateBadge name={v.corporateClient} />}
                      <a
                        href={`tel:${v.phone.replace(/\s/gu, '')}`}
                        data-numeric
                        className="inline-flex items-center gap-1.5 font-medium text-brand-600 transition-colors hover:text-brand-700"
                      >
                        <PhoneCall aria-hidden className="size-3.5" />
                        {v.phone}
                      </a>
                    </p>

                    <p
                      className={cn(
                        'mt-2.5 inline-flex flex-wrap items-center gap-2 text-sm',
                        avisado ? 'text-fg-muted' : 'font-medium text-warn-700',
                      )}
                    >
                      <Clock aria-hidden className="size-4" />
                      <span data-numeric>Listo hace {formatMinutes(v.readyMinutesAgo)}</span>
                      <span aria-hidden className="text-fg-subtle">
                        ·
                      </span>
                      {avisado ? (
                        <span data-numeric className="inline-flex items-center gap-1.5 text-ok-600">
                          <Check aria-hidden className="size-4" />
                          Avisado hace {formatMinutes(v.notifiedMinutesAgo ?? 0)}
                        </span>
                      ) : (
                        <span>Sin avisar</span>
                      )}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-3">
                    <div className="text-right">
                      <p className="text-xs uppercase tracking-[0.06em] text-fg-subtle">
                        {debe ? 'Por cobrar' : 'Total'}
                      </p>
                      <p
                        data-numeric
                        className={cn(
                          'font-display text-xl font-semibold tracking-tight',
                          debe ? 'text-warn-700' : 'text-fg',
                        )}
                      >
                        {formatCurrency(toSoles(debe ? saldo : v.totalCents))}
                      </p>
                      {saldo > 0 && v.hasCorporateCredit && (
                        <p className="mt-0.5 text-xs text-fg-subtle">Crédito corporativo</p>
                      )}
                    </div>

                    <div className="flex flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        disabled={avisado}
                        onClick={() => notify(v.orderId)}
                        className={cn(
                          'inline-flex h-11 items-center gap-2 rounded-control border px-4 text-sm font-semibold',
                          'transition-colors duration-150 ease-snap active:scale-[0.98]',
                          'border-border-strong bg-surface text-fg hover:bg-surface-sunken',
                          'disabled:pointer-events-none disabled:border-border disabled:text-fg-subtle',
                        )}
                      >
                        <BellRing aria-hidden className="size-4" />
                        {avisado ? 'Avisado' : 'Avisar al cliente'}
                      </button>

                      <Link
                        href={`/ordenes/${v.orderId}/entrega`}
                        className={cn(
                          'inline-flex h-11 items-center gap-2 rounded-control bg-brand-600 px-4 text-sm font-semibold text-white',
                          'transition-[background-color,transform] duration-150 ease-snap hover:bg-brand-700 active:scale-[0.98]',
                        )}
                      >
                        <KeyRound aria-hidden className="size-4" />
                        Entregar
                      </Link>
                    </div>
                  </div>
                </div>

                {debe && (
                  <p className="mt-4 flex items-start gap-2 border-t border-border pt-4 text-sm text-warn-700">
                    <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
                    Esta cuenta no tiene crédito corporativo: el saldo se cobra antes de entregar
                    las llaves.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
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
  readonly tone?: 'ok' | 'warn' | 'crit';
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-[0.06em] text-fg-subtle">{label}</dt>
      <dd
        data-numeric
        className={cn(
          'mt-1 font-display text-2xl font-semibold tracking-tight',
          tone === 'ok' && 'text-ok-600',
          tone === 'warn' && 'text-warn-700',
          tone === 'crit' && 'text-crit-600',
          tone === undefined && 'text-fg',
        )}
      >
        {value}
      </dd>
    </div>
  );
}
