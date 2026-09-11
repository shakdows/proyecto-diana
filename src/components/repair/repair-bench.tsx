'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePersistentState } from '@/lib/demo/store';
import {
  Camera,
  Check,
  CircleCheckBig,
  CircleDot,
  Flag,
  Pause,
  Play,
  TriangleAlert,
} from 'lucide-react';
import { Modal } from '@/components/overlay/modal';
import { Field } from '@/components/ui/field';
import { Textarea } from '@/components/ui/input';
import { AssetImage } from '@/components/ui/asset-image';
import { StatusChip } from '@/components/ui/status-chip';
import {
  allDone,
  BLOCKS_ETA,
  canPause,
  clockView,
  completeCurrent,
  doneCount,
  finishReadiness,
  formatClock,
  PAUSE_LABELS,
  pauseNeedsNote,
  reopenStep,
  type JobStep,
  type PauseReason,
} from '@/features/repairs/services/job-steps';
import { cn } from '@/lib/utils/cn';

/**
 * Bahía del técnico — TABLET-FIRST.
 *
 * Deliberadamente más simple que la vista administrativa: el técnico está de
 * pie, con guantes, y mira la tablet de reojo entre pieza y pieza. Un reloj
 * grande, una lista de pasos y tres botones que se aciertan sin apuntar.
 *
 * El tiempo EFECTIVO no avanza durante la pausa. En producción las marcas las
 * pone `now()` de PostgreSQL sobre `repair_time_sessions`, nunca el reloj de
 * la tablet: si dependiera del dispositivo, el indicador de productividad
 * sería manipulable cambiando la hora.
 */
export function RepairBench({
  vehicle,
  plate,
  orderCode,
  jobTitle,
  initialSteps,
  initialEffectiveSeconds,
  estimatedSeconds,
  initialEvidenceCount,
}: {
  readonly vehicle: string;
  readonly plate: string;
  readonly orderCode: string;
  readonly jobTitle: string;
  readonly initialSteps: readonly JobStep[];
  readonly initialEffectiveSeconds: number;
  readonly estimatedSeconds: number;
  readonly initialEvidenceCount: number;
}) {
  const [steps, setSteps] = usePersistentState<readonly JobStep[]>(
    `reparacion.${orderCode}.pasos`,
    initialSteps,
  );
  const [evidence, setEvidence] = usePersistentState(
    `reparacion.${orderCode}.evidencia`,
    initialEvidenceCount,
  );
  const [finished, setFinished] = usePersistentState(`reparacion.${orderCode}.terminado`, false);
  const [activePause, setActivePause] = usePersistentState<{
    reason: PauseReason;
    note: string;
  } | null>(`reparacion.${orderCode}.pausa`, null);

  /*
   * El cronómetro guarda el ANCLA, no el tic.
   *
   * Persistir `seconds` cada segundo serían sesenta escrituras por minuto. Se
   * guarda `{ base, desde }`: los segundos acumulados y el instante en que
   * arrancó el tramo actual, y el reloj se DERIVA de la hora del sistema. Así
   * se escribe solo al iniciar, pausar o terminar.
   *
   * Efecto secundario buscado: el tiempo sigue corriendo con la pestaña
   * cerrada, que es como se comportará en producción —las marcas las pone
   * `now()` de PostgreSQL sobre `repair_time_sessions`, y a esa tabla le da
   * igual si la tablet se durmió—.
   */
  const [clockState, setClockState] = usePersistentState<{
    base: number;
    desde: number | null;
  }>(`reparacion.${orderCode}.reloj`, { base: initialEffectiveSeconds, desde: null });

  const running = clockState.desde !== null;

  /*
   * `Date.now()` NO se llama durante el renderizado: React puede reejecutar
   * el cuerpo del componente cuando le convenga, y un reloj leído ahí daría
   * un valor distinto en cada pasada. El instante vive en estado y solo lo
   * mueve el intervalo, que sí es un efecto.
   */
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!running || finished) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    // Sin la limpieza, salir de la pantalla deja un temporizador escribiendo
    // estado de un componente que ya no existe.
    return () => clearInterval(id);
  }, [running, finished]);

  // El trabajo arranca en marcha la primera vez que se abre la bahía.
  useEffect(() => {
    setClockState((c) => (c.desde === null && !finished ? { ...c, desde: Date.now() } : c));
    // Solo al montar: reanudar después es decisión explícita del técnico.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const seconds =
    clockState.desde === null
      ? clockState.base
      : clockState.base + Math.max(0, Math.floor((now - clockState.desde) / 1000));

  const [pause, setPause] = useState<{ reason?: PauseReason; note: string } | null>(null);

  const clock = useMemo(() => clockView(seconds, estimatedSeconds), [seconds, estimatedSeconds]);
  const done = doneCount(steps);
  const ready = finishReadiness(steps, evidence, !running);

  const confirmPause = (): void => {
    if (pause?.reason === undefined || !canPause(pause.reason, pause.note)) return;
    setActivePause({ reason: pause.reason, note: pause.note });
    // Al pausar se congela lo acumulado hasta AHORA y se suelta el ancla.
    setClockState((c) => ({
      base:
        c.desde === null
          ? c.base
          : c.base + Math.max(0, Math.floor((Date.now() - c.desde) / 1000)),
      desde: null,
    }));
    setPause(null);
  };

  const resume = (): void => {
    setActivePause(null);
    setClockState((c) => (c.desde === null ? { base: c.base, desde: Date.now() } : c));
  };

  if (finished) {
    return <Finished jobTitle={jobTitle} seconds={seconds} allJobsDone={allDone(steps)} />;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-4 pb-28">
      {/* Cabecera: qué vehículo, qué orden, qué trabajo. Nada más. */}
      <header className="flex flex-wrap items-center gap-4 rounded-panel border border-border bg-surface-raised p-5">
        <AssetImage
          alt={vehicle}
          subject={vehicle}
          fit="cover"
          rounded="control"
          className="h-16 w-24 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <p className="font-display text-xl font-semibold tracking-tight text-fg">{vehicle}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="inline-flex rounded-chip border border-border-strong bg-surface px-2.5 py-0.5 font-mono text-sm font-bold tracking-[0.06em] text-fg">
              {plate}
            </span>
            <span data-numeric className="font-mono text-xs text-fg-subtle">
              {orderCode}
            </span>
          </p>
        </div>
        <StatusChip status={running ? 'EN_REPARACION' : 'REPARACION_PAUSADA'} />
      </header>

      {/* Trabajo actual, con la foto del sistema que se está tocando. */}
      <section className="flex items-center gap-4 rounded-panel border border-border bg-surface-raised p-5">
        <AssetImage
          alt={`Evidencia de ${jobTitle}`}
          subject={jobTitle}
          kind="evidencia"
          rounded="control"
          className="size-20 shrink-0"
        />
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.08em] text-fg-subtle">
            Trabajo actual
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold leading-tight tracking-tight text-fg">
            {jobTitle}
          </h1>
        </div>
      </section>

      {/* BLOQUE PRINCIPAL: el cronómetro. */}
      <section
        className={cn(
          'rounded-panel border p-6 transition-colors duration-200',
          running ? 'border-border bg-graphite-950' : 'border-warn-500/40 bg-graphite-900',
        )}
      >
        <p className="text-center text-xs font-medium uppercase tracking-[0.1em] text-graphite-400">
          Tiempo efectivo
        </p>
        <p
          data-numeric
          aria-live="off"
          className={cn(
            'mt-2 text-center font-mono text-5xl font-bold tabular-nums tracking-tight sm:text-6xl',
            running ? 'text-white' : 'text-graphite-400',
          )}
        >
          {formatClock(seconds)}
        </p>

        {!running && activePause !== null && (
          <p className="mt-3 flex flex-wrap items-center justify-center gap-2 text-sm text-warn-500">
            <Pause aria-hidden className="size-4" />
            En pausa · {PAUSE_LABELS[activePause.reason]}
            {BLOCKS_ETA[activePause.reason] && (
              <span className="rounded-chip bg-warn-500/15 px-2 py-0.5 text-xs">
                Afecta la hora prometida
              </span>
            )}
          </p>
        )}

        <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-white/10 pt-5 text-center">
          <div>
            <dt className="text-xs uppercase tracking-[0.08em] text-graphite-400">Estimado</dt>
            <dd data-numeric className="mt-1 font-mono text-lg font-semibold text-graphite-100">
              {formatClock(clock.estimatedSeconds)}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-[0.08em] text-graphite-400">
              {clock.over ? 'Excedido' : 'Restante'}
            </dt>
            <dd
              data-numeric
              className={cn(
                'mt-1 font-mono text-lg font-semibold',
                clock.over ? 'text-crit-500' : 'text-graphite-100',
              )}
            >
              {/*
                Al excederse NO se muestra un restante negativo: «−00:12:30»
                es un dato sobre el que el técnico no puede actuar. Se cambia
                la etiqueta y se dice cuánto lleva de más.
              */}
              {formatClock(clock.over ? clock.overrunSeconds : clock.remainingSeconds)}
            </dd>
          </div>
        </dl>

        <div className="mt-5">
          <div className="flex items-baseline justify-between text-xs">
            <span className="uppercase tracking-[0.08em] text-graphite-400">Progreso</span>
            <span data-numeric className="font-semibold text-graphite-100">
              {Math.round(clock.percent)} %
            </span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/10">
            <div
              className={cn(
                'h-full rounded-full transition-[width] duration-500 ease-snap',
                clock.over ? 'bg-crit-500' : 'bg-brand-500',
              )}
              style={{ width: `${clock.percent}%` }}
            />
          </div>
        </div>
      </section>

      {/* Lista de pasos. */}
      <section className="overflow-hidden rounded-panel border border-border bg-surface-raised">
        <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
          <h2 className="font-display text-base font-semibold tracking-tight text-fg">Trabajos</h2>
          <span data-numeric className="text-sm text-fg-muted">
            {done}/{steps.length}
          </span>
        </header>

        <ul className="divide-y divide-border">
          {steps.map((step) => (
            <li key={step.id}>
              <button
                type="button"
                disabled={step.state === 'pendiente'}
                onClick={() =>
                  setSteps((prev) =>
                    step.state === 'hecho' ? reopenStep(prev, step.id) : completeCurrent(prev),
                  )
                }
                className={cn(
                  'flex w-full items-center gap-4 px-5 py-4 text-left',
                  'transition-colors duration-150 ease-snap',
                  step.state === 'pendiente'
                    ? 'cursor-default'
                    : 'hover:bg-surface-sunken active:bg-graphite-100',
                  step.state === 'en_curso' && 'bg-brand-50',
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'grid size-8 shrink-0 place-items-center rounded-full border-2',
                    step.state === 'hecho' && 'border-ok-600 bg-ok-600 text-white',
                    step.state === 'en_curso' && 'border-brand-600 text-brand-600',
                    step.state === 'pendiente' && 'border-border-strong text-transparent',
                  )}
                >
                  {step.state === 'hecho' && <Check className="size-4" />}
                  {step.state === 'en_curso' && <CircleDot className="size-4" />}
                </span>

                <span
                  className={cn(
                    'min-w-0 flex-1 text-base',
                    step.state === 'hecho' && 'text-fg-muted line-through decoration-border-strong',
                    step.state === 'en_curso' && 'font-semibold text-fg',
                    step.state === 'pendiente' && 'text-fg-subtle',
                  )}
                >
                  {step.label}
                </span>

                {step.state === 'en_curso' && (
                  <span className="shrink-0 text-sm font-medium text-brand-700">
                    Marcar hecho
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </section>

      {ready.blockers.length > 0 && (
        <ul className="space-y-1.5 px-1">
          {ready.blockers.map((b) => (
            <li key={b} className="flex items-start gap-2 text-sm text-fg-muted">
              <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-warn-600" />
              {b}
            </li>
          ))}
        </ul>
      )}

      {/*
        Botonera fija. 56 px de alto: se aciertan sin mirar, que es como se
        pulsan cuando se tienen las manos ocupadas.
      */}
      <div className="fixed inset-x-0 bottom-0 z-sticky border-t border-border bg-surface/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto grid max-w-4xl grid-cols-3 gap-3">
          {running ? (
            <BigButton tone="warn" onClick={() => setPause({ note: '' })}>
              <Pause aria-hidden className="size-5" />
              Pausar
            </BigButton>
          ) : (
            <BigButton tone="ok" onClick={resume}>
              <Play aria-hidden className="size-5" />
              Reanudar
            </BigButton>
          )}

          <BigButton tone="neutral" onClick={() => setEvidence((n) => n + 1)}>
            <Camera aria-hidden className="size-5" />
            <span className="hidden sm:inline">Agregar evidencia</span>
            <span className="sm:hidden">Evidencia</span>
            {evidence > 0 && (
              <span
                data-numeric
                className="rounded-chip bg-graphite-100 px-1.5 text-xs font-semibold text-fg-muted"
              >
                {evidence}
              </span>
            )}
          </BigButton>

          <BigButton
            tone="primary"
            disabled={!ready.canFinish}
            onClick={() => {
              setClockState((c) => ({
                base:
                  c.desde === null
                    ? c.base
                    : c.base + Math.max(0, Math.floor((Date.now() - c.desde) / 1000)),
                desde: null,
              }));
              setFinished(true);
            }}
          >
            <Flag aria-hidden className="size-5" />
            <span className="hidden sm:inline">Finalizar trabajo</span>
            <span className="sm:hidden">Finalizar</span>
          </BigButton>
        </div>
      </div>

      <Modal
        open={pause !== null}
        onClose={() => setPause(null)}
        title="¿Por qué pausas?"
        description="El tiempo efectivo deja de correr. El motivo queda registrado en la orden."
      >
        <div className="space-y-4">
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {(Object.keys(PAUSE_LABELS) as PauseReason[]).map((reason) => {
              const selected = pause?.reason === reason;
              return (
                <li key={reason}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setPause((p) => ({ note: p?.note ?? '', reason }))}
                    className={cn(
                      'flex h-14 w-full items-center justify-between gap-3 rounded-control border px-4 text-left text-base font-medium',
                      'transition-colors duration-150 ease-snap active:scale-[0.99]',
                      selected
                        ? 'border-brand-600 bg-brand-50 text-brand-700'
                        : 'border-border-strong bg-surface text-fg hover:bg-surface-sunken',
                    )}
                  >
                    {PAUSE_LABELS[reason]}
                    {BLOCKS_ETA[reason] && (
                      <span className="shrink-0 rounded-chip bg-warn-100 px-2 py-0.5 text-xs font-medium text-warn-700">
                        Afecta ETA
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>

          <Field
            label="Notas"
            hint={
              pause?.reason !== undefined && pauseNeedsNote(pause.reason)
                ? undefined
                : 'Opcional.'
            }
            error={
              pause?.reason !== undefined &&
              pauseNeedsNote(pause.reason) &&
              pause.note.trim() === ''
                ? 'Este motivo necesita una nota: mañana nadie recordará qué pasó.'
                : undefined
            }
          >
            <Textarea
              rows={2}
              value={pause?.note ?? ''}
              placeholder="Ej.: falta el extractor de pistones, lo tiene la bahía 3."
              onChange={(e) => setPause((p) => ({ ...p, note: e.target.value }))}
            />
          </Field>

          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={() => setPause(null)}
              className="inline-flex h-12 items-center rounded-control border border-border-strong bg-surface px-5 text-sm font-semibold text-fg-muted transition-colors hover:bg-surface-sunken"
            >
              Seguir trabajando
            </button>
            <button
              type="button"
              disabled={!canPause(pause?.reason, pause?.note ?? '')}
              onClick={confirmPause}
              className="inline-flex h-12 items-center gap-2 rounded-control bg-warn-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-warn-700 disabled:opacity-50"
            >
              <Pause aria-hidden className="size-4" />
              Pausar trabajo
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function BigButton({
  tone,
  disabled = false,
  onClick,
  children,
}: {
  readonly tone: 'primary' | 'warn' | 'ok' | 'neutral';
  readonly disabled?: boolean;
  readonly onClick: () => void;
  readonly children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'inline-flex h-14 items-center justify-center gap-2 rounded-control text-base font-semibold',
        'transition-[background-color,transform] duration-150 ease-snap active:scale-[0.98]',
        'disabled:pointer-events-none disabled:opacity-50',
        tone === 'primary' && 'bg-brand-600 text-white hover:bg-brand-700',
        tone === 'warn' && 'bg-warn-600 text-white hover:bg-warn-700',
        tone === 'ok' && 'bg-ok-600 text-white hover:bg-ok-700',
        tone === 'neutral' &&
          'border border-border-strong bg-surface text-fg hover:bg-surface-sunken',
      )}
    >
      {children}
    </button>
  );
}

function Finished({
  jobTitle,
  seconds,
  allJobsDone,
}: {
  readonly jobTitle: string;
  readonly seconds: number;
  readonly allJobsDone: boolean;
}) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <span
        aria-hidden
        className="mx-auto grid size-16 place-items-center rounded-full bg-ok-100 text-ok-600"
      >
        <CircleCheckBig className="size-8" />
      </span>

      <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight text-fg">
        Trabajo terminado
      </h1>
      <p className="mt-2 text-base leading-relaxed text-fg-muted">{jobTitle}</p>

      <p className="mt-5 rounded-panel border border-border bg-surface-raised px-5 py-4">
        <span className="block text-sm text-fg-muted">Tiempo efectivo</span>
        <span
          data-numeric
          className="mt-1 block font-mono text-3xl font-bold tabular-nums tracking-tight text-fg"
        >
          {formatClock(seconds)}
        </span>
      </p>

      {allJobsDone && (
        <p className="mt-4 text-sm leading-relaxed text-fg-muted">
          Era el último trabajo de la orden. Pasa a control de calidad, que lo revisa alguien
          distinto de quien lo hizo.
        </p>
      )}
    </div>
  );
}
