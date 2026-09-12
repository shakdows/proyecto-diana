import { renderToBuffer, type DocumentProps } from '@react-pdf/renderer';
import { NextResponse } from 'next/server';
import { documentById } from '@/features/reports/services/catalog';
import { QuotationPdf } from '@/components/documents/quotation-pdf';
import { HandoverPdf } from '@/components/documents/handover-pdf';
import { ReportPdf } from '@/components/documents/report-pdf';
import { ChecklistPdf } from '@/components/documents/checklist-pdf';
import { OrderPdf } from '@/components/documents/order-pdf';
import { DiagnosisPdf } from '@/components/documents/diagnosis-pdf';
import { PurchasePdf } from '@/components/documents/purchase-pdf';
import { PartsReportPdf } from '@/components/documents/parts-report-pdf';
import { WorkReportPdf } from '@/components/documents/work-report-pdf';
import { DEMO_CHECKLIST_STATE, DEMO_FINDINGS, DEMO_WORK_REPORT } from '@/features/documents/demo';
import { DEMO_QUOTED_LINES } from '@/features/purchasing/demo';
import { DEMO_RECEIVABLE_LINES } from '@/features/parts/reception-demo';
import {
  cheapestOffer,
  ordersBySupplier,
  type Selection,
} from '@/features/purchasing/services/supplier-quotes';
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

/*
 * Los tipos que esta ruta sirve salen del CATÁLOGO, no de una lista propia.
 *
 * Con dos listas, añadir un documento al centro de informes y olvidarse de
 * esta da una tarjeta con un botón que lleva a un 404 —peor que no tener la
 * tarjeta—, y nada avisa. Con una sola, ese error no se puede cometer.
 */
type Tipo = string;

function isTipo(value: string): value is Tipo {
  return documentById(value) !== undefined;
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

  /*
   * ⚠️ EL PERMISO SE COMPRUEBA AQUÍ, NO EN LA PANTALLA.
   *
   * El centro de informes oculta las tarjetas que el usuario no puede pedir,
   * pero eso es comodidad: evita ofrecer un botón que iba a fallar. Quien
   * escriba la URL a mano llega igual hasta aquí, y aquí es donde se decide.
   *
   * Responde 404 y no 403 a propósito, como el resto del sistema: un 403
   * confirma que el documento existe, y eso ya es información.
   */
  const kind = documentById(tipo);
  if (kind === undefined || !user.permissions.includes(kind.permission)) {
    return NextResponse.json({ error: 'No se encontró el documento.' }, { status: 404 });
  }

  const now = new Date();

  const supplierId = new URL(request.url).searchParams.get('proveedor') ?? '';
  const doc = build(tipo, id, user.fullName, now, supplierId);
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
  /** Proveedor concreto para la orden de compra; vacío = el primero. */
  supplierId: string,
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

  if (tipo === 'checklist') {
    return {
      element: (
        <ChecklistPdf
          data={{
            orderCode: order.code,
            receivedAt: new Date(now.getTime() - order.openedMinutesAgo * 60_000),
            customer: order.customer,
            vehicle: order.vehicle,
            plate,
            usage: order.usage,
            usageUnit: vocab.usageUnit,
            advisor: order.advisor,
            technician: order.technician ?? 'Sin asignar',
            state: DEMO_CHECKLIST_STATE,
          }}
        />
      ),
      filename: `checklist-${order.code}.pdf`,
    };
  }

  if (tipo === 'orden') {
    return {
      element: (
        <OrderPdf
          data={{
            orderCode: order.code,
            openedAt: new Date(now.getTime() - order.openedMinutesAgo * 60_000),
            promisedAt:
              order.promisedInMinutes === null
                ? null
                : new Date(now.getTime() + order.promisedInMinutes * 60_000),
            status: order.status,
            serviceType: order.serviceType,
            customer: order.customer,
            corporateClient: order.corporateClient,
            phone: order.customerPhone,
            vehicle: order.vehicle,
            plate,
            modelYear: order.modelYear,
            color: order.color,
            vin: order.vin,
            usage: order.usage,
            usageUnit: vocab.usageUnit,
            serialLabel: vocab.serialLabel,
            advisor: order.advisor,
            technician: order.technician,
            customerRequest:
              order.notes[0]?.text ??
              'El cliente solicita revisión general y atención del motivo de ingreso.',
            items: order.items,
          }}
        />
      ),
      filename: `orden-servicio-${order.code}.pdf`,
    };
  }

  if (tipo === 'diagnostico') {
    return {
      element: (
        <DiagnosisPdf
          data={{
            orderCode: order.code,
            completedAt: now,
            customer: order.customer,
            vehicle: order.vehicle,
            plate,
            usage: order.usage,
            usageUnit: vocab.usageUnit,
            technician: order.technician ?? 'Sin asignar',
            advisor: order.advisor,
            findings: DEMO_FINDINGS,
          }}
        />
      ),
      filename: `diagnostico-${order.code}.pdf`,
    };
  }

  if (tipo === 'compra') {
    /*
     * Se elige el proveedor más barato de cada línea que SÍ cubra la cantidad:
     * el más barato a secas emitiría una orden que el proveedor no puede
     * cumplir, y eso se descubre una semana después.
     */
    const seleccion: Selection = Object.fromEntries(
      DEMO_QUOTED_LINES.map((line) => {
        const cubren = line.offers.filter((o) => o.availableQuantity >= line.quantity);
        const offer = cheapestOffer({ ...line, offers: cubren });
        return offer === undefined ? null : ([line.lineId, offer.supplierId] as const);
      }).filter((e): e is readonly [string, string] => e !== null),
    );

    /*
     * UNA orden de compra por PROVEEDOR. La primera versión agrupaba todas las
     * líneas bajo el proveedor de la primera: a Importaciones del Sur le habría
     * llegado una orden con un disco que cotizó AutoPartes Andes. Para eso
     * existe `ordersBySupplier`, y no usarlo fue el error.
     */
    const ordenes = ordersBySupplier(DEMO_QUOTED_LINES, seleccion);
    const elegida = ordenes.find((o) => o.supplierId === supplierId) ?? ordenes[0];
    if (elegida === undefined) return null;

    return {
      element: (
        <PurchasePdf
          data={{
            purchaseCode: `${order.code.replace('OS', 'OC')}-${elegida.supplierId.toUpperCase()}`,
            orderCode: order.code,
            issuedAt: now,
            supplierName: elegida.supplierName,
            paymentTerms: elegida.lines[0]?.offer.paymentTerms ?? 'contado',
            expectedDays: elegida.leadTimeDays,
            vehicle: order.vehicle,
            plate,
            authorizedBy: order.advisor,
            buyer: 'Patricia Vega',
            lines: elegida.lines,
          }}
        />
      ),
      filename: `orden-compra-${order.code}-${elegida.supplierId}.pdf`,
    };
  }

  if (tipo === 'repuestos') {
    return {
      element: (
        <PartsReportPdf
          data={{
            orderCode: order.code,
            generatedAt: now,
            vehicle: order.vehicle,
            plate,
            customer: order.customer,
            buyer: 'Patricia Vega',
            lines: DEMO_RECEIVABLE_LINES.map((l) => ({
              partId: l.lineId,
              description: l.description,
              required: l.ordered,
              received: l.alreadyReceived,
              ...(l.partNumber === undefined ? {} : { partNumber: l.partNumber }),
              supplierName: l.supplierName,
            })),
          }}
        />
      ),
      filename: `reporte-repuestos-${order.code}.pdf`,
    };
  }

  if (tipo === 'trabajo') {
    return {
      element: (
        <WorkReportPdf
          data={{
            ...DEMO_WORK_REPORT,
            orderCode: order.code,
            finishedAt: now,
            vehicle: order.vehicle,
            plate,
            customer: order.customer,
            technician: order.technician ?? 'Sin asignar',
          }}
        />
      ),
      filename: `reporte-trabajo-${order.code}.pdf`,
    };
  }

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
