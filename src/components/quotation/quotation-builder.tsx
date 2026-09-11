'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { usePersistentState } from '@/lib/demo/store';
import { ArrowLeft, Eye, Save, Send } from 'lucide-react';
import { AssetImage } from '@/components/ui/asset-image';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/choice';
import { CorporateBadge } from '@/components/ui/plate';
import { PRIORITY_LABELS } from '@/features/diagnosis/services/findings';
import {
  lineTotalCents,
  toSoles,
  totalsOf,
  type QuoteLine,
} from '@/features/quotations/services/quotation';
import { formatCurrency } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

/**
 * Cotización del asesor.
 *
 * Las líneas vienen del diagnóstico; aquí solo se elige cuáles se envían. El
 * asesor puede dejar fuera un hallazgo —una recomendación que el cliente ya
 * rechazó el mes pasado— SIN borrarlo del diagnóstico, que es el registro
 * técnico y no se toca.
 */
export function QuotationBuilder({
  lines,
  vehicle,
  plate,
  orderCode,
  orderId,
  customer,
  corporateClient,
  authHref,
}: {
  readonly lines: readonly QuoteLine[];
  readonly vehicle: string;
  readonly plate: string;
  readonly orderCode: string;
  readonly orderId: string;
  readonly customer: string;
  readonly corporateClient: string | null;
  readonly authHref: string;
}) {
  /*
   * Esto era un `Set`, y al persistirlo se perdía entero: `JSON.stringify` de
   * un Set devuelve `{}`, sin error y sin aviso. Al recargar, la cotización
   * aparecía con TODAS las líneas desmarcadas y un total de cero.
   *
   * Se guarda como lista de identificadores —que sí sobrevive— y el `Set` se
   * deriva para las comprobaciones de pertenencia.
   */
  const [includedIds, setIncludedIds] = usePersistentState<readonly string[]>(
    `cotizacion.${orderId}`,
    lines.map((l) => l.id),
  );

  const included = useMemo(() => new Set(includedIds), [includedIds]);
  const selected = useMemo(() => lines.filter((l) => included.has(l.id)), [lines, included]);
  const totals = useMemo(() => totalsOf(selected), [selected]);

  const toggle = (id: string): void =>
    setIncludedIds((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id],
    );

  return (
    <>
      <Link
        href={`/ordenes/${orderId}`}
        className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 transition-colors hover:text-brand-700"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Volver a la orden
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-6 rounded-panel border border-border bg-surface-raised p-6">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-fg lg:text-[1.75rem]">
            Cotización
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            Elige qué trabajos se envían al cliente y confirma los importes.
          </p>
          <p className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <span className="font-mono text-xs text-fg-subtle">{orderCode}</span>
            <span className="text-fg">{customer}</span>
            {corporateClient !== null && <CorporateBadge name={corporateClient} />}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <AssetImage
            alt={`Ilustración de ${vehicle}`}
            subject={vehicle}
            className="hidden h-24 w-44 shrink-0 sm:block"
          />
          <div className="text-right">
            <p className="font-display text-lg font-semibold tracking-tight text-fg">{vehicle}</p>
            <p className="mt-2 inline-flex rounded-control border border-border-strong bg-surface px-3 py-1.5 font-mono text-base font-bold tracking-[0.08em] text-fg">
              {plate}
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="min-w-0 rounded-panel border border-border bg-surface-raised">
          <header className="flex items-center justify-between gap-3 px-5 py-4">
            <h2 className="font-display text-base font-semibold tracking-tight text-fg">
              Trabajos diagnosticados
            </h2>
            <p data-numeric className="text-xs text-fg-subtle">
              {selected.length} de {lines.length} seleccionados
            </p>
          </header>

          <ul className="divide-y divide-border border-t border-border">
            {lines.map((line) => {
              const on = included.has(line.id);
              return (
                <li
                  key={line.id}
                  className={cn(
                    'flex gap-4 px-5 py-4 transition-colors duration-150',
                    on ? 'bg-surface-raised' : 'bg-surface-sunken/60',
                  )}
                >
                  <span className="pt-1">
                    <Checkbox
                      checked={on}
                      onChange={() => toggle(line.id)}
                      label={<span className="sr-only">Incluir {line.title}</span>}
                      className="py-0"
                    />
                  </span>

                  <AssetImage
                    alt={line.title}
                    subject={line.title}
                    kind="evidencia"
                    rounded="control"
                    className="hidden h-16 w-24 shrink-0 sm:block"
                  />

                  <div className="min-w-0 flex-1">
                    <h3 className={cn('font-medium', on ? 'text-fg' : 'text-fg-subtle line-through')}>
                      {line.title}
                    </h3>
                    <p className="mt-0.5 text-sm text-fg-muted">{line.detail}</p>
                    <p className="mt-1.5 text-xs text-fg-subtle">
                      {PRIORITY_LABELS[line.priority]} · {line.photoCount}{' '}
                      {line.photoCount === 1 ? 'foto' : 'fotos'}
                    </p>
                  </div>

                  <dl className="hidden w-52 shrink-0 text-right text-sm sm:block">
                    <div className="flex justify-between gap-4">
                      <dt className="text-fg-subtle">Repuestos</dt>
                      <dd data-numeric className="text-fg-muted">
                        {formatCurrency(toSoles(line.partsCents))}
                      </dd>
                    </div>
                    <div className="mt-0.5 flex justify-between gap-4">
                      <dt className="text-fg-subtle">Mano de obra</dt>
                      <dd data-numeric className="text-fg-muted">
                        {formatCurrency(toSoles(line.labourCents))}
                      </dd>
                    </div>
                    <div className="mt-1.5 flex justify-between gap-4 border-t border-border pt-1.5">
                      <dt className="font-medium text-fg">Total</dt>
                      <dd data-numeric className="font-semibold text-fg">
                        {formatCurrency(toSoles(lineTotalCents(line)))}
                      </dd>
                    </div>
                  </dl>
                </li>
              );
            })}
          </ul>
        </section>

        <aside className="min-w-0">
          <section className="rounded-panel border border-border bg-surface-raised p-5">
            <h2 className="font-display text-base font-semibold tracking-tight text-fg">
              Resumen de cotización
            </h2>

            <dl className="mt-4 space-y-2.5 text-sm">
              <Row label="Repuestos" value={formatCurrency(toSoles(totals.partsCents))} />
              <Row label="Mano de obra" value={formatCurrency(toSoles(totals.labourCents))} />
              <Row label="Subtotal" value={formatCurrency(toSoles(totals.subtotalCents))} divider />
              <Row label="IGV (18 %)" value={formatCurrency(toSoles(totals.taxCents))} />
            </dl>

            <p className="mt-4 flex items-baseline justify-between border-t border-border pt-4">
              <span className="text-sm font-medium text-fg">Total</span>
              <span data-numeric className="font-display text-2xl font-semibold text-fg">
                {formatCurrency(toSoles(totals.totalCents))}
              </span>
            </p>

            <div className="mt-5 space-y-2">
              <Link
                href={authHref}
                target="_blank"
                className={cn(
                  'inline-flex h-11 w-full items-center justify-center gap-2 rounded-control',
                  'bg-brand-600 px-4 text-sm font-semibold text-white',
                  'transition-colors duration-150 hover:bg-brand-700 active:scale-[0.98]',
                  selected.length === 0 && 'pointer-events-none opacity-50',
                )}
              >
                <Send aria-hidden className="size-4" />
                Enviar al cliente
              </Link>
              <Button type="button" variant="secondary" block>
                <Eye aria-hidden className="size-4" />
                Vista previa
              </Button>
              <Button type="button" variant="ghost" block>
                <Save aria-hidden className="size-4" />
                Guardar borrador
              </Button>
            </div>

            <p className="mt-4 rounded-control bg-surface-sunken px-3 py-2.5 text-xs leading-relaxed text-fg-subtle">
              Al enviarla se genera un enlace propio para el cliente, que aprueba o rechaza cada
              trabajo por separado.
            </p>
          </section>
        </aside>
      </div>
    </>
  );
}

function Row({
  label,
  value,
  divider = false,
}: {
  readonly label: string;
  readonly value: string;
  readonly divider?: boolean;
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3',
        divider && 'border-t border-border pt-2.5',
      )}
    >
      <dt className="text-fg-muted">{label}</dt>
      <dd data-numeric className="font-medium text-fg">
        {value}
      </dd>
    </div>
  );
}
