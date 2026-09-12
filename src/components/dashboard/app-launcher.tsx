import Link from 'next/link';
import { NavIcon } from '@/components/layout/nav-icon';
import type { LauncherApp, LauncherTone } from '@/features/dashboard/services/launcher';
import { cn } from '@/lib/utils/cn';

/**
 * La rejilla de accesos.
 *
 * Cuadrados grandes con el icono dentro y el nombre debajo, como una pantalla
 * de inicio. Se toca con el dedo desde una tablet en el taller y se distingue
 * de un vistazo desde medio metro, que es la distancia real a la que se usa.
 *
 * El distintivo rojo con la cifra solo aparece cuando hay algo esperando. Un
 * contador que siempre dice «0» es tinta que enseña a no mirar los contadores.
 */

const TONE: Readonly<Record<LauncherTone, string>> = {
  brand: 'bg-brand-600 text-white',
  warn: 'bg-warn-600 text-white',
  crit: 'bg-crit-500 text-white',
  ok: 'bg-ok-600 text-white',
  graphite: 'bg-graphite-600 text-white',
};

export function AppLauncher({ apps }: { readonly apps: readonly LauncherApp[] }) {
  return (
    <ul className="grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {apps.map((app) => (
        <li key={app.id}>
          <Link
            href={app.href}
            className="group flex flex-col items-center gap-2.5 rounded-panel p-2 text-center transition-transform duration-150 ease-snap active:scale-95"
          >
            <span className="relative block">
              <span
                aria-hidden
                className={cn(
                  'grid size-[4.5rem] place-items-center rounded-[1.375rem] shadow-raise [&>svg]:size-8',
                  'transition-shadow duration-150 group-hover:shadow-panel',
                  TONE[app.tone],
                )}
              >
                <NavIcon name={app.icon} />
              </span>

              {app.badge > 0 && (
                <span
                  data-numeric
                  className={cn(
                    'absolute -right-1.5 -top-1.5 grid min-w-6 place-items-center rounded-full',
                    'border-2 border-surface bg-crit-500 px-1.5 py-0.5 text-xs font-bold text-white',
                  )}
                >
                  {app.badge > 99 ? '99+' : app.badge}
                  {/* El lector de pantalla lee la cifra suelta como un número
                      sin contexto; esto le da el sustantivo, y concuerda. */}
                  <span className="sr-only">
                    {app.badge === 1 ? ' pendiente' : ' pendientes'}
                  </span>
                </span>
              )}
            </span>

            <span className="block max-w-[7.5rem] text-xs font-medium leading-snug text-fg">
              {app.label}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
