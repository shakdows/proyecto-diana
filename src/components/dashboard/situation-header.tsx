import Link from 'next/link';
import { AlertTriangle, CheckCircle2, Clock3, Plus } from 'lucide-react';
import type { Situation } from '@/features/dashboard/services/situation';
import { cn } from '@/lib/utils/cn';

/**
 * Lo primero que se lee del tablero.
 *
 * No es un saludo con adornos: es una afirmación sobre el estado del taller.
 * «Operación estable · 8 vehículos activos · 3 terminan hoy», o «2 vehículos
 * necesitan tu atención · 1 esperando repuestos · 1 en riesgo de retraso».
 *
 * Antes aquí había una cita de marca y una ilustración. Ocupaban el lugar más
 * valioso de la pantalla —lo que se lee primero, siempre— para decir algo que
 * es igual de cierto todos los días, que es otra forma de no decir nada.
 *
 * El color lo decide `situationOf`, no esta pantalla: el tono es parte de la
 * afirmación, y si se calculara aquí no habría forma de probarlo.
 */
export function SituationHeader({
  greeting,
  userName,
  situation,
}: {
  readonly greeting: string;
  readonly userName: string;
  readonly situation: Situation;
}) {
  const TONE = {
    estable: {
      icon: <CheckCircle2 />,
      tile: 'bg-ok-100 text-ok-700',
      rule: 'border-l-ok-500',
    },
    atencion: {
      icon: <Clock3 />,
      tile: 'bg-warn-100 text-warn-700',
      rule: 'border-l-warn-500',
    },
    critico: {
      icon: <AlertTriangle />,
      tile: 'bg-crit-100 text-crit-700',
      rule: 'border-l-crit-500',
    },
  } as const;

  const tone = TONE[situation.tone];

  return (
    <section
      className={cn(
        'flex flex-wrap items-center gap-x-5 gap-y-4 rounded-panel border border-border border-l-4 bg-surface-raised px-5 py-5 sm:px-6',
        tone.rule,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'grid size-12 shrink-0 place-items-center rounded-[0.875rem] [&>svg]:size-6',
          tone.tile,
        )}
      >
        {tone.icon}
      </span>

      {/* `min-w-[11rem]`, no `min-w-0`: con el botón en la misma línea, el
          bloque de texto se encogía hasta caber una palabra por renglón. Ese
          mínimo obliga a la fila a partirse antes de llegar a ese punto. */}
      <div className="min-w-[11rem] flex-1">
        <p className="text-sm text-fg-muted">
          {greeting}, {userName}
        </p>
        <h1 className="mt-0.5 font-display text-[1.5rem] font-semibold leading-tight tracking-tight text-fg lg:text-[1.75rem]">
          {situation.headline}
        </h1>
        <p className="mt-1 text-sm text-fg-muted">{situation.detail}</p>
      </div>

      <Link
        href="/recepcion/nueva"
        className="inline-flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-[0.875rem] bg-brand-600 px-5 text-sm font-semibold text-white shadow-raise transition-colors duration-150 hover:bg-brand-700 active:scale-[0.98] sm:w-auto"
      >
        <Plus aria-hidden className="size-5" />
        Nueva recepción
      </Link>
    </section>
  );
}
