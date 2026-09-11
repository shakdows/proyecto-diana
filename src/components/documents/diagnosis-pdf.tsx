import { Document, Sheet, Text, View, styles, COLOR, Field } from './kit';
import { Signature } from './quotation-pdf';
import {
  PRIORITY_LABELS,
  SYSTEM_LABELS,
  countByPriority,
  sortByPriority,
  totalEstimatedMinutes,
  type Finding,
} from '@/features/diagnosis/services/findings';
import { formatMinutes } from '@/features/repairs/services/time-tracking';
import { formatDateTime, formatNumber } from '@/lib/utils/format';

/**
 * Informe de diagnóstico.
 *
 * Va ordenado por prioridad, no por sistema ni por orden de captura: quien lo
 * lee decide qué autorizar con un presupuesto limitado, y lo primero que ve
 * debe ser lo que no puede esperar.
 *
 * Las notas internas del técnico NO se imprimen: este documento se entrega al
 * cliente junto con la cotización.
 */
export interface DiagnosisDocData {
  readonly orderCode: string;
  readonly completedAt: Date;
  readonly customer: string;
  readonly vehicle: string;
  readonly plate: string;
  readonly usage: number;
  readonly usageUnit: string;
  readonly technician: string;
  readonly advisor: string;
  readonly findings: readonly Finding[];
}

const PRIORITY_COLOR: Readonly<Record<string, string>> = {
  critico: COLOR.crit,
  alto: COLOR.warn,
  medio: COLOR.muted,
  recomendacion: COLOR.subtle,
};

export function DiagnosisPdf({ data }: { readonly data: DiagnosisDocData }) {
  const ordenados = sortByPriority(data.findings);
  const porPrioridad = countByPriority(data.findings);
  const minutos = totalEstimatedMinutes(data.findings);

  return (
    <Document
      title={`Diagnóstico ${data.orderCode}`}
      author="Romero Motors"
      subject={`Diagnóstico técnico de ${data.plate}`}
    >
      <Sheet
        title="DIAGNÓSTICO TÉCNICO"
        code={data.orderCode}
        footerNote="Romero Motors · Hallazgos ordenados por prioridad · Ningún trabajo se ejecuta sin tu autorización"
      >
        <View style={styles.card}>
          <View style={[styles.row, { marginBottom: 8 }]}>
            <Field label="Cliente" value={data.customer} width="30%" />
            <Field label="Vehículo" value={data.vehicle} width="28%" />
            <Field label="Placa" value={data.plate} width="20%" />
            <Field
              label={data.usageUnit === 'km' ? 'Kilometraje' : 'Horómetro'}
              value={`${formatNumber(data.usage)} ${data.usageUnit}`}
              width="22%"
            />
          </View>
          <View style={styles.row}>
            <Field label="Diagnosticado" value={formatDateTime(data.completedAt)} width="30%" />
            <Field label="Técnico" value={data.technician} width="28%" />
            <Field label="Hallazgos" value={String(data.findings.length)} width="20%" />
            <Field label="Tiempo estimado" value={formatMinutes(minutos)} width="22%" />
          </View>
        </View>

        <View style={[styles.row, { marginBottom: 12 }]}>
          {(['critico', 'alto', 'medio', 'recomendacion'] as const).map((p) => (
            <View
              key={p}
              style={{
                width: '23.5%',
                marginRight: '2%',
                borderWidth: 1,
                borderColor: COLOR.line,
                borderRadius: 4,
                padding: 7,
              }}
            >
              <Text style={styles.subtle}>{PRIORITY_LABELS[p]}</Text>
              <Text
                style={{
                  fontSize: 15,
                  fontFamily: 'Helvetica-Bold',
                  marginTop: 1,
                  color: PRIORITY_COLOR[p],
                }}
              >
                {porPrioridad[p] ?? 0}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.h2}>Hallazgos</Text>
        {ordenados.map((f, i) => (
          <View
            key={f.id}
            style={[styles.card, { paddingVertical: 8, marginBottom: 6 }]}
            wrap={false}
          >
            <View style={styles.between}>
              <Text style={{ fontSize: 9.5, fontFamily: 'Helvetica-Bold' }}>
                {i + 1}. {f.title}
              </Text>
              <Text
                style={{
                  fontSize: 8,
                  fontFamily: 'Helvetica-Bold',
                  color: PRIORITY_COLOR[f.priority],
                }}
              >
                {PRIORITY_LABELS[f.priority]}
              </Text>
            </View>
            <Text style={[styles.muted, { marginTop: 2 }]}>{f.detail}</Text>
            <View style={[styles.row, { marginTop: 4 }]}>
              <Text style={styles.subtle}>Sistema: {SYSTEM_LABELS[f.system]}</Text>
              <Text style={[styles.subtle, { marginLeft: 14 }]}>
                Tiempo estimado: {formatMinutes(f.estimatedMinutes)}
              </Text>
              <Text style={[styles.subtle, { marginLeft: 14 }]}>
                Evidencia: {f.photoCount} {f.photoCount === 1 ? 'foto' : 'fotos'}
                {f.videoCount > 0 &&
                  `, ${f.videoCount} ${f.videoCount === 1 ? 'vídeo' : 'vídeos'}`}
              </Text>
            </View>
          </View>
        ))}

        <View style={[styles.card, { backgroundColor: COLOR.sunken, marginTop: 8 }]}>
          <Text style={styles.muted}>
            Este informe describe lo encontrado, no lo que se va a hacer. Recibirás una cotización
            aparte y podrás aprobar o rechazar cada trabajo por separado.
          </Text>
        </View>

        <View style={{ marginTop: 22, flexDirection: 'row', justifyContent: 'space-between' }}>
          <Signature label="Técnico responsable" hint={data.technician} />
          <Signature label="Asesor de servicio" hint={data.advisor} />
        </View>
      </Sheet>
    </Document>
  );
}
