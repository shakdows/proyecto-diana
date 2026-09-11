import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { HandoverForm } from '@/components/delivery/handover-form';
import { DEMO_SURVEY_TOKEN } from '@/features/delivery/demo';
import { findDemoOrder, quotationTotals } from '@/features/demo/board';
import { vocabularyFor } from '@/features/equipment/services/equipment-kind';

export const metadata: Metadata = { title: 'Entrega del vehículo' };
export const dynamic = 'force-dynamic';

export default async function EntregaPage({
  params,
}: {
  readonly params: Promise<{ readonly id: string }>;
}) {
  const { id } = await params;
  const row = findDemoOrder(id, new Date());
  if (row === undefined) notFound();

  const { order } = row;
  const totals = quotationTotals(order.items);
  const vocab = vocabularyFor(order.equipmentKind);

  /*
   * El total viaja en CÉNTIMOS. `quotationTotals` trabaja en soles porque es
   * el resumen antiguo de la orden; aquí se convierte una sola vez y en un
   * solo sitio, en vez de arrastrar decimales por toda la entrega.
   */
  const totalCents = Math.round(totals.total * 100);

  return (
    <HandoverForm
      vehicle={order.vehicle}
      plate={order.plate.replace(/^(.{3})(.*)$/u, '$1-$2')}
      orderCode={order.code}
      orderId={order.id}
      customer={order.customer}
      corporateClient={order.corporateClient}
      totalCents={totalCents}
      paidCents={order.corporateClient === null ? 0 : totalCents}
      hasCorporateCredit={order.corporateClient !== null}
      usageAtReception={order.usage}
      usageUnit={vocab.usageUnit}
      surveyHref={`/encuesta/${DEMO_SURVEY_TOKEN}`}
    />
  );
}
