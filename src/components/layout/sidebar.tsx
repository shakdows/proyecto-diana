'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { NavGroup } from '@/lib/auth/navigation';
import { cn } from '@/lib/utils/cn';
import { NavIcon } from './nav-icon';

function isActive(pathname: string, href: string): boolean {
  if (href === '/admin') return pathname === '/admin';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({
  groups,
  appName,
}: {
  readonly groups: readonly NavGroup[];
  readonly appName: string;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegación principal"
      className={cn(
        'flex h-full w-60 shrink-0 flex-col gap-6 overflow-y-auto',
        'bg-graphite-900 px-3 py-4 text-graphite-100',
      )}
    >
      <Link
        href="/"
        className="flex items-center gap-2.5 px-2 py-1 text-graphite-50 hover:text-white"
      >
        <span
          aria-hidden
          className="grid size-8 place-items-center rounded-control bg-brand-600 font-display text-sm font-bold text-white"
        >
          D
        </span>
        <span className="font-display text-base font-semibold tracking-tight">{appName}</span>
      </Link>

      <div className="flex flex-1 flex-col gap-5">
        {groups.map((group) => (
          <div key={group.label}>
            <h2 className="px-2 pb-1.5 text-[0.6875rem] font-semibold uppercase tracking-wider text-graphite-400">
              {group.label}
            </h2>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-2.5 rounded-control px-2 py-2 text-sm transition-colors',
                        active
                          ? 'bg-brand-600 font-medium text-white'
                          : 'text-graphite-200 hover:bg-graphite-800 hover:text-white',
                      )}
                    >
                      <NavIcon name={item.icon} className="size-4 shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </nav>
  );
}
