import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Lock } from 'lucide-react';
import { SettingsPanel } from '@/components/settings/settings-panels';
import { settingById } from '@/features/settings/services/hub';
import { getSessionUser } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  readonly params: Promise<{ readonly seccion: string }>;
}): Promise<Metadata> {
  const { seccion } = await params;
  return { title: settingById(seccion)?.label ?? 'Configuración' };
}

export default async function SeccionPage({
  params,
}: {
  readonly params: Promise<{ readonly seccion: string }>;
}) {
  const { seccion } = await params;
  const entry = settingById(seccion);
  const user = await getSessionUser();

  /*
   * ⚠️ El permiso se comprueba AQUÍ, no solo al dibujar las tarjetas.
   *
   * Un bloque que no sale en la portada se alcanza igual escribiendo la URL.
   * Responde 404 —no 403— como el resto del sistema: un 403 confirmaría que
   * la sección existe.
   */
  if (entry === undefined || !entry.available || !user.permissions.includes(entry.permission)) {
    notFound();
  }

  return (
    <>
      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted transition-colors duration-150 hover:text-fg"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Configuración
      </Link>

      <header>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-fg lg:text-[1.75rem]">
          {entry.label}
        </h1>
        <p className="mt-1 text-sm text-fg-muted">{entry.description}</p>
      </header>

      {/* Se dice que no se puede guardar todavía, en vez de poner un botón que
          no guarda. Quien cambie un umbral creyendo que lo cambió es peor que
          quien no puede cambiarlo. */}
      <p className="flex items-start gap-3 rounded-panel border border-border bg-surface-sunken px-4 py-3">
        <Lock aria-hidden className="mt-0.5 size-4 shrink-0 text-fg-subtle" />
        <span className="text-sm leading-relaxed text-fg-muted">
          <span className="font-medium text-fg">Solo lectura.</span> Esta es la configuración que
          usa el sistema ahora mismo, leída del catálogo. Editarla exige la conexión a la base de
          datos, donde cada cambio queda auditado.
        </span>
      </p>

      <SettingsPanel id={entry.id} />
    </>
  );
}
