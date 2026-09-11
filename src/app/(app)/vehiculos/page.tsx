import type { Metadata } from 'next';
import { PhasePlaceholder } from '@/components/layout/phase-placeholder';

export const metadata: Metadata = { title: 'Equipos' };

export default function Page() {
  return (
    <PhasePlaceholder
      title="Equipos"
      description="Ficha e historial completo de cada equipo, con su horómetro."
      phase={4}
      delivers={[
          'Datos del equipo y titular actual',
          'Órdenes anteriores, trabajos, repuestos instalados y evidencias',
          'Recomendaciones rechazadas en visitas previas',
          'Encuestas de satisfacción asociadas',
      ]}
    />
  );
}
