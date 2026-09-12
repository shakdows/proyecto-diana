import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { NavIcon } from '@/components/layout/nav-icon';
import type { LauncherApp, LauncherTone } from '@/features/dashboard/services/launcher';
import { cn } from '@/lib/utils/cn';

/**
 * La rejilla de módulos.
 *
 * Tarjetas horizontales: cuadrado de color con el icono a la izquierda,
 * nombre y qué se hace dentro en el centro, flecha arriba a la derecha. Es
 * más densa que una rejilla de iconos con el nombre debajo —caben diez
 * módulos en dos filas y en el alto de una pantalla— y cada uno dice qué es
 * sin que haya que saberlo de antes.
 *
 * El color vive solo en el cuadrado del icono. Tarjetas enteras de colores
 * convierten la rejilla en un semáforo roto donde nada destaca porque todo
 * destaca.
 */

const TONE: Readonly<Record<LauncherTone, string>> = {
  brand: 'bg-brand-600 text-white',
  warn: 'bg-warn-600 text-white',
  crit: 'bg-crit-600 text-white',
  ok: 'bg-ok-600 text-white',
  graphite: 'bg-graphite-600 text-white',
};

export function ModuleGrid({ apps }: { readonly apps: readonly LauncherApp[] }) {
  return (
    /* Consultas de CONTENEDOR, no de ventana: la barra lateral aparece a
       1280 px y se lleva 264, así que a esa anchura la ventana dice «ancha» y
       la rejilla tiene menos sitio que a 1279. Y nunca tres columnas: diez
       módulos entre tres dejan una tarjeta huérfana en la última fila. */
    <ul className="grid grid-cols-1 gap-3 @sm/modulos:grid-cols-2 @4xl/modulos:grid-cols-5">
      {apps.map((app) => (
        <li key={app.id}>
          <Link
            href={app.href}
            className={cn(
              'group relative flex h-full items-center gap-3 rounded-panel border border-border',
              'min-h-[4.5rem] bg-surface p-3 pr-8',
              'transition-[transform,border-color,background-color] duration-150 ease-snap',
              'hover:-translate-y-0.5 hover:border-border-strong hover:bg-surface-raised',
              'active:translate-y-0',
            )}
          >
            <span className="relative shrink-0">
              <span
                aria-hidden
                className={cn(
                  'grid size-11 place-items-center rounded-[0.875rem] [&>svg]:size-5',
                  TONE[app.tone],
                )}
              >
                <NavIcon name={app.icon} />
              </span>

              {app.badge > 0 && (
                <span
                  data-numeric
                  className={cn(
                    'absolute -right-1.5 -top-1.5 grid min-w-5 place-items-center rounded-full',
                    'border-2 border-surface bg-crit-600 px-1 py-px text-[0.625rem] font-bold leading-4 text-white',
                  )}
                >
                  {app.badge > 99 ? '99+' : app.badge}
                  {/* El lector de pantalla leería la cifra suelta como un
                      número sin contexto; esto le da el sustantivo. */}
                  <span className="sr-only">
                    {app.badge === 1 ? ' pendiente' : ' pendientes'}
                  </span>
                </span>
              )}
            </span>

            <span className="min-w-0">
              {/* Dos líneas, no recorte: «Centro de operaciones» cortado a
                  «Centro de oper…» obliga a adivinar justo en el módulo más
                  importante de la rejilla. */}
              <span className="block text-sm font-semibold leading-tight text-fg">
                {app.label}
              </span>
              <span className="mt-0.5 block text-xs leading-tight text-fg-muted">
                {app.description}
              </span>
            </span>

            <ArrowUpRight
              aria-hidden
              className={cn(
                'absolute right-2.5 top-2.5 size-4 text-fg-subtle',
                'transition-colors duration-150 group-hover:text-brand-600',
              )}
            />
          </Link>
        </li>
      ))}
    </ul>
  );
}
