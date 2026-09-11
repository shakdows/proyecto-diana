'use client';

import { useMemo, useState } from 'react';
import { CircleCheckBig, Star, TriangleAlert } from 'lucide-react';
import { RomeroMark } from '@/components/brand/romero-logo';
import { Field } from '@/components/ui/field';
import { Textarea } from '@/components/ui/input';
import {
  bucketOf,
  csatAverage,
  CSAT_QUESTIONS,
  MAX_CSAT,
  needsFollowUp,
  readiness,
  type CsatAnswers,
} from '@/features/delivery/services/survey';
import { cn } from '@/lib/utils/cn';

/**
 * Encuesta de satisfacción.
 *
 * Como la autorización del cliente, la ve alguien que no trabaja aquí, desde
 * el móvil y probablemente de pie: sin barra lateral, sin jerga y con
 * objetivos táctiles grandes.
 *
 * El comentario es obligatorio SOLO para el detractor. Pedirlo a todo el
 * mundo hace que la mayoría escriba «bien» y se pierda la señal; no pedirlo
 * nunca deja al taller con un 3 sin saber qué arreglar.
 */
export function SatisfactionSurvey({
  customerFirstName,
  vehicle,
  plate,
  orderCode,
}: {
  readonly customerFirstName: string;
  readonly vehicle: string;
  readonly plate: string;
  readonly orderCode: string;
}) {
  const [score, setScore] = useState<number | null>(null);
  const [answers, setAnswers] = useState<CsatAnswers>({});
  const [comment, setComment] = useState('');
  const [sent, setSent] = useState(false);

  const state = useMemo(() => readiness(score, answers, comment), [score, answers, comment]);
  const bucket = score === null ? null : bucketOf(score);

  if (sent) {
    return (
      <Thanks
        customerFirstName={customerFirstName}
        followUp={needsFollowUp(score, answers)}
        average={csatAverage(answers)}
      />
    );
  }

  return (
    <div className="min-h-dvh bg-surface-sunken pb-12">
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
            Gracias, {customerFirstName}
          </h1>
          <p className="mt-2 text-base leading-relaxed text-fg-muted">
            Ya tienes tu {vehicle} de vuelta. Cuéntanos cómo fue: son dos minutos y nos sirve de
            verdad.
          </p>
          <p className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-fg-subtle">
            <span className="inline-flex rounded-chip border border-border-strong bg-surface px-2 py-0.5 font-mono text-sm font-bold tracking-[0.06em] text-fg">
              {plate}
            </span>
            <span data-numeric className="font-mono text-xs">
              {orderCode}
            </span>
          </p>
        </section>

        {/* NPS. La pregunta que se compara con el resto del sector. */}
        <section className="mt-7 rounded-panel border border-border bg-surface-raised p-5">
          <h2 className="font-display text-lg font-semibold leading-snug tracking-tight text-fg">
            ¿Qué tan probable es que nos recomiendes a un amigo?
          </h2>

          <div className="mt-4 grid grid-cols-6 gap-2 sm:grid-cols-11">
            {Array.from({ length: 11 }, (_, n) => n).map((n) => {
              const selected = score === n;
              return (
                <button
                  key={n}
                  type="button"
                  aria-pressed={selected}
                  aria-label={`${n} de 10`}
                  onClick={() => setScore(n)}
                  className={cn(
                    'flex h-12 items-center justify-center rounded-control border text-base font-semibold tabular-nums',
                    'transition-colors duration-150 ease-snap active:scale-[0.95]',
                    selected
                      ? 'border-brand-600 bg-brand-600 text-white'
                      : 'border-border-strong bg-surface text-fg-muted hover:bg-surface-sunken',
                  )}
                >
                  {n}
                </button>
              );
            })}
          </div>

          <p className="mt-2.5 flex justify-between text-xs text-fg-subtle">
            <span>Nada probable</span>
            <span>Muy probable</span>
          </p>

          {bucket !== null && (
            <p
              className={cn(
                'mt-4 rounded-control px-3 py-2.5 text-sm',
                bucket === 'promotor' && 'bg-ok-100 text-ok-700',
                bucket === 'pasivo' && 'bg-surface-sunken text-fg-muted',
                bucket === 'detractor' && 'bg-warn-100 text-warn-700',
              )}
            >
              {bucket === 'promotor' && 'Nos alegra mucho. Gracias.'}
              {bucket === 'pasivo' && 'Gracias. Nos gustaría llegar más alto la próxima vez.'}
              {bucket === 'detractor' && 'Sentimos no haber estado a la altura. Cuéntanos abajo qué pasó.'}
            </p>
          )}
        </section>

        <section className="mt-5 rounded-panel border border-border bg-surface-raised p-5">
          <h2 className="font-display text-lg font-semibold tracking-tight text-fg">
            Puntúa cada aspecto
          </h2>

          <ul className="mt-4 space-y-5">
            {CSAT_QUESTIONS.map((q) => (
              <li key={q.id}>
                <p className="text-base font-medium text-fg">{q.label}</p>
                {q.hint !== undefined && (
                  <p className="mt-0.5 text-sm text-fg-muted">{q.hint}</p>
                )}
                <div className="mt-2.5 flex gap-2">
                  {Array.from({ length: MAX_CSAT }, (_, i) => i + 1).map((value) => {
                    const active = (answers[q.id] ?? 0) >= value;
                    return (
                      <button
                        key={value}
                        type="button"
                        aria-label={`${value} de ${MAX_CSAT} en ${q.label}`}
                        aria-pressed={(answers[q.id] ?? 0) === value}
                        onClick={() => setAnswers((a) => ({ ...a, [q.id]: value }))}
                        className={cn(
                          'grid size-12 place-items-center rounded-control border',
                          'transition-colors duration-150 ease-snap active:scale-[0.95]',
                          active
                            ? 'border-warn-500 bg-warn-100 text-warn-600'
                            : 'border-border-strong bg-surface text-fg-subtle hover:bg-surface-sunken',
                        )}
                      >
                        <Star
                          aria-hidden
                          className={cn('size-5', active && 'fill-current')}
                        />
                      </button>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-5 rounded-panel border border-border bg-surface-raised p-5">
          <Field
            label={bucket === 'detractor' ? '¿Qué salió mal?' : '¿Algo más que quieras contarnos?'}
            hint={bucket === 'detractor' ? undefined : 'Opcional.'}
          >
            <Textarea
              rows={4}
              value={comment}
              placeholder={
                bucket === 'detractor'
                  ? 'Cuéntanos qué pasó para poder corregirlo.'
                  : 'Lo leemos todo.'
              }
              onChange={(e) => setComment(e.target.value)}
            />
          </Field>
        </section>

        <button
          type="button"
          disabled={!state.canSubmit}
          onClick={() => setSent(true)}
          className={cn(
            'mt-5 inline-flex h-14 w-full items-center justify-center gap-2 rounded-control',
            'bg-brand-600 text-base font-semibold text-white',
            'transition-[background-color,transform] duration-150 ease-snap hover:bg-brand-700 active:scale-[0.99]',
            'disabled:pointer-events-none disabled:opacity-50',
          )}
        >
          Enviar respuesta
        </button>

        {state.blockers.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {state.blockers.map((b) => (
              <li key={b} className="flex items-start gap-2 text-sm text-fg-muted">
                <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-warn-600" />
                {b}
              </li>
            ))}
          </ul>
        )}

        <p className="mt-6 text-center text-xs leading-relaxed text-fg-subtle">
          Tu respuesta la lee el jefe de taller. No se comparte con el técnico que atendió tu
          vehículo de forma que pueda identificarte.
        </p>
      </main>
    </div>
  );
}

function Thanks({
  customerFirstName,
  followUp,
  average,
}: {
  readonly customerFirstName: string;
  readonly followUp: boolean;
  readonly average: number | null;
}) {
  return (
    <div className="grid min-h-dvh place-items-center bg-surface-sunken px-5">
      <div className="w-full max-w-md text-center">
        <span
          aria-hidden
          className="mx-auto grid size-16 place-items-center rounded-full bg-ok-100 text-ok-600"
        >
          <CircleCheckBig className="size-8" />
        </span>

        <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight text-fg">
          Gracias, {customerFirstName}
        </h1>

        <p className="mt-2 text-base leading-relaxed text-fg-muted">
          {followUp
            ? 'Tu asesor te llamará en las próximas 24 horas para resolverlo. No hace falta que hagas nada más.'
            : 'Tu respuesta ya está con nosotros. Nos ayuda a saber qué mantener y qué cambiar.'}
        </p>

        {average !== null && !followUp && (
          <p className="mt-5 rounded-panel border border-border bg-surface-raised px-5 py-4">
            <span className="block text-sm text-fg-muted">Tu valoración media</span>
            <span
              data-numeric
              className="mt-1 block font-display text-3xl font-semibold tracking-tight text-fg"
            >
              {average} / 5
            </span>
          </p>
        )}

        <p className="mt-6 text-xs text-fg-subtle">
          Romero Motors · Más que un taller, tu aliado en el camino
        </p>
      </div>
    </div>
  );
}
