import { Document, Sheet, Text, View, styles, COLOR, Field } from './kit';
import { Signature } from './quotation-pdf';
import {
  PAYMENT_METHOD_LABELS,
  toSoles,
  type PaymentMethod,
} from '@/features/delivery/services/handover';
import { formatCurrency, formatDateTime, formatNumber, maskDocument } from '@/lib/utils/format';

/**
 * Acta de entrega.
 *
 * Es el documento que queda cuando el vehículo ya salió y el cliente reclama.
 * Por eso lleva las dos lecturas del odómetro, quién recogió y con qué
 * documento, lo entregado, y el importe con su forma de pago.
 *
 * El documento de identidad va ENMASCARADO: un acta se fotocopia, se manda por
 * correo y acaba en un archivador. El número completo solo se obtiene con
 * `reveal_document_number()`, que exige permiso y deja registro.
 */
export interface HandoverDocData {
  readonly orderCode: string;
  readonly deliveredAt: Date;
  readonly customer: string;
  readonly corporateClient: string | null;
  readonly vehicle: string;
  readonly plate: string;
  readonly usageAtReception: number;
  readonly usageAtDelivery: number;
  readonly usageUnit: string;
  readonly recipientName: string;
  readonly recipientIsOwner: boolean;
  readonly recipientDocLast3: string;
  readonly totalCents: number;
  readonly paidCents: number;
  readonly method: PaymentMethod;
  readonly advisor: string;
  readonly works: readonly string[];
  readonly keysReturned: boolean;
  readonly documentsReturned: boolean;
}

export function HandoverPdf({ data }: { readonly data: HandoverDocData }) {
  const balance = Math.max(0, data.totalCents - data.paidCents);
  const recorrido = Math.max(0, data.usageAtDelivery - data.usageAtReception);

  return (
    <Document
      title={`Acta de entrega ${data.orderCode}`}
      author="Romero Motors"
      subject={`Entrega del vehículo ${data.plate}`}
    >
      <Sheet
        title="ACTA DE ENTREGA"
        code={data.orderCode}
        footerNote="Romero Motors · Este documento acredita la entrega del vehículo y su conformidad"
      >
        <View style={styles.card}>
          <View style={[styles.row, { marginBottom: 8 }]}>
            <Field label="Cliente" value={data.customer} width="34%" />
            <Field label="Cuenta" value={data.corporateClient ?? 'Particular'} width="22%" />
            <Field label="Asesor" value={data.advisor} width="22%" />
            <Field label="Entregado" value={formatDateTime(data.deliveredAt)} width="22%" />
          </View>
          <View style={styles.row}>
            <Field label="Vehículo" value={data.vehicle} width="34%" />
            <Field label="Placa" value={data.plate} width="22%" />
            <Field
              label={`${data.usageUnit === 'km' ? 'Kilometraje' : 'Horómetro'} de entrada`}
              value={`${formatNumber(data.usageAtReception)} ${data.usageUnit}`}
              width="22%"
            />
            <Field
              label="De salida"
              value={`${formatNumber(data.usageAtDelivery)} ${data.usageUnit}`}
              width="22%"
            />
          </View>
          <Text style={[styles.subtle, { marginTop: 6 }]}>
            Recorrido dentro del taller: {formatNumber(recorrido)} {data.usageUnit}.
          </Text>
        </View>

        <Text style={styles.h2}>Trabajos ejecutados</Text>
        <View style={[styles.card, { paddingVertical: 6 }]}>
          {data.works.map((w, i) => (
            <View
              key={w}
              style={{
                flexDirection: 'row',
                paddingVertical: 3,
                ...(i > 0 ? { borderTopWidth: 0.5, borderTopColor: COLOR.line } : {}),
              }}
            >
              <Text style={[styles.td, { width: '5%', color: COLOR.subtle }]}>{i + 1}</Text>
              <Text style={styles.td}>{w}</Text>
            </View>
          ))}
        </View>

        <View style={styles.row}>
          <View style={{ width: '48%', marginRight: '4%' }}>
            <Text style={styles.h2}>Quién recibe</Text>
            <View style={styles.card}>
              <Field
                label={data.recipientIsOwner ? 'Titular de la orden' : 'Tercero autorizado'}
                value={data.recipientName}
                width="100%"
              />
              {!data.recipientIsOwner && (
                <View style={{ marginTop: 6 }}>
                  <Field
                    label="Documento"
                    value={maskDocument(data.recipientDocLast3)}
                    width="100%"
                  />
                </View>
              )}
              <View style={{ marginTop: 8 }}>
                <Check label="Llaves entregadas" done={data.keysReturned} />
                <Check label="Documentos entregados" done={data.documentsReturned} />
              </View>
            </View>
          </View>

          <View style={{ width: '48%' }}>
            <Text style={styles.h2}>Importe</Text>
            <View style={styles.card}>
              <Line label="Total del servicio" value={formatCurrency(toSoles(data.totalCents))} />
              <Line label="Pagado" value={formatCurrency(toSoles(data.paidCents))} />
              <Line
                label="Saldo"
                value={formatCurrency(toSoles(balance))}
                tone={balance > 0 ? COLOR.warn : COLOR.ok}
              />
              <View style={{ marginTop: 6 }}>
                <Field
                  label="Forma de pago"
                  value={PAYMENT_METHOD_LABELS[data.method]}
                  width="100%"
                />
              </View>
            </View>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: COLOR.sunken }]}>
          <Text style={styles.muted}>
            El cliente declara recibir el vehículo conforme, con los trabajos detallados
            ejecutados, y haber verificado su estado exterior e interior en el momento de la
            entrega.
          </Text>
        </View>

        <View style={{ marginTop: 30, flexDirection: 'row', justifyContent: 'space-between' }}>
          <Signature label="Firma de quien recibe" hint={data.recipientName} />
          <Signature label="Asesor de servicio" hint={data.advisor} />
        </View>
      </Sheet>
    </Document>
  );
}

function Check({ label, done }: { readonly label: string; readonly done: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 1.5 }}>
      <View
        style={{
          width: 8,
          height: 8,
          borderWidth: 1,
          borderColor: done ? COLOR.ok : COLOR.line,
          backgroundColor: done ? COLOR.ok : '#FFFFFF',
          marginRight: 5,
          borderRadius: 1.5,
        }}
      />
      <Text style={styles.td}>{label}</Text>
    </View>
  );
}

function Line({
  label,
  value,
  tone,
}: {
  readonly label: string;
  readonly value: string;
  readonly tone?: string;
}) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 }}>
      <Text style={{ fontSize: 8.5, color: COLOR.muted }}>{label}</Text>
      <Text style={{ fontSize: 8.5, ...(tone === undefined ? {} : { color: tone }) }}>{value}</Text>
    </View>
  );
}
