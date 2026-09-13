import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { CreatedCustomerProfile } from '@/components/customers/created-customer-profile';
import { CustomerProfile } from '@/components/customers/customer-profile';
import { findDemoCustomer } from '@/features/customers/demo';
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
  const customer = findDemoCustomer(id, new Date());

  /*
   * Un cliente creado durante la prueba no está en el catálogo sembrado: vive
   * en `localStorage`, que el servidor no puede leer. Antes esto era un 404, o
   * sea: la fila recién creada llevaba a una página de error, que es la forma
   * más rápida de convencer a alguien de que el alta tampoco funcionó.
   */
  if (customer === undefined) return <CreatedCustomerProfile id={id} />;

  return (
    <>
      <Link
        href="/clientes"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted transition-colors duration-150 hover:text-fg"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Clientes
      </Link>

      <CustomerProfile customer={customer} />
    </>
  );
}
