'use client';

import Link from 'next/link';
import { Bell, LogOut, Menu } from 'lucide-react';
import { useState } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { ResetDemo, SavedHint } from './reset-demo';
import { Tooltip } from '@/components/ui/tooltip';
import { Drawer } from '@/components/overlay/modal';
import { Sidebar } from './sidebar';
import { CommandPalette, type CommandTarget } from './command-palette';
import type { DemoCustomer } from '@/features/customers/demo';
import { ROLE_LABELS, type RoleCode } from '@/lib/auth/permissions';
import type { NavGroup } from '@/lib/auth/navigation';
import { leaveDemo } from '@/app/login/actions';

/**
 * Barra superior.
 *
 * Incluye el botón de menú para tablet y móvil. Antes, la barra lateral era
 * `hidden lg:block` y NADA la sustituía: por debajo de 1024 px el usuario
 * quedaba encerrado en la pantalla en la que estuviera. Es el fallo más grave
 * que encontró la auditoría y se arregla aquí.
 */
export function Topbar({
  groups,
  badges,
  targets,
  customers,
  userName,
  role,
  isDemo,
  notifications,
}: {
  readonly groups: readonly NavGroup[];
  readonly badges: Readonly<Record<string, number>>;
  readonly targets: readonly CommandTarget[];
  readonly customers: readonly DemoCustomer[];
  readonly userName: string;
  readonly role: RoleCode;
  readonly isDemo: boolean;
  readonly notifications: number;
}) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <header className="flex h-topbar shrink-0 items-center gap-3 border-b border-border bg-surface px-4 lg:px-6">
      <button
        type="button"
        onClick={() => setNavOpen(true)}
        aria-label="Abrir el menú"
        className="grid size-10 shrink-0 place-items-center rounded-control text-fg-muted transition-colors duration-150 hover:bg-surface-sunken hover:text-fg xl:hidden"
      >
        <Menu aria-hidden className="size-5" />
      </button>

      <CommandPalette targets={targets} customers={customers} />

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <button
          type="button"
          aria-label={
            notifications > 0 ? `Notificaciones: ${notifications} sin leer` : 'Notificaciones'
          }
          className="relative grid size-10 place-items-center rounded-control text-fg-muted transition-colors duration-150 hover:bg-surface-sunken hover:text-fg"
        >
          <Bell aria-hidden className="size-[1.375rem]" />
          {notifications > 0 && (
            <span
              aria-hidden
              className="absolute right-1 top-1 grid size-[1.125rem] place-items-center rounded-full bg-crit-500 text-[0.625rem] font-bold text-white ring-2 ring-surface"
            >
              {notifications}
            </span>
          )}
        </button>

        <Link
          href="/admin"
          className="flex items-center gap-2.5 rounded-control py-1 pl-1 pr-2 transition-colors duration-150 hover:bg-surface-sunken"
        >
          <Avatar name={userName} size="lg" />
          <span className="hidden leading-tight sm:block">
            <span className="block text-sm font-semibold text-fg">{userName}</span>
            <span className="block text-xs text-fg-subtle">{ROLE_LABELS[role]}</span>
          </span>
        </Link>

        {isDemo && (
          /* El badge decía «Sesión de demostración · Fase 1». La fase es
             información de desarrollo y no le dice nada a quien usa el
             sistema; el motivo completo queda en la etiqueta emergente. */
          <Tooltip label="Datos de demostración" side="top">
            <span className="rounded-chip bg-warn-100 px-2.5 py-1 text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-warn-700">
              Demo
            </span>
          </Tooltip>
        )}

        {/* Borrar lo guardado vive junto al distintivo de demostración, no
            enterrado en ajustes: es la contrapartida de que el trabajo
            persista, y quien lo necesita lo necesita ahora. */}
        {isDemo && <SavedHint />}
        {isDemo && <ResetDemo />}

        {/* Salir devuelve a la pantalla de entrada, que es donde se cambia de
            puesto. Sin esto, probar la demostración con otro rol obligaba a
            borrar la cookie a mano. */}
        <form action={leaveDemo}>
          <button
            type="submit"
            aria-label="Cerrar sesión y cambiar de puesto"
            className="grid size-10 place-items-center rounded-control text-fg-subtle transition-colors duration-150 hover:bg-surface-sunken hover:text-crit-600"
          >
            <LogOut aria-hidden className="size-[1.125rem]" />
          </button>
        </form>
      </div>

      <Drawer open={navOpen} onClose={() => setNavOpen(false)} title="Navegación">
        <div className="-mx-5 -my-5">
          <Sidebar groups={groups} badges={badges} onNavigate={() => setNavOpen(false)} />
        </div>
      </Drawer>
    </header>
  );
}
