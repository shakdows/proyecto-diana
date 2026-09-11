import type { Metadata } from 'next';
import { PhasePlaceholder } from '@/components/layout/phase-placeholder';

export const metadata: Metadata = { title: 'Búsqueda universal' };

export default function Page() {
  return (
    <PhasePlaceholder
      title="Búsqueda universal"
      description="Placa, orden, DNI, cliente, teléfono, VIN, cotización u orden de compra."
      phase={4}
      delivers={[
          'Búsqueda por placa: comparación exacta contra índice único',
          'Búsqueda por documento mediante HMAC, sin leer nunca el número',
          'Búsqueda por nombre con índice de trigramas',
          'Ficha del vehículo con historial completo y recomendaciones rechazadas',
      ]}
    />
  );
}
