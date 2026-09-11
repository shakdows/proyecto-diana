import type { Metadata } from 'next';
import { PhasePlaceholder } from '@/components/layout/phase-placeholder';

export const metadata: Metadata = { title: 'Control de calidad' };

export default function Page() {
  return (
    <PhasePlaceholder
      title="Control de calidad"
      description="Verificación de los trabajos antes de liberar el equipo."
      phase={13}
      delivers={[
          'Checklist final configurable',
          'Rechazo con hallazgos, que devuelve la orden al técnico',
          'Reintentos numerados, con historial de cada ronda',
          'Evidencia fotográfica del control',
      ]}
    />
  );
}
