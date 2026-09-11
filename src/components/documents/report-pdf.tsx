import { Document, Sheet, Text, View, styles, COLOR, Field } from './kit';
import { Path, Svg } from '@react-pdf/renderer';
import {
  band,
  donutArc,
  donutSegments,
  linear,
  linePath,
  zeroBasedDomain,
} from '@/features/analytics/services/scale';
import {
  breakdownBy,
  computeKpis,
  dailySeries,
  deltaOf,
  npsMix,
  toSoles,
  type OrderRecord,
} from '@/features/analytics/services/metrics';
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils/format';

/**
 * Informe corporativo de satisfacción.
 *
 * Aquí se cobra la promesa que hizo `scale.ts`: los gráficos se dibujan con
 * las MISMAS funciones que la pantalla —`linear`, `band`, `donutSegments`—,
 * solo que sobre el `<Svg>` de react-pdf en vez del `<svg>` del navegador.
 * Recharts no podía hacerlo porque escribe en el DOM.
 *
 * Y las cifras salen de `computeKpis`, el mismo módulo del panel: el informe
 * que se manda al cliente corporativo no puede decir un NPS distinto del que
 * ve el analista en pantalla.
 */
export interface ReportDocData {
  readonly corporateClient: string;
  readonly from: Date;
  readonly to: Date;
  readonly current: readonly OrderRecord[];
  readonly previous: readonly OrderRecord[];
  readonly generatedBy: string;
  readonly generatedAt: Date;
}

export function ReportPdf({ data }: { readonly data: ReportDocData }) {
  const kpis = computeKpis(data.current);
  const before = computeKpis(data.previous);
  const mix = npsMix(data.current);
  const serie = dailySeries(data.current, data.from, data.to);
  const porServicio = breakdownBy(data.current, 'serviceType').slice(0, 6);

  return (
    <Document
      title={`Informe de satisfacción · ${data.corporateClient}`}
      author="Romero Motors"
      subject={`Periodo ${formatDate(data.from)} — ${formatDate(data.to)}`}
    >
      <Sheet
        title="INFORME DE SATISFACCIÓN"
        code={data.corporateClient}
        footerNote={`Generado por ${data.generatedBy} · ${formatDate(data.generatedAt)}`}
      >
        <View style={[styles.card, { marginBottom: 14 }]}>
          <View style={styles.row}>
            <Field label="Cuenta" value={data.corporateClient} width="34%" />
            <Field
              label="Periodo"
              value={`${formatDate(data.from)} — ${formatDate(data.to)}`}
              width="34%"
            />
            <Field label="Órdenes cerradas" value={formatNumber(kpis.orders)} width="32%" />
          </View>
        </View>

        <View style={[styles.row, { marginBottom: 14 }]}>
          <Kpi
            label="NPS"
            value={String(kpis.nps)}
            delta={deltaOf(kpis.nps, before.nps)}
            unit="pts"
          />
          <Kpi
            label="Entrega a tiempo"
            value={`${kpis.onTimePercent} %`}
            delta={deltaOf(kpis.onTimePercent, before.onTimePercent)}
            unit="pp"
          />
          <Kpi
            label="Ciclo medio"
            value={`${kpis.averageCycleHours} h`}
            delta={deltaOf(kpis.averageCycleHours, before.averageCycleHours)}
            unit="h"
            lowerIsBetter
          />
          <Kpi
            label="Facturación"
            value={formatCurrency(toSoles(kpis.revenueCents))}
            delta={deltaOf(toSoles(kpis.revenueCents), toSoles(before.revenueCents))}
            unit=""
            money
          />
        </View>

        <View style={styles.row}>
          <View style={{ width: '62%', marginRight: '3%' }}>
            <Text style={styles.h2}>Órdenes cerradas por día</Text>
            <View style={styles.card}>
              <LineChartPdf
                values={serie.map((p) => p.orders)}
                width={300}
                height={92}
              />
              <View style={[styles.between, { marginTop: 3 }]}>
                <Text style={styles.subtle}>{formatDate(data.from)}</Text>
                <Text style={styles.subtle}>{formatDate(data.to)}</Text>
              </View>
            </View>
          </View>

          <View style={{ width: '35%' }}>
            <Text style={styles.h2}>Composición del NPS</Text>
            <View style={styles.card}>
              <DonutPdf
                size={92}
                slices={[
                  { value: mix.promoters, color: COLOR.ok },
                  { value: mix.passives, color: '#94A3B8' },
                  { value: mix.detractors, color: COLOR.crit },
                  { value: mix.withoutResponse, color: '#E2E8F0' },
                ]}
              />
              <Legend color={COLOR.ok} label="Promotores" value={mix.promoters} />
              <Legend color="#94A3B8" label="Pasivos" value={mix.passives} />
              <Legend color={COLOR.crit} label="Detractores" value={mix.detractors} />
              <Legend color="#E2E8F0" label="Sin respuesta" value={mix.withoutResponse} />
              <Text style={[styles.subtle, { marginTop: 5 }]}>
                {kpis.npsResponses} respuestas · {kpis.responseRatePercent} % de respuesta
              </Text>
            </View>
          </View>
        </View>

        <Text style={styles.h2}>Por tipo de servicio</Text>
        <View style={styles.card}>
          <BarsPdf
            values={porServicio.map((s) => toSoles(s.revenueCents))}
            width={468}
            height={80}
          />
          <View style={[styles.trHead, { marginTop: 10 }]}>
            <Text style={[styles.th, { width: '40%' }]}>Servicio</Text>
            <Text style={[styles.th, { width: '15%', textAlign: 'right' }]}>Órdenes</Text>
            <Text style={[styles.th, { width: '20%', textAlign: 'right' }]}>Facturación</Text>
            <Text style={[styles.th, { width: '13%', textAlign: 'right' }]}>A tiempo</Text>
            <Text style={[styles.th, { width: '12%', textAlign: 'right' }]}>NPS</Text>
          </View>
          {porServicio.map((s) => (
            <View key={s.label} style={styles.tr} wrap={false}>
              <Text style={[styles.td, { width: '40%' }]}>{s.label}</Text>
              <Text style={[styles.td, { width: '15%', textAlign: 'right' }]}>
                {formatNumber(s.orders)}
              </Text>
              <Text style={[styles.td, { width: '20%', textAlign: 'right' }]}>
                {formatCurrency(toSoles(s.revenueCents))}
              </Text>
              <Text style={[styles.td, { width: '13%', textAlign: 'right' }]}>
                {s.onTimePercent} %
              </Text>
              <Text
                style={[
                  styles.td,
                  {
                    width: '12%',
                    textAlign: 'right',
                    color: s.nps >= 50 ? COLOR.ok : s.nps >= 0 ? COLOR.ink : COLOR.crit,
                  },
                ]}
              >
                {s.nps}
              </Text>
            </View>
          ))}
        </View>

        <Text style={[styles.subtle, { marginTop: 10 }]}>
          El NPS se calcula restando el porcentaje de detractores al de promotores sobre las
          encuestas respondidas, no promediando notas. Las órdenes sin respuesta no puntúan.
        </Text>
      </Sheet>
    </Document>
  );
}

/* ── Gráficos: misma geometría que la pantalla, distinto lienzo ───────────── */

function LineChartPdf({
  values,
  width,
  height,
}: {
  readonly values: readonly number[];
  readonly width: number;
  readonly height: number;
}) {
  if (values.length === 0) return <Text style={styles.subtle}>Sin datos en el periodo.</Text>;

  const pad = 4;
  const y = linear(zeroBasedDomain(values), [height - pad, pad]);
  const x = linear([0, Math.max(1, values.length - 1)], [pad, width - pad]);
  const d = linePath(values.map((v, i) => [x(i), y(v)] as const));

  return (
    <Svg width={width} height={height}>
      <Path d={d} stroke={COLOR.brand} strokeWidth={1.4} fill="none" />
    </Svg>
  );
}

function BarsPdf({
  values,
  width,
  height,
}: {
  readonly values: readonly number[];
  readonly width: number;
  readonly height: number;
}) {
  if (values.length === 0) return <Text style={styles.subtle}>Sin datos en el periodo.</Text>;

  const y = linear(zeroBasedDomain(values), [height, 0]);
  const x = band(values.length, [0, width], 0.4);
  const base = y(0);

  return (
    <Svg width={width} height={height}>
      {values.map((v, i) => (
        <Path
          key={i}
          d={rect(x(i), Math.min(y(v), base), x.bandwidth, Math.max(1, Math.abs(base - y(v))))}
          fill={COLOR.brand}
        />
      ))}
    </Svg>
  );
}

function DonutPdf({
  size,
  slices,
}: {
  readonly size: number;
  readonly slices: readonly { readonly value: number; readonly color: string }[];
}) {
  const segments = donutSegments(slices, (s) => s.value);
  if (segments.length === 0) return <Text style={styles.subtle}>Sin datos.</Text>;

  const c = size / 2;
  return (
    <Svg width={size} height={size} style={{ alignSelf: 'center' }}>
      {segments.map(({ item, startAngle, endAngle }, i) => (
        <Path
          key={i}
          d={donutArc(c, c, c - 2, (c - 2) * 0.6, startAngle, endAngle)}
          fill={item.color}
        />
      ))}
    </Svg>
  );
}

function rect(x: number, y: number, w: number, h: number): string {
  return `M${x},${y} L${x + w},${y} L${x + w},${y + h} L${x},${y + h} Z`;
}

function Legend({
  color,
  label,
  value,
}: {
  readonly color: string;
  readonly label: string;
  readonly value: number;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3 }}>
      <View
        style={{ width: 6, height: 6, backgroundColor: color, borderRadius: 1, marginRight: 5 }}
      />
      <Text style={[styles.td, { flexGrow: 1 }]}>{label}</Text>
      <Text style={styles.td}>{value}</Text>
    </View>
  );
}

function Kpi({
  label,
  value,
  delta,
  unit,
  lowerIsBetter = false,
  money = false,
}: {
  readonly label: string;
  readonly value: string;
  readonly delta: ReturnType<typeof deltaOf>;
  readonly unit: string;
  readonly lowerIsBetter?: boolean;
  readonly money?: boolean;
}) {
  const bueno =
    delta.direction === 'igual'
      ? null
      : lowerIsBetter
        ? delta.direction === 'baja'
        : delta.direction === 'sube';

  const cambio =
    delta.direction === 'igual'
      ? 'sin cambio'
      : `${delta.absolute > 0 ? '+' : ''}${money ? formatCurrency(delta.absolute) : `${delta.absolute} ${unit}`}`;

  return (
    <View
      style={{
        width: '23.5%',
        marginRight: '2%',
        borderWidth: 1,
        borderColor: COLOR.line,
        borderRadius: 4,
        padding: 8,
      }}
    >
      <Text style={styles.subtle}>{label}</Text>
      <Text style={{ fontSize: 15, fontFamily: 'Helvetica-Bold', marginTop: 2 }}>{value}</Text>
      <Text
        style={{
          fontSize: 7.5,
          marginTop: 2,
          color: bueno === null ? COLOR.subtle : bueno ? COLOR.ok : COLOR.crit,
        }}
      >
        {cambio}
      </Text>
    </View>
  );
}
