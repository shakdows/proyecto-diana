import { Document, Sheet, Text, View, styles, COLOR, Field } from './kit';
import { Signature } from './quotation-pdf';
import {
  CHECKLIST,
  FLUID_LABELS,
  FUEL_LABELS,
  MIN_TREAD_MM,
  nonConformities,
  overallProgress,
  sectionProgress,
  tyresBelowMinimum,
  type ChecklistState,
} from '@/features/reception/services/checklist';
import { formatDateTime, formatNumber } from '@/lib/utils/format';

/**
 * Checklist de recepción.
 *
 * Es el documento que decide quién paga un rayón. Por eso imprime el estado
 * de LOS 42 ítems, incluidos los conformes: una hoja que solo listara los
 * problemas no probaría que lo demás se revisó, y «no está en la lista»
 * admite dos lecturas opuestas.
 */
export interface ChecklistDocData {
  readonly orderCode: string;
  readonly receivedAt: Date;
  readonly customer: string;
  readonly vehicle: string;
  readonly plate: string;
  readonly usage: number;
  readonly usageUnit: string;
  readonly advisor: string;
  readonly technician: string;
  readonly state: ChecklistState;
}

export function ChecklistPdf({ data }: { readonly data: ChecklistDocData }) {
  const progress = overallProgress(data.state);
  const fallos = nonConformities(data.state);
  const neumaticos = tyresBelowMinimum(data.state);

  return (
    <Document
      title={`Checklist de recepción ${data.orderCode}`}
      author="Romero Motors"
      subject={`Recepción del vehículo ${data.plate}`}
    >
      <Sheet
        title="CHECKLIST DE RECEPCIÓN"
        code={data.orderCode}
        footerNote="Romero Motors · El estado descrito es el que el vehículo tenía al ingresar"
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
            <Field label="Recibido" value={formatDateTime(data.receivedAt)} width="30%" />
            <Field label="Asesor" value={data.advisor} width="28%" />
            <Field label="Técnico" value={data.technician} width="20%" />
            <Field
              label="Revisado"
              value={`${progress.done} de ${progress.total} ítems`}
              width="22%"
            />
          </View>
        </View>

        {/*
          Los hallazgos van ARRIBA, antes del detalle. Quien firma esta hoja
          normalmente no la lee entera: lo que tiene que ver sí o sí es lo que
          está mal.
        */}
        {(fallos.length > 0 || neumaticos.length > 0) && (
          <View
            style={[
              styles.card,
              { borderColor: COLOR.crit, backgroundColor: '#FEF2F2', marginBottom: 12 },
            ]}
          >
            <Text style={[styles.h2, { color: COLOR.crit, marginBottom: 4 }]}>
              Observaciones al ingreso ({fallos.length})
            </Text>
            {fallos.map((item) => (
              <View key={item.id} style={{ flexDirection: 'row', paddingVertical: 1.5 }}>
                <Text style={[styles.td, { width: '42%' }]}>{item.label}</Text>
                <Text style={[styles.td, { color: COLOR.muted }]}>
                  {data.state[item.id]?.note ?? 'Sin detalle'}
                </Text>
              </View>
            ))}
            {neumaticos.length > 0 && (
              <Text style={[styles.td, { marginTop: 5, color: COLOR.crit }]}>
                {neumaticos.length === 1
                  ? `1 neumático por debajo del mínimo legal de ${MIN_TREAD_MM} mm.`
                  : `${neumaticos.length} neumáticos por debajo del mínimo legal de ${MIN_TREAD_MM} mm.`}
              </Text>
            )}
          </View>
        )}

        {CHECKLIST.map((section) => {
          const sp = sectionProgress(section, data.state);
          return (
            <View key={section.id} style={{ marginBottom: 10 }} wrap={false}>
              <View style={[styles.between, { marginBottom: 3 }]}>
                <Text style={styles.h2}>{section.label}</Text>
                <Text style={styles.subtle}>
                  {sp.done}/{sp.total}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {section.items.map((item) => {
                  const r = data.state[item.id];
                  return (
                    <View
                      key={item.id}
                      style={{
                        width: '50%',
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        paddingVertical: 1.5,
                        paddingRight: 10,
                      }}
                    >
                      <Text style={[styles.td, { flexGrow: 1 }]}>{item.label}</Text>
                      <Text
                        style={{
                          fontSize: 8,
                          fontFamily: r?.answer === 'no_conforme' ? 'Helvetica-Bold' : 'Helvetica',
                          color:
                            r?.answer === 'no_conforme'
                              ? COLOR.crit
                              : r === undefined
                                ? COLOR.subtle
                                : COLOR.muted,
                        }}
                      >
                        {describe(item.kind, r)}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        })}

        <View style={{ marginTop: 20, flexDirection: 'row', justifyContent: 'space-between' }}>
          <Signature label="Firma del cliente" hint={data.customer} />
          <Signature label="Recibido por" hint={data.advisor} />
        </View>
      </Sheet>
    </Document>
  );
}

/**
 * Qué se imprime para cada ítem.
 *
 * El silencio se imprime como «sin revisar», no como un guion: un guion se
 * lee como «no aplica» y son cosas distintas ante un reclamo.
 */
function describe(
  kind: string,
  r: { readonly answer?: string; readonly level?: string; readonly depthMm?: number } | undefined,
): string {
  if (r === undefined) return 'Sin revisar';
  if (kind === 'nivel_combustible' && r.level !== undefined) {
    return FUEL_LABELS[r.level as keyof typeof FUEL_LABELS] ?? r.level;
  }
  if (kind === 'nivel_fluido' && r.level !== undefined) {
    return FLUID_LABELS[r.level as keyof typeof FLUID_LABELS] ?? r.level;
  }
  if (kind === 'profundidad' && r.depthMm !== undefined) {
    return `${r.depthMm} mm`;
  }
  if (r.answer === 'ok') return 'Conforme';
  if (r.answer === 'no_conforme') return 'No conforme';
  if (r.answer === 'no_aplica') return 'No aplica';
  return 'Sin revisar';
}
