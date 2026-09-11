import type { Metadata } from 'next';
import { PhasePlaceholder } from '@/components/layout/phase-placeholder';

export const metadata: Metadata = { title: 'Recepción' };

export default function Page() {
  return (
    <PhasePlaceholder
      title="Recepción"
      description="Recepción del vehículo, checklist digital, diagrama de daños y firmas."
      phase={5}
      delivers={[
          'Formulario de recepción optimizado para tablet',
          'Checklist por categorías, leído del catálogo administrable',
          'Niveles de combustible, aceite y refrigerante; cocada de los cinco neumáticos',
          'Documentos entregados y firma digital de cliente y asesor',
          'Generación automática de la orden de servicio',
      ]}
    />
  );
}
