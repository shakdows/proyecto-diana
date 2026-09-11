'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useCallback, useSyncExternalStore } from 'react';
import type { NavGroup } from '@/lib/auth/navigation';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils/cn';
import { NavIcon } from './nav-icon';

/**
 * Barra lateral del centro de operaciones.
 *
 * Dos decisiones que no son de estilo:
 *
 * 1. El elemento activo NO es un rectángulo azul lleno. Con veinte entradas y
 *    una siempre encendida, ese bloque saturado se convierte en el objeto más
 *    llamativo de la pantalla y compite con los datos, que es lo que hay que
 *    mirar. Aquí se marca con una barra vertical, un fondo apenas teñido y el
 *    icono en azul: se reconoce de un vistazo y no grita.
 *
 * 2. Colapsable a 72 px. En un portátil de 1366 px, 260 px de menú son el 19 %
 *    del ancho gastado en algo que se usa una vez cada diez minutos. Colapsada
 *    quedan los iconos, y cada uno conserva su nombre en `aria-label` más una
 *    etiqueta emergente para el puntero.
 */

const STORAGE_KEY = 'diana:sidebar-collapsed';

/*
 * La preferencia vive en `localStorage`, que es un almacén EXTERNO a React.
 * Leerlo en un efecto y llamar a `setState` funciona, pero renderiza dos veces
 * y la barra se ve saltar de ancho en cada carga. `useSyncExternalStore` está
 * hecho justo para esto: el servidor renderiza siempre expandida y el cliente
 * corrige en el mismo paso de hidratación, sin parpadeo ni desajuste de HTML.
 */
const listeners = new Set<() => void>();
/** Si el navegador bloquea el almacenamiento, la preferencia dura la sesión. */
let fallback = false;

function subscribe(notify: () => void): () => void {
  listeners.add(notify);
  window.addEventListener('storage', notify);
  return () => {
    listeners.delete(notify);
    window.removeEventListener('storage', notify);
  };
}

function readCollapsed(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return fallback;
  }
}

function writeCollapsed(value: boolean): void {
  fallback = value;
  try {
    window.localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
  } catch {
    /* Sin almacenamiento la barra sigue plegándose; solo no se recuerda. */
  }
  for (const notify of listeners) notify();
}

function isActive(pathname: string, href: string): boolean {
  if (href === '/admin') return pathname === '/admin';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({
  groups,
  appName,
  badges = {},
  collapsible = true,
  onNavigate,
}: {
  readonly groups: readonly NavGroup[];
  readonly appName: string;
  readonly badges?: Readonly<Record<string, number>>;
  readonly collapsible?: boolean;
  readonly onNavigate?: () => void;
}) {
  const pathname = usePathname();
  const stored = useSyncExternalStore(subscribe, readCollapsed, () => false);
  // En el panel lateral de tablet la barra ocupa todo el ancho disponible:
  // plegarla ahí no ahorra nada y deja un menú de iconos sin motivo.
  const collapsed = collapsible && stored;

  const toggle = useCallback((): void => {
    writeCollapsed(!readCollapsed());
  }, []);

  return (
    <nav
      aria-label="Navegación principal"
      data-collapsed={collapsed ? '' : undefined}
      className={cn(
        'flex h-full shrink-0 flex-col bg-graphite-950 text-graphite-200',
        'transition-[width] duration-200 ease-snap',
        collapsed ? 'w-[4.5rem]' : 'w-[16.25rem]',
      )}
    >
      <header
        className={cn(
          'flex shrink-0 items-center gap-2.5 border-b border-white/5 px-4 py-4',
          collapsed && 'justify-center px-0',
        )}
      >
        <Link
          href="/"
          onClick={onNavigate}
          className="flex min-w-0 items-center gap-2.5 rounded-control"
        >
          <span
            aria-hidden
            className="grid size-9 shrink-0 place-items-center rounded-control bg-brand-600 font-display text-base font-bold text-white"
          >
            D
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block truncate font-display text-sm font-semibold tracking-tight text-white">
                {appName}
              </span>
              <span className="block truncate text-[0.6875rem] tracking-wide text-graphite-400">
                Automotive Operations
              </span>
            </span>
          )}
        </Link>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4">
        <div className="flex flex-col gap-5">
          {groups.map((group) => (
            <div key={group.label}>
              {!collapsed && (
                <h2 className="px-2 pb-1.5 text-[0.625rem] font-semibold uppercase tracking-[0.12em] text-graphite-500">
                  {group.label}
                </h2>
              )}
              {collapsed && <div aria-hidden className="mx-2 mb-2 h-px bg-white/5" />}

              <ul className="space-y-0.5">
                {group.items.map((item) => {
                  const active = isActive(pathname, item.href);
                  const badge = badges[item.href];

                  const link = (
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? 'page' : undefined}
                      aria-label={collapsed ? item.label : undefined}
                      className={cn(
                        'relative flex h-10 items-center rounded-control text-sm',
                        'transition-colors duration-150 ease-snap',
                        collapsed ? 'w-11 justify-center' : 'gap-2.5 px-2.5',
                        active
                          ? 'bg-brand-600/15 font-medium text-white'
                          : 'text-graphite-300 hover:bg-white/5 hover:text-white',
                      )}
                    >
                      {/* La barra vertical hace el trabajo que hacía el bloque azul. */}
                      {active && (
                        <span
                          aria-hidden
                          className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-brand-400"
                        />
                      )}
                      <NavIcon
                        name={item.icon}
                        className={cn(
                          'size-[1.125rem] shrink-0',
                          active ? 'text-brand-400' : 'text-graphite-400',
                        )}
                      />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                      {!collapsed && badge !== undefined && badge > 0 && (
                        <span
                          data-numeric
                          className={cn(
                            'ml-auto rounded-chip px-1.5 py-0.5 text-[0.625rem] font-semibold',
                            active
                              ? 'bg-brand-500/25 text-brand-200'
                              : 'bg-white/8 text-graphite-300',
                          )}
                        >
                          {badge}
                        </span>
                      )}
                      {collapsed && badge !== undefined && badge > 0 && (
                        <span
                          aria-hidden
                          className="absolute right-1 top-1 size-1.5 rounded-full bg-brand-400"
                        />
                      )}
                    </Link>
                  );

                  return (
                    <li key={item.href}>
                      {collapsed ? <Tooltip label={item.label}>{link}</Tooltip> : link}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <footer className="shrink-0 border-t border-white/5 px-3 py-3">
        {!collapsed && (
          <p className="mb-2 flex items-center gap-2 px-2 text-[0.6875rem] text-graphite-400">
            <span aria-hidden className="size-1.5 rounded-full bg-ok-500" />
            Sistema operativo
          </p>
        )}

        {collapsible && (
          <button
            type="button"
            onClick={toggle}
            aria-label={collapsed ? 'Expandir el menú' : 'Contraer el menú'}
            className={cn(
              'flex h-9 items-center rounded-control text-xs text-graphite-400',
              'transition-colors duration-150 hover:bg-white/5 hover:text-white',
              collapsed ? 'w-11 justify-center' : 'w-full gap-2.5 px-2.5',
            )}
          >
            {collapsed ? (
              <PanelLeftOpen aria-hidden className="size-4" />
            ) : (
              <>
                <PanelLeftClose aria-hidden className="size-4" />
                <span>Contraer</span>
              </>
            )}
          </button>
        )}
      </footer>
    </nav>
  );
}
