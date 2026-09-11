'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { usePersistentState } from '@/lib/demo/store';
import {
  ArrowLeft,
  ChevronRight,
  Clock,
  Plus,
  Save,
  TriangleAlert,
  Video,
} from 'lucide-react';
import { AssetImage } from '@/components/ui/asset-image';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/input';
import { Field } from '@/components/ui/field';
import {
  FINDING_SYSTEMS,
  PRIORITIES,
  PRIORITY_LABELS,
  SYSTEM_LABELS,
  countByPriority,
  countBySystem,
  readiness,
  sortByPriority,
  totalEstimatedMinutes,
  type Finding,
  type FindingSystem,
  type Priority,
} from '@/features/diagnosis/services/findings';
import { formatMinutes } from '@/features/repairs/services/time-tracking';
import { formatNumber } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

/** Estilo de cada prioridad. Declarado una vez, usado en la lista y el resumen. */
const PRIORITY_STYLE: Readonly<Record<Priority, { chip: string; dot: string; tile: string }>> = {
  critico: {
    chip: 'bg-crit-100 text-crit-700 border-crit-500/30',
    dot: 'bg-crit-500',
    tile: 'border-crit-500/25 bg-crit-100/60 text-crit-700',
  },
  alto: {
    chip: 'bg-warn-100 text-warn-700 border-warn-500/30',
    dot: 'bg-warn-600',
    tile: 'border-warn-500/25 bg-warn-100/60 text-warn-700',
  },
  medio: {
    chip: 'bg-warn-100/70 text-warn-700 border-warn-500/20',
    dot: 'bg-warn-400',
    tile: 'border-warn-500/20 bg-warn-100/40 text-warn-700',
  },
  recomendacion: {
    chip: 'bg-wait-100 text-wait-700 border-wait-500/25',
    dot: 'bg-wait-500',
    tile: 'border-border bg-surface-sunken text-fg-muted',
  },
};

/**
 * Diagnóstico técnico.
 *
 * Pantalla del TÉCNICO: no lleva importes, ni cliente corporativo, ni estado
 * comercial. Lo que el técnico necesita es qué encontró, con qué gravedad y
 * cuánto cuesta en tiempo. El precio lo pone el asesor en la cotización, y
 * mezclarlos aquí invita a que el técnico ajuste el hallazgo al presupuesto.
 */
export function TechnicalDiagnosis({
  vehicle,
  plate,
  orderCode,
  customer,
  usage,
  usageUnit,
  initialFindings,
}: {
  readonly vehicle: string;
  readonly plate: string;
  readonly orderCode: string;
  readonly customer: string;
  readonly usage: number;
  readonly usageUnit: string;
  readonly initialFindings: readonly Finding[];
}) {
  const [findings] = useState<readonly Finding[]>(initialFindings);
  const [system, setSystem] = useState<FindingSystem | 'todos'>('todos');
  const [notes, setNotes] = usePersistentState(`diagnostico.${orderCode}.notas`, '');

  const bySystem = useMemo(() => countBySystem(findings), [findings]);
  const byPriority = useMemo(() => countByPriority(findings), [findings]);
  const visible = useMemo(
    () => sortByPriority(system === 'todos' ? findings : findings.filter((f) => f.system === system)),
    [findings, system],
  );
  const check = useMemo(() => readiness(findings), [findings]);

  return (
    <>
      <Link
        href="/taller"
        className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 transition-colors hover:text-brand-700"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Volver a mi bandeja
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-6 rounded-panel border border-border bg-surface-raised p-6">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-fg lg:text-[1.75rem]">
            Diagnóstico técnico
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            Registra los hallazgos y recomendaciones del vehículo.
          </p>
          <dl className="mt-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
            <Meta label="Orden">
              <span className="font-mono text-xs">{orderCode}</span>
            </Meta>
            <Meta label="Cliente">{customer}</Meta>
            <Meta label="Kilometraje">
              <span data-numeric>
                {formatNumber(usage)} {usageUnit}
              </span>
            </Meta>
          </dl>
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

      <div className="grid gap-5 xl:grid-cols-[13rem_minmax(0,1fr)_19rem]">
        {/* Sistemas. El contador evita entrar a un sistema vacío para nada. */}
        <nav aria-label="Filtrar por sistema" className="min-w-0">
          <ul className="flex gap-2 overflow-x-auto xl:flex-col xl:gap-1 xl:overflow-visible">
            {(['todos', ...FINDING_SYSTEMS] as const).map((key) => {
              const active = key === system;
              const count = key === 'todos' ? findings.length : bySystem[key];
              return (
                <li key={key} className="shrink-0 xl:shrink">
                  <button
                    type="button"
                    onClick={() => setSystem(key)}
                    aria-pressed={active}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-control px-3 py-2.5 text-sm',
                      'transition-colors duration-150 ease-snap',
                      active
                        ? 'bg-brand-50 font-semibold text-brand-800'
                        : 'text-fg-muted hover:bg-surface-sunken',
                    )}
                  >
                    <span className="truncate">
                      {key === 'todos' ? 'Todos' : SYSTEM_LABELS[key]}
                    </span>
                    <span
                      data-numeric
                      className={cn(
                        'ml-auto shrink-0 rounded-chip px-1.5 py-0.5 text-xs font-semibold',
                        count === 0
                          ? 'bg-transparent text-graphite-300'
                          : active
                            ? 'bg-brand-100 text-brand-800'
                            : 'bg-surface-sunken text-fg-subtle',
                      )}
                    >
                      {count}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <section className="min-w-0 rounded-panel border border-border bg-surface-raised">
          <header className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <h2 className="font-display text-base font-semibold tracking-tight text-fg">
              Hallazgos del diagnóstico
            </h2>
            <p data-numeric className="text-xs text-fg-subtle">
              Ordenados por prioridad
            </p>
          </header>

          {visible.length === 0 ? (
            <p className="px-5 pb-8 pt-4 text-center text-sm text-fg-subtle">
              {findings.length === 0
                ? 'Todavía no hay hallazgos. Agrega el primero para empezar el diagnóstico.'
                : `Sin hallazgos en ${SYSTEM_LABELS[system as FindingSystem].toLowerCase()}.`}
            </p>
          ) : (
            <ul className="divide-y divide-border border-t border-border">
              {visible.map((f) => (
                <li key={f.id}>
                  <FindingRow finding={f} />
                </li>
              ))}
            </ul>
          )}

          <div className="border-t border-border p-4">
            <Button type="button" variant="secondary" block>
              <Plus aria-hidden className="size-4" />
              Agregar hallazgo
            </Button>
          </div>
        </section>

        <aside className="min-w-0 space-y-5">
          <section className="rounded-panel border border-border bg-surface-raised p-5">
            <h2 className="font-display text-base font-semibold tracking-tight text-fg">
              Resumen del diagnóstico
            </h2>

            <div className="mt-4 grid grid-cols-2 gap-2.5">
              {PRIORITIES.map((priority) => (
                <p
                  key={priority}
                  className={cn(
                    'rounded-control border px-3 py-2.5',
                    PRIORITY_STYLE[priority].tile,
                  )}
                >
                  <span data-numeric className="block font-display text-xl font-semibold">
                    {byPriority[priority]}
                  </span>
                  <span className="block text-xs">{PRIORITY_LABELS[priority]}</span>
                </p>
              ))}
            </div>

            <p className="mt-4 flex items-center justify-between border-t border-border pt-4 text-sm">
              <span className="flex items-center gap-2 text-fg-muted">
                <Clock aria-hidden className="size-4" />
                Tiempo estimado
              </span>
              <span data-numeric className="font-semibold text-fg">
                {formatMinutes(totalEstimatedMinutes(findings))}
              </span>
            </p>
          </section>

          <section className="rounded-panel border border-border bg-surface-raised p-5">
            <Field
              label="Observaciones generales"
              hint="Lo que el asesor debe saber y no cabe en un hallazgo."
            >
              <Textarea
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej. el vehículo presenta desgaste general acorde a su kilometraje."
              />
            </Field>
          </section>
        </aside>
      </div>

      <section className="sticky bottom-0 -mx-4 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur lg:-mx-6 lg:px-6">
        {/*
          Los requisitos que faltan se DICEN, no se esconden tras un botón
          apagado. Un técnico frente a un botón gris que no explica nada
          termina llamando al asesor, que es justo la interrupción que esta
          pantalla debería evitar.
        */}
        {!check.canFinish && (
          <ul className="mb-3 space-y-1">
            {check.blockers.map((blocker) => (
              <li key={blocker} className="flex items-start gap-2 text-xs text-warn-700">
                <TriangleAlert aria-hidden className="mt-px size-3.5 shrink-0" />
                {blocker}
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button type="button" variant="ghost" size="sm">
            <Save aria-hidden className="size-4" />
            Guardar borrador
          </Button>
          <Button type="button" disabled={!check.canFinish}>
            Finalizar diagnóstico
            <ChevronRight aria-hidden className="size-4" />
          </Button>
        </div>
      </section>
    </>
  );
}

function Meta({ label, children }: { readonly label: string; readonly children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-fg-subtle">{label}</dt>
      <dd className="mt-0.5 text-fg">{children}</dd>
    </div>
  );
}

function FindingRow({ finding }: { readonly finding: Finding }) {
  const style = PRIORITY_STYLE[finding.priority];
  const evidence = finding.photoCount + finding.videoCount;

  return (
    <article className="flex gap-4 px-5 py-4 transition-colors duration-150 hover:bg-surface-sunken">
      <AssetImage
        alt={finding.title}
        subject={finding.title}
        kind="evidencia"
        rounded="control"
        className="hidden h-20 w-28 shrink-0 sm:block"
      />

      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-fg-subtle">
          {SYSTEM_LABELS[finding.system]}
        </p>
        <h3 className="mt-0.5 font-display text-base font-semibold tracking-tight text-fg">
          {finding.title}
        </h3>
        <p className="mt-1 text-sm leading-relaxed text-fg-muted">{finding.detail}</p>

        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-chip border px-2 py-0.5 text-xs font-medium',
              style.chip,
            )}
          >
            <span aria-hidden className={cn('size-1.5 rounded-full', style.dot)} />
            {PRIORITY_LABELS[finding.priority]}
          </span>

          <span data-numeric className="inline-flex items-center gap-1.5 text-xs text-fg-subtle">
            <Clock aria-hidden className="size-3.5" />
            {formatMinutes(finding.estimatedMinutes)}
          </span>

          {evidence === 0 ? (
            <span className="inline-flex items-center gap-1.5 text-xs text-warn-700">
              <TriangleAlert aria-hidden className="size-3.5" />
              Sin evidencia
            </span>
          ) : (
            <span data-numeric className="inline-flex items-center gap-1.5 text-xs text-fg-subtle">
              {finding.videoCount > 0 && <Video aria-hidden className="size-3.5" />}
              {finding.photoCount} {finding.photoCount === 1 ? 'foto' : 'fotos'}
              {finding.videoCount > 0 && ` · ${finding.videoCount} vídeo`}
            </span>
          )}
        </div>
      </div>

      <ChevronRight aria-hidden className="mt-1 size-4 shrink-0 self-start text-graphite-300" />
    </article>
  );
}
