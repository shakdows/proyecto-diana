import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PartsAuthorization } from '@/components/parts/parts-authorization';
import { DEMO_PARTS_REQUEST } from '@/features/parts/demo';
import { findDemoOrder } from '@/features/demo/board';

export const metadata: Metadata = { title: 'Autorización de repuestos' };
export const dynamic = 'force-dynamic';

export default async function AutorizacionRepuestosPage({
  params,
}: {
  readonly params: Promise<{ readonly id: string }>;
}) {
  const { id } = await params;
  const row = findDemoOrder(id, new Date());
  if (row === undefined) notFound();

  const { order } = row;

  return (
    <PartsAuthorization
      lines={DEMO_PARTS_REQUEST}
      vehicle={order.vehicle}
      plate={order.plate.replace(/^(.{3})(.*)$/u, '$1-$2')}
      orderCode={order.code}
      orderId={order.id}
      customer={order.customer}
      requestedBy={order.technician ?? 'el técnico asignado'}
    />
  );
}
