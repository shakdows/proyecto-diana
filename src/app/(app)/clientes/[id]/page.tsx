import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
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
  if (customer === undefined) notFound();

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
