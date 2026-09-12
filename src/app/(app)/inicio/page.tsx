import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, CarFront, ClipboardList, UserRound } from 'lucide-react';
import type { ReactNode } from 'react';
import { attentionItems, demoBoard } from '@/features/demo/board';
import { getSessionUser } from '@/lib/auth/session';
import { greetingAt } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

export const metadata: Metadata = { title: 'Inicio' };
export const dynamic = 'force-dynamic';

/**
 * La casa del asesor.
 *
 * Un asesor no dirige el taller: recibe vehículos y atiende clientes. Aterrizar
 * en un tablero de indicadores le obliga a leer nueve cifras que no va a usar
 * para encontrar el botón que sí. Aquí hay dos acciones grandes y una línea de
 * estado; el tablero completo sigue a un clic, para cuando lo quiera.
 *
 * El orden no es alfabético ni estético: «recibir» va primero porque es lo que
 * se hace con el cliente delante y el motor todavía caliente. Buscar un cliente
 * se hace sentado.
 */
export default async function InicioPage() {
  const user = await getSessionUser();
  const now = new Date();
  const rows = demoBoard(now);
  const pendientes = attentionItems(rows, now).length;
  const nombre = user.fullName.split(' ')[0] ?? user.fullName;

  return (
    <>
      <header>
        <p className="text-sm text-fg-muted">{greetingAt(now)}, {nombre}</p>
        <h1 className="mt-1 font-display text-[1.75rem] font-semibold tracking-tight text-fg lg:text-[2rem]">
          ¿Qué necesitas hacer?
        </h1>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Accion
          href="/recepcion/nueva"
          icon={<CarFront />}
          title="Recibir un vehículo"
          hint="Checklist, daños y apertura de la orden"
          primary
        />
        <Accion
          href="/clientes"
          icon={<UserRound />}
          title="Buscar un cliente"
          hint="Historial, vehículos y contacto"
        />
      </div>

      {/* Una sola línea de estado. Si hay algo torcido se dice; si no, también,
          porque «nada pendiente» es información y no un hueco. */}
      <Link
        href="/tablero"
        className="flex items-center gap-3 rounded-panel border border-border bg-surface-raised px-5 py-4 transition-shadow duration-150 hover:shadow-panel"
      >
        <ClipboardList aria-hidden className="size-5 shrink-0 text-fg-subtle" />
        <span className="min-w-0 flex-1 text-sm">
          {pendientes === 0 ? (
            <span className="text-fg">Nada pendiente de atender ahora mismo.</span>
          ) : (
            <>
              <span data-numeric className="font-semibold text-fg">
                {pendientes}
              </span>{' '}
              <span className="text-fg">
                {pendientes === 1 ? 'vehículo necesita atención' : 'vehículos necesitan atención'}
              </span>
            </>
          )}
          <span className="ml-2 text-fg-muted">Ver el tablero completo</span>
        </span>
        <ArrowRight aria-hidden className="size-4 shrink-0 text-fg-subtle" />
      </Link>
    </>
  );
}

function Accion({
  href,
  icon,
  title,
  hint,
  primary = false,
}: {
  readonly href: string;
  readonly icon: ReactNode;
  readonly title: string;
  readonly hint: string;
  readonly primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'group flex min-h-[9rem] flex-col justify-between rounded-panel border p-6',
        'transition-shadow duration-150 ease-snap hover:shadow-panel',
        primary
          ? 'border-romero-500/30 bg-romero-500/[0.04]'
          : 'border-border bg-surface-raised',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'grid size-12 place-items-center rounded-[0.875rem] [&>svg]:size-6',
          primary ? 'bg-romero-500/10 text-romero-600' : 'bg-surface-sunken text-fg-muted',
        )}
      >
        {icon}
      </span>

      <span className="mt-5 block">
        <span className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight text-fg">
          {title}
          <ArrowRight
            aria-hidden
            className="size-4 text-fg-subtle transition-transform duration-150 group-hover:translate-x-0.5"
          />
        </span>
        <span className="mt-0.5 block text-sm text-fg-muted">{hint}</span>
      </span>
    </Link>
  );
}
