import type { Metadata } from 'next';
import { PhasePlaceholder } from '@/components/layout/phase-placeholder';

export const metadata: Metadata = { title: 'Compras' };

export default function Page() {
  return (
    <PhasePlaceholder
      title="Compras"
      description="Solicitudes, cotizaciones de proveedores, órdenes de compra y recepciones."
      phase={11}
      delivers={[
          'Solicitudes nuevas y pendientes de cotización',
          'Comparación de proveedores por precio, plazo, garantía y forma de pago',
          'Selección por línea: se puede repartir el pedido entre proveedores',
          'Órdenes de compra y recepción parcial o total, con cobertura calculada',
          'Compras no autoriza su propio gasto: lo hace el asesor',
      ]}
    />
  );
}
