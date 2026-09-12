import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { MyDay } from '@/components/workshop/my-day';
import { demoBoard } from '@/features/demo/board';
import { demoJobsFor } from '@/features/repairs/demo';
import { minutesWorkedToday, planDay } from '@/features/repairs/services/my-day';
import { getSessionUser } from '@/lib/auth/session';
import { greetingAt } from '@/lib/utils/format';

export const metadata: Metadata = { title: 'Mi jornada' };

/* El cronómetro, «terminado hoy» y las horas prometidas se calculan contra
   `now`: prerrenderizar congelaría la jornada en la hora de compilación. */
export const dynamic = 'force-dynamic';

/**
 * La jornada del técnico.
 *
 * Antes esto era una bandeja con tres accesos —diagnóstico, repuestos,
 * reparación— y una lista de fases pendientes. Obligaba al técnico a elegir la
 * sección antes de saber qué le tocaba, que es justo al revés: el estado de la
 * orden ya determina la única acción que avanza el trabajo, y elegirla es algo
 * que el sistema sabe hacer solo.
 *
 * Los tres bancos de trabajo siguen existiendo; ahora se llega a ellos desde
 * el botón de la orden concreta, no desde un menú.
 *
 * El filtro por técnico es COMODIDAD: en la Fase 12 la consulta la recorta RLS
 * a partir del JWT y la orden de otro técnico sencillamente no existe para
 * esta sesión (docs/05-roles-y-permisos.md §5.3).
 */
export default async function TallerPage() {
  const user = await getSessionUser();
  const now = new Date();

  const jobs = demoJobsFor(demoBoard(now), user.fullName, user.profileId, now);

  /*
   * Quien no tiene órdenes asignadas no tiene jornada que enseñar. Es el caso
   * del administrador —que entra aquí por el menú y nunca tiene órdenes a su
   * nombre— y el de un técnico al que todavía no le han asignado nada. Pintar
   * cuatro bloques vacíos les diría que el taller está parado, que es falso:
   * lo que pasa es que esta pantalla no es la suya.
   */
  if (jobs.length === 0) {
    return <NoJobs canSeeWorkshop={user.permissions.includes('dashboard:control_tower')} />;
  }

  const plan = planDay(jobs, user, now);

  return (
    <div className="space-y-6">
      <MyDay
        userName={firstName(user.fullName)}
        greeting={greetingAt(now)}
        plan={plan}
        minutesToday={minutesWorkedToday(plan, now)}
      />

      {/* Los bancos de trabajo, para llegar sin pasar por una orden. Abajo y
          en pequeño a propósito: es la excepción, no el camino. */}
      <nav aria-label="Bancos de trabajo" className="flex flex-wrap gap-2 pt-2">
        {BENCHES.map((bench) => (
          <Link
            key={bench.href}
            href={bench.href}
            className="inline-flex min-h-12 items-center gap-2 rounded-control border border-border bg-surface-raised px-4 text-sm font-medium text-fg-muted transition-colors duration-150 hover:border-border-strong hover:text-fg"
          >
            {bench.label}
            <ArrowRight aria-hidden className="size-3.5 text-fg-subtle" />
          </Link>
        ))}
      </nav>
    </div>
  );
}

const BENCHES = [
  { href: '/taller/diagnostico', label: 'Diagnóstico técnico' },
  { href: '/taller/repuestos', label: 'Solicitud de repuestos' },
  { href: '/taller/reparacion', label: 'Banco de reparación' },
] as const;

function NoJobs({ canSeeWorkshop }: { readonly canSeeWorkshop: boolean }) {
  return (
    <section className="rounded-panel border border-border bg-surface-raised px-6 py-10 text-center">
      <h1 className="font-display text-xl font-semibold text-fg">
        No tienes órdenes asignadas
      </h1>
      <p className="mx-auto mt-2 max-w-prose text-sm text-fg-muted">
        Esta pantalla es la jornada del técnico: muestra las órdenes asignadas a
        quien la abre, en el orden en que tocan. Para ver el taller entero, usa
        el centro de operaciones.
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {canSeeWorkshop && (
          <Link
            href="/tablero/operacion"
            className="inline-flex min-h-12 items-center gap-2 rounded-control bg-brand-600 px-5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-brand-700 active:scale-[0.98]"
          >
            Ver el taller completo
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        )}
        <Link
          href="/ordenes"
          className="inline-flex min-h-12 items-center gap-2 rounded-control border border-border-strong bg-surface-raised px-5 text-sm font-semibold text-fg transition-colors duration-150 hover:bg-surface-sunken"
        >
          Todas las órdenes
          <ArrowRight aria-hidden className="size-4 text-fg-subtle" />
        </Link>
      </div>
    </section>
  );
}

/** «Carlos Mendoza» → «Carlos». En un saludo, el apellido sobra. */
function firstName(fullName: string): string {
  return fullName.split(' ')[0] ?? fullName;
}
