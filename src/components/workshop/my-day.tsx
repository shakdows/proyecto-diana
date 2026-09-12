import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Hourglass,
  Pause,
  Wrench,
} from 'lucide-react';
import { LiveTimer } from '@/components/workshop/live-timer';
import { Plate } from '@/components/ui/plate';
import { StatusChip } from '@/components/ui/status-chip';
import { formatMinutes } from '@/features/repairs/services/time-tracking';
import {
  stepHref,
  waitingPhrase,
  type DayEntry,
  type DayPlan,
  type NextStep,
} from '@/features/repairs/services/my-day';
import { cn } from '@/lib/utils/cn';
import { DEFAULT_LOCALE, DEFAULT_TIME_ZONE } from '@/lib/utils/format';

/**
 * La jornada del técnico (§12).
 *
 * Cuatro bloques y un orden que no es decorativo: lo que está haciendo, lo que
 * puede empezar, lo que no depende de él y lo que ya terminó. Quien abre esto
 * está de pie junto al vehículo; la primera pantalla tiene que responder «¿qué
 * hago ahora?» sin desplazarse y sin elegir sección.
 *
 * Ningún botón está escrito aquí. La etiqueta, si está activo y qué falta para
 * activarlo los decide `nextStep` contra la máquina de estados, así que esta
 * pantalla no puede ofrecer una acción que el servidor vaya a rechazar.
 *
 * Objetivos táctiles de 48 px o más en todo: se usa en tablet, de pie y a
 * veces con guantes.
 */
export function MyDay({
  userName,
  greeting,
  plan,
  minutesToday,
}: {
  readonly userName: string;
  readonly greeting: string;
  readonly plan: DayPlan;
  readonly minutesToday: number;
}) {
  const pending = plan.next.length + plan.waiting.length;

  return (
    <div className="@container space-y-6">
      <header className="rounded-panel border border-border bg-surface-raised px-5 py-5 sm:px-6">
        <p className="text-sm text-fg-muted">
          {greeting}, {userName}
        </p>
        <h1 className="mt-0.5 font-display text-[1.5rem] font-semibold leading-tight tracking-tight text-fg lg:text-[1.75rem]">
          Mi jornada
        </h1>
        <p className="mt-1 text-sm text-fg-muted">
          {formatMinutes(minutesToday)} de trabajo efectivo hoy
          {' · '}
          {plan.finishedToday.length === 1
            ? '1 trabajo terminado'
            : `${plan.finishedToday.length} trabajos terminados`}
          {' · '}
          {pending === 1 ? '1 orden por delante' : `${pending} órdenes por delante`}
        </p>
      </header>

      <CurrentJob entry={plan.current} />

      <Block
        title="Lo siguiente"
        description="Puedes empezarlo ahora mismo."
        icon={<Wrench />}
        entries={plan.next}
        empty="Nada más asignado por ahora."
      />

      <Block
        title="Esperando"
        description="Parado por alguien que no eres tú."
        icon={<Hourglass />}
        entries={plan.waiting}
        empty="Ninguna orden tuya está esperando a nadie."
      />

      <FinishedToday entries={plan.finishedToday} />
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Lo que está haciendo ahora
 * ------------------------------------------------------------------ */

function CurrentJob({ entry }: { readonly entry: DayEntry | null }) {
  if (entry === null) {
    return (
      <section className="rounded-panel border border-dashed border-border-strong bg-surface-sunken px-5 py-8 text-center">
        <p className="text-base font-semibold text-fg">No tienes ningún trabajo en curso</p>
        <p className="mt-1 text-sm text-fg-muted">
          Empieza el primero de «Lo siguiente» y el cronómetro arranca solo.
        </p>
      </section>
    );
  }

  const { job, step, pause } = entry;
  /* El ancla del cronómetro es la sesión de trabajo abierta, no «hace un
     rato»: lo que se pinta tiene que poder recalcularse desde la base. */
  const open = job.sessions.find((s) => s.kind === 'trabajo' && s.endedAt === null);
  const before = job.totals.effectiveMinutes - elapsedSince(open?.startedAt);

  return (
    <section className="overflow-hidden rounded-panel bg-graphite-950 text-white shadow-raise">
      <div className="flex items-center gap-2 border-b border-white/10 px-5 py-3 sm:px-6">
        <span className="relative flex size-2.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-400 opacity-75" />
          <span className="relative inline-flex size-2.5 rounded-full bg-brand-400" />
        </span>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-graphite-300">
          Trabajando ahora
        </p>
      </div>

      <div className="grid gap-6 px-5 py-6 sm:px-6 @3xl:grid-cols-[1fr_auto] @3xl:items-center">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Plate value={job.plate} size="lg" className="ring-white/20" />
            <span className="text-sm text-graphite-300">{job.code}</span>
          </div>
          <h2 className="mt-3 font-display text-xl font-semibold leading-tight">
            {job.serviceType}
          </h2>
          <p className="mt-1 text-sm text-graphite-300">
            {job.vehicle} · {job.customer}
          </p>

          {job.jobsTotal > 0 && (
            <p className="mt-4 text-sm text-graphite-300">
              {job.jobsDone} de {job.jobsTotal} trabajos hechos
              {job.estimatedMinutes > 0 && (
                <> · estimado {formatMinutes(job.estimatedMinutes)}</>
              )}
            </p>
          )}
        </div>

        <div className="@3xl:text-right">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-graphite-400">
            Tiempo efectivo
          </p>
          <div className="mt-1.5">
            {open === undefined ? (
              <p className="font-mono text-[2.75rem] font-semibold leading-none tabular-nums">
                {formatMinutes(job.totals.effectiveMinutes)}
              </p>
            ) : (
              <LiveTimer
                startedAt={open.startedAt}
                baseMinutes={Math.max(0, before)}
                estimatedMinutes={job.estimatedMinutes}
              />
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-white/10 px-5 py-4 sm:flex-row sm:px-6">
        <PrimaryAction step={step} orderId={job.id} inverted />
        {/* Pausar no está escrito aquí: si la máquina de estados dejara de
            permitirlo, el botón desaparece solo. */}
        {pause !== null && (
          <Link
            href={stepHref(pause.action, job.id)}
            className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-control border border-white/20 px-5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-white/10 active:scale-[0.98]"
          >
            <Pause aria-hidden className="size-4" />
            {pause.label}
          </Link>
        )}
      </div>
    </section>
  );
}

function elapsedSince(startedAt: Date | undefined): number {
  if (startedAt === undefined) return 0;
  return Math.max(0, (Date.now() - startedAt.getTime()) / 60_000);
}

/* ------------------------------------------------------------------ *
 * El botón que decide el sistema
 * ------------------------------------------------------------------ */

const TONE_CLASS = {
  brand: 'bg-brand-600 text-white hover:bg-brand-700',
  ok: 'bg-ok-600 text-white hover:bg-ok-700',
  crit: 'bg-crit-600 text-white hover:bg-crit-700',
  warn: 'bg-surface-raised text-fg border border-border-strong',
  muted: 'bg-surface-sunken text-fg-muted border border-border',
} as const;

/**
 * La acción contextual.
 *
 * Tres formas, según lo que el dominio diga: enlace cuando se puede hacer,
 * botón deshabilitado con el motivo cuando falta algo que el técnico sí puede
 * resolver, y una frase gris cuando la pelota la tiene otro. Nunca un botón
 * que parece pulsable y no hace nada.
 */
function PrimaryAction({
  step,
  orderId,
  inverted = false,
  subdued = false,
}: {
  readonly step: NextStep;
  readonly orderId: string;
  readonly inverted?: boolean;
  /** La acción existe pero no es el trabajo que toca: sin color de llamada. */
  readonly subdued?: boolean;
}) {
  const base =
    'inline-flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-control px-5 text-sm font-semibold transition-colors duration-150 active:scale-[0.98]';

  if (step.action === null) {
    /* Sin acción del técnico, repetir «Esperando a control de calidad» —que la
       tarjeta ya dice arriba— gasta el sitio del botón en decir dos veces lo
       mismo. Lo único útil aquí es abrir la orden: ahí están las notas y el
       asesor a quien preguntar. */
    return (
      <Link
        href={`/ordenes/${orderId}`}
        className={cn(
          base,
          inverted
            ? 'border border-white/20 text-white hover:bg-white/10'
            : 'border border-border bg-surface-raised text-fg-muted hover:bg-surface-sunken hover:text-fg',
        )}
      >
        Ver la orden
        <ArrowRight aria-hidden className="size-4 shrink-0" />
      </Link>
    );
  }

  if (!step.enabled) {
    /* Bloqueado NO es «no puedes»: es «falta algo que se resuelve en el banco
       de trabajo». Un botón muerto dejaba al técnico mirando dos requisitos
       sin ninguna forma de llegar a donde se cumplen. Así que sigue siendo un
       enlace, con aspecto secundario y el motivo debajo. */
    return (
      <div className="min-w-0 flex-1">
        <Link
          href={stepHref(step.action, orderId)}
          className={cn(
            'inline-flex h-12 w-full items-center justify-center gap-2 rounded-control px-5 text-sm font-semibold transition-colors duration-150 active:scale-[0.98]',
            inverted
              ? 'border border-white/25 text-white hover:bg-white/10'
              : 'border border-border-strong bg-surface-raised text-fg hover:bg-surface-sunken',
          )}
        >
          Continuar en el banco
          <ArrowRight aria-hidden className="size-4 shrink-0" />
        </Link>
        <p className={cn('mt-2 text-sm', inverted ? 'text-warn-300' : 'text-warn-700')}>
          <AlertTriangle aria-hidden className="mr-1.5 inline size-3.5 align-[-2px]" />
          Para {step.label.toLowerCase()} falta:
        </p>
        <ul className={cn('mt-0.5 space-y-0.5 text-sm', inverted ? 'text-graphite-300' : 'text-fg-muted')}>
          {step.blockedBy.map((reason) => (
            <li key={reason}>· {reason}</li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <Link
      href={stepHref(step.action, orderId)}
      className={cn(
        base,
        inverted
          ? 'bg-white text-graphite-950 hover:bg-graphite-100'
          : subdued
            ? 'border border-border-strong bg-surface-raised text-fg hover:bg-surface-sunken'
            : TONE_CLASS[step.tone],
      )}
    >
      {step.label}
      <ArrowRight aria-hidden className="size-4 shrink-0" />
    </Link>
  );
}

/* ------------------------------------------------------------------ *
 * Bloques de lista
 * ------------------------------------------------------------------ */

function Block({
  title,
  description,
  icon,
  entries,
  empty,
}: {
  readonly title: string;
  readonly description: string;
  readonly icon: React.ReactNode;
  readonly entries: readonly DayEntry[];
  readonly empty: string;
}) {
  return (
    <section>
      <header className="flex items-center gap-2.5 px-1 pb-3">
        <span aria-hidden className="text-fg-subtle [&>svg]:size-4">
          {icon}
        </span>
        <h2 className="text-sm font-semibold text-fg">{title}</h2>
        <span className="text-sm text-fg-subtle">· {description}</span>
        <span className="ml-auto text-sm font-semibold tabular-nums text-fg-muted">
          {entries.length}
        </span>
      </header>

      {entries.length === 0 ? (
        <p className="rounded-panel border border-dashed border-border bg-surface-sunken px-5 py-5 text-sm text-fg-muted">
          {empty}
        </p>
      ) : (
        <ul className="grid gap-3 @3xl:grid-cols-2">
          {entries.map((entry) => (
            <li key={entry.job.id}>
              <JobCard entry={entry} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function JobCard({ entry }: { readonly entry: DayEntry }) {
  const { job, step, waiting } = entry;

  return (
    <article className="flex h-full flex-col gap-4 rounded-panel border border-border bg-surface-raised p-4 shadow-raise sm:p-5">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Plate value={job.plate} />
          <StatusChip status={job.status} />
        </div>
        <h3 className="mt-2.5 truncate text-base font-semibold text-fg">{job.serviceType}</h3>
        <p className="mt-0.5 truncate text-sm text-fg-muted">
          {job.vehicle} · {job.customer}
        </p>

        {/* Por qué está parado y desde cuándo. Sin las dos, «esperando» es una
            etiqueta que no dice a quién llamar ni si ya es demasiado tarde.
            La pausa y el tercero se dicen por separado: un motivo de pausa no
            es alguien a quien esperar. */}
        {job.openPause !== null && (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-chip bg-warn-100 px-2.5 py-1 text-sm text-warn-800">
            <Pause aria-hidden className="size-3.5 shrink-0" />
            Pausado por {job.openPause.label.toLowerCase()} ·{' '}
            {formatMinutes(minutesSince(job.openPause.since))}
          </p>
        )}

        {job.openPause === null && waiting !== null && (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-chip bg-surface-sunken px-2.5 py-1 text-sm text-fg-muted">
            <Clock3 aria-hidden className="size-3.5 shrink-0" />
            Esperando {waitingPhrase(waiting)}
          </p>
        )}

        {job.promisedAt !== null && (
          <p className="mt-3 text-sm text-fg-subtle">
            Se entrega a las{' '}
            <time dateTime={job.promisedAt.toISOString()} className="font-medium text-fg-muted">
              {hourIn(job.promisedAt)}
            </time>
          </p>
        )}
      </div>

      <div className="mt-auto flex">
        {/* En «Esperando», hasta una acción disponible va en secundario: el
            azul de «Reanudar» era lo más llamativo de la pantalla y decía lo
            contrario que el bloque donde vive. */}
        <PrimaryAction step={step} orderId={job.id} subdued={entry.bucket === 'esperando'} />
      </div>
    </article>
  );
}

function minutesSince(date: Date): number {
  return Math.max(0, (Date.now() - date.getTime()) / 60_000);
}

function hourIn(date: Date): string {
  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    timeZone: DEFAULT_TIME_ZONE,
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

/* ------------------------------------------------------------------ *
 * Terminado hoy
 * ------------------------------------------------------------------ */

function FinishedToday({ entries }: { readonly entries: readonly DayEntry[] }) {
  return (
    <section>
      <header className="flex items-center gap-2.5 px-1 pb-3">
        <span aria-hidden className="text-ok-600 [&>svg]:size-4">
          <CheckCircle2 />
        </span>
        <h2 className="text-sm font-semibold text-fg">Terminado hoy</h2>
        <span className="ml-auto text-sm font-semibold tabular-nums text-fg-muted">
          {entries.length}
        </span>
      </header>

      {entries.length === 0 ? (
        <p className="rounded-panel border border-dashed border-border bg-surface-sunken px-5 py-5 text-sm text-fg-muted">
          Todavía no has cerrado ningún trabajo hoy.
        </p>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-panel border border-border bg-surface-raised">
          {entries.map(({ job }) => (
            <li key={job.id}>
              <Link
                href={`/ordenes/${job.id}`}
                className="flex min-h-12 items-center gap-3 px-4 py-3 transition-colors duration-150 hover:bg-surface-sunken sm:px-5"
              >
                <CheckCircle2 aria-hidden className="size-4 shrink-0 text-ok-600" />
                <Plate value={job.plate} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm text-fg">
                  {job.serviceType}
                </span>
                <span className="hidden shrink-0 text-sm text-fg-subtle @xl:inline">
                  {formatMinutes(job.totals.effectiveMinutes)}
                </span>
                <ChevronRight aria-hidden className="size-4 shrink-0 text-fg-subtle" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
