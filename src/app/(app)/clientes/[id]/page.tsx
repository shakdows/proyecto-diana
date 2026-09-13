import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { CustomerProfileScreen } from '@/components/customers/customer-profile-screen';
import { demoCorporateClients, demoCustomers, findDemoCustomer } from '@/features/customers/demo';
import { displayName } from '@/features/customers/services/identity';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  readonly params: Promise<{ readonly id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const customer = findDemoCustomer(id, new Date());
  return { title: customer === undefined ? 'Cliente' : displayName(customer) };
}

export default async function ClientePage({
  params,
}: {
  readonly params: Promise<{ readonly id: string }>;
}) {
  const { id } = await params;
  const now = new Date();

  /*
   * El servidor aporta la base y nada más. Encima de ella puede haber cosas
   * que solo el navegador sabe —un cliente creado durante la prueba, un
   * teléfono corregido, un vehículo registrado—, y eso lo resuelve la pantalla.
   * Antes esto era un `notFound()`, o sea: la fila recién creada llevaba a una
   * página de error.
   */
  return (
    <>
      <Link
        href="/clientes"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted transition-colors duration-150 hover:text-fg"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Clientes
      </Link>

      <CustomerProfileScreen
        id={id}
        seeded={findDemoCustomer(id, now)}
        seededAll={demoCustomers(now)}
        corporateClients={demoCorporateClients()}
        now={now}
      />
    </>
  );
}
