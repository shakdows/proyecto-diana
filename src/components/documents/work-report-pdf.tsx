import { Document, Sheet, Text, View, styles, COLOR, Field } from './kit';
import { Signature } from './quotation-pdf';
import {
  PAUSE_LABELS,
  clockView,
  formatClock,
  type JobStep,
  type PauseReason,
} from '@/features/repairs/services/job-steps';
import { formatDateTime, formatNumber } from '@/lib/utils/format';

/**
 * Reporte de trabajo.
 *
 * Lo que el técnico deja escrito al terminar. Documento INTERNO: lleva el
 * desglose de tiempo efectivo y pausas, que es información de productividad,
 * no algo que se discuta con el cliente.
 *
 * Las pausas se imprimen con su motivo. Una orden que tardó nueve horas para
 * cuatro de trabajo no es un técnico lento: son cinco horas esperando una
 * herramienta, y eso solo se arregla si queda escrito.
 */
export interface WorkReportDocData {
  readonly orderCode: string;
  readonly finishedAt: Date;
  readonly vehicle: string;
  readonly plate: string;
  readonly customer: string;
  readonly technician: string;
  readonly supervisor: string;
  readonly jobTitle: string;
  readonly steps: readonly JobStep[];
  readonly effectiveSeconds: number;
  readonly estimatedSeconds: number;
  readonly pauses: readonly {
    readonly reason: PauseReason;
    readonly minutes: number;
    readonly note?: string;
  }[];
  readonly evidenceCount: number;
  readonly finalNotes: string;
}

export function WorkReportPdf({ data }: { readonly data: WorkReportDocData }) {
  const clock = clockView(data.effectiveSeconds, data.estimatedSeconds);
  const pausadoMin = data.pauses.reduce((n, p) => n + p.minutes, 0);
  const hechos = data.steps.filter((s) => s.state === 'hecho').length;

  return (
    <Document
      title={`Reporte de trabajo ${data.orderCode}`}
      author="Romero Motors"
      subject={`${data.jobTitle} · ${data.plate}`}
    >
      <Sheet
        title="REPORTE DE TRABAJO"
        code={data.orderCode}
        footerNote="Romero Motors · Documento interno · No entregar al cliente"
      >
        <View style={styles.card}>
          <View style={[styles.row, { marginBottom: 8 }]}>
            <Field label="Vehículo" value={`${data.vehicle} · ${data.plate}`} width="34%" />
            <Field label="Cliente" value={data.customer} width="22%" />
            <Field label="Técnico" value={data.technician} width="22%" />
            <Field label="Terminado" value={formatDateTime(data.finishedAt)} width="22%" />
          </View>
          <Field label="Trabajo" value={data.jobTitle} width="100%" />
        </View>

        <View style={[styles.row, { marginBottom: 12 }]}>
          <Metric label="Tiempo efectivo" value={formatClock(data.effectiveSeconds)} />
          <Metric label="Estimado" value={formatClock(data.estimatedSeconds)} />
          <Metric
            label={clock.over ? 'Excedido' : 'Ahorrado'}
            value={formatClock(clock.over ? clock.overrunSeconds : clock.remainingSeconds)}
            tone={clock.over ? COLOR.crit : COLOR.ok}
          />
          <Metric label="En pausa" value={`${formatNumber(Math.round(pausadoMin))} min`} />
        </View>

        <Text style={styles.h2}>
          Pasos ejecutados ({hechos} de {data.steps.length})
        </Text>
        <View style={[styles.card, { paddingVertical: 6 }]}>
          {data.steps.map((s, i) => (
            <View
              key={s.id}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingVertical: 2.5,
                ...(i > 0 ? { borderTopWidth: 0.5, borderTopColor: COLOR.line } : {}),
              }}
            >
              <View
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: 3.5,
                  marginRight: 6,
                  backgroundColor: s.state === 'hecho' ? COLOR.ok : '#FFFFFF',
                  borderWidth: 1,
                  borderColor: s.state === 'hecho' ? COLOR.ok : COLOR.line,
                }}
              />
              <Text style={[styles.td, { flexGrow: 1 }]}>{s.label}</Text>
              <Text style={[styles.subtle, { color: s.state === 'hecho' ? COLOR.ok : COLOR.crit }]}>
                {s.state === 'hecho' ? 'Hecho' : 'Sin terminar'}
              </Text>
            </View>
          ))}
        </View>

        <Text style={styles.h2}>Pausas registradas</Text>
        {data.pauses.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.subtle}>El trabajo se ejecutó sin interrupciones.</Text>
          </View>
        ) : (
          <View>
            <View style={styles.trHead}>
              <Text style={[styles.th, { width: '26%' }]}>Motivo</Text>
              <Text style={[styles.th, { width: '14%', textAlign: 'right' }]}>Minutos</Text>
              <Text style={[styles.th, { width: '60%', paddingLeft: 10 }]}>Nota</Text>
            </View>
            {data.pauses.map((p, i) => (
              <View key={i} style={styles.tr} wrap={false}>
                <Text style={[styles.td, { width: '26%' }]}>{PAUSE_LABELS[p.reason]}</Text>
                <Text style={[styles.td, { width: '14%', textAlign: 'right' }]}>
                  {formatNumber(Math.round(p.minutes))}
                </Text>
                <Text style={[styles.td, { width: '60%', paddingLeft: 10, color: COLOR.muted }]}>
                  {p.note ?? '—'}
                </Text>
              </View>
            ))}
          </View>
        )}

        <Text style={[styles.h2, { marginTop: 10 }]}>Observaciones del técnico</Text>
        <View style={[styles.card, { backgroundColor: COLOR.sunken }]}>
          <Text style={styles.muted}>{data.finalNotes}</Text>
          <Text style={[styles.subtle, { marginTop: 5 }]}>
            Evidencia adjunta: {data.evidenceCount}{' '}
            {data.evidenceCount === 1 ? 'fotografía' : 'fotografías'}.
          </Text>
        </View>

        <View style={{ marginTop: 24, flexDirection: 'row', justifyContent: 'space-between' }}>
          <Signature label="Técnico responsable" hint={data.technician} />
          <Signature label="Visto bueno" hint={data.supervisor} />
        </View>
      </Sheet>
    </Document>
  );
}

function Metric({
  label,
  value,
  tone,
}: {
  readonly label: string;
  readonly value: string;
  readonly tone?: string;
}) {
  return (
    <View
      style={{
        width: '23.5%',
        marginRight: '2%',
        borderWidth: 1,
        borderColor: COLOR.line,
        borderRadius: 4,
        padding: 7,
      }}
    >
      <Text style={styles.subtle}>{label}</Text>
      <Text
        style={{
          fontSize: 13,
          fontFamily: 'Helvetica-Bold',
          marginTop: 1,
          ...(tone === undefined ? {} : { color: tone }),
        }}
      >
        {value}
      </Text>
    </View>
  );
}
