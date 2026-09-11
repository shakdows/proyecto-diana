'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, ChevronRight, Menu } from 'lucide-react';
import { useState } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Tooltip } from '@/components/ui/tooltip';
import { Drawer } from '@/components/overlay/modal';
import { Sidebar } from './sidebar';
import { CommandPalette, type CommandTarget } from './command-palette';
import { ROLE_LABELS, type RoleCode } from '@/lib/auth/permissions';
import type { NavGroup } from '@/lib/auth/navigation';
import { cn } from '@/lib/utils/cn';

/**
 * Barra superior.
 *
 * Incluye el botón de menú para tablet y móvil. Antes de esto, la barra
 * lateral era `hidden lg:block` y NADA la sustituía: por debajo de 1024 px el
 * usuario quedaba encerrado en la pantalla en la que estuviera, sin forma de
 * llegar a ninguna otra. Es el fallo más grave que encontró la auditoría, y se
 * arregla aquí.
 */

function useBreadcrumb(groups: readonly NavGroup[]): readonly string[] {
  const pathname = usePathname();

  for (const group of groups) {
    for (const item of group.items) {
      if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
        return pathname === item.href
          ? [group.label, item.label]
          : [group.label, item.label, 'Detalle'];
      }
    }
  }
  return [];
}

export function Topbar({
  groups,
  appName,
  badges,
  targets,
  userName,
  role,
  isDemo,
  notifications,
}: {
  readonly groups: readonly NavGroup[];
  readonly appName: string;
  readonly badges: Readonly<Record<string, number>>;
  readonly targets: readonly CommandTarget[];
  readonly userName: string;
  readonly role: RoleCode;
  readonly isDemo: boolean;
  readonly notifications: number;
}) {
  const [navOpen, setNavOpen] = useState(false);
  const crumbs = useBreadcrumb(groups);

  return (
    <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border bg-surface px-4 lg:px-6">
      <button
        type="button"
        onClick={() => setNavOpen(true)}
        aria-label="Abrir el menú"
        className="grid size-10 shrink-0 place-items-center rounded-control text-fg-muted transition-colors duration-150 hover:bg-surface-sunken hover:text-fg xl:hidden"
      >
        <Menu aria-hidden className="size-5" />
      </button>

      <nav aria-label="Ruta" className="hidden min-w-0 shrink-0 lg:block">
        <ol className="flex items-center gap-1.5 text-sm">
          {crumbs.map((crumb, index) => (
            <li key={crumb} className="flex items-center gap-1.5">
              {index > 0 && (
                <ChevronRight aria-hidden className="size-3.5 shrink-0 text-graphite-300" />
              )}
              <span
                className={cn(
                  'truncate',
                  index === crumbs.length - 1 ? 'font-medium text-fg' : 'text-fg-subtle',
                )}
              >
                {crumb}
              </span>
            </li>
          ))}
        </ol>
      </nav>

      <div className="flex min-w-0 flex-1 justify-center px-2">
        <CommandPalette targets={targets} />
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        {isDemo && (
          /* El badge decía «Sesión de demostración · Fase 1». La fase es
             información de desarrollo y no le dice nada a quien usa el
             sistema; el motivo completo queda en la etiqueta emergente. */
          <Tooltip label="Datos de demostración" side="top">
            <span className="rounded-chip border border-warn-500/30 bg-warn-100 px-2 py-1 text-[0.625rem] font-semibold uppercase tracking-[0.08em] text-warn-700">
              Demo
            </span>
          </Tooltip>
        )}

        <button
          type="button"
          aria-label={
            notifications > 0
              ? `Notificaciones: ${notifications} sin leer`
              : 'Notificaciones'
          }
          className="relative grid size-10 place-items-center rounded-control text-fg-muted transition-colors duration-150 hover:bg-surface-sunken hover:text-fg"
        >
          <Bell aria-hidden className="size-[1.125rem]" />
          {notifications > 0 && (
            <span
              aria-hidden
              className="absolute right-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-crit-500 px-1 text-[0.5625rem] font-bold text-white"
            >
              {notifications}
            </span>
          )}
        </button>

        <Link
          href="/admin"
          className="flex items-center gap-2.5 rounded-control py-1 pl-1 pr-2 transition-colors duration-150 hover:bg-surface-sunken"
        >
          <Avatar name={userName} />
          <span className="hidden leading-tight sm:block">
            <span className="block text-sm font-medium text-fg">{userName}</span>
            <span className="block text-xs text-fg-subtle">{ROLE_LABELS[role]}</span>
          </span>
        </Link>
      </div>

      <Drawer open={navOpen} onClose={() => setNavOpen(false)} title="Navegación">
        <div className="-mx-5 -my-5">
          <Sidebar
            groups={groups}
            appName={appName}
            badges={badges}
            collapsible={false}
            onNavigate={() => setNavOpen(false)}
          />
        </div>
      </Drawer>
    </header>
  );
}
