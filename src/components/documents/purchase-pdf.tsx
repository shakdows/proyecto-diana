import { Document, Sheet, Text, View, styles, COLOR, Field, Money } from './kit';
import { Signature } from './quotation-pdf';
import {
  PAYMENT_LABELS,
  lineTotalCents,
  toSoles,
  TAX_RATE,
  type QuotedLine,
  type SupplierOffer,
} from '@/features/purchasing/services/supplier-quotes';
import { formatCurrency, formatDate } from '@/lib/utils/format';

/**
 * Orden de compra.
 *
 * Va al PROVEEDOR, así que es el documento con la dirección de audiencia
 * contraria a los demás: aquí sí aparece el costo —es lo que se le va a
 * pagar— y lo que no aparece nunca es a cuánto se lo cobramos al cliente.
 */
export interface PurchaseDocData {
  readonly purchaseCode: string;
  readonly orderCode: string;
  readonly issuedAt: Date;
  readonly supplierName: string;
  readonly paymentTerms: SupplierOffer['paymentTerms'];
  readonly expectedDays: number;
  readonly vehicle: string;
  readonly plate: string;
  readonly authorizedBy: string;
  readonly buyer: string;
  readonly lines: readonly {
    readonly line: QuotedLine;
    readonly offer: SupplierOffer;
  }[];
}

export function PurchasePdf({ data }: { readonly data: PurchaseDocData }) {
  const subtotal = data.lines.reduce((n, l) => n + lineTotalCents(l.line, l.offer), 0);
  const igv = Math.round(subtotal * TAX_RATE);

  return (
    <Document
      title={`Orden de compra ${data.purchaseCode}`}
      author="Romero Motors"
      subject={`Compra a ${data.supplierName}`}
    >
      <Sheet
        title="ORDEN DE COMPRA"
        code={data.purchaseCode}
        footerNote="Romero Motors · Referencia esta orden en tu guía de remisión y factura"
      >
        <View style={styles.card}>
          <View style={[styles.row, { marginBottom: 8 }]}>
            <Field label="Proveedor" value={data.supplierName} width="34%" />
            <Field label="Emitida" value={formatDate(data.issuedAt)} width="22%" />
            <Field
              label="Forma de pago"
              value={PAYMENT_LABELS[data.paymentTerms]}
              width="22%"
            />
            <Field
              label="Plazo acordado"
              value={`${data.expectedDays} ${data.expectedDays === 1 ? 'día' : 'días'}`}
              width="22%"
            />
          </View>
          <View style={styles.row}>
            <Field label="Orden de servicio" value={data.orderCode} width="34%" />
            <Field label="Vehículo" value={`${data.vehicle} · ${data.plate}`} width="44%" />
            <Field label="Comprador" value={data.buyer} width="22%" />
          </View>
        </View>

        <Text style={styles.h2}>Repuestos solicitados</Text>
        <View style={styles.trHead}>
          <Text style={[styles.th, { width: '6%' }]}>#</Text>
          <Text style={[styles.th, { width: '38%' }]}>Descripción</Text>
          <Text style={[styles.th, { width: '18%' }]}>N.º de parte</Text>
          <Text style={[styles.th, { width: '10%', textAlign: 'right' }]}>Cant.</Text>
          <Text style={[styles.th, { width: '14%', textAlign: 'right' }]}>Unitario</Text>
          <Text style={[styles.th, { width: '14%', textAlign: 'right' }]}>Total</Text>
        </View>
        {data.lines.map(({ line, offer }, i) => (
          <View key={line.lineId} style={styles.tr} wrap={false}>
            <Text style={[styles.td, { width: '6%', color: COLOR.subtle }]}>{i + 1}</Text>
            <Text style={[styles.td, { width: '38%' }]}>{line.description}</Text>
            <Text style={[styles.td, { width: '18%', color: COLOR.muted }]}>
              {line.partNumber ?? '—'}
            </Text>
            <Text style={[styles.td, { width: '10%', textAlign: 'right' }]}>{line.quantity}</Text>
            <View style={{ width: '14%' }}>
              <Money value={formatCurrency(toSoles(offer.unitCostCents))} />
            </View>
            <View style={{ width: '14%' }}>
              <Money value={formatCurrency(toSoles(lineTotalCents(line, offer)))} bold />
            </View>
          </View>
        ))}

        <View style={{ marginTop: 12, flexDirection: 'row', justifyContent: 'flex-end' }}>
          <View style={{ width: '38%' }}>
            <Row label="Subtotal" value={formatCurrency(toSoles(subtotal))} />
            <Row label={`IGV (${Math.round(TAX_RATE * 100)} %)`} value={formatCurrency(toSoles(igv))} />
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                borderTopWidth: 1,
                borderTopColor: COLOR.ink,
                marginTop: 4,
                paddingTop: 4,
              }}
            >
              <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold' }}>Total</Text>
              <Text style={{ fontSize: 13, fontFamily: 'Helvetica-Bold' }}>
                {formatCurrency(toSoles(subtotal + igv))}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.card, { marginTop: 14, backgroundColor: COLOR.sunken }]}>
          <Text style={styles.muted}>
            La mercadería se recibe contando unidad por unidad. Lo que llegue dañado o no
            corresponda se rechaza en el acto y se deja constancia con fotografía.
          </Text>
        </View>

        <View style={{ marginTop: 26, flexDirection: 'row', justifyContent: 'space-between' }}>
          <Signature label="Autorizado por" hint={data.authorizedBy} />
          <Signature label="Conformidad del proveedor" hint={data.supplierName} />
        </View>
      </Sheet>
    </Document>
  );
}

function Row({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 }}>
      <Text style={{ fontSize: 8.5, color: COLOR.muted }}>{label}</Text>
      <Text style={{ fontSize: 8.5 }}>{value}</Text>
    </View>
  );
}
