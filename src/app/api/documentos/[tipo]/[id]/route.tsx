import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer';
import { NextResponse } from 'next/server';
import { QuotationPdf } from '@/components/documents/quotation-pdf';
import { HandoverPdf } from '@/components/documents/handover-pdf';
import { ReportPdf } from '@/components/documents/report-pdf';
import { DEMO_QUOTE } from '@/features/quotations/demo';
import { findDemoOrder, quotationTotals } from '@/features/demo/board';
import { vocabularyFor } from '@/features/equipment/services/equipment-kind';
import { demoHistory } from '@/features/analytics/demo';
import { applyFilters, inRange, previousWindow } from '@/features/analytics/services/metrics';
import { getSessionUser } from '@/lib/auth/session';

/*
 * Node, no Edge: `@react-pdf/renderer` necesita APIs de Node (Buffer, stream)
 * que el runtime Edge no tiene. Declararlo aquí evita un fallo que solo
 * aparecería al desplegar.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TIPOS = ['cotizacion', 'entrega', 'informe'] as const;
type Tipo = (typeof TIPOS)[number];

function isTipo(value: string): value is Tipo {
  return (TIPOS as readonly string[]).includes(value);
}

export async function GET(
  request: Request,
  { params }: { readonly params: Promise<{ readonly tipo: string; readonly id: string }> },
) {
  const { tipo, id } = await params;
  if (!isTipo(tipo)) {
    return NextResponse.json({ error: 'Tipo de documento desconocido.' }, { status: 404 });
  }

  const user = await getSessionUser();
  const now = new Date();

  const doc = build(tipo, id, user.fullName, now);
  if (doc === null) {
    // Inexistente y fuera de alcance responden igual, como en el resto del
    // sistema: distinguirlos permitiría averiguar qué órdenes existen.
    return NextResponse.json({ error: 'No se encontró el documento.' }, { status: 404 });
  }

  const buffer = await renderToBuffer(doc.element);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      /*
       * `inline` y no `attachment`: el asesor lo revisa antes de mandarlo, y
       * forzar la descarga de un PDF que solo quería ojear llena la carpeta
       * de descargas de borradores.
       */
      'Content-Disposition': `inline; filename="${doc.filename}"`,
      // Un documento se genera con los datos del momento; cachearlo haría que
      // el segundo asesor viera los importes del primero.
      'Cache-Control': 'no-store',
    },
  });
}

function build(
  tipo: Tipo,
  id: string,
  actor: string,
  now: Date,
): { readonly element: React.ReactElement<DocumentProps>; readonly filename: string } | null {
  if (tipo === 'informe') {
    const history = demoHistory(now);
    const empresa = decodeURIComponent(id);
    const from = new Date(now.getTime() - 30 * 86_400_000);
    const prev = previousWindow(from, now);
    const filtrado = applyFilters(history, { corporateClient: empresa });

    if (filtrado.length === 0) return null;

    return {
      element: (
        <ReportPdf
          data={{
            corporateClient: empresa,
            from,
            to: now,
            current: inRange(filtrado, from, now),
            previous: inRange(filtrado, prev.from, prev.to),
            generatedBy: actor,
            generatedAt: now,
          }}
        />
      ),
      filename: `informe-satisfaccion-${empresa.toLowerCase().replace(/\s+/gu, '-')}.pdf`,
    };
  }

  const row = findDemoOrder(id, now);
  if (row === undefined) return null;
  const { order } = row;
  const vocab = vocabularyFor(order.equipmentKind);
  const plate = order.plate.replace(/^(.{3})(.*)$/u, '$1-$2');

  if (tipo === 'cotizacion') {
    return {
      element: (
        <QuotationPdf
          data={{
            orderCode: order.code,
            quotationCode: order.code.replace('OS', 'COT'),
            issuedAt: now,
            customer: order.customer,
            corporateClient: order.corporateClient,
            vehicle: order.vehicle,
            plate,
            modelYear: order.modelYear,
            usage: order.usage,
            usageUnit: vocab.usageUnit,
            advisor: order.advisor,
            lines: DEMO_QUOTE,
          }}
        />
      ),
      filename: `cotizacion-${order.code}.pdf`,
    };
  }

  const totalCents = Math.round(quotationTotals(order.items).total * 100);
  return {
    element: (
      <HandoverPdf
        data={{
          orderCode: order.code,
          deliveredAt: now,
          customer: order.customer,
          corporateClient: order.corporateClient,
          vehicle: order.vehicle,
          plate,
          usageAtReception: order.usage,
          usageAtDelivery: order.usage + 6,
          usageUnit: vocab.usageUnit,
          recipientName: order.customer,
          recipientIsOwner: true,
          recipientDocLast3: order.customerDocLast3,
          totalCents,
          paidCents: totalCents,
          method: order.corporateClient === null ? 'tarjeta' : 'credito_corporativo',
          advisor: order.advisor,
          works: order.items.map((i) => i.description),
          keysReturned: true,
          documentsReturned: true,
        }}
      />
    ),
    filename: `acta-entrega-${order.code}.pdf`,
  };
}
