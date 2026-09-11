import type { Metadata } from 'next';
import { PhasePlaceholder } from '@/components/layout/phase-placeholder';

export const metadata: Metadata = { title: 'Vehículos' };

export default function Page() {
  return (
    <PhasePlaceholder
      title="Vehículos"
      description="Ficha e historial completo de cada vehículo."
      phase={4}
      delivers={[
          'Datos del vehículo y titular actual',
          'Órdenes anteriores, trabajos, repuestos instalados y evidencias',
          'Recomendaciones rechazadas en visitas previas',
          'Encuestas de satisfacción asociadas',
      ]}
    />
  );
}
