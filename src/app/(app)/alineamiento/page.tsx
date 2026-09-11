import type { Metadata } from 'next';
import { PhasePlaceholder } from '@/components/layout/phase-placeholder';

export const metadata: Metadata = { title: 'Alineamiento' };

export default function Page() {
  return (
    <PhasePlaceholder
      title="Alineamiento"
      description="Registro de inicio y fin del alineamiento."
      phase={13}
      delivers={[
          'Cola de vehículos pendientes de alineamiento',
          'Marcas de inicio y fin con responsable',
          'Encadenamiento automático con la siguiente etapa configurada',
      ]}
    />
  );
}
