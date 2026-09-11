import type { Metadata } from 'next';
import { PhasePlaceholder } from '@/components/layout/phase-placeholder';

export const metadata: Metadata = { title: 'Auditoría' };

export default function Page() {
  return (
    <PhasePlaceholder
      title="Auditoría"
      description="Toda acción sensible queda registrada: quién, qué, antes, después, cuándo y desde dónde."
      phase={16}
      delivers={[
        'Filtros por usuario, entidad, acción, orden y rango de fechas',
        'Diferencia legible entre el antes y el después, no JSON crudo',
        'Registro de cada revelación de documento de identidad',
        'La tabla solo admite inserción: ni el super administrador puede editarla',
      ]}
    />
  );
}
