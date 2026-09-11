import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { QuotationBuilder } from '@/components/quotation/quotation-builder';
import { DEMO_AUTH_TOKEN, DEMO_QUOTE } from '@/features/quotations/demo';
import { findDemoOrder } from '@/features/demo/board';

export const metadata: Metadata = { title: 'Cotización' };
export const dynamic = 'force-dynamic';

export default async function CotizacionPage({
  params,
}: {
  readonly params: Promise<{ readonly id: string }>;
}) {
  const { id } = await params;
  const row = findDemoOrder(id, new Date());
  if (row === undefined) notFound();

  const { order } = row;

  return (
    <QuotationBuilder
      lines={DEMO_QUOTE}
      vehicle={order.vehicle}
      plate={order.plate.replace(/^(.{3})(.*)$/u, '$1-$2')}
      orderCode={order.code}
      orderId={order.id}
      customer={order.customer}
      corporateClient={order.corporateClient}
      authHref={`/autorizacion/${DEMO_AUTH_TOKEN}`}
    />
  );
}
