'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { NavGroup } from '@/lib/auth/navigation';
import { RomeroWordmark } from '@/components/brand/romero-logo';
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
 *
 * ⚠️ LA DECORACIÓN CEDE, LA NAVEGACIÓN NO.
 *
 * La ilustración y la frase van DENTRO del área que se desplaza, empujadas
 * abajo con `mt-auto`. En una pantalla alta se ven exactamente donde se veían
 * —pegadas al pie—, pero cuando falta alto son ellas las que se salen, no los
 * enlaces.
 *
 * Antes estaban fijas en el pie y se llevaban 233 px pasara lo que pasara. Con
 * el rol de administrador —doce entradas— en un portátil de 862 px, eso dejaba
 * 542 px para 617 px de enlaces: «Configuración» salía partida por la mitad y
 * «Auditoría» no se veía en absoluto. Un menú que esconde entradas sin avisar
 * es peor que uno feo.
 *
 * El estado del servicio sí sigue anclado: es información, no adorno.
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
      <header className="shrink-0 px-5 py-5 [@media(max-height:50rem)]:py-3">
        {/*
          El logotipo de la EMPRESA, no el del producto. Quien usa esto todos
          los días trabaja en Romero Motors; DIANA es la herramienta, y su
          nombre ya está en el pie y en la pestaña del navegador.

          Es el archivo oficial en su variante clara —`romero-motors-claro.png`—
          porque la barra es grafito: el archivo normal termina el degradado en
          negro y ahí se pierden la «O» final y «MOTORS».
        */}
        <Link href="/" onClick={onNavigate} className="inline-flex rounded-control">
          <RomeroWordmark
            on="dark"
            className="h-9 w-auto [@media(max-height:50rem)]:h-8"
          />
        </Link>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-4">
        {groups.map((group, groupIndex) => (
          <ul
            key={group.label}
            className={cn(
              'space-y-1 [@media(max-height:50rem)]:space-y-0.5',
              groupIndex > 0 &&
                'mt-4 border-t border-white/8 pt-4 [@media(max-height:50rem)]:mt-3 [@media(max-height:50rem)]:pt-3',
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
                      'relative flex h-11 items-center gap-3 rounded-[0.75rem] px-3.5 text-sm',
                      // Pantalla baja: 40 px en vez de 44. Son 48 px ganados
                      // sobre doce entradas, que es justo lo que separa un menú
                      // completo de uno que esconde «Auditoría».
                      '[@media(max-height:50rem)]:h-10',
                      'transition-colors duration-150 ease-snap',
                      active
                        // Marca de posición, no botón. La pastilla azul llena
                        // pesaba igual que el botón de acción principal, y en
                        // una barra con doce entradas el sitio donde estás no
                        // compite con lo que hay que pulsar.
                        ? 'bg-white/8 font-semibold text-white'
                        : 'text-graphite-300 hover:bg-white/6 hover:text-white',
                    )}
                  >
                    {active && (
                      <span
                        aria-hidden
                        className="absolute inset-y-2 left-0 w-[3px] rounded-full bg-brand-500"
                      />
                    )}

                    <NavIcon
                      name={item.icon}
                      className={cn(
                        'size-5 shrink-0',
                        active ? 'text-brand-400' : 'text-graphite-400',
                      )}
                    />
                    <span className="truncate">{item.label}</span>

                    {badge !== undefined && badge > 0 && (
                      <span
                        data-numeric
                        className={cn(
                          'ml-auto rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold',
                          active ? 'bg-brand-600 text-white' : 'bg-white/8 text-graphite-300',
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
        <div className="mt-auto shrink-0 px-2 pt-8">
          <CarSilhouette />

          <p className="mt-3 text-[0.9375rem] leading-snug text-graphite-300">
            La tecnología también
            <br />
            mueve confianza.
          </p>
        </div>
      </div>

      <footer className="shrink-0 px-5 pb-5 pt-4">
        <p className="flex items-center gap-2.5 rounded-panel bg-white/5 px-3.5 py-3">
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
