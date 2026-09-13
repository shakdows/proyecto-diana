'use client';

import { useMemo, useState } from 'react';
import { Building2, ChevronRight, Search, Sparkles, UserRound } from 'lucide-react';
import { Input } from '@/components/ui/input';
import type { DemoCustomer, DemoVehicle } from '@/features/customers/demo';
import { toSearchable } from '@/features/customers/demo';
import {
  displayName,
  formatPhone,
  initialsOf,
  maskDocument,
} from '@/features/customers/services/identity';
import { newCustomerLabel, newestFirst } from '@/features/customers/services/recency';
import {
  FILTER_LABELS,
  applyFilter,
  countByKind,
  searchCustomers,
  type DirectoryFilter,
} from '@/features/customers/services/search';
import { formatPlate } from '@/features/vehicles/services/vehicle';
import { cn } from '@/lib/utils/cn';

const FILTROS: readonly DirectoryFilter[] = ['todos', 'personas', 'empresas'];

/**
 * Elegir al cliente cuando no se sabe la placa.
 *
 * ── Por qué hace falta ─────────────────────────────────────────────────────
 *
 * La placa manda en la recepción porque está pintada en el coche que el
 * asesor tiene delante. Pero hay dos casos en que no la tiene:
 *
 *   · El cliente llama para anunciar que va a traerlo.
 *   · Acaba de darlo de alta y todavía no la ha tecleado en ningún sitio.
 *
 * Sin una salida para esos dos, lo que hace el asesor es lo único que la
 * pantalla le ofrece: registrar un cliente que ya existe.
 *
 * ── Por qué los recién creados van marcados y arriba ───────────────────────
 *
 * Porque quien da de alta a alguien y al minuto abre una recepción está
 * buscando A ESE, y en una lista alfabética queda perdido entre dos que no
 * le interesan. El distintivo caduca a los dos días: si no caducara, a los
 * tres meses media cartera sería «nueva» y la etiqueta sería ruido.
 *
 * ── Por qué el vehículo se elige aparte ────────────────────────────────────
 *
 * Una empresa con flota tiene veinte. Cargar «el primero» sería adivinar, y
 * adivinar mal aquí significa abrir la orden del camión equivocado.
 */
export function CustomerPicker({
  customers,
  now,
  onPick,
}: {
  readonly customers: readonly DemoCustomer[];
  readonly now: Date;
  readonly onPick: (customer: DemoCustomer, vehicle: DemoVehicle) => void;
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<DirectoryFilter>('todos');
  /** El cliente abierto para elegir cuál de sus vehículos llega. */
  const [abierto, setAbierto] = useState<string | null>(null);

  const counts = useMemo(() => countByKind(customers), [customers]);

  const results = useMemo(() => {
    const porId = new Map(customers.map((c) => [c.id, c]));
    const base =
      query.trim() === ''
        ? customers
        : searchCustomers(customers.map(toSearchable), query)
            .map((s) => porId.get(s.id))
            .filter((c): c is DemoCustomer => c !== undefined);

    const filtrados = applyFilter(base, filter);
    /* Sin búsqueda manda la novedad; con búsqueda manda la relevancia, que ya
       viene ordenada por `searchCustomers` y no se debe pisar. */
    return query.trim() === '' ? newestFirst(filtrados, now, displayName) : filtrados;
  }, [customers, query, filter, now]);

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="buscar-cliente-recepcion" className="sr-only">
          Buscar cliente por nombre, documento o empresa
        </label>
        <Input
          id="buscar-cliente-recepcion"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          leading={<Search aria-hidden className="size-[1.125rem]" />}
          placeholder="Nombre, DNI/RUC, empresa o teléfono…"
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
            {results.length === 0
              ? 'Ninguno coincide'
              : `${String(results.length)} ${results.length === 1 ? 'cliente' : 'clientes'}`}
          </p>
        </div>
      </div>

      {results.length === 0 ? (
        <p className="rounded-panel border border-dashed border-border-strong bg-surface-sunken px-4 py-6 text-center text-sm text-fg-muted">
          Nadie coincide con «{query}». Si es su primera vez, regístralo como cliente nuevo.
        </p>
      ) : (
        <ul className="max-h-[26rem] space-y-2 overflow-y-auto pr-1">
          {results.slice(0, 40).map((customer) => (
            <li key={customer.id}>
              <CustomerRow
                customer={customer}
                now={now}
                expanded={abierto === customer.id}
                onToggle={() =>
                  setAbierto((prev) => (prev === customer.id ? null : customer.id))
                }
                onPick={onPick}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CustomerRow({
  customer,
  now,
  expanded,
  onToggle,
  onPick,
}: {
  readonly customer: DemoCustomer;
  readonly now: Date;
  readonly expanded: boolean;
  readonly onToggle: () => void;
  readonly onPick: (customer: DemoCustomer, vehicle: DemoVehicle) => void;
}) {
  const nombre = displayName(customer);
  const empresa = customer.kind === 'empresa';
  const nuevo = newCustomerLabel(customer, now);
  const único = customer.vehicles.length === 1 ? customer.vehicles[0] : undefined;
  const sinVehiculos = customer.vehicles.length === 0;

  /* Con un solo vehículo no hay nada que elegir: pulsar la fila lo carga. Con
     varios, se despliega la flota y se elige cuál llegó. */
  const alPulsar = (): void => {
    if (único !== undefined) onPick(customer, único);
    else if (!sinVehiculos) onToggle();
  };

  return (
    <div
      className={cn(
        'rounded-panel border bg-surface-raised transition-colors duration-150',
        expanded ? 'border-brand-600/40' : 'border-border',
      )}
    >
      <button
        type="button"
        onClick={alPulsar}
        disabled={sinVehiculos}
        className={cn(
          'flex w-full items-center gap-3 px-4 py-3 text-left',
          sinVehiculos ? 'cursor-not-allowed opacity-70' : 'hover:bg-surface-sunken',
          'rounded-panel',
        )}
      >
        <span
          aria-hidden
          className={cn(
            'relative grid size-10 shrink-0 place-items-center rounded-full text-xs font-semibold',
            empresa ? 'bg-graphite-100 text-graphite-700' : 'bg-romero-500/10 text-romero-600',
          )}
        >
          {initialsOf(nombre)}
          {/* El círculo del recién creado, encima de su propio avatar: es lo
              que hace que la fila salte a la vista sin leer nada. */}
          {nuevo !== null && (
            <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-brand-600 text-white ring-2 ring-surface-raised">
              <Sparkles className="size-2.5" />
            </span>
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate text-sm font-semibold text-fg">{nombre}</span>
            {nuevo !== null && (
              <span className="rounded-chip bg-brand-600/10 px-1.5 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-wide text-brand-700">
                {nuevo}
              </span>
            )}
            <span className="inline-flex items-center gap-1 text-[0.6875rem] uppercase tracking-wide text-fg-subtle">
              {empresa ? <Building2 className="size-3" /> : <UserRound className="size-3" />}
              {empresa ? 'Empresa' : 'Particular'}
            </span>
          </span>

          <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-fg-muted">
            <span data-numeric>{maskDocument(customer.documentType, customer.documentLast)}</span>
            {customer.phone !== null && <span data-numeric>{formatPhone(customer.phone)}</span>}
            {customer.corporateClient !== null && (
              <span className="rounded-chip bg-surface-sunken px-1.5 py-0.5">
                {customer.corporateClient}
              </span>
            )}
          </span>
        </span>

        <span className="shrink-0 text-right">
          {sinVehiculos ? (
            <span className="text-xs text-warn-700">Sin vehículos</span>
          ) : único !== undefined ? (
            <span className="flex items-center gap-2">
              <span className="rounded-chip border border-border-strong bg-surface px-1.5 py-0.5 font-mono text-xs font-bold tracking-[0.06em] text-fg">
                {formatPlate(único.plate)}
              </span>
              <ChevronRight aria-hidden className="size-4 text-fg-subtle" />
            </span>
          ) : (
            <span className="flex items-center gap-2 text-xs font-medium text-brand-700">
              {customer.vehicles.length} vehículos
              <ChevronRight
                aria-hidden
                className={cn(
                  'size-4 transition-transform duration-150',
                  expanded && 'rotate-90',
                )}
              />
            </span>
          )}
        </span>
      </button>

      {/* La flota. Una empresa con veinte camiones elige cuál llegó; cargar
          «el primero» sería adivinar, y adivinar mal aquí abre la orden del
          vehículo equivocado. */}
      {expanded && customer.vehicles.length > 1 && (
        <ul className="border-t border-border p-2">
          {customer.vehicles.map((v) => (
            <li key={v.id}>
              <button
                type="button"
                onClick={() => onPick(customer, v)}
                className="flex w-full items-center gap-3 rounded-control px-2.5 py-2 text-left hover:bg-surface-sunken"
              >
                <span className="rounded-chip border border-border-strong bg-surface px-1.5 py-0.5 font-mono text-xs font-bold tracking-[0.06em] text-fg">
                  {formatPlate(v.plate)}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-fg">
                  {v.brand} {v.model}
                </span>
                {v.openOrderId !== null && (
                  <span className="shrink-0 text-xs text-warn-700">Ya está en el taller</span>
                )}
                <ChevronRight aria-hidden className="size-4 shrink-0 text-fg-subtle" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
