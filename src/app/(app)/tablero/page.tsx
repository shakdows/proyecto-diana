import type { Metadata } from 'next';
import { BoardHero } from '@/components/dashboard/board-hero';
import { BrandCard } from '@/components/dashboard/brand-card';
import { ModuleGrid } from '@/components/dashboard/module-grid';
import { PrioritiesPanel } from '@/components/dashboard/priorities-panel';
import { attentionItems, demoBoard } from '@/features/demo/board';
import { countFinishingToday, situationOf } from '@/features/dashboard/services/situation';
import { buildLauncher, visibleApps } from '@/features/dashboard/services/launcher';
import { topPriorities } from '@/features/dashboard/services/priorities';
import { countByStage } from '@/features/dashboard/services/stages';
import { demoTodayIntakes } from '@/features/reception/demo';
import { demoSurveys } from '@/features/surveys/demo';
import { pendingFollowUps } from '@/features/surveys/services/board';
import { getSessionUser } from '@/lib/auth/session';
import { greetingAt } from '@/lib/utils/format';

export const metadata: Metadata = { title: 'Tablero' };
export const dynamic = 'force-dynamic';

/**
 * El tablero.
 *
 * Cuatro bloques y nada más: una banda que dice cómo va el taller, los
 * módulos con lo que espera dentro de cada uno, las prioridades de hoy y la
 * tarjeta de marca. Entra en una pantalla de escritorio sin desplazarse.
 *
 * El detalle —las seis etapas, la lista completa de atención, los vehículos en
 * proceso— no se perdió: vive en `/tablero/operacion`, el primer módulo de la
 * rejilla y el que se pone rojo cuando hay algo.
 *
 * ── Por qué esta pantalla es oscura y el resto no ──────────────────────────
 *
 * `theme-night` redefine los tokens semánticos en un ámbito, no en `:root`.
 * Todo lo que vive dentro —`Plate`, los distintivos, los bordes— se vuelve
 * oscuro sin que haya que tocarlo, y ninguna otra pantalla se entera. El
 * margen negativo saca el fondo hasta los bordes del área de contenido, que
 * de otro modo dejaría un marco claro alrededor del tablero.
 *
 * Los distintivos y las prioridades son cifras REALES, contadas aquí: un
 * contador decorativo se descubre el primer día y a partir de ahí nadie mira
 * ninguno.
 */
export default async function TableroPage() {
  const user = await getSessionUser();
  const now = new Date();

  const rows = demoBoard(now);
  const attention = attentionItems(rows, now);
  const stages = countByStage(rows.map((r) => r.order.status));

  const situation = situationOf({
    activeCount: rows.length,
    finishingToday: countFinishingToday(rows.map((r) => r.eta.etaAt), now),
    items: attention,
  });

  const apps = visibleApps(
    buildLauncher({
      atencion: attention.length,
      ordenes: rows.length,
      recepcionesHoy: demoTodayIntakes(now).length,
      enTaller: stages.reparacion,
      comprasPendientes: stages.repuestos,
      encuestasPorLlamar: pendingFollowUps(demoSurveys(now)).length,
      clientes: 0,
    }),
    user.permissions,
  );

  return (
    <div className="theme-night -mx-4 -my-6 min-h-[calc(100dvh-var(--spacing-topbar))] bg-surface-sunken px-4 py-5 text-fg lg:-mx-6 lg:-my-7 lg:px-6">
      <div className="space-y-5">
        <BoardHero
          greeting={greetingAt(now)}
          userName={user.fullName.split(' ')[0] ?? user.fullName}
          situation={situation}
          secondary={{ href: '/tablero/operacion', label: 'Ver detalle' }}
        />

        <section className="@container/modulos space-y-3">
          <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <h2 className="font-display text-base font-semibold text-fg">Módulos</h2>
            <p className="text-xs text-fg-muted">
              Todo en un solo lugar para una operación más eficiente.
            </p>
          </header>

          <ModuleGrid apps={apps} />
        </section>

        {/* Prioridades primero en estrecho: en un teléfono lo que hay que
            hacer no puede ir debajo de una tarjeta de marca. */}
        <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
          <PrioritiesPanel priorities={topPriorities(attention, now)} />
          <BrandCard />
        </div>
      </div>
    </div>
  );
}
