'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Boxes,
  Check,
  CircleCheckBig,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingCart,
  TriangleAlert,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Textarea } from '@/components/ui/input';
import { Plate } from '@/components/ui/plate';
import { AssetImage } from '@/components/ui/asset-image';
import {
  approvedLines,
  isTrimmed,
  nextStatusAfter,
  outcomeOf,
  readiness,
  rejectedLines,
  rulingFor,
  type LineRuling,
  type Rulings,
} from '@/features/parts/services/authorization';
import { groupByWork, type RequestLine } from '@/features/parts/services/request';
import { STATUS_LABELS } from '@/features/orders/services/order-status';
import { cn } from '@/lib/utils/cn';

/**
 * Autorización del asesor sobre la solicitud del técnico.
 *
 * Es una pantalla de ESCRITORIO: el asesor la usa en el mostrador, con el
 * cliente esperando o al teléfono. Tres decisiones por línea —aprobar,
 * recortar, rechazar— y cada recorte o rechazo exige motivo escrito, porque
 * un «no» sin explicación vuelve al taller en forma de llamada.
 */
export function PartsAuthorization({
  lines,
  vehicle,
  plate,
  orderCode,
  orderId,
  customer,
  requestedBy,
}: {
  readonly lines: readonly RequestLine[];
  readonly vehicle: string;
  readonly plate: string;
  readonly orderCode: string;
  readonly orderId: string;
  readonly customer: string;
  readonly requestedBy: string;
}) {
  const [rulings, setRulings] = useState<Rulings>({});
  const [done, setDone] = useState(false);

  const groups = useMemo(() => groupByWork(lines), [lines]);
  const state = useMemo(() => readiness(lines, rulings), [lines, rulings]);
  const outcome = outcomeOf(lines, rulings);
  const nextStatus = nextStatusAfter(lines, rulings);
  const approved = approvedLines(lines, rulings);
  const rejected = rejectedLines(lines, rulings);

  const toBuyUnits = approved.reduce((n, l) => {
    const q = rulingFor(l, rulings).quantity;
    return n + Math.max(0, Math.min(q, l.quantity) - l.inStock);
  }, 0);

  const rule = (id: string, change: Partial<LineRuling>): void =>
    setRulings((prev) => {
      const line = lines.find((l) => l.id === id);
      const current = prev[id] ?? {
        decision: 'pendiente' as const,
        quantity: line?.quantity ?? 0,
      };
      return { ...prev, [id]: { ...current, ...change } };
    });

  /*
   * El recorte se aplica como INCREMENTO sobre el estado anterior, no como
   * valor calculado en el botón. Dos toques rápidos en la misma tanda de React
   * leen la misma prop `quantity` y ambos calculan 8 - 1 = 7: el segundo toque
   * se pierde. Con el incremento, dos toques bajan dos unidades.
   */
  const step = (id: string, delta: number): void =>
    setRulings((prev) => {
      const line = lines.find((l) => l.id === id);
      if (line === undefined) return prev;
      const current = prev[id] ?? { decision: 'pendiente' as const, quantity: line.quantity };
      const quantity = Math.min(line.quantity, Math.max(0, current.quantity + delta));
      return { ...prev, [id]: { ...current, quantity } };
    });

  if (done) {
    return (
      <Resolution
        outcome={outcome}
        orderCode={orderCode}
        approvedCount={approved.length}
        rejectedCount={rejected.length}
        nextStatus={nextStatus}
      />
    );
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
            Autorización de repuestos
          </h1>
          <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
            Revisa lo que pidió el técnico antes de que Compras salga a cotizar.
          </p>
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span data-numeric className="font-mono text-xs text-fg-subtle">
              {orderCode}
            </span>
            <span className="text-fg-muted">{customer}</span>
            <span className="text-fg-subtle">·</span>
            <span className="text-fg-muted">Solicitó {requestedBy}</span>
          </p>
        </div>

        <div className="flex items-center gap-4">
          <AssetImage
            alt={`Ilustración de ${vehicle}`}
            subject={vehicle}
            fit="cover"
            rounded="control"
            className="h-16 w-24 shrink-0"
          />
          <div className="text-right">
            <p className="font-display text-base font-semibold tracking-tight text-fg">{vehicle}</p>
            <Plate value={plate} className="mt-1.5" />
          </div>
        </div>
      </header>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-5">
          {groups.map((group) => (
            <section
              key={group.workId}
              className="overflow-hidden rounded-panel border border-border bg-surface-raised"
            >
              <header className="border-b border-border px-5 py-4">
                <h2 className="font-display text-base font-semibold tracking-tight text-fg">
                  {group.workTitle}
                </h2>
              </header>

              <ul className="divide-y divide-border">
                {group.lines.map((line) => (
                  <LineRow
                    key={line.id}
                    line={line}
                    ruling={rulingFor(line, rulings)}
                    trimmed={isTrimmed(line, rulings)}
                    onRule={(change) => rule(line.id, change)}
                    onStep={(delta) => step(line.id, delta)}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>

        <aside className="lg:sticky lg:top-5 lg:self-start">
          <section className="rounded-panel border border-border bg-surface-raised p-5">
            <h2 className="font-display text-base font-semibold tracking-tight text-fg">
              Decisión
            </h2>

            <dl className="mt-4 space-y-2.5 text-sm">
              <Row label="Aprobados" value={String(approved.length)} tone="ok" />
              <Row label="Rechazados" value={String(rejected.length)} tone="crit" />
              <Row label="Sin decidir" value={String(lines.length - approved.length - rejected.length)} />
            </dl>

            <p className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4 text-sm">
              <span className="inline-flex items-center gap-2 text-fg-muted">
                <ShoppingCart aria-hidden className="size-4 text-brand-600" />
                Unidades a comprar
              </span>
              <span data-numeric className="font-semibold text-fg">
                {toBuyUnits}
              </span>
            </p>

            {nextStatus !== null && (
              <p className="mt-4 flex items-start gap-2 rounded-control bg-surface-sunken px-3 py-2.5 text-sm text-fg-muted">
                <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-brand-600" />
                <span>
                  La orden pasará a <strong className="font-medium text-fg">{STATUS_LABELS[nextStatus]}</strong>.
                  {nextStatus === 'REPUESTOS_COMPLETOS' &&
                    ' El almacén cubre todo, así que no pasa por Compras.'}
                </span>
              </p>
            )}

            <Button
              block
              size="lg"
              className="mt-5"
              disabled={!state.canAuthorize}
              onClick={() => setDone(true)}
            >
              <Check aria-hidden className="size-4" />
              Autorizar solicitud
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

function LineRow({
  line,
  ruling,
  trimmed,
  onRule,
  onStep,
}: {
  readonly line: RequestLine;
  readonly ruling: LineRuling;
  readonly trimmed: boolean;
  readonly onRule: (change: Partial<LineRuling>) => void;
  readonly onStep: (delta: number) => void;
}) {
  const necesitaMotivo = ruling.decision === 'rechazado' || trimmed;

  /*
   * Lo que hay que comprar se calcula sobre la cantidad AUTORIZADA, no sobre
   * la pedida. Si la línea siguiera diciendo «Comprar 5» después de recortar
   * de 8 a 6, contradiría al resumen de la derecha, y entre dos números el
   * asesor cree al que tiene delante.
   */
  const aComprar =
    ruling.decision === 'rechazado'
      ? 0
      : Math.max(0, Math.min(ruling.quantity, line.quantity) - line.inStock);
  const sinMotivo = necesitaMotivo && (ruling.reason ?? '').trim() === '';

  return (
    <li
      className={cn(
        'px-5 py-4 transition-colors duration-150',
        ruling.decision === 'aprobado' && 'bg-ok-100/30',
        ruling.decision === 'rechazado' && 'bg-surface-sunken',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-fg">{line.description}</span>
            {line.urgency === 'urgente' && (
              <span className="inline-flex items-center gap-1 rounded-chip border border-warn-500/30 bg-warn-100 px-2 py-0.5 text-xs font-medium text-warn-700">
                <TriangleAlert aria-hidden className="size-3" />
                Urgente
              </span>
            )}
          </p>

          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-fg-muted">
            {line.partNumber !== undefined && (
              <span data-numeric className="font-mono text-xs text-fg-subtle">
                {line.partNumber}
              </span>
            )}
            <span data-numeric>Pidió {line.quantity}</span>
            {line.inStock > 0 && (
              <span className="inline-flex items-center gap-1.5 text-ok-600">
                <Boxes aria-hidden className="size-4" />
                <span data-numeric>{line.inStock} en almacén</span>
              </span>
            )}
            <span
              className={cn(
                'inline-flex items-center gap-1.5',
                aComprar === 0 ? 'text-fg-subtle' : 'text-fg-muted',
              )}
            >
              <ShoppingCart aria-hidden className="size-4" />
              {aComprar === 0 ? 'Nada que comprar' : `Comprar ${aComprar}`}
            </span>
          </p>

          {line.note !== undefined && line.note.trim() !== '' && (
            <p className="mt-2 rounded-control bg-surface-sunken px-3 py-2 text-sm leading-relaxed text-fg-muted">
              {line.note}
            </p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <Stepper
            value={ruling.quantity}
            max={line.quantity}
            disabled={ruling.decision === 'rechazado'}
            label={line.description}
            onStep={onStep}
          />

          <div className="flex gap-2">
            <button
              type="button"
              aria-pressed={ruling.decision === 'rechazado'}
              onClick={() =>
                onRule({
                  decision: ruling.decision === 'rechazado' ? 'pendiente' : 'rechazado',
                  quantity: 0,
                })
              }
              className={cn(
                'inline-flex h-11 items-center justify-center gap-2 rounded-control border px-3 text-sm font-semibold',
                'transition-colors duration-150 ease-snap active:scale-[0.98]',
                ruling.decision === 'rechazado'
                  ? 'border-crit-600 bg-crit-100 text-crit-700'
                  : 'border-border-strong bg-surface text-fg-muted hover:bg-surface-sunken',
              )}
            >
              <X aria-hidden className="size-4" />
              <span className="hidden sm:inline">Rechazar</span>
              <span className="sr-only">{line.description}</span>
            </button>

            <button
              type="button"
              aria-pressed={ruling.decision === 'aprobado'}
              onClick={() =>
                onRule({
                  decision: ruling.decision === 'aprobado' ? 'pendiente' : 'aprobado',
                  ...(ruling.quantity === 0 ? { quantity: line.quantity } : {}),
                })
              }
              className={cn(
                'inline-flex h-11 items-center justify-center gap-2 rounded-control border px-3 text-sm font-semibold',
                'transition-colors duration-150 ease-snap active:scale-[0.98]',
                ruling.decision === 'aprobado'
                  ? 'border-ok-600 bg-ok-600 text-white'
                  : 'border-border-strong bg-surface text-fg-muted hover:bg-surface-sunken',
              )}
            >
              <Check aria-hidden className="size-4" />
              <span className="hidden sm:inline">Aprobar</span>
              <span className="sr-only">{line.description}</span>
            </button>
          </div>
        </div>
      </div>

      {necesitaMotivo && (
        <div className="mt-3">
          <Field
            label={ruling.decision === 'rechazado' ? 'Motivo del rechazo' : 'Motivo del recorte'}
            error={sinMotivo ? 'El técnico y Compras necesitan saber por qué.' : undefined}
          >
            <Textarea
              rows={2}
              value={ruling.reason ?? ''}
              placeholder={
                ruling.decision === 'rechazado'
                  ? 'Ej.: el cliente no autorizó este trabajo.'
                  : 'Ej.: solo se cambia el eje delantero.'
              }
              onChange={(e) => onRule({ reason: e.target.value })}
            />
          </Field>
        </div>
      )}
    </li>
  );
}

/**
 * Recortar cantidad con botones, no con un campo numérico: el asesor decide
 * de pie y con prisa, y «4 → 2» es un gesto, no una edición de texto.
 */
function Stepper({
  value,
  max,
  disabled,
  label,
  onStep,
}: {
  readonly value: number;
  readonly max: number;
  readonly disabled: boolean;
  readonly label: string;
  readonly onStep: (delta: number) => void;
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-control border border-border-strong bg-surface',
        disabled && 'opacity-50',
      )}
    >
      <button
        type="button"
        disabled={disabled || value <= 0}
        onClick={() => onStep(-1)}
        className="grid size-11 place-items-center text-fg-muted transition-colors hover:text-fg disabled:opacity-40"
      >
        <Minus aria-hidden className="size-4" />
        <span className="sr-only">Reducir cantidad de {label}</span>
      </button>
      <span
        data-numeric
        aria-live="polite"
        className="min-w-10 text-center text-sm font-semibold text-fg"
      >
        {value}
      </span>
      <button
        type="button"
        disabled={disabled || value >= max}
        onClick={() => onStep(1)}
        className="grid size-11 place-items-center text-fg-muted transition-colors hover:text-fg disabled:opacity-40"
      >
        <Plus aria-hidden className="size-4" />
        <span className="sr-only">Aumentar cantidad de {label}</span>
      </button>
    </div>
  );
}

function Resolution({
  outcome,
  orderCode,
  approvedCount,
  rejectedCount,
  nextStatus,
}: {
  readonly outcome: ReturnType<typeof outcomeOf>;
  readonly orderCode: string;
  readonly approvedCount: number;
  readonly rejectedCount: number;
  readonly nextStatus: ReturnType<typeof nextStatusAfter>;
}) {
  const nada = outcome === 'rechazado_todo';

  return (
    <div className="mx-auto max-w-md py-16 text-center">
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
        {nada ? 'Solicitud rechazada' : 'Solicitud autorizada'}
      </h1>

      <p className="mt-2 text-base leading-relaxed text-fg-muted">
        {nada
          ? `No autorizaste ningún repuesto de ${orderCode}. El técnico ya tiene los motivos.`
          : `Autorizaste ${approvedCount} ${approvedCount === 1 ? 'repuesto' : 'repuestos'} de ${orderCode}.`}
      </p>

      {!nada && rejectedCount > 0 && (
        <p className="mt-3 text-sm leading-relaxed text-fg-muted">
          {rejectedCount === 1
            ? 'El repuesto rechazado queda registrado con su motivo.'
            : `Los ${rejectedCount} repuestos rechazados quedan registrados con su motivo.`}
        </p>
      )}

      {!nada && nextStatus !== null && (
        <p className="mt-5 rounded-panel border border-border bg-surface-raised px-5 py-4">
          <span className="block text-sm text-fg-muted">La orden pasó a</span>
          <span className="mt-1 block font-display text-xl font-semibold tracking-tight text-fg">
            {STATUS_LABELS[nextStatus]}
          </span>
        </p>
      )}
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
