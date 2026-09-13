'use client';

import { useMemo } from 'react';
import { usePersistentState } from '@/lib/demo/store';
import Link from 'next/link';
import {
  ArrowLeft,
  Check,
  CircleCheckBig,
  ShieldAlert,
  ShieldCheck,
  TriangleAlert,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Textarea } from '@/components/ui/input';
import { Plate } from '@/components/ui/plate';
import { ProgressBar } from '@/components/ui/progress-bar';
import {
  countBy,
  failedChecks,
  groupByWork,
  nextStatusAfter,
  outcomeOf,
  readiness,
  rulingFor,
  separationOfDuties,
  type CheckRuling,
  type QualityCheck,
  type Rulings,
} from '@/features/quality/services/inspection';
import { STATUS_LABELS } from '@/features/orders/services/order-status';
import { PhotoCapture } from '@/components/evidence/photo-capture';
import { cn } from '@/lib/utils/cn';

/**
 * Control de calidad.
 *
 * Lo revisa alguien DISTINTO de quien reparó. Esa regla no es un aviso de la
 * pantalla: el dominio la impone y aquí solo se explica, porque esconder el
 * botón en el frontend no es control de acceso. En la Fase 13 la frontera
 * definitiva es la política RLS sobre `quality_inspections`.
 *
 * Un «no conforme» exige nota Y foto. Sin prueba el técnico no sabe qué
 * corregir y el vehículo vuelve a calidad con el mismo defecto.
 */
export function QualityInspection({
  checks,
  vehicle,
  plate,
  orderCode,
  orderId,
  technicianName,
  technicianId,
  inspectorName,
  inspectorId,
}: {
  readonly checks: readonly QualityCheck[];
  readonly vehicle: string;
  readonly plate: string;
  readonly orderCode: string;
  readonly orderId: string;
  readonly technicianName: string;
  readonly technicianId: string;
  readonly inspectorName: string;
  readonly inspectorId: string;
}) {
  const [rulings, setRulings] = usePersistentState<Rulings>(`calidad.${orderId}`, {});
  const [resolved, setResolved] = usePersistentState(`calidad.${orderId}.resuelta`, false);

  const groups = useMemo(() => groupByWork(checks), [checks]);
  const state = useMemo(
    () => readiness(checks, rulings, inspectorId, technicianId),
    [checks, rulings, inspectorId, technicianId],
  );
  const outcome = outcomeOf(checks, rulings);
  const nextStatus = nextStatusAfter(checks, rulings);
  const failed = failedChecks(checks, rulings);
  const ok = countBy(checks, rulings, 'conforme');
  const pending = countBy(checks, rulings, 'pendiente');
  const separated = separationOfDuties(inspectorId, technicianId);

  const rule = (id: string, change: Partial<CheckRuling>): void =>
    setRulings((prev) => ({ ...prev, [id]: { ...(prev[id] ?? { result: 'pendiente' }), ...change } }));

  if (resolved) {
    return (
      <Resolution
        outcome={outcome}
        nextStatus={nextStatus}
        orderCode={orderCode}
        orderId={orderId}
        failed={failed}
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
            Control de calidad
          </h1>
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-fg-muted">
            Revisa el trabajo terminado. Lo que no esté conforme vuelve al taller con su nota y su
            foto.
          </p>
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span data-numeric className="font-mono text-xs text-fg-subtle">
              {orderCode}
            </span>
            <span className="text-fg-muted">Reparó {technicianName}</span>
            <span className="text-fg-subtle">·</span>
            <span className="text-fg-muted">Revisa {inspectorName}</span>
          </p>
        </div>

        <div className="text-right">
          <p className="font-display text-base font-semibold tracking-tight text-fg">{vehicle}</p>
          <Plate value={plate} className="mt-1.5" />
        </div>
      </header>

      {/*
        La separación de funciones se explica en cuanto falla, arriba del todo
        y antes de la lista: dejar que alguien revise nueve comprobaciones para
        descubrir al final que no puede firmarlas es hacerle perder el turno.
      */}
      {!separated && (
        <section className="flex items-start gap-3 rounded-panel border border-crit-500/40 bg-crit-100/50 p-5">
          <ShieldAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-crit-600" />
          <div>
            <h2 className="text-sm font-semibold text-crit-700">
              No puedes aprobar tu propio trabajo
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-fg-muted">
              Esta orden la reparó {technicianName}, que eres tú. El control de calidad lo hace
              otra persona. Puedes revisar la lista, pero no resolver la inspección.
            </p>
          </div>
        </section>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="min-w-0 space-y-5">
          {groups.map((group) => (
            <section
              key={group.workTitle}
              className="overflow-hidden rounded-panel border border-border bg-surface-raised"
            >
              <header className="border-b border-border px-5 py-4">
                <h2 className="font-display text-base font-semibold tracking-tight text-fg">
                  {group.workTitle}
                </h2>
              </header>

              <ul className="divide-y divide-border">
                {group.checks.map((item) => (
                  <CheckRow
                    key={item.id}
                    check={item}
                    orderId={orderId}
                    ruling={rulingFor(item, rulings)}
                    onRule={(change) => rule(item.id, change)}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>

        <aside className="min-w-0 xl:sticky xl:top-5 xl:self-start">
          <section className="rounded-panel border border-border bg-surface-raised p-5">
            <h2 className="font-display text-base font-semibold tracking-tight text-fg">
              Inspección
            </h2>

            <div className="mt-4">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-fg-muted">Revisadas</span>
                <span data-numeric className="text-sm font-semibold text-fg">
                  {checks.length - pending}/{checks.length}
                </span>
              </div>
              <ProgressBar
                percent={checks.length === 0 ? 0 : ((checks.length - pending) / checks.length) * 100}
                label={`Avance de la inspección de ${orderCode}`}
                showValue={false}
                className="mt-2"
              />
            </div>

            <dl className="mt-5 space-y-2.5 border-t border-border pt-4 text-sm">
              <Row label="Conformes" value={String(ok)} tone="ok" />
              <Row
                label="No conformes"
                value={String(failed.length)}
                tone={failed.length > 0 ? 'crit' : undefined}
              />
            </dl>

            {/*
              El destino solo se anuncia si quien mira puede provocarlo. Decir
              «la orden pasará a Calidad aprobada» junto a un botón que este
              usuario no puede pulsar promete algo que no va a ocurrir.
            */}
            {nextStatus !== null && separated && (
              <p
                className={cn(
                  'mt-4 flex items-start gap-2 rounded-control px-3 py-2.5 text-sm',
                  nextStatus === 'CONTROL_CALIDAD_APROBADO'
                    ? 'bg-ok-100 text-ok-700'
                    : 'bg-warn-100 text-warn-700',
                )}
              >
                {nextStatus === 'CONTROL_CALIDAD_APROBADO' ? (
                  <ShieldCheck aria-hidden className="mt-0.5 size-4 shrink-0" />
                ) : (
                  <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
                )}
                <span>
                  La orden pasará a <strong className="font-medium">{STATUS_LABELS[nextStatus]}</strong>
                  {nextStatus === 'OBSERVADO_CONTROL_CALIDAD' && ' y volverá al taller.'}
                </span>
              </p>
            )}

            <Button
              block
              size="lg"
              className="mt-5"
              variant={outcome === 'observado' ? 'danger' : 'primary'}
              disabled={!state.canResolve}
              onClick={() => setResolved(true)}
            >
              {outcome === 'observado' ? (
                <>
                  <X aria-hidden className="size-4" />
                  Observar y devolver al taller
                </>
              ) : (
                <>
                  <Check aria-hidden className="size-4" />
                  Aprobar calidad
                </>
              )}
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

function CheckRow({
  check,
  orderId,
  ruling,
  onRule,
}: {
  readonly check: QualityCheck;
  /** Ancla la foto a ESTA orden: el mismo punto se revisa en muchas. */
  readonly orderId: string;
  readonly ruling: CheckRuling;
  readonly onRule: (change: Partial<CheckRuling>) => void;
}) {
  const rechazada = ruling.result === 'no_conforme';
  const faltaNota = rechazada && (ruling.note ?? '').trim() === '';
  const faltaFoto = rechazada && (ruling.photoCount ?? 0) === 0;

  return (
    <li
      className={cn(
        'px-5 py-4 transition-colors duration-150',
        ruling.result === 'conforme' && 'bg-ok-100/30',
        rechazada && 'bg-crit-100/30',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <p className="min-w-0 flex-1">
          <span className="text-base text-fg">{check.label}</span>
          {check.critical && (
            <span className="ml-2 inline-flex rounded-chip border border-crit-500/30 bg-crit-100 px-2 py-0.5 align-middle text-xs font-medium text-crit-700">
              Crítica
            </span>
          )}
        </p>

        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            aria-pressed={rechazada}
            onClick={() => onRule({ result: rechazada ? 'pendiente' : 'no_conforme' })}
            className={cn(
              'inline-flex h-11 items-center gap-2 rounded-control border px-3 text-sm font-semibold',
              'transition-colors duration-150 ease-snap active:scale-[0.98]',
              rechazada
                ? 'border-crit-600 bg-crit-100 text-crit-700'
                : 'border-border-strong bg-surface text-fg-muted hover:bg-surface-sunken',
            )}
          >
            <X aria-hidden className="size-4" />
            <span className="hidden sm:inline">No conforme</span>
            <span className="sr-only">{check.label}</span>
          </button>

          <button
            type="button"
            aria-pressed={ruling.result === 'conforme'}
            onClick={() =>
              onRule({ result: ruling.result === 'conforme' ? 'pendiente' : 'conforme' })
            }
            className={cn(
              'inline-flex h-11 items-center gap-2 rounded-control border px-3 text-sm font-semibold',
              'transition-colors duration-150 ease-snap active:scale-[0.98]',
              ruling.result === 'conforme'
                ? 'border-ok-600 bg-ok-600 text-white'
                : 'border-border-strong bg-surface text-fg-muted hover:bg-surface-sunken',
            )}
          >
            <Check aria-hidden className="size-4" />
            <span className="hidden sm:inline">Conforme</span>
            <span className="sr-only">{check.label}</span>
          </button>
        </div>
      </div>

      {rechazada && (
        <div className="mt-3 space-y-3">
          <Field
            label="Qué está mal"
            error={faltaNota ? 'Sin esto el técnico no sabe qué corregir.' : undefined}
          >
            <Textarea
              rows={2}
              value={ruling.note ?? ''}
              placeholder="Ej.: chirría al frenar en seco desde 40 km/h."
              onChange={(e) => onRule({ note: e.target.value })}
            />
          </Field>

          {/* El mismo contador falso que en el checklist: subía un número y no
              guardaba ninguna imagen. Aquí duele más, porque la foto del
              defecto es lo que el técnico mira para corregirlo. */}
          <PhotoCapture
            anchor={`calidad:${orderId}:${check.id}`}
            title={check.label}
            hint={
              faltaFoto
                ? 'Falta la foto del defecto: es lo que el técnico mira para corregirlo.'
                : undefined
            }
            onCountChange={(photoCount) => onRule({ photoCount })}
          />
        </div>
      )}
    </li>
  );
}

function Resolution({
  outcome,
  nextStatus,
  orderCode,
  orderId,
  failed,
}: {
  readonly outcome: ReturnType<typeof outcomeOf>;
  readonly nextStatus: ReturnType<typeof nextStatusAfter>;
  readonly orderCode: string;
  readonly orderId: string;
  readonly failed: readonly QualityCheck[];
}) {
  const aprobado = outcome === 'aprobado';

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <span
        aria-hidden
        className={cn(
          'mx-auto grid size-16 place-items-center rounded-full',
          aprobado ? 'bg-ok-100 text-ok-600' : 'bg-warn-100 text-warn-700',
        )}
      >
        {aprobado ? <CircleCheckBig className="size-8" /> : <TriangleAlert className="size-8" />}
      </span>

      <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight text-fg">
        {aprobado ? 'Calidad aprobada' : 'Orden observada'}
      </h1>

      <p className="mt-2 text-base leading-relaxed text-fg-muted">
        {aprobado
          ? `${orderCode} pasa a los servicios finales.`
          : `${orderCode} vuelve al taller con ${failed.length === 1 ? '1 observación' : `${failed.length} observaciones`}.`}
      </p>

      {!aprobado && failed.length > 0 && (
        <ul className="mt-5 space-y-2 text-left">
          {failed.map((c) => (
            <li
              key={c.id}
              className="flex items-start gap-2.5 rounded-control border border-border bg-surface-raised px-4 py-3 text-sm text-fg-muted"
            >
              <X aria-hidden className="mt-0.5 size-4 shrink-0 text-crit-600" />
              {c.label}
            </li>
          ))}
        </ul>
      )}

      {nextStatus !== null && (
        <p className="mt-5 rounded-panel border border-border bg-surface-raised px-5 py-4">
          <span className="block text-sm text-fg-muted">Estado</span>
          <span className="mt-1 block font-display text-xl font-semibold tracking-tight text-fg">
            {STATUS_LABELS[nextStatus]}
          </span>
        </p>
      )}

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
