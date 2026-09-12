import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { AppLauncher } from '@/components/dashboard/app-launcher';
import { SituationHeader } from '@/components/dashboard/situation-header';
import { attentionItems, demoBoard } from '@/features/demo/board';
import { countFinishingToday, situationOf } from '@/features/dashboard/services/situation';
import { buildLauncher, visibleApps } from '@/features/dashboard/services/launcher';
import { countByStage } from '@/features/dashboard/services/stages';
import { demoTodayIntakes } from '@/features/reception/demo';
import { demoSurveys } from '@/features/surveys/demo';
import { pendingFollowUps } from '@/features/surveys/services/board';
import { getSessionUser } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'Tablero' };
export const dynamic = 'force-dynamic';

function greeting(hour: number): string {
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

/**
 * El tablero.
 *
 * Una frase que dice cómo va el taller, y una rejilla de accesos con lo que
 * espera dentro de cada uno. Nada más.
 *
 * El detalle —las seis etapas, la lista de los que piden atención, los
 * vehículos en proceso— no se perdió: vive en `/tablero/operacion`, que es el
 * primer acceso de la rejilla y el que se pone rojo cuando hay algo. Quien
 * dirige el taller entra ahí y se queda; quien solo viene a recibir un
 * vehículo no tiene que atravesarlo para llegar a Recepción.
 *
 * Los distintivos son cifras REALES, contadas aquí: un contador decorativo se
 * descubre el primer día y a partir de ahí nadie mira ninguno.
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
      listos: stages.listos,
      encuestasPorLlamar: pendingFollowUps(demoSurveys(now)).length,
      clientes: 0,
    }),
    user.permissions,
  );

  return (
    <>
      <SituationHeader
        greeting={greeting(now.getHours())}
        userName={user.fullName.split(' ')[0] ?? user.fullName}
        situation={situation}
      />

      <AppLauncher apps={apps} />

      <Link
        href="/tablero/operacion"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 transition-colors duration-150 hover:text-brand-700"
      >
        Ver el taller en detalle
        <ArrowRight aria-hidden className="size-4" />
      </Link>
    </>
  );
}
