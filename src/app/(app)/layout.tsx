import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import type { CommandTarget } from '@/components/layout/command-palette';
import { ToastProvider } from '@/components/feedback/toast';
import { attentionItems, demoBoard } from '@/features/demo/board';
import { visibleNavigation } from '@/lib/auth/navigation';
import { getSessionUser } from '@/lib/auth/session';

/*
 * El armazón lee el tablero de demostración para alimentar tres cosas que
 * dejan de ser adorno cuando llevan datos: los contadores del menú, el número
 * de avisos y la búsqueda universal.
 *
 * En la Fase 3 esto pasa a ser una consulta con RLS; la forma no cambia.
 */
export default async function AppLayout({ children }: { readonly children: React.ReactNode }) {
  // FASE 3 sustituye esto por la sesión real de Supabase Auth.
  const user = await getSessionUser();
  const groups = visibleNavigation(user.permissions, user.role);

  const now = new Date();
  const rows = demoBoard(now);
  const attention = attentionItems(rows, now);

  const badges: Record<string, number> = {
    '/ordenes': rows.length,
    '/compras': rows.filter((r) => r.order.status === 'ESPERANDO_REPUESTOS').length,
    '/tablero': attention.length,
  };

  const targets: readonly CommandTarget[] = [
    ...rows.map((row) => ({
      id: row.order.id,
      href: `/ordenes/${row.order.id}`,
      kind: 'orden' as const,
      title: `${row.order.serviceType} · ${row.order.vehicle}`,
      subtitle: `${row.order.code} · ${row.order.customer}`,
      plate: row.order.plate,
      haystack: [
        row.order.plate,
        row.order.code,
        row.order.vehicle,
        row.order.customer,
        row.order.corporateClient ?? '',
        row.order.serviceType,
      ].join(' '),
    })),
    ...groups.flatMap((group) =>
      group.items.map((item) => ({
        id: `nav-${item.href}`,
        href: item.href,
        kind: 'pantalla' as const,
        title: item.label,
        subtitle: group.label,
        haystack: `${item.label} ${group.label}`,
      })),
    ),
  ];

  return (
    <ToastProvider>
      <div className="flex h-dvh overflow-hidden bg-surface-sunken">
        {/* Por debajo de xl la barra vive en un panel lateral que abre la
            barra superior, no desaparece sin sustituto. */}
        <div className="hidden xl:block">
          <Sidebar groups={groups} badges={badges} />
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            groups={groups}
            badges={badges}
            targets={targets}
            userName={user.fullName}
            role={user.role}
            isDemo={user.isDemo}
            notifications={attention.length}
          />
          <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-6 lg:py-7">
            <div className="mx-auto w-full max-w-[110rem] space-y-6">{children}</div>
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}
