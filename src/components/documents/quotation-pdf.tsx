import { Document, Money, Sheet, Text, View, styles, COLOR, Field } from './kit';
import {
  lineTotalCents,
  totalsOf,
  toSoles,
  TAX_RATE,
  type QuoteLine,
} from '@/features/quotations/services/quotation';
import { PRIORITY_LABELS } from '@/features/diagnosis/services/findings';
import { assertSafeForCustomer } from '@/features/documents/services/visibility';
import { formatCurrency, formatDateTime } from '@/lib/utils/format';

/**
 * Cotización en PDF.
 *
 * Los importes NO se recalculan aquí: salen de `totalsOf`, el mismo módulo que
 * alimenta la pantalla. Si el PDF hiciera su propia suma, bastaría un cambio
 * en el IGV para que el papel y el sistema dijeran cosas distintas — y el
 * cliente cree al papel, porque es lo que tiene en la mano.
 */
export interface QuotationDocData {
  readonly orderCode: string;
  readonly quotationCode: string;
  readonly issuedAt: Date;
  readonly customer: string;
  readonly corporateClient: string | null;
  readonly vehicle: string;
  readonly plate: string;
  readonly modelYear: number;
  readonly usage: number;
  readonly usageUnit: string;
  readonly advisor: string;
  readonly lines: readonly QuoteLine[];
}

export function QuotationPdf({ data }: { readonly data: QuotationDocData }) {
  const totals = totalsOf(data.lines);

  // Es una cotización del CLIENTE: ningún campo interno puede viajar en ella.
  assertSafeForCustomer(data);

  return (
    <Document
      title={`Cotización ${data.quotationCode}`}
      author="Romero Motors"
      subject={`Cotización de la orden ${data.orderCode}`}
    >
      <Sheet
        title="COTIZACIÓN"
        code={data.quotationCode}
        footerNote="Romero Motors · Precios en soles, IGV incluido · Validez 15 días"
      >
        <View style={styles.card}>
          <View style={[styles.row, { marginBottom: 8 }]}>
            <Field label="Cliente" value={data.customer} width="34%" />
            <Field
              label="Cuenta"
              value={data.corporateClient ?? 'Particular'}
              width="22%"
            />
            <Field label="Asesor" value={data.advisor} width="22%" />
            <Field label="Emitida" value={formatDateTime(data.issuedAt)} width="22%" />
          </View>
          <View style={styles.row}>
            <Field label="Vehículo" value={data.vehicle} width="34%" />
            <Field label="Placa" value={data.plate} width="22%" />
            <Field label="Año" value={String(data.modelYear)} width="22%" />
            <Field
              label="Kilometraje"
              value={`${data.usage.toLocaleString('es-PE')} ${data.usageUnit}`}
              width="22%"
            />
          </View>
        </View>

        <Text style={styles.h2}>Trabajos cotizados</Text>

        <View style={styles.trHead}>
          <Text style={[styles.th, { width: '5%' }]}>#</Text>
          <Text style={[styles.th, { width: '47%' }]}>Descripción</Text>
          <Text style={[styles.th, { width: '14%' }]}>Prioridad</Text>
          <Text style={[styles.th, { width: '17%', textAlign: 'right' }]}>Repuestos</Text>
          <Text style={[styles.th, { width: '17%', textAlign: 'right' }]}>Total</Text>
        </View>

        {data.lines.map((line, i) => (
          <View key={line.id} style={styles.tr} wrap={false}>
            <Text style={[styles.td, { width: '5%', color: COLOR.subtle }]}>{i + 1}</Text>
            <View style={{ width: '47%', paddingRight: 6 }}>
              <Text style={styles.td}>{line.title}</Text>
              <Text style={[styles.subtle, { marginTop: 1 }]}>{line.detail}</Text>
            </View>
            <Text style={[styles.td, { width: '14%' }]}>{PRIORITY_LABELS[line.priority]}</Text>
            <View style={{ width: '17%' }}>
              <Money value={formatCurrency(toSoles(line.partsCents))} />
            </View>
            <View style={{ width: '17%' }}>
              <Money value={formatCurrency(toSoles(lineTotalCents(line)))} bold />
            </View>
          </View>
        ))}

        <View style={{ marginTop: 14, flexDirection: 'row', justifyContent: 'flex-end' }}>
          <View style={{ width: '42%' }}>
            <Total label="Repuestos" value={formatCurrency(toSoles(totals.partsCents))} />
            <Total label="Mano de obra" value={formatCurrency(toSoles(totals.labourCents))} />
            <Total label="Subtotal" value={formatCurrency(toSoles(totals.subtotalCents))} divider />
            <Total
              label={`IGV (${Math.round(TAX_RATE * 100)} %)`}
              value={formatCurrency(toSoles(totals.taxCents))}
            />
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'baseline',
                borderTopWidth: 1,
                borderTopColor: COLOR.ink,
                marginTop: 5,
                paddingTop: 5,
              }}
            >
              <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold' }}>Total</Text>
              <Text style={{ fontSize: 14, fontFamily: 'Helvetica-Bold' }}>
                {formatCurrency(toSoles(totals.totalCents))}
              </Text>
            </View>
          </View>
        </View>

        <View style={[styles.card, { marginTop: 16, backgroundColor: COLOR.sunken }]}>
          <Text style={[styles.h2, { marginBottom: 3 }]}>Antes de autorizar</Text>
          <Text style={styles.muted}>
            Puedes aprobar o rechazar cada trabajo por separado. Lo que rechaces queda registrado y
            no se ejecuta. El taller no empieza ningún trabajo sin tu autorización.
          </Text>
        </View>

        <View style={{ marginTop: 34, flexDirection: 'row', justifyContent: 'space-between' }}>
          <Signature label="Firma del cliente" hint={data.customer} />
          <Signature label="Asesor de servicio" hint={data.advisor} />
        </View>
      </Sheet>
    </Document>
  );
}

function Total({
  label,
  value,
  divider = false,
}: {
  readonly label: string;
  readonly value: string;
  readonly divider?: boolean;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 2,
        ...(divider
          ? { borderTopWidth: 0.5, borderTopColor: COLOR.line, marginTop: 3, paddingTop: 4 }
          : {}),
      }}
    >
      <Text style={{ fontSize: 8.5, color: COLOR.muted }}>{label}</Text>
      <Text style={{ fontSize: 8.5 }}>{value}</Text>
    </View>
  );
}

export function Signature({ label, hint }: { readonly label: string; readonly hint: string }) {
  return (
    <View style={{ width: '44%' }}>
      <View style={{ borderTopWidth: 1, borderTopColor: COLOR.ink, paddingTop: 4 }}>
        <Text style={{ fontSize: 8.5, fontFamily: 'Helvetica-Bold' }}>{label}</Text>
        <Text style={styles.subtle}>{hint}</Text>
      </View>
    </View>
  );
}
