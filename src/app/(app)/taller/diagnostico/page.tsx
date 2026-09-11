import type { Metadata } from 'next';
import { TechnicalDiagnosis } from '@/components/diagnosis/technical-diagnosis';
import type { Finding } from '@/features/diagnosis/services/findings';
import { findDemoOrder } from '@/features/demo/board';
import { vocabularyFor } from '@/features/equipment/services/equipment-kind';

export const metadata: Metadata = { title: 'Diagnóstico técnico' };
export const dynamic = 'force-dynamic';

/*
 * FASE 6 lo lee de `diagnosis_items`. Los hallazgos de ejemplo son los que
 * justifican la cotización de la orden 154, para que el recorrido completo
 * —diagnóstico, cotización, autorización— cuente la misma historia.
 */
const DEMO_FINDINGS: readonly Finding[] = [
  {
    id: 'h1',
    system: 'frenos',
    title: 'Pastillas delanteras con desgaste',
    detail: 'Desgaste aproximado del 90 %. Se recomienda reemplazo antes de los próximos 500 km.',
    priority: 'critico',
    estimatedMinutes: 90,
    photoCount: 3,
    videoCount: 0,
  },
  {
    id: 'h2',
    system: 'suspension',
    title: 'Amortiguador delantero izquierdo',
    detail: 'Fuga de aceite visible en el vástago. Se recomienda reemplazo del par completo.',
    priority: 'alto',
    estimatedMinutes: 60,
    photoCount: 2,
    videoCount: 1,
  },
  {
    id: 'h3',
    system: 'motor',
    title: 'Filtro de aire en mal estado',
    detail: 'Filtro con suciedad acumulada. Cambio incluido en el mantenimiento preventivo.',
    priority: 'medio',
    estimatedMinutes: 30,
    photoCount: 1,
    videoCount: 0,
  },
  {
    id: 'h4',
    system: 'transmision',
    title: 'Revisión general de transmisión',
    detail: 'Sin observaciones críticas. Se recomienda mantenimiento preventivo en la próxima visita.',
    priority: 'recomendacion',
    estimatedMinutes: 45,
    photoCount: 0,
    videoCount: 0,
  },
];

export default function DiagnosticoPage() {
  const row = findDemoOrder('os-154', new Date());
  if (row === undefined) return null;

  const { order } = row;
  const vocab = vocabularyFor(order.equipmentKind);

  return (
    <TechnicalDiagnosis
      vehicle={order.vehicle}
      plate={order.plate.replace(/^(.{3})(.*)$/u, '$1-$2')}
      orderCode={order.code}
      customer={order.customer}
      usage={order.usage}
      usageUnit={vocab.usageUnit}
      initialFindings={DEMO_FINDINGS}
    />
  );
}
