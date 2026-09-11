import type { Metadata } from 'next';
import { PhasePlaceholder } from '@/components/layout/phase-placeholder';

export const metadata: Metadata = { title: 'Encuestas' };

export default function Page() {
  return (
    <PhasePlaceholder
      title="Encuestas"
      description="Medición de satisfacción tras la entrega del vehículo."
      phase={15}
      delivers={[
          'Cuestionario leído de la versión vigente en base de datos',
          'CSAT, NPS e índice de satisfacción almacenados calculados',
          'Marcado automático de los casos que requieren seguimiento',
          'Encuesta enlazada a la orden entregada, o suelta por placa',
      ]}
    />
  );
}
