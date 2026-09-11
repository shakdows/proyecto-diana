import { CircleUser, Search } from 'lucide-react';
import { ROLE_LABELS, type RoleCode } from '@/lib/auth/permissions';
import { Badge } from '@/components/ui/badge';

export function Topbar({
  userName,
  role,
  isDemo,
}: {
  readonly userName: string;
  readonly role: RoleCode;
  readonly isDemo: boolean;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-4 border-b border-border bg-surface px-4 lg:px-6">
      <label className="relative hidden max-w-md flex-1 items-center sm:flex">
        <span className="sr-only">Búsqueda universal</span>
        <Search aria-hidden className="absolute left-3 size-4 text-fg-subtle" />
        <input
          type="search"
          placeholder="Código de equipo, orden, serie, cliente…"
          className="h-9 w-full rounded-control border border-border bg-surface-sunken pl-9 pr-3 text-sm text-fg placeholder:text-fg-subtle"
        />
      </label>

      <div className="ml-auto flex items-center gap-3">
        {isDemo && <Badge tone="warn">Sesión de demostración · Fase 1</Badge>}
        <div className="flex items-center gap-2">
          <CircleUser aria-hidden className="size-6 text-fg-subtle" />
          <div className="hidden leading-tight sm:block">
            <p className="text-sm font-medium text-fg">{userName}</p>
            <p className="text-xs text-fg-subtle">{ROLE_LABELS[role]}</p>
          </div>
        </div>
      </div>
    </header>
  );
}
