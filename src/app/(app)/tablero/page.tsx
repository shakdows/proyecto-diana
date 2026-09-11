import type { Metadata } from 'next';
import { ControlTower } from '@/components/control-tower/control-tower';
import { AttentionList } from '@/components/dashboard/attention-list';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { StageCounters } from '@/components/dashboard/stage-counters';
import { SituationHeader } from '@/components/dashboard/situation-header';
import { attentionItems, demoActivity, demoBoard } from '@/features/demo/board';
import { countFinishingToday, situationOf } from '@/features/dashboard/services/situation';

export const metadata: Metadata = { title: 'Tablero' };

/* Los tiempos se calculan contra `now`: la página no puede prerrenderizarse o
   se quedaría con el reloj del momento de la compilación. */
export const dynamic = 'force-dynamic';

function greeting(hour: number): string {
  if (hour < 12) return 'Buenos días';
  if (hour < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

/**
 * Centro de operaciones.
 *
 * La pantalla responde a tres preguntas, en este orden y sin repetir nada que
 * ya tenga su propia sección en el menú:
 *
 *   1. ¿Cómo va el taller?      → la frase de arriba, que cambia con el estado.
 *   2. ¿Dónde está cada uno?    → las seis etapas, que suman el total.
 *   3. ¿Qué necesita acción?    → los vehículos con problema, antes que el resto.
 *   4. ¿Qué hay en marcha?      → la lista, con la ficha en un cajón lateral.
 *
 * Y cierra con la actividad reciente, que es contexto y no tarea.
 *
 * Lo que se quitó pesa tanto como lo que se puso: la cita de marca, el bloque
 * promocional y la ilustración de cabecera ocupaban el sitio que se lee
 * primero para decir algo idéntico todos los días.
 */
export default function TableroPage() {
  const now = new Date();
  const rows = demoBoard(now);
  const attention = attentionItems(rows, now);

  const finishingToday = countFinishingToday(
    rows.map((r) => r.eta.etaAt),
    now,
  );
  const situation = situationOf({ activeCount: rows.length, finishingToday, items: attention });

  return (
    <>
      <SituationHeader
        greeting={greeting(now.getHours())}
        userName="Andrea"
        situation={situation}
      />

      {/* Seis cifras, no cuatro: son las paradas reales del vehículo y suman
          el total. Cada uno del taller está en una y solo una. */}
      <StageCounters rows={rows} />

      <AttentionList items={attention} now={now} />

      <ControlTower rows={rows} now={now} />

      <RecentActivity entries={demoActivity()} />
    </>
  );
}
