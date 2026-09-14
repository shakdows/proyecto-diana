import type { Metadata } from 'next';
import { PageHeader } from '@/components/layout/page-header';
import { Panel, PanelHeader } from '@/components/ui/panel';
import { OrdersList } from '@/components/order/orders-list';
import { demoBoard } from '@/features/demo/board';

export const metadata: Metadata = { title: 'Órdenes de servicio' };

// Misma razón que en el tablero: los tiempos se calculan contra `now`.
export const dynamic = 'force-dynamic';

export default function OrdenesPage() {
  const rows = demoBoard(new Date());

  return (
    <>
      <PageHeader
        title="Órdenes de servicio"
        description="Todo el recorrido del vehículo queda registrado en una única orden."
      />

      <Panel>
        {/*
          El recuento vive en la lista y no aquí: las órdenes que abrió la
          recepción están en el navegador, y el servidor no las puede contar.
          Un «9 órdenes abiertas» impreso arriba mientras abajo se ven diez es
          justo la clase de detalle que hace desconfiar de todo lo demás.
        */}
        <PanelHeader
          title="Abiertas"
          description="Las recibidas en este dispositivo van primero."
        />
        <OrdersList seeded={rows} />
      </Panel>
    </>
  );
}
