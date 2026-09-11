import type { Metadata } from 'next';
import { PhasePlaceholder } from '@/components/layout/phase-placeholder';

export const metadata: Metadata = { title: 'Lavado' };

export default function Page() {
  return (
    <PhasePlaceholder
      title="Lavado"
      description="Registro de inicio y fin del lavado."
      phase={13}
      delivers={[
          'Cola de equipos pendientes de lavado',
          'Marcas de inicio y fin con responsable',
          'Encadenamiento automático con la siguiente etapa configurada',
      ]}
    />
  );
}
