import type { Metadata } from 'next';
import { PhasePlaceholder } from '@/components/layout/phase-placeholder';

export const metadata: Metadata = { title: 'Panel' };

export default function Page() {
  return (
    <PhasePlaceholder
      title="Panel"
      description="Indicadores de satisfacción y operación, con filtros en la URL."
      phase={15}
      delivers={[
          'KPIs que reaccionan a periodo, empresa, sede, asesor, marca y modelo',
          'Doce visualizaciones y comparativa contra el periodo anterior',
          'Una sola función SQL de agregación, con RLS aplicada',
          'El enlace es compartible y el PDF se genera con el mismo estado',
      ]}
    />
  );
}
