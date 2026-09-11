import { Document, Sheet, Text, View, styles, COLOR, Field } from './kit';
import { orderCoverage, type PartLine } from '@/features/parts/services/coverage';
import { formatDate } from '@/lib/utils/format';

/**
 * Reporte de repuestos.
 *
 * Documento INTERNO: dice qué falta para poder reparar. Imprime la cobertura
 * calculada por `orderCoverage`, que cuenta `min(recibido, requerido)` por
 * línea —recibir de más en una no compensa lo que falta en otra— y que da por
 * completa la orden solo si TODAS las líneas lo están: al 97 % no se empieza
 * si lo que falta es el perno que sujeta la pieza.
 */
export interface PartsReportDocData {
  readonly orderCode: string;
  readonly generatedAt: Date;
  readonly vehicle: string;
  readonly plate: string;
  readonly customer: string;
  readonly buyer: string;
  readonly lines: readonly (PartLine & {
    readonly partNumber?: string;
    readonly supplierName?: string;
  })[];
}

export function PartsReportPdf({ data }: { readonly data: PartsReportDocData }) {
  const coverage = orderCoverage(data.lines);
  const porNumero = new Map(data.lines.map((l) => [l.partId, l]));

  return (
    <Document
      title={`Reporte de repuestos ${data.orderCode}`}
      author="Romero Motors"
      subject={`Cobertura de repuestos de ${data.plate}`}
    >
      <Sheet
        title="REPORTE DE REPUESTOS"
        code={data.orderCode}
        footerNote="Romero Motors · Documento interno · No entregar al cliente"
      >
        <View style={styles.card}>
          <View style={styles.row}>
            <Field label="Vehículo" value={`${data.vehicle} · ${data.plate}`} width="34%" />
            <Field label="Cliente" value={data.customer} width="24%" />
            <Field label="Compras" value={data.buyer} width="20%" />
            <Field label="Generado" value={formatDate(data.generatedAt)} width="22%" />
          </View>
        </View>

        <View
          style={[
            styles.card,
            {
              borderColor: coverage.complete ? COLOR.ok : COLOR.warn,
              backgroundColor: coverage.complete ? '#F0FDF4' : '#FFFBEB',
            },
          ]}
        >
          <View style={styles.between}>
            <View>
              <Text style={styles.subtle}>Cobertura de la orden</Text>
              <Text
                style={{
                  fontSize: 18,
                  fontFamily: 'Helvetica-Bold',
                  color: coverage.complete ? COLOR.ok : COLOR.warn,
                }}
              >
                {coverage.percent} %
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end', maxWidth: '62%' }}>
              <Text style={{ fontSize: 9.5, fontFamily: 'Helvetica-Bold' }}>
                {coverage.complete ? 'Listo para reparar' : 'No se puede empezar'}
              </Text>
              <Text style={[styles.muted, { textAlign: 'right', marginTop: 1 }]}>
                {coverage.complete
                  ? `Las ${coverage.totalRequired} unidades requeridas están en almacén.`
                  : `Faltan ${coverage.totalRequired - coverage.totalReceived} de ${coverage.totalRequired} unidades, repartidas en ${coverage.pendingLines.length} ${coverage.pendingLines.length === 1 ? 'línea' : 'líneas'}.`}
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.h2}>Detalle por repuesto</Text>
        <View style={styles.trHead}>
          <Text style={[styles.th, { width: '34%' }]}>Repuesto</Text>
          <Text style={[styles.th, { width: '16%' }]}>N.º de parte</Text>
          <Text style={[styles.th, { width: '18%' }]}>Proveedor</Text>
          <Text style={[styles.th, { width: '10%', textAlign: 'right' }]}>Pedido</Text>
          <Text style={[styles.th, { width: '10%', textAlign: 'right' }]}>Recibido</Text>
          <Text style={[styles.th, { width: '12%', textAlign: 'right' }]}>Falta</Text>
        </View>
        {coverage.lines.map((l) => {
          const extra = porNumero.get(l.partId);
          return (
            <View key={l.partId} style={styles.tr} wrap={false}>
              <Text style={[styles.td, { width: '34%' }]}>{l.description}</Text>
              <Text style={[styles.td, { width: '16%', color: COLOR.muted }]}>
                {extra?.partNumber ?? '—'}
              </Text>
              <Text style={[styles.td, { width: '18%', color: COLOR.muted }]}>
                {extra?.supplierName ?? '—'}
              </Text>
              <Text style={[styles.td, { width: '10%', textAlign: 'right' }]}>{l.required}</Text>
              <Text style={[styles.td, { width: '10%', textAlign: 'right' }]}>{l.received}</Text>
              <Text
                style={{
                  width: '12%',
                  fontSize: 8.5,
                  textAlign: 'right',
                  fontFamily: l.complete ? 'Helvetica' : 'Helvetica-Bold',
                  color: l.complete ? COLOR.ok : COLOR.crit,
                }}
              >
                {l.complete ? '—' : l.missing}
              </Text>
            </View>
          );
        })}

        {coverage.pendingLines.length > 0 && (
          <View
            style={[styles.card, { marginTop: 12, borderColor: COLOR.warn, backgroundColor: '#FFFBEB' }]}
          >
            <Text style={[styles.h2, { color: COLOR.warn, marginBottom: 3 }]}>
              Bloquean la reparación
            </Text>
            {coverage.pendingLines.map((l) => (
              <Text key={l.partId} style={styles.td}>
                · {l.description} — faltan {l.missing} de {l.required}
              </Text>
            ))}
          </View>
        )}
      </Sheet>
    </Document>
  );
}
