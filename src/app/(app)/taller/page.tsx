import type { Metadata } from 'next';
import { PhasePlaceholder } from '@/components/layout/phase-placeholder';

export const metadata: Metadata = { title: 'Mi bandeja' };

export default function Page() {
  return (
    <PhasePlaceholder
      title="Mi bandeja"
      description="Las órdenes asignadas a ti, clasificadas por lo que puedes hacer ahora."
      phase={12}
      delivers={[
          'Por diagnosticar · Esperando autorización · Esperando repuestos',
          'Listos para iniciar · En proceso · Pausados · Terminados hoy',
          'Cronómetro con marcas del servidor y pausas justificadas',
          'Optimizada para tablet y móvil, con objetivos táctiles grandes',
      ]}
      built={[
        {
          href: '/taller/diagnostico',
          label: 'Diagnóstico técnico',
          detail: 'Registrar hallazgos con evidencia y tiempo estimado.',
        },
        {
          href: '/taller/repuestos',
          label: 'Solicitud de repuestos',
          detail: 'Pedir las piezas de los trabajos que el cliente autorizó.',
        },
        {
          href: '/taller/reparacion',
          label: 'Reparación y cronómetro',
          detail: 'Cronómetro, pasos del trabajo y pausas con motivo.',
        },
      ]}
    />
  );
}
