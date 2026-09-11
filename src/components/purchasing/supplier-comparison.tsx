'use client';

import { useMemo } from 'react';
import { usePersistentState } from '@/lib/demo/store';
import Link from 'next/link';
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  CircleCheckBig,
  Clock,
  CreditCard,
  Send,
  ShieldCheck,
  TriangleAlert,
  Truck,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Plate } from '@/components/ui/plate';
import {
  cheapestOffer,
  coversQuantity,
  fastestOffer,
  lineTotalCents,
  offerFor,
  ordersBySupplier,
  overpayCents,
  PAYMENT_LABELS,
  readiness,
  toSoles,
  totalsOf,
  type QuotedLine,
  type Selection,
  type SupplierOffer,
} from '@/features/purchasing/services/supplier-quotes';
import { formatCurrency } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

/**
 * Comparación de proveedores — pantalla de COMPRAS.
 *
 * Se elige proveedor por LÍNEA, no por proveedor completo: el más barato en
 * pastillas rara vez es el más rápido en discos, y forzar un solo proveedor
 * para toda la orden paga de más o entrega tarde.
 *
 * Compras NO autoriza su propio gasto. La acción final es «Enviar a
 * autorización», y el asesor decide.
 */
export function SupplierComparison({
  lines,
  vehicle,
  plate,
  orderCode,
  orderId,
  customer,
}: {
  readonly lines: readonly QuotedLine[];
  readonly vehicle: string;
  readonly plate: string;
  readonly orderCode: string;
  readonly orderId: string;
  readonly customer: string;
}) {
  const [selection, setSelection] = usePersistentState<Selection>(`compras.${orderId}`, {});
  const [sent, setSent] = usePersistentState(`compras.${orderId}.enviada`, false);

  const totals = useMemo(() => totalsOf(lines, selection), [lines, selection]);
  const state = useMemo(() => readiness(lines, selection), [lines, selection]);
  const orders = useMemo(() => ordersBySupplier(lines, selection), [lines, selection]);

  const choose = (lineId: string, supplierId: string): void =>
    setSelection((prev) =>
      prev[lineId] === supplierId
        ? Object.fromEntries(Object.entries(prev).filter(([k]) => k !== lineId))
        : { ...prev, [lineId]: supplierId },
    );

  /** Atajos: eligen de golpe, pero se pueden corregir línea por línea después. */
  const applyAll = (pick: (line: QuotedLine) => SupplierOffer | undefined): void =>
    setSelection(
      Object.fromEntries(
        lines
          .map((l) => [l.lineId, pick(l)?.supplierId] as const)
          .filter((e): e is readonly [string, string] => e[1] !== undefined),
      ),
    );

  if (sent) {
    return <Sent orderCode={orderCode} orderId={orderId} totals={totals} orders={orders} />;
  }

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
            Cotización de proveedores
          </h1>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-fg-muted">
            Elige proveedor repuesto por repuesto. Puedes repartir el pedido: el más barato en uno
            rara vez es el más rápido en el otro.
          </p>
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span data-numeric className="font-mono text-xs text-fg-subtle">
              {orderCode}
            </span>
            <span className="text-fg-muted">{customer}</span>
            <span className="text-fg-subtle">·</span>
            <span className="text-fg-muted">{vehicle}</span>
          </p>
        </div>

        <Plate value={plate} size="lg" />
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="min-w-0 space-y-5">
          <div className="flex flex-wrap items-center gap-2 rounded-panel border border-border bg-surface-raised px-5 py-4">
            <span className="mr-1 text-sm text-fg-muted">Elegir todo por:</span>
            <Button variant="secondary" size="sm" onClick={() => applyAll(cheapestOffer)}>
              <BadgeCheck aria-hidden className="size-4" />
              Precio más bajo
            </Button>
            <Button variant="secondary" size="sm" onClick={() => applyAll(fastestOffer)}>
              <Zap aria-hidden className="size-4" />
              Entrega más rápida
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setSelection({})}>
              Limpiar
            </Button>
          </div>

          {lines.map((line) => (
            <LineComparison
              key={line.lineId}
              line={line}
              chosen={offerFor(line, selection)}
              onChoose={(supplierId) => choose(line.lineId, supplierId)}
            />
          ))}
        </div>

        <aside className="min-w-0 xl:sticky xl:top-5 xl:self-start">
          <section className="rounded-panel border border-border bg-surface-raised p-5">
            <h2 className="font-display text-base font-semibold tracking-tight text-fg">
              Resumen de compra
            </h2>

            <dl className="mt-4 space-y-2.5 text-sm">
              <Row label="Subtotal" value={formatCurrency(toSoles(totals.subtotalCents))} />
              <Row label="IGV (18 %)" value={formatCurrency(toSoles(totals.taxCents))} />
            </dl>

            <p className="mt-4 flex items-baseline justify-between border-t border-border pt-4">
              <span className="text-sm font-medium text-fg">Total</span>
              <span data-numeric className="font-display text-2xl font-semibold text-fg">
                {formatCurrency(toSoles(totals.totalCents))}
              </span>
            </p>

            <dl className="mt-4 space-y-2.5 border-t border-border pt-4 text-sm">
              <Row
                label="Órdenes de compra"
                value={String(totals.supplierCount)}
                hint={totals.supplierCount > 1 ? 'Un flete por proveedor.' : undefined}
              />
              {/*
                El plazo que manda es el del repuesto MÁS LENTO. Con nueve
                piezas el martes y una el viernes, se repara el viernes.
              */}
              <Row
                label="Listo para reparar en"
                value={
                  totals.leadTimeDays === 0
                    ? '—'
                    : `${totals.leadTimeDays} ${totals.leadTimeDays === 1 ? 'día' : 'días'}`
                }
                hint="Manda el repuesto más lento."
              />
            </dl>

            {totals.overpayCents > 0 && (
              <p className="mt-4 flex items-start gap-2 rounded-control bg-surface-sunken px-3 py-2.5 text-sm text-fg-muted">
                <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-warn-600" />
                <span>
                  Pagas{' '}
                  <strong data-numeric className="font-medium text-fg">
                    {formatCurrency(toSoles(totals.overpayCents))}
                  </strong>{' '}
                  más que la opción más barata. Suele comprarse plazo o garantía.
                </span>
              </p>
            )}

            <Button
              block
              size="lg"
              className="mt-5"
              disabled={!state.canSend}
              onClick={() => setSent(true)}
            >
              <Send aria-hidden className="size-4" />
              Enviar a autorización
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

            <p className="mt-4 flex items-start gap-2 rounded-control bg-surface-sunken px-3 py-2.5 text-xs leading-relaxed text-fg-subtle">
              <ShieldCheck aria-hidden className="mt-0.5 size-3.5 shrink-0" />
              Compras no autoriza su propio gasto. La comparación va al asesor, que decide.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}

function LineComparison({
  line,
  chosen,
  onChoose,
}: {
  readonly line: QuotedLine;
  readonly chosen: SupplierOffer | undefined;
  readonly onChoose: (supplierId: string) => void;
}) {
  const cheapest = cheapestOffer(line);
  const fastest = fastestOffer(line);

  if (line.offers.length === 0) {
    return (
      <section className="rounded-panel border border-warn-500/40 bg-warn-100/40 p-5">
        <h2 className="font-display text-base font-semibold tracking-tight text-fg">
          {line.description}
        </h2>
        <p className="mt-2 flex items-start gap-2 text-sm text-warn-700">
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          Ningún proveedor ha cotizado este repuesto todavía.
        </p>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-panel border border-border bg-surface-raised">
      <header className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <h2 className="font-display text-base font-semibold tracking-tight text-fg">
            {line.description}
          </h2>
          {line.partNumber !== undefined && (
            <p data-numeric className="mt-0.5 font-mono text-xs text-fg-subtle">
              {line.partNumber}
            </p>
          )}
        </div>
        <p data-numeric className="text-sm text-fg-muted">
          {line.quantity} {line.quantity === 1 ? 'unidad' : 'unidades'}
        </p>
      </header>

      <ul className="grid gap-3 p-4 md:grid-cols-3">
        {line.offers.map((offer) => {
          const selected = chosen?.supplierId === offer.supplierId;
          const cubre = coversQuantity(line, offer);
          const extra = overpayCents(line, offer);

          return (
            <li key={offer.supplierId}>
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => onChoose(offer.supplierId)}
                className={cn(
                  'flex h-full w-full flex-col rounded-control border p-4 text-left',
                  'transition-[border-color,background-color] duration-150 ease-snap active:scale-[0.99]',
                  selected
                    ? 'border-brand-600 bg-brand-50 ring-2 ring-brand-600/20'
                    : 'border-border-strong bg-surface hover:border-graphite-300 hover:bg-surface-sunken',
                )}
              >
                <span className="flex items-start justify-between gap-2">
                  <span className="min-w-0 text-sm font-semibold text-fg">
                    {offer.supplierName}
                  </span>
                  {selected && (
                    <span
                      aria-hidden
                      className="grid size-5 shrink-0 place-items-center rounded-full bg-brand-600 text-white"
                    >
                      <Check className="size-3" />
                    </span>
                  )}
                </span>

                <span className="mt-2 flex min-h-6 flex-wrap items-start gap-1.5">
                  {offer.supplierId === cheapest?.supplierId && <Tag tone="ok">Más barato</Tag>}
                  {offer.supplierId === fastest?.supplierId && <Tag tone="brand">Más rápido</Tag>}
                  {!cubre && <Tag tone="warn">{`Solo ${offer.availableQuantity}`}</Tag>}
                </span>

                <span
                  data-numeric
                  className="mt-3 block font-display text-xl font-semibold tracking-tight text-fg"
                >
                  {formatCurrency(toSoles(lineTotalCents(line, offer)))}
                </span>
                <span data-numeric className="text-xs text-fg-subtle">
                  {formatCurrency(toSoles(offer.unitCostCents))} c/u
                  {extra > 0 && ` · +${formatCurrency(toSoles(extra))}`}
                </span>

                <span className="mt-3 space-y-1.5 border-t border-border pt-3 text-sm text-fg-muted">
                  <span className="flex items-center gap-2">
                    <Truck aria-hidden className="size-4 shrink-0 text-fg-subtle" />
                    <span data-numeric>
                      {offer.leadTimeDays} {offer.leadTimeDays === 1 ? 'día' : 'días'}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <ShieldCheck aria-hidden className="size-4 shrink-0 text-fg-subtle" />
                    <span data-numeric>{offer.warrantyMonths} meses de garantía</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <CreditCard aria-hidden className="size-4 shrink-0 text-fg-subtle" />
                    {PAYMENT_LABELS[offer.paymentTerms]}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {chosen !== undefined && !coversQuantity(line, chosen) && (
        <p className="flex items-start gap-2 border-t border-border bg-warn-100/50 px-5 py-3 text-sm text-warn-700">
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          {chosen.supplierName} solo tiene {chosen.availableQuantity} de las {line.quantity}{' '}
          unidades. Elige otro proveedor o parte la línea.
        </p>
      )}
    </section>
  );
}

function Sent({
  orderCode,
  orderId,
  totals,
  orders,
}: {
  readonly orderCode: string;
  readonly orderId: string;
  readonly totals: ReturnType<typeof totalsOf>;
  readonly orders: ReturnType<typeof ordersBySupplier>;
}) {
  return (
    <div className="mx-auto max-w-lg py-16">
      <div className="text-center">
        <span
          aria-hidden
          className="mx-auto grid size-16 place-items-center rounded-full bg-ok-100 text-ok-600"
        >
          <CircleCheckBig className="size-8" />
        </span>
        <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight text-fg">
          Enviada a autorización
        </h1>
        <p className="mt-2 text-base leading-relaxed text-fg-muted">
          El asesor revisa el gasto de {orderCode}. Al autorizarlo{' '}
          {orders.length === 1
            ? 'se emite una orden de compra'
            : `se emiten ${orders.length} órdenes de compra`}
          .
        </p>
      </div>

      <ul className="mt-6 space-y-2.5">
        {orders.map((o) => (
          <li
            key={o.supplierId}
            className="flex items-center justify-between gap-4 rounded-panel border border-border bg-surface-raised px-5 py-4"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-fg">{o.supplierName}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-fg-muted">
                <Clock aria-hidden className="size-3.5" />
                <span data-numeric>
                  {o.lines.length} {o.lines.length === 1 ? 'línea' : 'líneas'} ·{' '}
                  {o.leadTimeDays} {o.leadTimeDays === 1 ? 'día' : 'días'}
                </span>
              </p>
            </div>
            <span data-numeric className="shrink-0 font-medium text-fg">
              {formatCurrency(toSoles(o.subtotalCents))}
            </span>
          </li>
        ))}
      </ul>

      <p className="mt-5 flex items-baseline justify-between rounded-panel border border-border bg-surface-raised px-5 py-4">
        <span className="text-sm text-fg-muted">Total con IGV</span>
        <span data-numeric className="font-display text-xl font-semibold tracking-tight text-fg">
          {formatCurrency(toSoles(totals.totalCents))}
        </span>
      </p>

      <div className="mt-6 text-center">
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

function Tag({
  tone,
  children,
}: {
  readonly tone: 'ok' | 'brand' | 'warn';
  readonly children: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex rounded-chip border px-2 py-0.5 text-xs font-medium',
        tone === 'ok' && 'border-ok-500/30 bg-ok-100 text-ok-700',
        tone === 'brand' && 'border-brand-600/30 bg-brand-50 text-brand-700',
        tone === 'warn' && 'border-warn-500/30 bg-warn-100 text-warn-700',
      )}
    >
      {children}
    </span>
  );
}

function Row({
  label,
  value,
  hint,
}: {
  readonly label: string;
  readonly value: string;
  readonly hint?: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <dt className="text-fg-muted">{label}</dt>
        <dd data-numeric className="font-medium text-fg">
          {value}
        </dd>
      </div>
      {hint !== undefined && <p className="mt-0.5 text-xs text-fg-subtle">{hint}</p>}
    </div>
  );
}
