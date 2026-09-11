import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { QualityInspection } from '@/components/quality/quality-inspection';
import { DEMO_QUALITY_CHECKS } from '@/features/quality/demo';
import { findDemoOrder } from '@/features/demo/board';
import { getSessionUser } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'Control de calidad' };
export const dynamic = 'force-dynamic';

export default async function ControlCalidadPage({
  params,
}: {
  readonly params: Promise<{ readonly id: string }>;
}) {
  const { id } = await params;
  const row = findDemoOrder(id, new Date());
  if (row === undefined) notFound();

  const { order } = row;
  const user = await getSessionUser();

  /*
   * El técnico de la orden es el usuario demo `demo-tecnico`, de modo que
   * entrando como técnico se ve la regla en vivo: no puedes aprobar tu propio
   * trabajo. En la Fase 13 el identificador sale de `repair_jobs.technician_id`
   * y la frontera real es la política RLS sobre `quality_inspections`, no esta
   * comparación de pantalla.
   */
  return (
    <QualityInspection
      checks={DEMO_QUALITY_CHECKS}
      vehicle={order.vehicle}
      plate={order.plate.replace(/^(.{3})(.*)$/u, '$1-$2')}
      orderCode={order.code}
      orderId={order.id}
      technicianName={order.technician ?? 'el técnico asignado'}
      technicianId="demo-tecnico"
      inspectorName={user.fullName}
      inspectorId={user.profileId}
    />
  );
}
