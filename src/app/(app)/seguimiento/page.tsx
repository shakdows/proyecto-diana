import type { Metadata } from 'next';
import { PhasePlaceholder } from '@/components/layout/phase-placeholder';

export const metadata: Metadata = { title: 'Seguimiento' };

export default function Page() {
  return (
    <PhasePlaceholder
      title="Seguimiento"
      description="Clientes cuya experiencia requiere una llamada."
      phase={15}
      delivers={[
          'Casos marcados automáticamente por umbral de satisfacción',
          'Asignación, resolución y cierre con registro de auditoría',
          'Cruce con la operación: qué ocurrió en la orden de ese cliente',
      ]}
    />
  );
}
