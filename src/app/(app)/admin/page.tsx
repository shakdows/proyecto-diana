import type { Metadata } from 'next';
import { PhasePlaceholder } from '@/components/layout/phase-placeholder';

export const metadata: Metadata = { title: 'Configuración' };

export default function Page() {
  return (
    <PhasePlaceholder
      title="Configuración"
      description="Catálogos, umbrales y reglas administrables sin desplegar."
      phase={3}
      delivers={[
          'Usuarios, roles y permisos efectivos',
          'Empresas, sedes, bahías y tipos de servicio',
          'Categorías e ítems del checklist, motivos de pausa, etapas finales',
          'Cuestionario de satisfacción y sus versiones',
          'Umbrales de satisfacción, pesos del avance y tolerancias del semáforo',
      ]}
    />
  );
}
