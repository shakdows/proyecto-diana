import type { Metadata } from 'next';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { ControlTower } from '@/components/control-tower/control-tower';
import { AttentionList } from '@/components/dashboard/attention-list';
import { BoardHero } from '@/components/dashboard/board-hero';
import { BrandCard } from '@/components/dashboard/brand-card';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { StagePipeline } from '@/components/dashboard/stage-pipeline';
import { UpcomingDeliveries } from '@/components/dashboard/upcoming-deliveries';
import { attentionItems, demoActivity, demoBoard } from '@/features/demo/board';
import { upcomingDeliveries } from '@/features/dashboard/services/operations';
import { countFinishingToday, situationOf } from '@/features/dashboard/services/situation';
import { getSessionUser } from '@/lib/auth/session';
import { DEFAULT_LOCALE, DEFAULT_TIME_ZONE, greetingAt } from '@/lib/utils/format';

export const metadata: Metadata = { title: 'Centro de operaciones' };

/* Los tiempos se calculan contra `now`: la página no puede prerrenderizarse o
   se quedaría con el reloj del momento de la compilación. */
export const dynamic = 'force-dynamic';

/**
 * Centro de operaciones.
 *
 * La pantalla responde a tres preguntas y a ninguna más:
 *
 *   1. ¿Qué necesita mi atención?  → la banda de arriba y la lista de avisos.
 *   2. ¿Dónde se acumula el trabajo? → el flujo del taller, en una sola línea.
 *   3. ¿Qué hay en marcha?          → la lista, con la ficha en un cajón.
 *
 * A la derecha, lo que se consulta y no se hace: lo que sale pronto y lo
 * último que ha pasado.
 *
 * Lo que se quitó pesa tanto como lo que se puso. Las seis tarjetas de etapa
 * eran seis cajas del mismo peso que decían «aquí hay seis números» sin decir
 * que eran PASOS; ahora son un recorrido con conectores, y el atasco se ve sin
 * leer. Las cinco tarjetas de aviso en dos columnas obligaban a comparar en
 * zigzag; ahora son filas con la placa, el estado y el tiempo en la misma
 * columna vertical.
 */
export default async function CentroOperacionesPage() {
  const user = await getSessionUser();
  const now = new Date();

  const rows = demoBoard(now);
  const attention = attentionItems(rows, now);

  const finishingToday = countFinishingToday(
    rows.map((r) => r.eta.etaAt),
    now,
  );
  const situation = situationOf({ activeCount: rows.length, finishingToday, items: attention });

  return (
    <div className="theme-night -mx-4 -my-6 min-h-[calc(100dvh-var(--spacing-topbar))] bg-surface-sunken px-4 py-5 text-fg lg:-mx-6 lg:-my-7 lg:px-6">
      <div className="space-y-5">
        <Header now={now} />

        <BoardHero
          greeting={greetingAt(now)}
          userName={user.fullName.split(' ')[0] ?? user.fullName}
          situation={situation}
          primary={{ href: '#atencion', label: 'Revisar prioridades' }}
          accent
        />

        <StagePipeline rows={rows} />

        {/*
          Tres cuartos y un cuarto. La columna derecha es consulta: baja al
          final en tablet y en móvil, porque nadie la abre para leerla —se mira
          de paso mientras se hace otra cosa, y en una pantalla estrecha no hay
          «de paso».
        */}
        <div className="grid gap-4 xl:grid-cols-[minmax(0,3fr)_minmax(0,1fr)] xl:items-start">
          <div className="space-y-5">
            <AttentionList items={attention} now={now} />
            <ControlTower rows={rows} now={now} />
          </div>

          <div className="space-y-4">
            <BrandCard />
            <UpcomingDeliveries deliveries={upcomingDeliveries(rows, now)} />
            <RecentActivity entries={demoActivity()} />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Título, acción y reloj.
 *
 * La fecha y la hora no son adorno: esta pantalla dice «en tiempo real» y una
 * afirmación así necesita decir de CUÁNDO es. Se pintan en la zona del taller,
 * no en la del servidor.
 */
function Header({ now }: { readonly now: Date }) {
  const date = new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    timeZone: DEFAULT_TIME_ZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(now);

  const time = new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    timeZone: DEFAULT_TIME_ZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(now);

  return (
    <header className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
      <div className="min-w-0">
        <h1 className="font-display text-[1.375rem] font-bold tracking-tight text-fg">
          Centro de operaciones
        </h1>
        <p className="mt-0.5 text-sm text-fg-muted">Vista en tiempo real del taller.</p>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <Link
          href="/recepcion/nueva"
          className="inline-flex h-11 items-center gap-2 rounded-control bg-brand-600 px-5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-brand-700 active:scale-[0.98]"
        >
          <Plus aria-hidden className="size-4" />
          Nueva recepción
        </Link>

        <p className="border-l border-border pl-5 text-right leading-tight">
          <span className="block text-xs capitalize text-fg-muted">{date}</span>
          <span data-numeric className="block font-display text-lg font-semibold text-fg">
            {time}
          </span>
        </p>
      </div>
    </header>
  );
}
