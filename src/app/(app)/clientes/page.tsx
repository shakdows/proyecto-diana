import type { Metadata } from 'next';
import { PhasePlaceholder } from '@/components/layout/phase-placeholder';

export const metadata: Metadata = { title: 'Clientes' };

export default function Page() {
  return (
    <PhasePlaceholder
      title="Clientes"
      description="Personas y empresas, con el documento de identidad enmascarado."
      phase={4}
      delivers={[
          'Documento mostrado siempre como •••••123',
          'Ver el número completo exige permiso y queda auditado',
          'Vehículos asociados e historial de órdenes',
          'Pertenencia a cliente corporativo',
      ]}
    />
  );
}
