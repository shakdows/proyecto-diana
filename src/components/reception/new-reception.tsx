'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  ArrowRight,
  Building2,
  Car,
  CircleCheckBig,
  Eye,
  Gauge,
  Hash,
  Mail,
  Palette,
  Phone,
  Search,
  User,
  UserPlus,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { AssetImage } from '@/components/ui/asset-image';
import { Button } from '@/components/ui/button';
import { CorporateBadge } from '@/components/ui/plate';
import { Field } from '@/components/ui/field';
import { IdentifierInput } from '@/components/ui/input';
import { ReceptionStepper } from './reception-stepper';
import {
  EMPTY_DRAFT,
  RECEPTION_STEPS,
  STEP_LABELS,
  progress,
  stepState,
  type ReceptionDraft,
} from '@/features/reception/services/steps';
import { formatNumber, maskDocument, normalizePlate } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

/** Ficha que se encuentra al buscar por placa. */
export interface KnownVehicle {
  readonly plate: string;
  readonly vehicle: string;
  readonly brand: string;
  readonly model: string;
  readonly modelYear: number;
  readonly usage: number;
  readonly usageUnit: string;
  readonly color: string;
  readonly customer: string;
  readonly corporateClient: string | null;
  readonly phone: string;
  readonly email: string;
  readonly docLast3: string;
}

const DRAFT_KEY = 'diana:recepcion-borrador';

/**
 * Nueva recepción — paso 1.
 *
 * El borrador se guarda en el navegador en cada cambio. No es un adorno: la
 * recepción se hace de pie en una tablet, con el cliente delante, y una
 * pantalla que se recarga y pierde la placa recién tecleada obliga a empezar
 * de nuevo delante de él.
 *
 * ⚠️ FASE 5 lo sustituye por un borrador en la base de datos con su
 * `service_order_id`. El almacenamiento local no sobrevive a cambiar de
 * dispositivo, y en un taller el asesor cambia de tablet.
 */
export function NewReception({ known }: { readonly known: readonly KnownVehicle[] }) {
  /*
   * Todo el estado del paso vive en UN objeto. No es preferencia de estilo:
   * la restauración del borrador tiene que dejar el formulario coherente de
   * una vez —placa, ficha encontrada y borrador van juntos—, y con cuatro
   * `useState` separados hay instantes en los que la pantalla muestra una
   * placa sin su vehículo.
   */
  const [state, setState] = useState<{
    draft: ReceptionDraft;
    query: string;
    found: KnownVehicle | null;
    searched: boolean;
    restored: boolean;
  }>({ draft: EMPTY_DRAFT, query: '', found: null, searched: false, restored: false });

  const [docVisible, setDocVisible] = useState(false);
  const { draft, query, found, searched } = state;

  /*
   * `localStorage` es un almacén del navegador: no existe al renderizar en el
   * servidor, así que leerlo durante el render daría un HTML distinto en cada
   * lado y React lo rechazaría. Hidratarlo en un efecto tras montar es el
   * camino correcto, y por eso se silencia aquí la regla: no es un `setState`
   * en cascada, es la única lectura posible de un dato que solo existe en el
   * cliente, y ocurre una sola vez.
   */
  useEffect(() => {
    let saved: { draft: ReceptionDraft; plate: string } | null = null;
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (raw !== null) saved = JSON.parse(raw) as { draft: ReceptionDraft; plate: string };
    } catch {
      /* Borrador ilegible: se empieza limpio, que es mejor que romper. */
    }

    const match =
      saved === null ? null : (known.find((k) => k.plate === normalizePlate(saved.plate)) ?? null);

    // eslint-disable-next-line react-hooks/set-state-in-effect -- hidratación de `localStorage`, que no existe en el servidor
    setState({
      draft: saved?.draft ?? EMPTY_DRAFT,
      query: saved?.plate ?? '',
      found: match,
      searched: match !== null,
      restored: true,
    });
  }, [known]);

  useEffect(() => {
    if (!state.restored) return;
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ draft, plate: query }));
    } catch {
      /* Sin almacenamiento se pierde al recargar; no es motivo para bloquear. */
    }
  }, [draft, query, state.restored]);

  const setQuery = (value: string): void => setState((s) => ({ ...s, query: value }));
  const setDraft = (update: (d: ReceptionDraft) => ReceptionDraft): void =>
    setState((s) => ({ ...s, draft: update(s.draft) }));

  const search = (): void => {
    setDocVisible(false);
    setState((s) => {
      const plate = normalizePlate(s.query);
      const match = known.find((k) => k.plate === plate) ?? null;
      return {
        ...s,
        found: match,
        searched: true,
        draft: { ...s.draft, plate, customerConfirmed: match !== null },
      };
    });
  };

  const p = progress(draft);

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-fg lg:text-[1.75rem]">
            Nueva recepción
          </h1>
          <p className="mt-1 text-sm text-fg-muted">Registra el ingreso del vehículo al taller.</p>
        </div>
        <p data-numeric className="text-sm text-fg-subtle">
          Paso {p.done + 1} de {p.total}
        </p>
      </header>

      <section className="rounded-panel border border-border bg-surface-raised px-5 py-5">
        <ReceptionStepper draft={draft} />
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="min-w-0 space-y-5">
          <section className="rounded-panel border border-border bg-surface-raised p-5 lg:p-6">
            <h2 className="font-display text-lg font-semibold tracking-tight text-fg">
              Buscar cliente por placa
            </h2>
            <p className="mt-1 text-sm text-fg-muted">
              Ingresa la placa para traer los datos del cliente y del vehículo.
            </p>

            <form
              className="mt-5 flex flex-wrap items-end gap-3"
              onSubmit={(e) => {
                e.preventDefault();
                search();
              }}
            >
              <Field label="Placa" className="min-w-0 flex-1 sm:max-w-xs">
                <IdentifierInput
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="ABC-123"
                  maxLength={10}
                />
              </Field>
              <Button type="submit" size="lg" className="h-14 px-6">
                <Search aria-hidden className="size-5" />
                Buscar
              </Button>
            </form>

            {searched && found !== null && (
              <p className="mt-5 flex items-start gap-3 rounded-control border border-ok-500/30 bg-ok-100 px-4 py-3">
                <CircleCheckBig aria-hidden className="mt-0.5 size-5 shrink-0 text-ok-600" />
                <span className="text-sm">
                  <span className="block font-semibold text-ok-700">
                    Cliente y vehículo encontrados
                  </span>
                  <span className="block text-ok-700/85">
                    Se cargaron los datos automáticamente.
                  </span>
                </span>
              </p>
            )}

            {searched && found === null && (
              <div className="mt-5 rounded-control border border-warn-500/30 bg-warn-100 px-4 py-3">
                <p className="text-sm font-semibold text-warn-700">
                  No encontramos esa placa
                </p>
                <p className="mt-0.5 text-sm text-warn-700/85">
                  Puede ser la primera visita del vehículo.
                </p>
                <Link
                  href="/clientes"
                  className="mt-2.5 inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:text-brand-800"
                >
                  <UserPlus aria-hidden className="size-4" />
                  Registrar cliente nuevo
                </Link>
              </div>
            )}
          </section>

          {found !== null && (
            <div className="grid gap-5 lg:grid-cols-2">
              <Card title="Cliente" icon={<User />}>
                <Row icon={<User />} label="Nombre" value={found.customer} />
                {/*
                  El documento sale ENMASCARADO y se revela a petición. Ver el
                  número entero es a veces necesario en recepción —hay que
                  identificar a quien firma—, pero enseñarlo siempre lo deja a
                  la vista de cualquiera que pase por delante de la tablet. En
                  la Fase 3 este botón llama a `reveal_document_number()`, que
                  exige permiso y deja registro en `audit_logs`.
                */}
                <Row
                  icon={<Hash />}
                  label="Documento"
                  value={
                    <span className="flex items-center gap-2">
                      <span data-numeric>
                        {docVisible ? `4380${found.docLast3}` : maskDocument(found.docLast3)}
                      </span>
                      <button
                        type="button"
                        onClick={() => setDocVisible((v) => !v)}
                        className="inline-flex items-center gap-1 rounded-chip px-1.5 py-0.5 text-xs font-medium text-brand-700 transition-colors hover:bg-brand-50"
                      >
                        <Eye aria-hidden className="size-3.5" />
                        {docVisible ? 'Ocultar' : 'Ver'}
                      </button>
                    </span>
                  }
                />
                <Row icon={<Phone />} label="Teléfono" value={found.phone} />
                <Row icon={<Mail />} label="Correo" value={found.email} />
                <Row
                  icon={<Building2 />}
                  label="Empresa"
                  value={
                    found.corporateClient === null ? (
                      <span className="text-fg-subtle">Cliente particular</span>
                    ) : (
                      <CorporateBadge name={found.corporateClient} />
                    )
                  }
                />
              </Card>

              <Card title="Vehículo" icon={<Car />}>
                <Row icon={<Car />} label="Marca" value={found.brand} />
                <Row icon={<Car />} label="Modelo" value={found.model} />
                <Row icon={<Hash />} label="Año" value={String(found.modelYear)} />
                <Row
                  icon={<Gauge />}
                  label="Kilometraje"
                  value={`${formatNumber(found.usage)} ${found.usageUnit}`}
                />
                <Row icon={<Palette />} label="Color" value={found.color} />
              </Card>

              <div className="lg:col-span-2">
                <section className="flex flex-wrap items-center gap-5 rounded-panel border border-border bg-surface-raised p-5">
                  <AssetImage
                    alt={found.vehicle}
                    subject={found.vehicle}
                    className="h-28 w-52 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="font-display text-xl font-semibold tracking-tight text-fg">
                      {found.vehicle}
                    </p>
                    <p data-numeric className="mt-0.5 text-sm text-fg-muted">
                      {found.modelYear} · {found.color}
                    </p>
                    <p className="mt-2 inline-flex rounded-control border border-border-strong bg-surface px-3 py-1.5 font-mono text-base font-bold tracking-[0.08em] text-fg">
                      {found.plate.replace(/^(.{3})(.*)$/u, '$1-$2')}
                    </p>
                  </div>
                </section>
              </div>
            </div>
          )}
        </div>

        <aside className="min-w-0">
          <section className="rounded-panel border border-border bg-surface-raised p-5">
            <h2 className="font-display text-base font-semibold tracking-tight text-fg">
              Resumen del proceso
            </h2>
            <p data-numeric className="mt-0.5 text-xs text-fg-subtle">
              {p.done} de {p.total} completados
            </p>

            <ol className="mt-4 space-y-1">
              {RECEPTION_STEPS.map((step, index) => {
                const state = stepState(draft, step);
                return (
                  <li
                    key={step}
                    className={cn(
                      'flex items-center gap-3 rounded-control px-2.5 py-2',
                      state === 'en_progreso' && 'bg-brand-50',
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        'grid size-6 shrink-0 place-items-center rounded-full text-[0.6875rem] font-semibold',
                        state === 'completado' && 'bg-brand-600 text-white',
                        state === 'en_progreso' && 'bg-brand-600 text-white',
                        state === 'pendiente' && 'border border-border bg-surface text-fg-subtle',
                      )}
                    >
                      {state === 'completado' ? '✓' : index + 1}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm text-fg">
                      {STEP_LABELS[step]}
                    </span>
                    <span
                      className={cn(
                        'shrink-0 text-xs',
                        state === 'en_progreso' ? 'font-medium text-brand-700' : 'text-fg-subtle',
                      )}
                    >
                      {state === 'completado'
                        ? 'Listo'
                        : state === 'en_progreso'
                          ? 'En progreso'
                          : 'Pendiente'}
                    </span>
                  </li>
                );
              })}
            </ol>

            <p className="mt-4 rounded-control bg-surface-sunken px-3 py-2.5 text-xs leading-relaxed text-fg-subtle">
              El borrador se guarda solo. Puedes cerrar y volver sin perder lo avanzado.
            </p>
          </section>
        </aside>
      </div>

      <section className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-end gap-3 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur lg:-mx-6 lg:px-6">
        <Link
          href="/tablero"
          className="inline-flex h-11 items-center rounded-control border border-border-strong bg-surface-raised px-4 text-sm font-medium text-fg transition-colors duration-150 hover:bg-surface-sunken"
        >
          Cancelar
        </Link>
        {found === null ? (
          <Button type="button" disabled title="Busca primero la placa del vehículo">
            Continuar
            <ArrowRight aria-hidden className="size-4" />
          </Button>
        ) : (
          <Link
            href="/recepcion/nueva/checklist"
            onClick={() => setDraft((d) => ({ ...d, vehicleConfirmed: true }))}
            className="inline-flex h-11 items-center gap-2 rounded-control bg-brand-600 px-4 text-sm font-medium text-white transition-colors duration-150 hover:bg-brand-700 active:scale-[0.98]"
          >
            Continuar
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        )}
      </section>
    </>
  );
}

function Card({
  title,
  icon,
  children,
}: {
  readonly title: string;
  readonly icon: ReactNode;
  readonly children: ReactNode;
}) {
  return (
    <section className="rounded-panel border border-border bg-surface-raised p-5">
      <h3 className="flex items-center gap-2 font-display text-base font-semibold tracking-tight text-fg">
        <span aria-hidden className="text-fg-subtle [&>svg]:size-[1.125rem]">{icon}</span>
        {title}
      </h3>
      <dl className="mt-4 space-y-3">{children}</dl>
    </section>
  );
}

function Row({
  icon,
  label,
  value,
}: {
  readonly icon: ReactNode;
  readonly label: string;
  readonly value: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <span aria-hidden className="mt-0.5 shrink-0 text-fg-subtle [&>svg]:size-4">
        {icon}
      </span>
      <dt className="w-24 shrink-0 text-fg-subtle">{label}</dt>
      <dd className="min-w-0 flex-1 text-fg">{value}</dd>
    </div>
  );
}
