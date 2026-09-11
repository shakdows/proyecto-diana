'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Check,
  CircleCheckBig,
  PackageCheck,
  PackageOpen,
  Minus,
  Plus,
  TriangleAlert,
  Truck,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input, Select } from '@/components/ui/input';
import { Plate } from '@/components/ui/plate';
import { ProgressBar } from '@/components/ui/progress-bar';
import {
  entryFor,
  isLineComplete,
  pendingAfter,
  pendingBefore,
  readiness,
  REJECT_LABELS,
  statusAfter,
  summarize,
  acceptAll,
  type Entries,
  type LineEntry,
  type ReceivableLine,
  type RejectReason,
} from '@/features/parts/services/reception';
import { STATUS_LABELS } from '@/features/orders/services/order-status';
import { cn } from '@/lib/utils/cn';

/**
 * Recepción de repuestos.
 *
 * La usa almacén con la caja delante, así que cuenta unidades, no formularios.
 * Lo ACEPTADO y lo RECHAZADO se registran por separado a propósito: un disco
 * rayado dentro de la caja no es un disco, y si contara como recibido la orden
 * pasaría a «repuestos completos» y el técnico descubriría la pieza inservible
 * con el vehículo ya desarmado.
 */
export function PartsReception({
  lines,
  vehicle,
  plate,
  orderCode,
  orderId,
  customer,
}: {
  readonly lines: readonly ReceivableLine[];
  readonly vehicle: string;
  readonly plate: string;
  readonly orderCode: string;
  readonly orderId: string;
  readonly customer: string;
}) {
  const [entries, setEntries] = useState<Entries>({});
  const [confirmed, setConfirmed] = useState(false);

  const totals = useMemo(() => summarize(lines, entries), [lines, entries]);
  const state = useMemo(() => readiness(lines, entries), [lines, entries]);
  const nextStatus = statusAfter(lines, entries);

  const patch = (lineId: string, change: Partial<LineEntry>): void =>
    setEntries((prev) => ({
      ...prev,
      [lineId]: { ...(prev[lineId] ?? { accepted: 0, rejected: 0 }), ...change },
    }));

  /*
   * Los contadores se mueven por INCREMENTO sobre el estado anterior, no por
   * valor calculado en el botón: dos toques rápidos leen la misma prop y el
   * segundo se pierde. Contando piezas de una caja, eso es un error de
   * inventario.
   */
  const step = (line: ReceivableLine, field: 'accepted' | 'rejected', delta: number): void =>
    setEntries((prev) => {
      const current = prev[line.lineId] ?? { accepted: 0, rejected: 0 };
      const max = field === 'accepted' ? pendingBefore(line) : line.ordered;
      const next = Math.min(max, Math.max(0, current[field] + delta));
      return { ...prev, [line.lineId]: { ...current, [field]: next } };
    });

  if (confirmed) {
    return (
      <Confirmation
        orderCode={orderCode}
        orderId={orderId}
        totals={totals}
        nextStatus={nextStatus}
      />
    );
  }

  const supplier = lines[0]?.supplierName ?? '';

  return (
    <div className="space-y-5">
      <Link
        href={`/ordenes/${orderId}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 transition-colors hover:text-brand-700"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Volver a la orden
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-5 rounded-panel border border-border bg-surface-raised p-6">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-fg">
            Recepción de repuestos
          </h1>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-fg-muted">
            Cuenta lo que llegó. Lo que venga dañado o no corresponda se registra aparte: no cubre
            la orden.
          </p>
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span data-numeric className="font-mono text-xs text-fg-subtle">
              {orderCode}
            </span>
            <span className="text-fg-muted">{customer}</span>
            <span className="text-fg-subtle">·</span>
            <span className="inline-flex items-center gap-1.5 text-fg-muted">
              <Truck aria-hidden className="size-4 text-fg-subtle" />
              {supplier}
            </span>
          </p>
        </div>

        <div className="text-right">
          <p className="font-display text-base font-semibold tracking-tight text-fg">{vehicle}</p>
          <Plate value={plate} className="mt-1.5" />
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="min-w-0 space-y-5">
          <div className="flex flex-wrap items-center gap-2 rounded-panel border border-border bg-surface-raised px-5 py-4">
            <span className="mr-1 text-sm text-fg-muted">Atajo:</span>
            <Button variant="secondary" size="sm" onClick={() => setEntries(acceptAll(lines))}>
              <PackageCheck aria-hidden className="size-4" />
              Llegó todo lo pendiente
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setEntries({})}>
              Limpiar
            </Button>
          </div>

          <ul className="space-y-4">
            {lines.map((line) => (
              <LineCounter
                key={line.lineId}
                line={line}
                entry={entryFor(line, entries)}
                complete={isLineComplete(line, entries)}
                remaining={pendingAfter(line, entries)}
                onStep={(field, delta) => step(line, field, delta)}
                onPatch={(change) => patch(line.lineId, change)}
              />
            ))}
          </ul>
        </div>

        <aside className="min-w-0 xl:sticky xl:top-5 xl:self-start">
          <section className="rounded-panel border border-border bg-surface-raised p-5">
            <h2 className="font-display text-base font-semibold tracking-tight text-fg">
              Cobertura de la orden
            </h2>

            <div className="mt-4">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-fg-muted">Repuestos cubiertos</span>
                <span data-numeric className="text-sm font-semibold text-fg">
                  {Math.round(totals.percent)} %
                </span>
              </div>
              <ProgressBar
                percent={totals.percent}
                label={`Cobertura de repuestos de ${orderCode}`}
                showValue={false}
                className="mt-2"
              />
            </div>

            <dl className="mt-5 space-y-2.5 border-t border-border pt-4 text-sm">
              <Row label="Unidades aceptadas" value={String(totals.acceptedUnits)} tone="ok" />
              <Row
                label="Unidades rechazadas"
                value={String(totals.rejectedUnits)}
                tone={totals.rejectedUnits > 0 ? 'crit' : undefined}
              />
              <Row label="Líneas completas" value={`${totals.completedLines}/${lines.length}`} />
            </dl>

            {/*
              «97 % recibido» no permite empezar a reparar si lo que falta es
              el perno que sujeta la pieza. Por eso el estado se decide por
              líneas completas, no por porcentaje.
            */}
            <p
              className={cn(
                'mt-4 flex items-start gap-2 rounded-control px-3 py-2.5 text-sm',
                totals.complete
                  ? 'bg-ok-100 text-ok-700'
                  : 'bg-surface-sunken text-fg-muted',
              )}
            >
              {totals.complete ? (
                <PackageCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
              ) : (
                <PackageOpen aria-hidden className="mt-0.5 size-4 shrink-0 text-warn-600" />
              )}
              <span>
                {totals.complete ? (
                  <>
                    Todo cubierto. La orden pasará a{' '}
                    <strong className="font-medium">{STATUS_LABELS.REPUESTOS_COMPLETOS}</strong>.
                  </>
                ) : (
                  <>
                    {totals.missingUnits === 1 ? 'Falta' : 'Faltan'}{' '}
                    <strong data-numeric className="font-medium text-fg">
                      {totals.missingUnits}
                    </strong>{' '}
                    {totals.missingUnits === 1 ? 'unidad' : 'unidades'}. La orden quedará en{' '}
                    <strong className="font-medium text-fg">
                      {STATUS_LABELS.REPUESTOS_PARCIALES}
                    </strong>{' '}
                    y no se puede empezar a reparar.
                  </>
                )}
              </span>
            </p>

            <Button
              block
              size="lg"
              className="mt-5"
              disabled={!state.canConfirm}
              onClick={() => setConfirmed(true)}
            >
              <Check aria-hidden className="size-4" />
              Confirmar recepción
            </Button>

            {state.blockers.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {state.blockers.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm text-fg-muted">
                    <TriangleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0 text-warn-600" />
                    {b}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function LineCounter({
  line,
  entry,
  complete,
  remaining,
  onStep,
  onPatch,
}: {
  readonly line: ReceivableLine;
  readonly entry: LineEntry;
  readonly complete: boolean;
  readonly remaining: number;
  readonly onStep: (field: 'accepted' | 'rejected', delta: number) => void;
  readonly onPatch: (change: Partial<LineEntry>) => void;
}) {
  const pending = pendingBefore(line);

  return (
    <li
      className={cn(
        'overflow-hidden rounded-panel border bg-surface-raised transition-colors duration-150',
        complete ? 'border-ok-500/50' : 'border-border',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-4">
        <div className="min-w-0 flex-1">
          <p className="font-medium text-fg">{line.description}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-fg-muted">
            {line.partNumber !== undefined && (
              <span data-numeric className="font-mono text-xs text-fg-subtle">
                {line.partNumber}
              </span>
            )}
            <span data-numeric>
              Pedidas {line.ordered}
              {line.alreadyReceived > 0 && ` · ${line.alreadyReceived} ya recibidas`}
            </span>
            <span
              data-numeric
              className={cn(complete ? 'text-ok-600' : 'font-medium text-warn-700')}
            >
              {complete ? 'Línea completa' : `Faltan ${remaining}`}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-5">
          <Counter
            label="Aceptadas"
            tone="ok"
            value={entry.accepted}
            max={pending}
            onStep={(d) => onStep('accepted', d)}
          />
          <Counter
            label="Rechazadas"
            tone="crit"
            value={entry.rejected}
            max={line.ordered}
            onStep={(d) => onStep('rejected', d)}
          />
        </div>
      </div>

      {entry.rejected > 0 && (
        <div className="grid gap-3 border-t border-border bg-crit-100/30 px-5 py-4 sm:grid-cols-2">
          <Field
            label="Motivo del rechazo"
            error={entry.reason === undefined ? 'Sin motivo no hay reclamo al proveedor.' : undefined}
          >
            <Select
              value={entry.reason ?? ''}
              onChange={(e) =>
                onPatch({
                  reason: e.target.value === '' ? undefined : (e.target.value as RejectReason),
                })
              }
            >
              <option value="">Elige un motivo</option>
              {(Object.keys(REJECT_LABELS) as RejectReason[]).map((r) => (
                <option key={r} value={r}>
                  {REJECT_LABELS[r]}
                </option>
              ))}
            </Select>
          </Field>

          <Field
            label="Nota"
            hint={entry.reason === 'otro' ? undefined : 'Opcional.'}
            error={
              entry.reason === 'otro' && (entry.note ?? '').trim() === ''
                ? '«Otro motivo» necesita una explicación.'
                : undefined
            }
          >
            <Input
              value={entry.note ?? ''}
              placeholder="Ej.: vino la referencia de 2019."
              onChange={(e) => onPatch({ note: e.target.value })}
            />
          </Field>
        </div>
      )}
    </li>
  );
}

function Counter({
  label,
  tone,
  value,
  max,
  onStep,
}: {
  readonly label: string;
  readonly tone: 'ok' | 'crit';
  readonly value: number;
  readonly max: number;
  readonly onStep: (delta: number) => void;
}) {
  return (
    <div>
      <p
        className={cn(
          'mb-1.5 flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.06em]',
          tone === 'ok' ? 'text-ok-600' : 'text-crit-600',
        )}
      >
        {tone === 'ok' ? (
          <Check aria-hidden className="size-3.5" />
        ) : (
          <X aria-hidden className="size-3.5" />
        )}
        {label}
      </p>
      <div className="inline-flex items-center rounded-control border border-border-strong bg-surface">
        <button
          type="button"
          disabled={value <= 0}
          onClick={() => onStep(-1)}
          className="grid size-11 place-items-center text-fg-muted transition-colors hover:text-fg disabled:opacity-40"
        >
          <Minus aria-hidden className="size-4" />
          <span className="sr-only">Quitar una unidad de {label.toLowerCase()}</span>
        </button>
        <span
          data-numeric
          aria-live="polite"
          className="min-w-10 text-center text-lg font-semibold text-fg"
        >
          {value}
        </span>
        <button
          type="button"
          disabled={value >= max}
          onClick={() => onStep(1)}
          className="grid size-11 place-items-center text-fg-muted transition-colors hover:text-fg disabled:opacity-40"
        >
          <Plus aria-hidden className="size-4" />
          <span className="sr-only">Sumar una unidad de {label.toLowerCase()}</span>
        </button>
      </div>
    </div>
  );
}

function Confirmation({
  orderCode,
  orderId,
  totals,
  nextStatus,
}: {
  readonly orderCode: string;
  readonly orderId: string;
  readonly totals: ReturnType<typeof summarize>;
  readonly nextStatus: ReturnType<typeof statusAfter>;
}) {
  const completa = nextStatus === 'REPUESTOS_COMPLETOS';

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <span
        aria-hidden
        className={cn(
          'mx-auto grid size-16 place-items-center rounded-full',
          completa ? 'bg-ok-100 text-ok-600' : 'bg-warn-100 text-warn-700',
        )}
      >
        <CircleCheckBig className="size-8" />
      </span>

      <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight text-fg">
        Recepción registrada
      </h1>

      <p className="mt-2 text-base leading-relaxed text-fg-muted">
        {totals.acceptedUnits === 1
          ? 'Entró 1 unidad al almacén'
          : `Entraron ${totals.acceptedUnits} unidades al almacén`}
        {totals.rejectedUnits > 0 &&
          ` y ${totals.rejectedUnits === 1 ? 'se rechazó 1' : `se rechazaron ${totals.rejectedUnits}`}`}
        .
      </p>

      {totals.rejectedUnits > 0 && (
        <p className="mt-3 text-sm leading-relaxed text-fg-muted">
          Lo rechazado queda registrado con su motivo para reclamar al proveedor, y no cuenta como
          repuesto disponible.
        </p>
      )}

      <p className="mt-5 rounded-panel border border-border bg-surface-raised px-5 py-4">
        <span className="block text-sm text-fg-muted">{orderCode} pasó a</span>
        <span className="mt-1 block font-display text-xl font-semibold tracking-tight text-fg">
          {STATUS_LABELS[nextStatus]}
        </span>
        {!completa && (
          <span data-numeric className="mt-2 block text-sm text-fg-muted">
            {totals.missingUnits === 1
              ? 'Falta 1 unidad para poder reparar.'
              : `Faltan ${totals.missingUnits} unidades para poder reparar.`}
          </span>
        )}
      </p>

      <div className="mt-6">
        <Link
          href={`/ordenes/${orderId}`}
          className="text-sm font-medium text-brand-600 transition-colors hover:text-brand-700"
        >
          Volver a la orden
        </Link>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  readonly label: string;
  readonly value: string;
  readonly tone?: 'ok' | 'crit';
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-fg-muted">{label}</dt>
      <dd
        data-numeric
        className={cn(
          'font-medium',
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
