import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SupplierComparison } from '@/components/purchasing/supplier-comparison';
import { DEMO_QUOTED_LINES } from '@/features/purchasing/demo';
import { findDemoOrder } from '@/features/demo/board';

export const metadata: Metadata = { title: 'Cotización de proveedores' };
export const dynamic = 'force-dynamic';

export default async function CotizacionProveedoresPage({
  params,
}: {
  readonly params: Promise<{ readonly id: string }>;
}) {
  const { id } = await params;
  const row = findDemoOrder(id, new Date());
  if (row === undefined) notFound();

  const { order } = row;

  return (
    <SupplierComparison
      lines={DEMO_QUOTED_LINES}
      vehicle={order.vehicle}
      plate={order.plate.replace(/^(.{3})(.*)$/u, '$1-$2')}
      orderCode={order.code}
      orderId={order.id}
      customer={order.customer}
    />
  );
}
