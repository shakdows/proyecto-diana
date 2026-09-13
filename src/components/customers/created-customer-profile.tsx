'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { EmptyState } from '@/components/feedback/states';
import { Skeleton } from '@/components/ui/skeleton';
import { useCreatedCustomers } from '@/features/customers/use-created';
import { useHydrated } from '@/lib/demo/store';
import { CustomerProfile } from './customer-profile';

/**
 * La ficha de un cliente que solo existe en este navegador.
 *
 * El servidor no puede encontrarlo: mientras no haya base, los clientes
 * creados desde la pantalla viven en `localStorage`, y `localStorage` no
 * existe cuando se renderiza en el servidor. La página busca primero en el
 * catálogo sembrado y, si no está, deja que este componente mire aquí.
 *
 * Sin esto, la fila que acaba de aparecer en la lista lleva a un 404 —que es
 * la forma más rápida de convencer a alguien de que el alta tampoco funcionó—.
 */
export function CreatedCustomerProfile({ id }: { readonly id: string }) {
  const { created } = useCreatedCustomers();
  const hydrated = useHydrated();
  const customer = created.find((c) => c.id === id);

  /* Antes de hidratar no se sabe si existe: decirlo ya sería enseñar «no
     encontrado» durante un fotograma y el contenido justo después. */
  if (!hydrated) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (customer === undefined) {
    return (
      <div className="space-y-6">
        <Link
          href="/clientes"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted transition-colors duration-150 hover:text-fg"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Clientes
        </Link>
        <EmptyState
          title="Este cliente no está aquí"
          hint="Los clientes creados durante la prueba viven en el navegador donde se crearon. Si lo diste de alta en otro equipo —o usaste «Comenzar de nuevo»—, ya no está."
        />
      </div>
    );
  }

  return <CustomerProfile customer={customer} />;
}
