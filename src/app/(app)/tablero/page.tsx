import type { Metadata } from 'next';
import Link from 'next/link';
import { Car, Clock, Flag, Wrench } from 'lucide-react';
import type { ReactNode } from 'react';
import { ControlTower } from '@/components/control-tower/control-tower';
import { AttentionList } from '@/components/dashboard/attention-list';
import { RecentActivity } from '@/components/dashboard/recent-activity';
import { SituationHeader } from '@/components/dashboard/situation-header';
import { attentionItems, demoActivity, demoBoard } from '@/features/demo/board';
import { countFinishingToday, situationOf } from '@/features/dashboard/services/situation';
import type { OrderStatus } from '@/features/orders/services/order-status';
import { cn } from '@/lib/utils/cn';

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
 *   2. ¿Qué necesita acción?    → los vehículos con problema, primero.
 *   3. ¿Qué hay en marcha?      → la lista, con la ficha en un cajón lateral.
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

  const countOf = (statuses: readonly OrderStatus[]): number =>
    rows.filter((r) => statuses.includes(r.order.status)).length;

  const enRecepcion = countOf([
    'DRAFT',
    'RECEPCIONADO',
    'CHECKLIST_COMPLETADO',
    'PENDIENTE_DIAGNOSTICO',
    'EN_DIAGNOSTICO',
  ]);
  const EN_TALLER = new Set<OrderStatus>([
    'LISTO_PARA_REPARACION',
    'EN_REPARACION',
    'REPARACION_TERMINADA',
  ]);
  const tallerRows = rows.filter((r) => EN_TALLER.has(r.order.status));
  const esperaRows = rows.filter((r) => r.light.color === 'gris');
  const enTaller = tallerRows.length;
  const enEspera = esperaRows.length;
  const listos = countOf(['LISTO_PARA_ENTREGA', 'PENDIENTE_LAVADO', 'EN_LAVADO']);
  const total = Math.max(1, rows.length);

  const finishingToday = countFinishingToday(
    rows.map((r) => r.eta.etaAt),
    now,
  );
  const situation = situationOf({ activeCount: rows.length, finishingToday, items: attention });

  /* ⚠️ Cada sub-línea se calcula sobre EL MISMO subconjunto que cuenta la cifra
     de encima. Parece obvio y no lo es: la primera versión ponía «4 críticos»
     bajo «En espera», y esos cuatro eran entregas retrasadas —vehículos que
     están en reparación, no esperando—. La cifra era correcta, la frase era
     correcta, y juntas decían algo falso. */
  const enDiagnostico = countOf(['EN_DIAGNOSTICO']);
  const tallerTerminanHoy = countFinishingToday(
    tallerRows.map((r) => r.eta.etaAt),
    now,
  );
  const esperaPorRepuestos = esperaRows.filter(
    (r) => r.order.status === 'ESPERANDO_REPUESTOS',
  ).length;
  const esperaPorCliente = esperaRows.filter((r) => r.order.status === 'ESPERANDO_CLIENTE').length;
  /* «Listos para entrega» cuenta también los que están en lavado, que todavía
     no se pueden entregar. Sin desglosar, la tarjeta decía «1» y debajo
     «ninguno listo todavía», y las dos cosas eran ciertas. */
  const paraEntregar = countOf(['LISTO_PARA_ENTREGA']);
  const enLavado = countOf(['PENDIENTE_LAVADO', 'EN_LAVADO']);

  return (
    <>
      <SituationHeader
        greeting={greeting(now.getHours())}
        userName="Andrea"
        situation={situation}
      />

      {/* Cuatro indicadores, cada uno con la cifra que suele seguir a la
          pregunta: «cinco en espera» invita a «¿alguno crítico?». */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={<Car />}
          tone="brand"
          value={enRecepcion}
          label="En recepción"
          hint={
            enRecepcion === 0
              ? 'nada por diagnosticar'
              : enDiagnostico === 0
                ? 'ninguno en diagnóstico'
                : enDiagnostico === 1
                  ? '1 en diagnóstico'
                  : `${String(enDiagnostico)} en diagnóstico`
          }
          share={enRecepcion / total}
          href="/recepcion"
        />
        <StatCard
          icon={<Wrench />}
          tone="ok"
          value={enTaller}
          label="En taller"
          hint={
            tallerTerminanHoy === 0
              ? 'ninguno termina hoy'
              : tallerTerminanHoy === 1
                ? '1 termina hoy'
                : `${String(tallerTerminanHoy)} terminan hoy`
          }
          share={enTaller / total}
          href="/taller"
        />
        <StatCard
          icon={<Clock />}
          tone="warn"
          value={enEspera}
          label="En espera"
          hint={
            esperaPorRepuestos > 0
              ? `${String(esperaPorRepuestos)} por repuestos`
              : esperaPorCliente > 0
                ? `${String(esperaPorCliente)} por el cliente`
                : enEspera === 0
                  ? 'nadie esperando'
                  : 'sin hora estimada'
          }
          share={enEspera / total}
          href="/ordenes"
        />
        <StatCard
          icon={<Flag />}
          tone="ready"
          value={listos}
          label="Listos para entrega"
          hint={
            paraEntregar > 0
              ? paraEntregar === 1
                ? '1 por entregar'
                : `${String(paraEntregar)} por entregar`
              : enLavado > 0
                ? enLavado === 1
                  ? '1 todavía en lavado'
                  : `${String(enLavado)} todavía en lavado`
                : 'nada por entregar'
          }
          share={listos / total}
          href="/ordenes"
        />
      </div>

      <AttentionList items={attention} now={now} />

      <ControlTower rows={rows} now={now} />

      <RecentActivity entries={demoActivity()} />
    </>
  );
}

/**
 * Indicador.
 *
 * El azulejo de color identifica la etapa de un vistazo; la cifra es lo que se
 * lee. La barra de abajo dice qué parte del taller está en ese punto, que es
 * la pregunta que sigue a «ocho»: ¿ocho de cuántos?
 */
function StatCard({
  icon,
  tone,
  value,
  label,
  hint,
  share,
  href,
}: {
  readonly icon: ReactNode;
  readonly tone: 'brand' | 'ok' | 'warn' | 'ready';
  readonly value: number;
  readonly label: string;
  readonly hint: string;
  readonly share: number;
  readonly href: string;
}) {
  const TILE = {
    brand: 'bg-brand-100 text-brand-700',
    ok: 'bg-ok-100 text-ok-700',
    warn: 'bg-warn-100 text-warn-700',
    ready: 'bg-wait-100 text-wait-700',
  } as const;

  const BAR = {
    brand: 'bg-brand-600',
    ok: 'bg-ok-500',
    warn: 'bg-warn-500',
    ready: 'bg-wait-500',
  } as const;

  return (
    <Link
      href={href}
      className="group rounded-panel border border-border bg-surface-raised p-5 transition-shadow duration-150 ease-snap hover:shadow-panel"
    >
      <div className="flex items-center gap-4">
        <span
          aria-hidden
          className={cn(
            'grid size-14 shrink-0 place-items-center rounded-[0.875rem] [&>svg]:size-6',
            TILE[tone],
          )}
        >
          {icon}
        </span>

        <span className="min-w-0 flex-1">
          <span
            data-numeric
            className="block font-display text-[2rem] font-semibold leading-none tracking-tight text-fg"
          >
            {value}
          </span>
          <span className="mt-1 block truncate text-sm text-fg-muted">{label}</span>
          <span className="mt-0.5 block truncate text-xs text-fg-subtle">{hint}</span>
        </span>
      </div>

      <span
        aria-hidden
        className="mt-4 block h-1.5 overflow-hidden rounded-full bg-surface-sunken"
      >
        <span
          className={cn('block h-full rounded-full transition-[width] duration-300', BAR[tone])}
          style={{ width: `${String(Math.round(share * 100))}%` }}
        />
      </span>
    </Link>
  );
}
