import type { Metadata } from 'next';
import { CustomerDirectory } from '@/components/customers/customer-directory';
import { demoCorporateClients, demoCustomers } from '@/features/customers/demo';

export const metadata: Metadata = { title: 'Clientes' };

/* La cartera incluye a quien está hoy en el taller, y eso se calcula contra
   `now`: prerrenderizar dejaría la lista congelada en la hora de compilación. */
export const dynamic = 'force-dynamic';

export default function ClientesPage() {
  return (
    <CustomerDirectory
      customers={demoCustomers(new Date())}
      corporateClients={demoCorporateClients()}
    />
  );
}
