'use client';

import { useMemo } from 'react';
import { usePersistentState } from '@/lib/demo/store';
import { Check, CircleCheckBig, Images, ShieldCheck, X } from 'lucide-react';
import { AssetImage } from '@/components/ui/asset-image';
import { RomeroMark } from '@/components/brand/romero-logo';
import { PRIORITY_LABELS } from '@/features/diagnosis/services/findings';
import type { Priority } from '@/features/diagnosis/services/findings';
import {
  approvedLines,
  approvedTotals,
  canConfirm,
  lineTotalCents,
  outcomeOf,
  pendingLines,
  toSoles,
  type Decisions,
  type QuoteLine,
} from '@/features/quotations/services/quotation';
import { formatCurrency } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

const PRIORITY_CHIP: Readonly<Record<Priority, string>> = {
  critico: 'bg-crit-100 text-crit-700 border-crit-500/30',
  alto: 'bg-warn-100 text-warn-700 border-warn-500/30',
  medio: 'bg-warn-100/70 text-warn-700 border-warn-500/20',
  recomendacion: 'bg-wait-100 text-wait-700 border-wait-500/25',
};

/**
 * Autorización del cliente.
 *
 * NO es una pantalla del sistema: es la única que ve alguien que no trabaja
 * en el taller, desde el móvil, probablemente en la calle. Por eso no lleva
 * barra lateral, ni buscador, ni jerga —«orden de servicio», «ítem»,
 * «estado»—, y el total a autorizar está SIEMPRE a la vista en una barra
 * fija: es el número por el que llamaría por teléfono si no lo encuentra.
 *
 * Cada trabajo se aprueba o se rechaza por separado. Forzar «todo o nada»
 * empuja al cliente a aceptar trabajo que no quiere o a rechazar el que sí
 * necesita, y las dos cosas acaban en una llamada.
 */
export function CustomerAuthorization({
  lines,
  customerFirstName,
  vehicle,
  plate,
}: {
  readonly lines: readonly QuoteLine[];
  readonly customerFirstName: string;
  readonly vehicle: string;
  readonly plate: string;
}) {
  const [decisions, setDecisions] = usePersistentState<Decisions>(`autorizacion.${plate}`, {});
  const [confirmed, setConfirmed] = usePersistentState(`autorizacion.${plate}.confirmada`, false);

  const approved = useMemo(() => approvedLines(lines, decisions), [lines, decisions]);
  const totals = useMemo(() => approvedTotals(lines, decisions), [lines, decisions]);
  const pending = useMemo(() => pendingLines(lines, decisions), [lines, decisions]);
  const ready = canConfirm(lines, decisions);
  const outcome = outcomeOf(lines, decisions);

  const decide = (id: string, value: 'aprobado' | 'rechazado'): void =>
    setDecisions((d) => ({ ...d, [id]: d[id] === value ? 'pendiente' : value }));

  if (confirmed) {
    return (
      <Confirmation
        outcome={outcome}
        totals={totals}
        approvedCount={approved.length}
        rejectedCount={lines.length - approved.length}
      />
    );
  }

  return (
    <div className="min-h-dvh bg-surface-sunken pb-44">
      <header className="bg-graphite-950 px-5 py-5">
        <div className="mx-auto flex max-w-2xl items-center gap-2.5">
          <RomeroMark className="size-8 text-brand-500" />
          <span className="font-display text-sm font-bold uppercase tracking-[0.04em] text-white">
            Romero Motors
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5">
        <section className="pt-7">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-fg">
            Hola {customerFirstName}
          </h1>
          <p className="mt-2 text-base leading-relaxed text-fg-muted">
            Revisa los trabajos recomendados para tu vehículo y elige cuáles autorizas.
          </p>
        </section>

        <section className="mt-5 flex items-center gap-4 rounded-panel border border-border bg-surface-raised p-4">
          <AssetImage
            alt={`Ilustración de ${vehicle}`}
            subject={vehicle}
            fit="cover"
            rounded="control"
            className="h-16 w-24 shrink-0"
          />
          <div className="min-w-0">
            <p className="font-display text-base font-semibold tracking-tight text-fg">{vehicle}</p>
            <p className="mt-1 inline-flex rounded-chip border border-border-strong bg-surface px-2 py-0.5 font-mono text-sm font-bold tracking-[0.06em] text-fg">
              {plate}
            </p>
          </div>
        </section>

        <ul className="mt-5 space-y-4">
          {lines.map((line) => {
            const decision = decisions[line.id] ?? 'pendiente';
            return (
              <li
                key={line.id}
                className={cn(
                  'overflow-hidden rounded-panel border bg-surface-raised transition-colors duration-150',
                  decision === 'aprobado' && 'border-ok-500/50',
                  decision === 'rechazado' && 'border-border opacity-60',
                  decision === 'pendiente' && 'border-border',
                )}
              >
                <AssetImage
                  alt={line.title}
                  subject={line.title}
                  kind="evidencia"
                  rounded="chip"
                  className="h-40 w-full rounded-none"
                />

                <div className="p-4">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-chip border px-2 py-0.5 text-xs font-medium',
                      PRIORITY_CHIP[line.priority],
                    )}
                  >
                    {PRIORITY_LABELS[line.priority]}
                  </span>

                  <h2 className="mt-2.5 font-display text-xl font-semibold leading-tight tracking-tight text-fg">
                    {line.title}
                  </h2>
                  <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{line.detail}</p>

                  <p className="mt-3 flex flex-wrap items-center justify-between gap-3">
                    <span className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700">
                      <Images aria-hidden className="size-4" />
                      Ver fotos ({line.photoCount})
                    </span>
                    <span
                      data-numeric
                      className="font-display text-2xl font-semibold tracking-tight text-fg"
                    >
                      {formatCurrency(toSoles(lineTotalCents(line)))}
                    </span>
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => decide(line.id, 'rechazado')}
                      aria-pressed={decision === 'rechazado'}
                      className={cn(
                        'inline-flex h-12 items-center justify-center gap-2 rounded-control border text-sm font-semibold',
                        'transition-colors duration-150 ease-snap active:scale-[0.98]',
                        decision === 'rechazado'
                          ? 'border-crit-600 bg-crit-100 text-crit-700'
                          : 'border-border-strong bg-surface text-fg-muted hover:bg-surface-sunken',
                      )}
                    >
                      <X aria-hidden className="size-4" />
                      Rechazar
                    </button>

                    <button
                      type="button"
                      onClick={() => decide(line.id, 'aprobado')}
                      aria-pressed={decision === 'aprobado'}
                      className={cn(
                        'inline-flex h-12 items-center justify-center gap-2 rounded-control text-sm font-semibold',
                        'transition-colors duration-150 ease-snap active:scale-[0.98]',
                        decision === 'aprobado'
                          ? 'bg-ok-600 text-white'
                          : 'bg-brand-600 text-white hover:bg-brand-700',
                      )}
                    >
                      <Check aria-hidden className="size-4" />
                      {decision === 'aprobado' ? 'Aprobado' : 'Aprobar'}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <p className="mt-6 flex items-start gap-2.5 text-xs leading-relaxed text-fg-subtle">
          <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
          Puedes aceptar o rechazar cada trabajo de forma independiente. Lo que rechaces queda
          registrado y no se ejecuta.
        </p>
      </main>

      {/* Barra fija: el total a autorizar nunca se pierde de vista. */}
      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-surface/97 backdrop-blur">
        <div className="mx-auto max-w-2xl px-5 py-4">
          {approved.length > 0 && (
            <ul className="mb-3 max-h-24 space-y-1 overflow-y-auto">
              {approved.map((line) => (
                <li key={line.id} className="flex justify-between gap-4 text-sm">
                  <span className="min-w-0 truncate text-fg-muted">{line.title}</span>
                  <span data-numeric className="shrink-0 text-fg">
                    {formatCurrency(toSoles(lineTotalCents(line)))}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <p className="flex items-baseline justify-between gap-4 border-t border-border pt-3">
            <span className="text-sm font-medium text-fg">Total a autorizar</span>
            <span
              data-numeric
              className="font-display text-2xl font-semibold tracking-tight text-fg"
            >
              {formatCurrency(toSoles(totals.totalCents))}
            </span>
          </p>
          {totals.totalCents > 0 && (
            <p data-numeric className="mt-0.5 text-right text-xs text-fg-subtle">
              {formatCurrency(toSoles(totals.subtotalCents))} + IGV{' '}
              {formatCurrency(toSoles(totals.taxCents))}
            </p>
          )}

          <button
            type="button"
            disabled={!ready}
            onClick={() => setConfirmed(true)}
            className={cn(
              'mt-3 inline-flex h-13 w-full items-center justify-center gap-2 rounded-control',
              'text-base font-semibold transition-colors duration-150 ease-snap',
              ready
                ? 'bg-brand-600 text-white hover:bg-brand-700 active:scale-[0.99]'
                : 'cursor-not-allowed bg-graphite-200 text-fg-subtle',
            )}
          >
            <Check aria-hidden className="size-5" />
            Confirmar autorización
          </button>

          {/*
            Si falta decidir algo se DICE cuántos, no se deja un botón gris sin
            explicación: el cliente no está en la oficina y no va a investigar.
          */}
          {!ready && (
            <p className="mt-2 text-center text-xs text-fg-subtle">
              {pending.length === 1
                ? 'Falta decidir 1 trabajo'
                : `Faltan ${pending.length} trabajos por decidir`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Confirmation({
  outcome,
  totals,
  approvedCount,
  rejectedCount,
}: {
  readonly outcome: ReturnType<typeof outcomeOf>;
  readonly totals: ReturnType<typeof approvedTotals>;
  readonly approvedCount: number;
  readonly rejectedCount: number;
}) {
  const nada = outcome === 'rechazado_todo';

  return (
    <div className="grid min-h-dvh place-items-center bg-surface-sunken px-5">
      <div className="w-full max-w-md text-center">
        <span
          aria-hidden
          className={cn(
            'mx-auto grid size-16 place-items-center rounded-full',
            nada ? 'bg-wait-100 text-wait-700' : 'bg-ok-100 text-ok-600',
          )}
        >
          <CircleCheckBig className="size-8" />
        </span>

        <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight text-fg">
          {nada ? 'Registramos tu decisión' : 'Autorización confirmada'}
        </h1>

        <p className="mt-2 text-base leading-relaxed text-fg-muted">
          {nada
            ? 'No autorizaste ningún trabajo. Tu asesor se pondrá en contacto para coordinar la devolución del vehículo.'
            : `Autorizaste ${approvedCount} ${approvedCount === 1 ? 'trabajo' : 'trabajos'}. Tu asesor y el técnico ya fueron notificados.`}
        </p>

        {!nada && (
          <p className="mt-5 rounded-panel border border-border bg-surface-raised px-5 py-4">
            <span className="block text-sm text-fg-muted">Total autorizado</span>
            <span
              data-numeric
              className="mt-1 block font-display text-3xl font-semibold tracking-tight text-fg"
            >
              {formatCurrency(toSoles(totals.totalCents))}
            </span>
          </p>
        )}

        {!nada && rejectedCount > 0 && (
          <p className="mt-3 text-sm leading-relaxed text-fg-muted">
            {rejectedCount === 1
              ? 'El trabajo que rechazaste quedó registrado y no se ejecutará.'
              : `Los ${rejectedCount} trabajos que rechazaste quedaron registrados y no se ejecutarán.`}
          </p>
        )}

        <p className="mt-6 text-xs text-fg-subtle">
          Romero Motors · Más que un taller, tu aliado en el camino
        </p>
      </div>
    </div>
  );
}
