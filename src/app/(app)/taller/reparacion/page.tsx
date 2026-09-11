import type { Metadata } from 'next';
import { RepairBench } from '@/components/repair/repair-bench';
import type { JobStep } from '@/features/repairs/services/job-steps';
import { findDemoOrder } from '@/features/demo/board';

export const metadata: Metadata = { title: 'Reparación' };
export const dynamic = 'force-dynamic';

/*
 * Los pasos salen de `repair_job_items` en la Fase 12. Son los del trabajo
 * que el cliente autorizó como crítico, para que la bahía cuente la misma
 * historia que el diagnóstico y la cotización.
 */
const DEMO_STEPS: readonly JobStep[] = [
  { id: 's1', label: 'Desmontaje de ruedas', state: 'hecho' },
  { id: 's2', label: 'Retiro de pastillas usadas', state: 'hecho' },
  { id: 's3', label: 'Instalación de pastillas nuevas', state: 'en_curso' },
  { id: 's4', label: 'Montaje de ruedas', state: 'pendiente' },
  { id: 's5', label: 'Prueba de frenado', state: 'pendiente' },
];

export default function ReparacionPage() {
  const row = findDemoOrder('os-154', new Date());
  if (row === undefined) return null;

  const { order } = row;

  return (
    <RepairBench
      vehicle={order.vehicle}
      plate={order.plate.replace(/^(.{3})(.*)$/u, '$1-$2')}
      orderCode={order.code}
      jobTitle="Cambio de pastillas delanteras"
      initialSteps={DEMO_STEPS}
      initialEffectiveSeconds={2 * 3600 + 14 * 60 + 38}
      estimatedSeconds={3 * 3600}
      initialEvidenceCount={2}
    />
  );
}
