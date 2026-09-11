import type { Metadata } from 'next';
import { PhasePlaceholder } from '@/components/layout/phase-placeholder';

export const metadata: Metadata = { title: 'Informes' };

export default function Page() {
  return (
    <PhasePlaceholder
      title="Informes"
      description="Documentos PDF y plantillas Excel."
      phase={16}
      delivers={[
          'Checklist, orden de servicio, diagnóstico, cotización y autorización',
          'Orden de compra, reporte de repuestos, reporte de trabajo y acta de entrega',
          'Informe corporativo de satisfacción, con gráficos vectoriales',
          'Plantillas Excel: checklist imprimible en A4 y carga masiva normalizada',
      ]}
    />
  );
}
