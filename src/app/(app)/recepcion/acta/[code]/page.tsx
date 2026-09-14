import type { Metadata } from 'next';
import { ActaView } from '@/components/reception/acta-view';
import { getSessionUser } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'Acta de recepción' };

export const dynamic = 'force-dynamic';

/**
 * El acta vive en el NAVEGADOR mientras no haya base de datos, así que el
 * servidor solo puede aportar quién la está mirando —para firmar la
 * corrección— y el código que se pide. La busca la pantalla.
 */
export default async function ActaPage({
  params,
}: {
  readonly params: Promise<{ readonly code: string }>;
}) {
  const { code } = await params;
  const user = await getSessionUser();
  return <ActaView code={decodeURIComponent(code)} viewerName={user.fullName} />;
}
