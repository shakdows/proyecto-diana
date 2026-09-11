import type { Metadata } from 'next';
import { PartsRequest } from '@/components/parts/parts-request';
import { DEMO_PARTS_REQUEST } from '@/features/parts/demo';
import { DEMO_QUOTE } from '@/features/quotations/demo';
import { findDemoOrder } from '@/features/demo/board';

export const metadata: Metadata = { title: 'Solicitud de repuestos' };
export const dynamic = 'force-dynamic';

export default function SolicitudRepuestosPage() {
  const row = findDemoOrder('os-154', new Date());
  if (row === undefined) return null;

  const { order } = row;

  /*
   * Solo los trabajos que el cliente autorizó. En la Fase 8 sale de
   * `quotation_items` con `approved = true`: pedir repuestos para un trabajo
   * sin autorizar es comprar una pieza que nadie va a pagar.
   */
  const works = DEMO_QUOTE.map((q) => ({ id: q.id, title: q.title }));

  return (
    <PartsRequest
      initialLines={DEMO_PARTS_REQUEST}
      vehicle={order.vehicle}
      plate={order.plate.replace(/^(.{3})(.*)$/u, '$1-$2')}
      orderCode={order.code}
      customer={order.customer}
      works={works}
    />
  );
}
