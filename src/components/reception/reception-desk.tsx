'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CarFront, ChevronRight, Plus, Search, UserRound } from 'lucide-react';
import { AssetImage } from '@/components/ui/asset-image';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { NewCustomerModal } from '@/components/customers/new-customer-modal';
import { useToast } from '@/components/feedback/toast';
import type { DemoCustomer } from '@/features/customers/demo';
import {
  customerFromInput,
  newCustomerId,
  summarizeCreation,
} from '@/features/customers/services/create';
import {
  displayName,
  formatPhone,
  initialsOf,
  maskDocument,
} from '@/features/customers/services/identity';
import { useAllCustomers } from '@/features/customers/use-created';
import {
  formatPlate,
  isCompletePlate,
  lookupReception,
  searchState,
  type VehicleMatch,
} from '@/features/reception/services/intake';
import { formatNumber } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';
import { TodayIntakes } from './today-intakes';
import type { TodayIntake } from '@/features/reception/services/intake';
import { searchPeople } from '@/features/reception/services/people';

/**
 * La puerta del taller.
 *
 * Responde en este orden: qué vehículo está llegando, si ya lo conocemos, y
 * qué hacer ahora. Nada más. El formulario de siete pasos vive detrás y no
 * asoma hasta que alguien decide empezar.
 *
 * ── Por qué la placa manda ─────────────────────────────────────────────────
 *
 * Es el único dato que el asesor tiene SIEMPRE: está pintado en el vehículo
 * que tiene delante. El nombre puede no recordarlo y el documento está en la
 * guantera. Por eso la placa se lleva el campo grande y lo demás es
 * alternativa, no igual.
 *
 * ── Por qué hay un retardo antes de buscar ─────────────────────────────────
 *
 * Buscar a cada tecla haría aparecer y desaparecer resultados mientras se
 * escribe «ABC123», y eso enseña a no mirar lo que sale. Con 250 ms el
 * resultado aparece una vez, cuando el asesor ya dejó de teclear.
 *
 * Y mientras la búsqueda está en vuelo NO se dice «no encontrado»: ofrecer
 * «registrar vehículo» a medio escribir es exactamente como se crea un
 * duplicado de un vehículo que sí existía.
 */
export function ReceptionDesk({
  customers: seeded,
  intakes,
  corporateClients,
  now,
}: {
  readonly customers: readonly DemoCustomer[];
  readonly intakes: readonly TodayIntake[];
  readonly corporateClients: readonly string[];
  readonly now: Date;
}) {
  /* La misma cartera que ve el directorio, con lo creado en el navegador
     incluido: un cliente dado de alta aquí tiene que encontrarse aquí. */
  const { customers, add } = useAllCustomers(seeded);
  const [query, setQuery] = useState('');
  const [settled, setSettled] = useState('');
  const [modalCliente, setModalCliente] = useState(false);
  const toast = useToast();

  // El retardo: `settled` va por detrás de lo que se teclea.
  useEffect(() => {
    const id = setTimeout(() => setSettled(query), 250);
    return () => clearTimeout(id);
  }, [query]);

  /* Busca como la pantalla promete: placa primero, y también nombre,
     documento y teléfono. Ver `lookupReception`, que explica por qué. */
  const found = useMemo(() => lookupReception(customers, settled, searchPeople), [customers, settled]);
  const matches = found.vehicles;
  const people = found.people;

  const state = searchState({
    query,
    pending: query !== settled,
    matches: matches.length + people.length,
  });

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-fg lg:text-[1.75rem]">
            Recepción
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            Registra el ingreso del vehículo y comienza su atención.
          </p>
        </div>

        <Link
          href="/recepcion/nueva"
          className="inline-flex h-11 shrink-0 items-center gap-2 rounded-control bg-romero-500 px-4 text-sm font-semibold text-white transition-colors duration-150 hover:bg-romero-600 active:scale-[0.98]"
        >
          <Plus aria-hidden className="size-4" />
          Nueva recepción
        </Link>
      </header>

      <section className="rounded-panel border border-border bg-surface-raised px-5 py-6 sm:px-7 sm:py-8">
        <h2 className="font-display text-lg font-semibold tracking-tight text-fg">
          ¿Qué vehículo recibimos?
        </h2>
        <p className="mt-1 text-sm text-fg-muted">
          Escribe la placa. También sirve el nombre, el documento o el teléfono.
        </p>

        <div className="mt-4 max-w-xl">
          <label htmlFor="placa" className="sr-only">
            Buscar por placa
          </label>
          <Input
            id="placa"
            autoFocus
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            leading={<Search aria-hidden className="size-5" />}
            placeholder="ABC-123"
            className="h-14 text-lg font-semibold tracking-[0.08em]"
          />

          <p className="mt-2 min-h-5 text-xs" aria-live="polite">
            {state === 'corto' && (
              <span className="text-fg-subtle">Escribe al menos tres caracteres.</span>
            )}
            {state === 'buscando' && <span className="text-fg-subtle">Buscando…</span>}
            {state === 'encontrado' && (
              <span className="text-ok-700">{resumenHallazgo(matches.length, people.length)}</span>
            )}
          </p>
        </div>

        <div className="mt-4">
          {state === 'buscando' && (
            <div className="max-w-xl space-y-2" aria-hidden>
              <Skeleton className="h-20 w-full" />
            </div>
          )}

          {state === 'encontrado' && (
            <div className="space-y-4">
              {matches.length > 0 && (
                <ul className="grid gap-3 lg:grid-cols-2">
                  {matches.slice(0, 4).map((match) => (
                    <li key={match.vehicle.id}>
                      <VehicleCard match={match} />
                    </li>
                  ))}
                </ul>
              )}

              {/* Las personas van DEBAJO y nunca por encima de una placa que
                  casa: la placa es el único dato que el asesor tiene siempre
                  —está pintado en el vehículo que tiene delante—. */}
              {people.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-fg-subtle">
                    {matches.length > 0 ? 'También coinciden estos clientes' : 'Clientes que coinciden'}
                  </p>
                  <ul className="mt-2 grid gap-2 lg:grid-cols-2">
                    {people.slice(0, 4).map((customer) => (
                      <li key={customer.id}>
                        <PersonCard customer={customer} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {state === 'sin_resultados' && (
            <div className="max-w-xl rounded-panel border border-dashed border-border-strong bg-surface-sunken px-5 py-6 text-center">
              <p className="font-display text-base font-semibold text-fg">
                No encontramos la placa {formatPlate(query)}
              </p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-fg-muted">
                {isCompletePlate(query)
                  ? 'Puedes registrar el vehículo y seguir con la recepción sin salir de aquí.'
                  : 'Revisa la placa; si es un vehículo nuevo, regístralo y sigue.'}
              </p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Link
                  href={`/recepcion/nueva?placa=${encodeURIComponent(formatPlate(query))}`}
                  className="inline-flex h-11 items-center gap-2 rounded-control bg-romero-500 px-4 text-sm font-semibold text-white transition-colors duration-150 hover:bg-romero-600"
                >
                  <CarFront aria-hidden className="size-4" />
                  Registrar vehículo
                </Link>
                <button
                  type="button"
                  onClick={() => setModalCliente(true)}
                  className="inline-flex h-11 items-center gap-2 rounded-control border border-border px-4 text-sm font-medium text-fg transition-colors duration-150 hover:bg-surface-sunken"
                >
                  <UserRound aria-hidden className="size-4" />
                  Registrar cliente
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      <TodayIntakes intakes={intakes} now={now} />

      <NewCustomerModal
        open={modalCliente}
        onClose={() => setModalCliente(false)}
        customers={customers}
        corporateClients={corporateClients}
        now={now}
        onCreate={(draft) => {
          /*
           * FASE 3: aquí va la Server Action que inserta con RLS y deja
           * rastro en la auditoría. Mientras tanto se guarda en el navegador,
           * igual que el checklist, la autorización y la entrega.
           *
           * El aviso enumera lo que quedó guardado —cliente, empresa,
           * vehículo, licencia— porque el alta ya son hasta cuatro cosas y no
           * una: quien se saltó un paso tiene que verlo aquí y no descubrirlo
           * mañana al abrir la ficha.
           */
          const cliente = customerFromInput(draft, newCustomerId(Date.now()));
          add(cliente);
          toast(
            `${summarizeCreation(draft, displayName(cliente), draft.corporateClientIsNew)} Todo queda en este navegador hasta que haya base de datos.`,
            'ok',
          );
        }}
      />
    </>
  );
}

/**
 * La ficha del vehículo encontrado.
 *
 * Lo justo para reconocerlo y decidir: el vehículo, quién lo trae, cuándo vino
 * la última vez. La ficha completa del cliente está a un clic y no se carga
 * aquí; quien está recibiendo no necesita su dirección para abrir la orden.
 */
function VehicleCard({ match }: { readonly match: VehicleMatch }) {
  const { vehicle, customer } = match;
  const full = `${vehicle.brand} ${vehicle.model}`;
  const nombre = displayName(customer);

  return (
    <article
      className={cn(
        'flex h-full flex-col rounded-panel border bg-surface-raised p-4',
        match.exact ? 'border-ok-500/40 ring-1 ring-ok-500/20' : 'border-border',
      )}
    >
      <div className="flex items-start gap-3">
        <AssetImage
          alt={full}
          subject={full}
          equipmentKind={vehicle.equipmentKind}
          fit="cover"
          rounded="control"
          className="h-14 w-20 shrink-0"
        />

        <div className="min-w-0 flex-1">
          <p className="font-mono text-sm font-bold tracking-[0.06em] text-fg">
            {formatPlate(vehicle.plate)}
          </p>
          <p className="truncate text-sm font-semibold text-fg">{full}</p>
          <p className="mt-0.5 truncate text-xs text-fg-muted">
            <span data-numeric>{vehicle.modelYear}</span> · {vehicle.color} ·{' '}
            <span data-numeric>
              {formatNumber(vehicle.mileage)} {vehicle.equipmentKind === 'maquinaria' ? 'h' : 'km'}
            </span>
          </p>
        </div>
      </div>

      <dl className="mt-4 grid gap-x-4 gap-y-2 border-t border-border pt-3 text-xs sm:grid-cols-2">
        <div className="min-w-0">
          <dt className="uppercase tracking-wide text-fg-subtle">Cliente</dt>
          <dd className="mt-0.5 truncate font-medium text-fg">{nombre}</dd>
          <dd className="truncate text-fg-muted">
            {customer.phone === null ? (
              <span data-numeric>{maskDocument(customer.documentType, customer.documentLast)}</span>
            ) : (
              <span data-numeric>{formatPhone(customer.phone)}</span>
            )}
          </dd>
        </div>

        <div className="min-w-0">
          <dt className="uppercase tracking-wide text-fg-subtle">
            {customer.corporateClient === null ? 'Última visita' : 'Empresa'}
          </dt>
          <dd className="mt-0.5 truncate font-medium text-fg">
            {customer.corporateClient ??
              (customer.lastVisitDaysAgo === null
                ? 'Primera vez'
                : customer.lastVisitDaysAgo === 0
                  ? 'Hoy'
                  : `Hace ${String(customer.lastVisitDaysAgo)} días`)}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex flex-wrap gap-2">
        {vehicle.openOrderId === null ? (
          <Link
            href={`/recepcion/nueva?placa=${encodeURIComponent(formatPlate(vehicle.plate))}`}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-control bg-romero-500 px-4 text-sm font-semibold text-white transition-colors duration-150 hover:bg-romero-600"
          >
            Iniciar recepción
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        ) : (
          // Un vehículo con orden abierta NO se vuelve a recibir: se sigue.
          // Ofrecer «iniciar recepción» aquí crea una segunda orden del mismo
          // vehículo, y a partir de ahí dos verdades sobre el mismo coche.
          <Link
            href={`/ordenes/${vehicle.openOrderId}`}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-control border border-warn-500/40 bg-warn-100 px-4 text-sm font-semibold text-warn-700 transition-colors duration-150 hover:bg-warn-100/70"
          >
            Ya está en el taller · Ver orden
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        )}

        <Link
          href={`/clientes/${customer.id}`}
          className="inline-flex h-11 shrink-0 items-center rounded-control border border-border px-4 text-sm font-medium text-fg transition-colors duration-150 hover:bg-surface-sunken"
        >
          Historial
        </Link>
      </div>
    </article>
  );
}

/**
 * Cuántas cosas salieron, en una frase.
 *
 * Decir «3 vehículos encontrados» cuando dos de los tres son personas hace
 * que el asesor busque un coche que no está en la lista.
 */
function resumenHallazgo(vehiculos: number, personas: number): string {
  const partes: string[] = [];
  if (vehiculos > 0) {
    partes.push(vehiculos === 1 ? 'Un vehículo' : `${String(vehiculos)} vehículos`);
  }
  if (personas > 0) {
    partes.push(personas === 1 ? 'un cliente' : `${String(personas)} clientes`);
  }
  const frase = partes.join(' y ');
  return vehiculos + personas === 1 ? `${frase} encontrado` : `${frase} encontrados`;
}

/**
 * Un cliente que casó por nombre, documento o teléfono.
 *
 * Enseña si tiene vehículos y cuántos, porque eso decide el siguiente paso:
 * con vehículo se abre su ficha y se elige cuál llega; sin ninguno, lo que
 * toca es registrarle uno, y el enlace lleva justo ahí.
 */
function PersonCard({ customer }: { readonly customer: DemoCustomer }) {
  const nombre = displayName(customer);
  const sinVehiculos = customer.vehicles.length === 0;

  return (
    <Link
      href={`/clientes/${customer.id}`}
      className="flex items-center gap-3 rounded-panel border border-border bg-surface-raised px-4 py-3 transition-shadow duration-150 hover:shadow-panel"
    >
      <span
        aria-hidden
        className="grid size-10 shrink-0 place-items-center rounded-full bg-graphite-100 text-xs font-semibold text-graphite-700"
      >
        {initialsOf(nombre)}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold text-fg">{nombre}</span>
        <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-fg-muted">
          <span data-numeric>{maskDocument(customer.documentType, customer.documentLast)}</span>
          {customer.phone !== null && <span data-numeric>{formatPhone(customer.phone)}</span>}
          <span className={sinVehiculos ? 'text-warn-700' : undefined}>
            {sinVehiculos
              ? 'Sin vehículos · regístrale uno'
              : customer.vehicles.length === 1
                ? customer.vehicles[0]?.plate
                : `${String(customer.vehicles.length)} vehículos`}
          </span>
        </span>
      </span>

      <ChevronRight aria-hidden className="size-4 shrink-0 text-fg-subtle" />
    </Link>
  );
}
