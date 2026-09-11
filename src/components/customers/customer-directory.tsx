'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Building2, Car, Plus, Search, UserRound } from 'lucide-react';
import { EmptyState } from '@/components/feedback/states';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/feedback/toast';
import type { DemoCustomer } from '@/features/customers/demo';
import { toSearchable } from '@/features/customers/demo';
import { displayName, initialsOf, formatPhone, maskDocument } from '@/features/customers/services/identity';
import { searchCustomers } from '@/features/customers/services/search';
import { cn } from '@/lib/utils/cn';
import { NewCustomerDrawer } from './new-customer-drawer';

/**
 * Directorio de clientes.
 *
 * Buscar primero, crear después. El orden importa: un taller con tres mil
 * clientes crea duplicados cuando la acción más visible es «nuevo» y la
 * búsqueda está escondida. Aquí el buscador ocupa el ancho y está enfocado
 * desde el primer momento.
 *
 * No hay tabla. Una tabla obliga a definir columnas para todos y a rellenarlas
 * aunque estén vacías; la tarjeta enseña lo que ese cliente tiene —su empresa
 * si la hay, sus vehículos si los hay— y calla el resto.
 */
export function CustomerDirectory({
  customers,
  corporateClients,
}: {
  readonly customers: readonly DemoCustomer[];
  readonly corporateClients: readonly string[];
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const toast = useToast();

  const searchable = useMemo(() => customers.map(toSearchable), [customers]);
  const byId = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);

  const results = useMemo(
    () => searchCustomers(searchable, query).map((s) => byId.get(s.id)).filter((c) => c !== undefined),
    [searchable, byId, query],
  );

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-fg lg:text-[1.75rem]">
            Clientes
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            Personas y empresas que confían sus vehículos a Romero Motors.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-control bg-romero-500 px-4 text-sm font-semibold text-white transition-colors duration-150 hover:bg-romero-600 active:scale-[0.98]"
        >
          <Plus aria-hidden className="size-4" />
          Nuevo cliente
        </button>
      </header>

      <div>
        <label htmlFor="buscar-cliente" className="sr-only">
          Buscar cliente
        </label>
        <Input
          id="buscar-cliente"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          leading={<Search aria-hidden className="size-[1.125rem]" />}
          placeholder="Buscar nombre, documento, teléfono, correo o placa…"
        />
        <p className="mt-1.5 text-xs text-fg-subtle" aria-live="polite">
          {query.trim() === ''
            ? `${String(customers.length)} clientes en la cartera`
            : results.length === 0
              ? 'Ninguno coincide'
              : `${String(results.length)} de ${String(customers.length)}`}
        </p>
      </div>

      {results.length === 0 ? (
        <EmptyState
          title="No encontramos a nadie con eso"
          hint="Prueba con la placa del vehículo, o crea el cliente si es nuevo."
        />
      ) : (
        <ul className="@container grid gap-3">
          {results.map((customer) => (
            <li key={customer.id}>
              <CustomerCard customer={customer} />
            </li>
          ))}
        </ul>
      )}

      <NewCustomerDrawer
        open={open}
        onClose={() => setOpen(false)}
        existing={searchable}
        corporateClients={corporateClients}
        onCreate={() => {
          // FASE 3: aquí va la Server Action que inserta con RLS y deja
          // rastro en la auditoría. Hasta entonces no se finge que se guardó.
          toast('Sin base de datos todavía: el cliente no se guardó.', 'info');
        }}
      />
    </>
  );
}

function CustomerCard({ customer }: { readonly customer: DemoCustomer }) {
  const name = displayName(customer);
  const empresa = customer.kind === 'empresa';

  return (
    <Link
      href={`/clientes/${customer.id}`}
      className={cn(
        'flex items-center gap-4 rounded-panel border border-border bg-surface-raised px-4 py-3.5',
        'transition-shadow duration-150 ease-snap hover:shadow-panel',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'grid size-11 shrink-0 place-items-center rounded-full text-sm font-semibold',
          empresa ? 'bg-graphite-100 text-graphite-700' : 'bg-romero-500/10 text-romero-600',
        )}
      >
        {initialsOf(name)}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline gap-x-2">
          <span className="truncate text-sm font-semibold text-fg">{name}</span>
          <span className="flex items-center gap-1 text-xs text-fg-subtle">
            {empresa ? (
              <Building2 aria-hidden className="size-3" />
            ) : (
              <UserRound aria-hidden className="size-3" />
            )}
            {empresa ? 'Empresa' : 'Particular'}
          </span>
        </span>

        <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-fg-muted">
          <span data-numeric>{maskDocument(customer.documentType, customer.documentLast)}</span>
          {customer.phone !== null && <span data-numeric>{formatPhone(customer.phone)}</span>}
          {customer.corporateClient !== null && (
            <span className="rounded-chip bg-surface-sunken px-1.5 py-0.5">
              {customer.corporateClient}
            </span>
          )}
        </span>
      </span>

      <span className="hidden shrink-0 items-center gap-1.5 text-xs text-fg-muted sm:flex">
        <Car aria-hidden className="size-3.5" />
        <span data-numeric>{customer.vehicles.length}</span>
      </span>

      <span className="hidden w-28 shrink-0 text-right text-xs text-fg-subtle md:block">
        {customer.lastVisitDaysAgo === null ? (
          'Sin visitas'
        ) : customer.lastVisitDaysAgo === 0 ? (
          <span className="text-ok-700">En el taller</span>
        ) : (
          <>
            Hace <span data-numeric>{customer.lastVisitDaysAgo}</span> días
          </>
        )}
      </span>
    </Link>
  );
}
