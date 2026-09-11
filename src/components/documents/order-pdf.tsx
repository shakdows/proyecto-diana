import { Document, Sheet, Text, View, styles, COLOR, Field, Money } from './kit';
import { Signature } from './quotation-pdf';
import { STATUS_LABELS, type OrderStatus } from '@/features/orders/services/order-status';
import { formatCurrency, formatDateTime, formatNumber } from '@/lib/utils/format';

/**
 * Orden de servicio.
 *
 * El papel que viaja con el vehículo por el taller. Lleva lo que alguien
 * necesita para trabajar sin abrir el sistema: qué se pidió, qué se autorizó,
 * quién lo hace y para cuándo.
 */
export interface OrderDocData {
  readonly orderCode: string;
  readonly openedAt: Date;
  readonly promisedAt: Date | null;
  readonly status: OrderStatus;
  readonly serviceType: string;
  readonly customer: string;
  readonly corporateClient: string | null;
  readonly phone: string;
  readonly vehicle: string;
  readonly plate: string;
  readonly modelYear: number;
  readonly color: string;
  readonly vin: string;
  readonly usage: number;
  readonly usageUnit: string;
  readonly serialLabel: string;
  readonly advisor: string;
  readonly technician: string | null;
  readonly customerRequest: string;
  readonly items: readonly {
    readonly id: string;
    readonly description: string;
    readonly kind: 'servicio' | 'repuesto';
    readonly quantity: number;
    readonly unitPrice: number;
  }[];
}

export function OrderPdf({ data }: { readonly data: OrderDocData }) {
  const total = data.items.reduce((n, i) => n + i.quantity * i.unitPrice, 0);

  return (
    <Document
      title={`Orden de servicio ${data.orderCode}`}
      author="Romero Motors"
      subject={`${data.vehicle} · ${data.plate}`}
    >
      <Sheet
        title="ORDEN DE SERVICIO"
        code={data.orderCode}
        footerNote="Romero Motors · Este documento acompaña al vehículo durante todo el servicio"
      >
        <View style={[styles.card, { marginBottom: 10 }]}>
          <View style={[styles.between, { marginBottom: 8 }]}>
            <View>
              <Text style={styles.subtle}>Estado actual</Text>
              <Text style={{ fontSize: 12, fontFamily: 'Helvetica-Bold', marginTop: 1 }}>
                {STATUS_LABELS[data.status]}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.subtle}>Prometido</Text>
              <Text style={{ fontSize: 10, marginTop: 1 }}>
                {data.promisedAt === null ? 'Sin compromiso' : formatDateTime(data.promisedAt)}
              </Text>
            </View>
          </View>
          <View style={styles.row}>
            <Field label="Servicio" value={data.serviceType} width="34%" />
            <Field label="Ingreso" value={formatDateTime(data.openedAt)} width="22%" />
            <Field label="Asesor" value={data.advisor} width="22%" />
            <Field label="Técnico" value={data.technician ?? 'Sin asignar'} width="22%" />
          </View>
        </View>

        <View style={styles.row}>
          <View style={{ width: '48%', marginRight: '4%' }}>
            <Text style={styles.h2}>Cliente</Text>
            <View style={styles.card}>
              <Field label="Nombre" value={data.customer} width="100%" />
              <View style={{ marginTop: 6 }}>
                <Field
                  label="Cuenta"
                  value={data.corporateClient ?? 'Particular'}
                  width="100%"
                />
              </View>
              <View style={{ marginTop: 6 }}>
                <Field label="Teléfono" value={data.phone} width="100%" />
              </View>
            </View>
          </View>

          <View style={{ width: '48%' }}>
            <Text style={styles.h2}>Vehículo</Text>
            <View style={styles.card}>
              <View style={[styles.row, { marginBottom: 6 }]}>
                <Field label="Modelo" value={data.vehicle} width="60%" />
                <Field label="Placa" value={data.plate} width="40%" />
              </View>
              <View style={[styles.row, { marginBottom: 6 }]}>
                <Field label="Año" value={String(data.modelYear)} width="30%" />
                <Field label="Color" value={data.color} width="30%" />
                <Field
                  label={data.usageUnit === 'km' ? 'Kilometraje' : 'Horómetro'}
                  value={`${formatNumber(data.usage)} ${data.usageUnit}`}
                  width="40%"
                />
              </View>
              <Field label={data.serialLabel} value={data.vin} width="100%" />
            </View>
          </View>
        </View>

        <Text style={styles.h2}>Lo que pidió el cliente</Text>
        <View style={[styles.card, { backgroundColor: COLOR.sunken }]}>
          <Text style={styles.muted}>{data.customerRequest}</Text>
        </View>

        <Text style={styles.h2}>Trabajos y repuestos autorizados</Text>
        {data.items.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.subtle}>
              Todavía no hay trabajos autorizados. Se añaden al cerrar el diagnóstico y recibir la
              conformidad del cliente.
            </Text>
          </View>
        ) : (
          <View>
            <View style={styles.trHead}>
              <Text style={[styles.th, { width: '6%' }]}>#</Text>
              <Text style={[styles.th, { width: '48%' }]}>Descripción</Text>
              <Text style={[styles.th, { width: '14%' }]}>Tipo</Text>
              <Text style={[styles.th, { width: '10%', textAlign: 'right' }]}>Cant.</Text>
              <Text style={[styles.th, { width: '22%', textAlign: 'right' }]}>Subtotal</Text>
            </View>
            {data.items.map((item, i) => (
              <View key={item.id} style={styles.tr} wrap={false}>
                <Text style={[styles.td, { width: '6%', color: COLOR.subtle }]}>{i + 1}</Text>
                <Text style={[styles.td, { width: '48%' }]}>{item.description}</Text>
                <Text style={[styles.td, { width: '14%', color: COLOR.muted }]}>
                  {item.kind === 'servicio' ? 'Servicio' : 'Repuesto'}
                </Text>
                <Text style={[styles.td, { width: '10%', textAlign: 'right' }]}>
                  {item.quantity}
                </Text>
                <View style={{ width: '22%' }}>
                  <Money value={formatCurrency(item.quantity * item.unitPrice)} />
                </View>
              </View>
            ))}
            <View style={[styles.between, { marginTop: 8 }]}>
              <Text />
              <View style={{ width: '30%', flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 9.5, fontFamily: 'Helvetica-Bold' }}>Total</Text>
                <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold' }}>
                  {formatCurrency(total)}
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={{ marginTop: 26, flexDirection: 'row', justifyContent: 'space-between' }}>
          <Signature label="Firma del cliente" hint={data.customer} />
          <Signature label="Asesor de servicio" hint={data.advisor} />
        </View>
      </Sheet>
    </Document>
  );
}
