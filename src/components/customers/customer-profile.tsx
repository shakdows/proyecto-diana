import Link from 'next/link';
import { Car, FileText, Mail, MapPin, MessageCircle, Pencil, Phone, Plus } from 'lucide-react';
import type { ReactNode } from 'react';
import { AssetImage } from '@/components/ui/asset-image';
import { Tabs } from '@/components/ui/tabs';
import { EmptyState } from '@/components/feedback/states';
import type { DemoCustomer, DemoVehicle } from '@/features/customers/demo';
import {
  displayName,
  formatPhone,
  initialsOf,
  maskDocument,
} from '@/features/customers/services/identity';
import { formatNumber } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

/**
 * Ficha del cliente.
 *
 * La cabecera lleva lo que se necesita para ACTUAR —llamar, abrir una
 * recepción— y lo que identifica sin exponer: el documento enmascarado. Todo
 * lo demás está en pestañas, porque nadie viene a esta pantalla a leerlo todo:
 * viene a hacer una cosa concreta.
 *
 * El documento sale como •••••725 SIEMPRE. Ver el número completo exige un
 * permiso aparte y deja rastro en la auditoría; no es un detalle de pantalla,
 * es que la base tiene `REVOKE SELECT` sobre esa columna y la interfaz no
 * puede leerla aunque quiera.
 */
export function CustomerProfile({
  customer,
  onEdit,
  onAddVehicle,
}: {
  readonly customer: DemoCustomer;
  /* Opcionales: la ficha se puede pintar sin nada que tocar —un informe, una
     vista de solo lectura—, y entonces no aparecen los botones en vez de
     aparecer y no hacer nada. */
  readonly onEdit?: () => void;
  readonly onAddVehicle?: () => void;
}) {
  const name = displayName(customer);
  const empresa = customer.kind === 'empresa';
  const abiertas = customer.vehicles.filter((v) => v.openOrderId !== null);

  const PREFERENCIA = {
    whatsapp: { icon: <MessageCircle />, label: 'WhatsApp' },
    telefono: { icon: <Phone />, label: 'Llamada' },
    correo: { icon: <Mail />, label: 'Correo' },
  } as const;

  return (
    <>
      <header className="rounded-panel border border-border bg-surface-raised px-5 py-5">
        <div className="flex flex-wrap items-start gap-4">
          <span
            aria-hidden
            className={cn(
              'grid size-14 shrink-0 place-items-center rounded-full text-base font-semibold',
              empresa ? 'bg-graphite-100 text-graphite-700' : 'bg-romero-500/10 text-romero-600',
            )}
          >
            {initialsOf(name)}
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="font-display text-2xl font-semibold tracking-tight text-fg">{name}</h1>
              <span className="rounded-chip bg-ok-100 px-2 py-0.5 text-xs font-medium text-ok-700">
                Cliente activo
              </span>
            </div>

            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-fg-muted">
              <span data-numeric>
                {customer.documentType} {maskDocument(customer.documentType, customer.documentLast)}
              </span>
              {customer.corporateClient !== null && (
                <span className="rounded-chip bg-surface-sunken px-2 py-0.5 text-xs">
                  {customer.corporateClient}
                </span>
              )}
              <span>{empresa ? 'Empresa' : 'Cliente particular'}</span>
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap gap-2">
            {onEdit !== undefined && (
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex h-11 items-center gap-2 rounded-control border border-border px-4 text-sm font-medium text-fg transition-colors duration-150 hover:bg-surface-sunken"
              >
                <Pencil aria-hidden className="size-4" />
                Editar
              </button>
            )}
            <Link
              href="/recepcion/nueva"
              className="inline-flex h-11 items-center gap-2 rounded-control bg-romero-500 px-4 text-sm font-semibold text-white transition-colors duration-150 hover:bg-romero-600"
            >
              <Plus aria-hidden className="size-4" />
              Nueva recepción
            </Link>
            {customer.phone !== null && (
              <a
                href={`tel:${customer.phone.replace(/\s/gu, '')}`}
                className="inline-flex h-11 items-center gap-2 rounded-control border border-border px-4 text-sm font-medium text-fg transition-colors duration-150 hover:bg-surface-sunken"
              >
                <Phone aria-hidden className="size-4" />
                Contactar
              </a>
            )}
          </div>
        </div>
      </header>

      <Tabs
        items={[
          {
            id: 'resumen',
            label: 'Resumen',
            content: (
              <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                <Dato label="Teléfono">
                  {customer.phone === null ? (
                    <Falta />
                  ) : (
                    <span data-numeric>{formatPhone(customer.phone)}</span>
                  )}
                </Dato>
                <Dato label="Teléfono alternativo">
                  {customer.altPhone === null ? (
                    <Falta />
                  ) : (
                    <span data-numeric>{formatPhone(customer.altPhone)}</span>
                  )}
                </Dato>
                <Dato label="Correo">
                  {customer.email === null ? <Falta /> : customer.email}
                </Dato>
                <Dato label="Dirección">
                  {customer.address === null ? (
                    <Falta />
                  ) : (
                    <span className="flex items-start gap-1.5">
                      <MapPin aria-hidden className="mt-0.5 size-3.5 shrink-0 text-fg-subtle" />
                      {customer.address}
                    </span>
                  )}
                </Dato>
                <Dato label="Prefiere que le escriban por">
                  <span className="flex items-center gap-1.5">
                    <span aria-hidden className="[&>svg]:size-3.5">
                      {PREFERENCIA[customer.contactPreference].icon}
                    </span>
                    {PREFERENCIA[customer.contactPreference].label}
                  </span>
                </Dato>
                <Dato label="Última visita">
                  {customer.lastVisitDaysAgo === null ? (
                    <Falta texto="Todavía ninguna" />
                  ) : customer.lastVisitDaysAgo === 0 ? (
                    <span className="text-ok-700">Hoy, en el taller</span>
                  ) : (
                    <>
                      Hace <span data-numeric>{customer.lastVisitDaysAgo}</span> días
                    </>
                  )}
                </Dato>
                <Dato label="Vehículos">
                  <span data-numeric>{customer.vehicles.length}</span>
                </Dato>
                <Dato label="Órdenes abiertas">
                  <span data-numeric>{abiertas.length}</span>
                </Dato>
              </dl>
            ),
          },
          {
            id: 'vehiculos',
            label: 'Vehículos',
            badge: customer.vehicles.length > 0 ? customer.vehicles.length : undefined,
            content:
              customer.vehicles.length === 0 ? (
                <EmptyState
                  title="Todavía no tiene vehículos"
                  hint="Se asocian al recibir el primero, o se registran desde aquí."
                  action={
                    onAddVehicle === undefined ? undefined : (
                      <AddVehicleButton onClick={onAddVehicle} />
                    )
                  }
                />
              ) : (
                <div className="space-y-3">
                  <ul className="grid gap-3 md:grid-cols-2">
                    {customer.vehicles.map((v) => (
                      <li key={v.id}>
                        <VehicleCard vehicle={v} />
                      </li>
                    ))}
                  </ul>
                  {onAddVehicle !== undefined && <AddVehicleButton onClick={onAddVehicle} />}
                </div>
              ),
          },
          {
            id: 'ordenes',
            label: 'Órdenes',
            badge: abiertas.length > 0 ? abiertas.length : undefined,
            content:
              abiertas.length === 0 ? (
                <EmptyState
                  title="No tiene órdenes abiertas"
                  hint="Las cerradas aparecerán aquí cuando haya base de datos."
                />
              ) : (
                <ul className="grid gap-2">
                  {abiertas.map((v) => (
                    <li key={v.id}>
                      <Link
                        href={`/ordenes/${v.openOrderId ?? ''}`}
                        className="flex items-center gap-3 rounded-panel border border-border bg-surface-raised px-4 py-3 transition-shadow duration-150 hover:shadow-panel"
                      >
                        <FileText aria-hidden className="size-4 shrink-0 text-fg-subtle" />
                        <span className="min-w-0 flex-1 truncate text-sm text-fg">
                          {v.brand} {v.model} · {v.plate}
                        </span>
                        <span className="shrink-0 text-xs text-fg-muted">En el taller</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ),
          },
        ]}
      />
    </>
  );
}

function AddVehicleButton({ onClick }: { readonly onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-11 items-center gap-2 rounded-control border border-border-strong px-4 text-sm font-semibold text-fg transition-colors duration-150 hover:bg-surface-sunken"
    >
      <Plus aria-hidden className="size-4" />
      Registrar vehículo
    </button>
  );
}

function Dato({ label, children }: { readonly label: string; readonly children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-fg-subtle">{label}</dt>
      <dd className="mt-0.5 text-sm text-fg">{children}</dd>
    </div>
  );
}

/** Un hueco vacío no se deja en blanco: se dice que falta. */
function Falta({ texto = 'Sin registrar' }: { readonly texto?: string }) {
  return <span className="text-fg-subtle">{texto}</span>;
}

function VehicleCard({ vehicle }: { readonly vehicle: DemoVehicle }) {
  const full = `${vehicle.brand} ${vehicle.model}`;

  return (
    <div className="flex items-center gap-3 rounded-panel border border-border bg-surface-raised px-4 py-3.5">
      <AssetImage
        alt={full}
        subject={full}
        equipmentKind={vehicle.equipmentKind}
        fit="cover"
        rounded="control"
        className="h-12 w-16 shrink-0"
      />

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-fg">{full}</p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-fg-muted">
          <span className="rounded-chip border border-border-strong bg-surface px-1.5 py-0.5 font-mono font-bold tracking-[0.06em] text-fg">
            {vehicle.plate.replace(/^(.{3})(.*)$/u, '$1-$2')}
          </span>
          <span data-numeric>{vehicle.modelYear}</span>
          <span data-numeric>
            {formatNumber(vehicle.mileage)} {vehicle.equipmentKind === 'maquinaria' ? 'h' : 'km'}
          </span>
        </p>
      </div>

      {vehicle.openOrderId !== null && (
        <Link
          href={`/ordenes/${vehicle.openOrderId}`}
          className="shrink-0 rounded-control bg-surface-sunken px-2.5 py-1.5 text-xs font-medium text-fg-muted transition-colors duration-150 hover:bg-graphite-200 hover:text-fg"
        >
          <Car aria-hidden className="mr-1 inline size-3.5" />
          Ver orden
        </Link>
      )}
    </div>
  );
}
