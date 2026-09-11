'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { NavGroup } from '@/lib/auth/navigation';
import { RomeroLockup } from '@/components/brand/romero-logo';
import { cn } from '@/lib/utils/cn';
import { NavIcon } from './nav-icon';

/**
 * Barra lateral.
 *
 * Lista plana sin encabezados de sección, con el elemento activo como pastilla
 * azul llena y la línea única que separa operación de sistema. Al pie, la
 * ilustración, la frase de marca y el estado del servicio.
 *
 * La ilustración del vehículo es SVG y no una fotografía: ocupa el ancho
 * completo de una barra oscura, y una foto ahí obliga a tener recorte propio,
 * versión para cada densidad y un peso que se descarga en cada visita para
 * algo que nadie mira dos veces.
 */

function isActive(pathname: string, href: string): boolean {
  if (href === '/admin') return pathname === '/admin';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({
  groups,
  badges = {},
  onNavigate,
}: {
  readonly groups: readonly NavGroup[];
  readonly badges?: Readonly<Record<string, number>>;
  readonly onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegación principal"
      className="flex h-full w-[16.5rem] shrink-0 flex-col bg-graphite-950 text-graphite-300"
    >
      <header className="shrink-0 px-5 py-5">
        <Link href="/" onClick={onNavigate} className="inline-flex rounded-control">
          <RomeroLockup />
        </Link>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
        {groups.map((group, groupIndex) => (
          <ul
            key={group.label}
            className={cn(
              'space-y-1',
              groupIndex > 0 && 'mt-4 border-t border-white/8 pt-4',
            )}
          >
            {group.items.map((item) => {
              const active = isActive(pathname, item.href);
              const badge = badges[item.href];

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'flex h-11 items-center gap-3 rounded-[0.75rem] px-3.5 text-sm',
                      'transition-colors duration-150 ease-snap',
                      active
                        ? 'bg-brand-600 font-semibold text-white shadow-raise'
                        : 'text-graphite-300 hover:bg-white/6 hover:text-white',
                    )}
                  >
                    <NavIcon
                      name={item.icon}
                      className={cn('size-5 shrink-0', active ? 'text-white' : 'text-graphite-400')}
                    />
                    <span className="truncate">{item.label}</span>

                    {badge !== undefined && badge > 0 && (
                      <span
                        data-numeric
                        className={cn(
                          'ml-auto rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold',
                          active ? 'bg-white/20 text-white' : 'bg-white/8 text-graphite-300',
                        )}
                      >
                        {badge}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        ))}
      </div>

      <footer className="shrink-0 px-5 pb-5">
        <CarSilhouette />

        <p className="mt-3 text-[0.9375rem] leading-snug text-graphite-300">
          La tecnología también
          <br />
          mueve confianza.
        </p>

        <p className="mt-4 flex items-center gap-2.5 rounded-panel bg-white/5 px-3.5 py-3">
          <span aria-hidden className="size-2.5 shrink-0 rounded-full bg-ok-500" />
          <span className="min-w-0 leading-tight">
            <span className="block text-xs font-medium text-graphite-100">Sistema operativo</span>
            <span data-numeric className="block text-[0.6875rem] text-graphite-500">
              v1.0.0
            </span>
          </span>
        </p>
      </footer>
    </nav>
  );
}

/** Silueta de vehículo, apenas insinuada: es textura de marca, no información. */
function CarSilhouette() {
  return (
    <svg viewBox="0 0 240 96" aria-hidden className="w-full text-graphite-800">
      <defs>
        <linearGradient id="car-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.95" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.15" />
        </linearGradient>
      </defs>
      <path
        d="M14 72c0-6 4-11 10-12l14-2 18-22c5-6 12-9 20-9h56c9 0 17 4 23 11l16 19 24 4c7 1 12 6 12 13v6c0 3-2 5-5 5h-16a20 20 0 0 0-40 0H82a20 20 0 0 0-40 0H19c-3 0-5-2-5-5v-8z"
        fill="url(#car-fade)"
      />
      <circle cx="62" cy="78" r="12" className="fill-graphite-900" />
      <circle cx="62" cy="78" r="5" className="fill-graphite-700" />
      <circle cx="162" cy="78" r="12" className="fill-graphite-900" />
      <circle cx="162" cy="78" r="5" className="fill-graphite-700" />
      {/* Faro encendido: el único punto de luz, como en el original. */}
      <path d="M214 60h14c4 0 6 3 5 6l-1 3h-18z" className="fill-brand-500/70" />
    </svg>
  );
}
