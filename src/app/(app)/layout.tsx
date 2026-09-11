import { Sidebar } from '@/components/layout/sidebar';
import { Topbar } from '@/components/layout/topbar';
import { visibleNavigation } from '@/lib/auth/navigation';
import { getSessionUser } from '@/lib/auth/session';
import { clientEnv } from '@/lib/env';

export default function AppLayout({ children }: { readonly children: React.ReactNode }) {
  // FASE 3 sustituye esto por la sesión real de Supabase Auth.
  const user = getSessionUser();
  const groups = visibleNavigation(user.permissions);

  return (
    <div className="flex h-dvh overflow-hidden bg-surface-sunken">
      {/* En tablet y móvil la barra lateral desaparece: el asesor y el técnico
          trabajan de pie y necesitan la pantalla completa (§16.5). */}
      <div className="hidden lg:block">
        <Sidebar groups={groups} appName={clientEnv.NEXT_PUBLIC_APP_NAME} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar userName={user.fullName} role={user.role} isDemo={user.isDemo} />
        <main className="flex-1 overflow-y-auto px-4 py-6 lg:px-6">
          <div className="mx-auto w-full max-w-[112rem] space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
