'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Building2, ChevronRight, Plus, Search, UserRound } from 'lucide-react';
import { EmptyState } from '@/components/feedback/states';
import { Input } from '@/components/ui/input';
import { Plate } from '@/components/ui/plate';
import { useToast } from '@/components/feedback/toast';
import type { DemoCustomer } from '@/features/customers/demo';
import { toSearchable } from '@/features/customers/demo';
import {
  displayName,
  initialsOf,
  formatPhone,
  maskDocument,
} from '@/features/customers/services/identity';
import {
  FILTER_LABELS,
  applyFilter,
  countByKind,
  searchCustomers,
  type DirectoryFilter,
} from '@/features/customers/services/search';
import { cn } from '@/lib/utils/cn';
import { NewCustomerModal } from './new-customer-modal';

const FILTROS: readonly DirectoryFilter[] = ['todos', 'personas', 'empresas'];

/**
 * Directorio de clientes.
 *
 * Buscar primero, crear después. El orden importa: un taller con tres mil
 * clientes crea duplicados cuando la acción más visible es «nuevo» y la
 * búsqueda está escondida. Aquí el buscador ocupa el ancho y está antes que
 * todo lo demás.
 *
 * No hay tabla. Una tabla obliga a definir columnas para todos y a rellenarlas
 * aunque estén vacías; la fila enseña lo que ese cliente tiene —su empresa si
 * la hay, su vehículo si lo hay— y calla el resto. Lo demás vive en la ficha,
 * que está a un clic.
 */
export function CustomerDirectory({
  customers,
  corporateClients,
}: {
  readonly customers: readonly DemoCustomer[];
  readonly corporateClients: readonly string[];
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<DirectoryFilter>('todos');
  const [open, setOpen] = useState(false);
  const toast = useToast();

  const searchable = useMemo(() => customers.map(toSearchable), [customers]);
  const byId = useMemo(() => new Map(customers.map((c) => [c.id, c])), [customers]);

  /* Las cifras de las pestañas salen de la cartera ENTERA, no del resultado:
     dicen cuánta gente hay, no cuánta coincide con lo que se está tecleando.
     Recalcularlas con cada letra convertiría el dato en ruido. */
  const counts = useMemo(() => countByKind(customers), [customers]);

  const results = useMemo(() => {
    const found = searchCustomers(searchable, query)
      .map((s) => byId.get(s.id))
      .filter((c) => c !== undefined);
    return applyFilter(found, filter);
  }, [searchable, byId, query, filter]);

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
          placeholder="Buscar nombre, DNI/RUC, teléfono o placa…"
        />

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {FILTROS.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              aria-pressed={filter === f}
              className={cn(
                'inline-flex h-9 items-center gap-2 rounded-chip px-3 text-sm transition-colors duration-150',
                filter === f
                  ? 'bg-graphite-950 font-semibold text-white'
                  : 'bg-surface-sunken text-fg-muted hover:text-fg',
              )}
            >
              {FILTER_LABELS[f]}
              <span
                data-numeric
                className={cn('text-xs', filter === f ? 'text-white/70' : 'text-fg-subtle')}
              >
                {counts[f]}
              </span>
            </button>
          ))}

          <p className="ml-auto text-xs text-fg-subtle" aria-live="polite">
            {query.trim() === ''
              ? `${String(results.length)} en la lista`
              : results.length === 0
                ? 'Ninguno coincide'
                : `${String(results.length)} coinciden`}
          </p>
        </div>
      </div>

      {results.length === 0 ? (
        customers.length === 0 ? (
          <EmptyState
            title="No hay clientes registrados"
            hint="Registra el primero para comenzar."
          />
        ) : (
          <EmptyState
            title="No encontramos a nadie con eso"
            hint="Prueba con la placa del vehículo, o crea el cliente si es nuevo."
          />
        )
      ) : (
        <ul className="@container grid gap-2.5">
          {results.map((customer) => (
            <li key={customer.id}>
              <CustomerRow customer={customer} />
            </li>
          ))}
        </ul>
      )}

      <NewCustomerModal
        open={open}
        onClose={() => setOpen(false)}
        existing={searchable}
        corporateClients={corporateClients}
        onCreate={(draft) => {
          // FASE 3: aquí va la Server Action que inserta con RLS y deja
          // rastro en la auditoría. Hasta entonces no se finge que se guardó.
          //
          // La empresa nueva se nombra en el aviso a propósito: es lo que dice
          // que el alta son DOS cosas y no una, que es justo lo que habrá que
          // resolver en una transacción cuando haya base.
          toast(
            draft.corporateClientIsNew && draft.corporateClient !== null
              ? `Sin base de datos todavía: ni el cliente ni la empresa «${draft.corporateClient}» se guardaron.`
              : 'Sin base de datos todavía: el cliente no se guardó.',
            'info',
          );
        }}
      />
    </>
  );
}

/**
 * Una fila del directorio.
 *
 * Tres bloques y una flecha: quién es, con qué se le contacta, y qué tiene en
 * el taller. Nada más cabe sin que la fila deje de leerse de un vistazo, y
 * todo lo demás está en la ficha.
 *
 * El vehículo es el DE LA VISITA ABIERTA cuando la hay, y no «el primero de
 * la lista». Es lo que convierte la fila en útil: quien busca a María Quispe
 * casi siempre busca el coche que tiene aquí ahora mismo.
 */
function CustomerRow({ customer }: { readonly customer: DemoCustomer }) {
  const name = displayName(customer);
  const empresa = customer.kind === 'empresa';
  const enTaller = customer.vehicles.find((v) => v.openOrderId !== null);
  /* Una empresa con flota se describe por su tamaño; una persona, por su
     coche. «4 vehículos» no le dice nada a quien busca a Juan Pérez, y
     «Toyota Corolla» no le dice nada a quien gestiona una flota de cuarenta. */
  const único = !empresa && customer.vehicles.length === 1 ? customer.vehicles[0] : undefined;
  const vehículo = enTaller ?? único;

  return (
    <Link
      href={`/clientes/${customer.id}`}
      className={cn(
        'group flex items-center gap-4 rounded-panel border border-border bg-surface px-4 py-3.5',
        'transition-[transform,box-shadow,border-color] duration-150 ease-snap',
        'hover:-translate-y-px hover:border-border-strong hover:shadow-panel',
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

      <span className="grid min-w-0 flex-1 gap-x-6 gap-y-1 @2xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] @2xl:items-center">
        <span className="min-w-0">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="truncate text-sm font-semibold text-fg">{name}</span>
            <span className="flex items-center gap-1 text-[0.6875rem] uppercase tracking-wide text-fg-subtle">
              {empresa ? (
                <Building2 aria-hidden className="size-3" />
              ) : (
                <UserRound aria-hidden className="size-3" />
              )}
              {empresa ? 'Empresa' : 'Particular'}
            </span>
          </span>

          <span className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-fg-muted">
            <span data-numeric>{maskDocument(customer.documentType, customer.documentLast)}</span>
            {customer.phone !== null && <span data-numeric>{formatPhone(customer.phone)}</span>}
          </span>
        </span>

        <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-muted">
          {customer.corporateClient !== null && (
            <span className="rounded-chip bg-surface-sunken px-1.5 py-0.5">
              {customer.corporateClient}
            </span>
          )}
          {vehículo === undefined ? (
            <span className="truncate">
              {customer.vehicles.length === 0
                ? 'Sin vehículos'
                : `${String(customer.vehicles.length)} vehículos`}
            </span>
          ) : (
            <>
              <span className="truncate text-fg">
                {vehículo.brand} {vehículo.model}
              </span>
              <Plate value={vehículo.plate} size="sm" />
            </>
          )}
        </span>
      </span>

      <span className="hidden shrink-0 text-xs @xl:block">
        {enTaller !== undefined ? (
          <span className="rounded-chip bg-ok-100 px-2 py-1 font-medium text-ok-700">
            En el taller
          </span>
        ) : (
          <span className="text-fg-subtle">Ver ficha</span>
        )}
      </span>

      <ChevronRight
        aria-hidden
        className="size-4 shrink-0 text-fg-subtle transition-transform duration-150 group-hover:translate-x-0.5"
      />
    </Link>
  );
}
