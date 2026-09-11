import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PartsReception } from '@/components/parts/parts-reception';
import { DEMO_RECEIVABLE_LINES } from '@/features/parts/reception-demo';
import { findDemoOrder } from '@/features/demo/board';

export const metadata: Metadata = { title: 'Recepción de repuestos' };
export const dynamic = 'force-dynamic';

export default async function RecepcionRepuestosPage({
  params,
}: {
  readonly params: Promise<{ readonly id: string }>;
}) {
  const { id } = await params;
  const row = findDemoOrder(id, new Date());
  if (row === undefined) notFound();

  const { order } = row;

  return (
    <PartsReception
      lines={DEMO_RECEIVABLE_LINES}
      vehicle={order.vehicle}
      plate={order.plate.replace(/^(.{3})(.*)$/u, '$1-$2')}
      orderCode={order.code}
      orderId={order.id}
      customer={order.customer}
    />
  );
}
