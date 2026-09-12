import type { Metadata } from 'next';
import { DocumentCenter, type OrderChoice } from '@/components/reports/document-center';
import { demoCorporateClients } from '@/features/customers/demo';
import { demoBoard } from '@/features/demo/board';
import { visibleDocuments } from '@/features/reports/services/catalog';
import { getSessionUser } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'Informes' };

/* Las órdenes disponibles se calculan contra `now`. */
export const dynamic = 'force-dynamic';

export default async function InformesPage() {
  const user = await getSessionUser();

  const orders: readonly OrderChoice[] = demoBoard(new Date()).map(({ order }) => ({
    id: order.id,
    code: order.code,
    plate: order.plate,
    vehicle: order.vehicle,
    customer: order.customer,
  }));

  return (
    <DocumentCenter
      /* El filtro por permiso se hace EN EL SERVIDOR: así la lista de
         documentos que el usuario no puede pedir ni siquiera baja al
         navegador. La comprobación que manda sigue estando en la ruta que
         sirve el PDF. */
      documents={visibleDocuments(user.permissions)}
      orders={orders}
      corporateClients={demoCorporateClients()}
    />
  );
}
