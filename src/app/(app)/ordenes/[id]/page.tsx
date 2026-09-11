import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Camera,
  Car,
  FileText,
  Gauge,
  Hash,
  Mail,
  MapPin,
  Palette,
  Phone,
  Plus,
  User,
  Wrench,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { AssetImage } from '@/components/ui/asset-image';
import { Button } from '@/components/ui/button';
import { CorporateBadge } from '@/components/ui/plate';
import { ProgressBar } from '@/components/ui/progress-bar';
import { StatusChip } from '@/components/ui/status-chip';
import { TrafficLightDot } from '@/components/ui/traffic-light';
import { OrderJourney } from '@/components/order/order-journey';
import { factsFor, findDemoOrder, quotationTotals } from '@/features/demo/board';
import { vocabularyFor } from '@/features/equipment/services/equipment-kind';
import { availableActions } from '@/features/orders/services/state-machine';
import { getSessionUser } from '@/lib/auth/session';
import { formatCurrency, formatDateTime, formatNumber, formatTime, maskDocument } from '@/lib/utils/format';

export const metadata: Metadata = { title: 'Orden de servicio' };

export default async function OrdenPage({
  params,
}: {
  readonly params: Promise<{ readonly id: string }>;
}) {
  const { id } = await params;
  const now = new Date();
  const row = findDemoOrder(id, now);
  if (row === undefined) notFound();

  const { order } = row;
  const user = await getSessionUser();
  const vocab = vocabularyFor(order.equipmentKind);
  const totals = quotationTotals(order.items);

  /*
   * Las acciones NO están escritas a mano en la pantalla: las calcula la
   * máquina de estados contra el estado real y los permisos de quien mira.
   * Una barra con «Marcar como listo» siempre visible mentiría en las seis
   * órdenes de cada diez en las que esa transición no es legal.
   */
  const actions = availableActions(factsFor(order), {
    profileId: user.profileId,
    permissions: user.permissions,
  });
  const ready = actions.filter((a) => a.available);
  const blocked = actions.filter((a) => !a.available);

  const ago = (minutes: number): Date => new Date(now.getTime() - minutes * 60_000);

  return (
    <>
      <Link
        href="/ordenes"
        className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 transition-colors hover:text-brand-700"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Volver a órdenes
      </Link>

      {/* Cabecera: quién es este vehículo y por dónde va. */}
      <section className="rounded-panel border border-border bg-surface-raised p-6">
        <div className="flex flex-wrap items-start gap-6">
          <div className="min-w-0 flex-1">
            <StatusChip status={order.status} />
            <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-fg">
              {order.code}
            </h1>
            <p className="mt-1 text-lg text-fg-muted">{order.serviceType}</p>

            <dl className="mt-4 space-y-2 text-sm">
              <Meta icon={<CalendarDays />} label="Ingreso">
                {formatDateTime(row.openedAt)}
              </Meta>
              <Meta icon={<User />} label="Asesor">
                {order.advisor}
              </Meta>
              <Meta icon={<Wrench />} label="Técnico">
                {order.technician ?? 'Sin asignar'}
              </Meta>
            </dl>
          </div>

          <AssetImage
            alt={`Fotografía de ${order.vehicle}`}
            subject={order.vehicle}
            equipmentKind={order.equipmentKind}
            className="hidden h-36 w-72 shrink-0 lg:block"
          />

          <div className="shrink-0">
            <p className="font-display text-xl font-semibold tracking-tight text-fg">
              {order.vehicle}
            </p>
            <p data-numeric className="mt-1 text-sm text-fg-muted">
              {order.modelYear} · {formatNumber(order.usage)} {vocab.usageUnit}
            </p>
            <p className="text-sm text-fg-muted">{order.color}</p>
            <p className="mt-3 inline-flex rounded-control border border-border-strong bg-surface px-3.5 py-2 font-mono text-lg font-bold tracking-[0.08em] text-fg">
              {order.plate.replace(/^(.{3})(.*)$/u, '$1-$2')}
            </p>
          </div>
        </div>

        {/*
          Las pantallas del flujo, enlazadas desde la orden. Una ruta que solo
          se alcanza escribiéndola en la barra de direcciones no está entregada.
        */}
        <nav aria-label="Pantallas de la orden" className="mt-6 flex flex-wrap gap-2">
          {[
            { href: `/ordenes/${order.id}/cotizacion`, label: 'Cotización' },
            { href: `/ordenes/${order.id}/repuestos`, label: 'Autorización de repuestos' },
            { href: `/compras/${order.id}`, label: 'Cotización de proveedores' },
            { href: `/compras/${order.id}/recepcion`, label: 'Recepción de repuestos' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex items-center gap-2 rounded-control border border-border-strong bg-surface px-3.5 py-2 text-sm font-medium text-fg transition-colors duration-150 hover:border-brand-600 hover:bg-surface-sunken"
            >
              {item.label}
              <ArrowRight aria-hidden className="size-3.5 text-brand-600" />
            </Link>
          ))}
        </nav>

        <div className="mt-7 border-t border-border pt-6">
          <OrderJourney
            status={order.status}
            timestamps={{
              recepcion: formatTime(row.openedAt),
              ...(order.diagnosticItemCount > 0
                ? { diagnostico: formatTime(ago(order.openedMinutesAgo - 60)) }
                : {}),
              ...(order.startedMinutesAgo !== null
                ? { proceso: formatTime(ago(order.startedMinutesAgo)) }
                : {}),
            }}
          />
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="min-w-0 space-y-5">
          <QuotationPanel items={order.items} totals={totals} />
          <div className="grid gap-5 lg:grid-cols-2">
            <PhotosPanel order={order} ago={ago} />
            <NotesPanel order={order} ago={ago} />
          </div>
        </div>

        <div className="min-w-0 space-y-5">
          <SummaryPanel row={row} totals={totals} />
          <CustomerPanel order={order} />
          <VehiclePanel order={order} vocab={vocab} />
          <QualityPanel order={order} />
        </div>
      </div>

      {/* Barra de acciones. Solo lo que la máquina de estados permite AHORA. */}
      <section className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur lg:-mx-6 lg:px-6">
        <p className="text-xs text-fg-subtle">
          {ready.length === 0
            ? 'Ninguna acción disponible para tu rol en este estado.'
            : `${ready.length} ${ready.length === 1 ? 'acción disponible' : 'acciones disponibles'} según el estado y tu rol.`}
        </p>

        <div className="flex flex-wrap gap-2">
          {/*
            Las bloqueadas también se muestran, deshabilitadas y diciendo QUÉ
            falta. Ocultarlas deja al asesor preguntándose por qué no puede
            cerrar la orden; enseñarlas con «Falta la firma del cliente» le
            dice qué hacer a continuación.
          */}
          {blocked.slice(0, 2).map((action) => (
            <Button
              key={action.action}
              type="button"
              variant="secondary"
              disabled
              title={action.unmet.join(' · ')}
            >
              {action.label}
            </Button>
          ))}
          {ready.slice(0, 3).map((action, index) => (
            <Button
              key={action.action}
              type="button"
              variant={index === ready.length - 1 ? 'primary' : 'secondary'}
            >
              {action.label}
            </Button>
          ))}
        </div>
      </section>
    </>
  );
}

function Meta({
  icon,
  label,
  children,
}: {
  readonly icon: ReactNode;
  readonly label: string;
  readonly children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span aria-hidden className="shrink-0 text-fg-subtle [&>svg]:size-4">
        {icon}
      </span>
      <dt className="sr-only">{label}</dt>
      <dd className="min-w-0 truncate text-fg-muted">{children}</dd>
    </div>
  );
}

function Panel({
  title,
  action,
  children,
}: {
  readonly title: string;
  readonly action?: ReactNode;
  readonly children: ReactNode;
}) {
  return (
    <section className="rounded-panel border border-border bg-surface-raised">
      <header className="flex items-center justify-between gap-3 px-5 py-4">
        <h2 className="font-display text-base font-semibold tracking-tight text-fg">{title}</h2>
        {action}
      </header>
      <div className="px-5 pb-5">{children}</div>
    </section>
  );
}

function QuotationPanel({
  items,
  totals,
}: {
  readonly items: ReturnType<typeof quotationTotals> extends never ? never : readonly {
    readonly id: string;
    readonly description: string;
    readonly kind: 'servicio' | 'repuesto';
    readonly quantity: number;
    readonly unitPrice: number;
  }[];
  readonly totals: { readonly services: number; readonly parts: number; readonly total: number };
}) {
  if (items.length === 0) {
    return (
      <Panel title="Trabajos y repuestos">
        <p className="py-6 text-center text-sm text-fg-subtle">
          Todavía no hay trabajos cotizados. Se añaden al cerrar el diagnóstico.
        </p>
      </Panel>
    );
  }

  return (
    <Panel
      title="Trabajos y repuestos"
      action={
        <Button type="button" variant="secondary" size="sm">
          <Plus aria-hidden className="size-3.5" />
          Agregar ítem
        </Button>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[36rem] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-[0.06em] text-fg-subtle">
              <th scope="col" className="w-8 py-2.5 pr-3">#</th>
              <th scope="col" className="py-2.5 pr-3">Descripción</th>
              <th scope="col" className="w-24 py-2.5 pr-3">Tipo</th>
              <th scope="col" className="w-20 py-2.5 pr-3 text-right">Cantidad</th>
              <th scope="col" className="w-28 py-2.5 pr-3 text-right">Precio unit.</th>
              <th scope="col" className="w-28 py-2.5 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {items.map((item, index) => (
              <tr key={item.id}>
                <td data-numeric className="py-3 pr-3 text-fg-subtle">{index + 1}</td>
                <td className="py-3 pr-3 text-fg">{item.description}</td>
                <td className="py-3 pr-3">
                  <span className="inline-flex rounded-chip bg-surface-sunken px-2 py-0.5 text-xs text-fg-muted">
                    {item.kind === 'servicio' ? 'Servicio' : 'Repuesto'}
                  </span>
                </td>
                <td data-numeric className="py-3 pr-3 text-right text-fg-muted">{item.quantity}</td>
                <td data-numeric className="py-3 pr-3 text-right text-fg-muted">
                  {formatCurrency(item.unitPrice)}
                </td>
                <td data-numeric className="py-3 text-right font-medium text-fg">
                  {formatCurrency(item.quantity * item.unitPrice)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5} className="pt-4 text-right text-sm text-fg-muted">
                Total estimado
              </td>
              <td
                data-numeric
                className="pt-4 text-right font-display text-xl font-semibold text-fg"
              >
                {formatCurrency(totals.total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </Panel>
  );
}

function PhotosPanel({
  order,
  ago,
}: {
  readonly order: {
    readonly serviceType: string;
    readonly photos: readonly { id: string; label: string; minutesAgo: number }[];
  };
  readonly ago: (minutes: number) => Date;
}) {
  // El dibujo de la evidencia se elige por el TRABAJO, no por el rótulo de la
  // foto: «Estado inicial» no dice qué pieza hay que dibujar; «CAMBIO DE
  // PASTILLAS» sí.
  const orderSubject = order.serviceType;
  return (
    <Panel
      title={`Fotos del servicio (${order.photos.length})`}
      action={
        <Button type="button" variant="secondary" size="sm">
          <Camera aria-hidden className="size-3.5" />
          Subir
        </Button>
      }
    >
      {order.photos.length === 0 ? (
        <p className="py-6 text-center text-sm text-fg-subtle">
          Sin evidencia cargada todavía.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {order.photos.map((photo) => (
            <li key={photo.id}>
              <AssetImage
                alt={photo.label}
                subject={`${photo.label} ${orderSubject}`}
                kind="evidencia"
                rounded="control"
                className="aspect-4/3 w-full"
              />
              <p className="mt-1.5 truncate text-xs font-medium text-fg">{photo.label}</p>
              <p data-numeric className="text-[0.625rem] text-fg-subtle">
                {formatTime(ago(photo.minutesAgo))}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function NotesPanel({
  order,
  ago,
}: {
  readonly order: {
    readonly notes: readonly { id: string; text: string; minutesAgo: number; author: string }[];
  };
  readonly ago: (minutes: number) => Date;
}) {
  return (
    <Panel title="Notas del taller">
      {order.notes.length === 0 ? (
        <p className="py-6 text-center text-sm text-fg-subtle">Sin notas registradas.</p>
      ) : (
        <ul className="space-y-3">
          {order.notes.map((note) => (
            <li key={note.id} className="rounded-control bg-surface-sunken p-3.5">
              <p className="text-sm leading-relaxed text-fg-muted">{note.text}</p>
              <p data-numeric className="mt-2 text-xs text-fg-subtle">
                {formatDateTime(ago(note.minutesAgo))} · {note.author}
              </p>
            </li>
          ))}
        </ul>
      )}
      <Button type="button" variant="secondary" size="sm" block className="mt-3">
        <Plus aria-hidden className="size-3.5" />
        Agregar nota
      </Button>
    </Panel>
  );
}

function SummaryPanel({
  row,
  totals,
}: {
  readonly row: NonNullable<ReturnType<typeof findDemoOrder>>;
  readonly totals: { readonly services: number; readonly parts: number; readonly total: number };
}) {
  return (
    <Panel title="Resumen de la orden">
      <dl className="space-y-2.5 text-sm">
        <Line label="Total de servicios" value={formatCurrency(totals.services)} />
        <Line label="Total de repuestos" value={formatCurrency(totals.parts)} />
      </dl>

      <div className="mt-4 flex items-baseline justify-between border-t border-border pt-4">
        <span className="text-sm text-fg-muted">Total estimado</span>
        <span data-numeric className="font-display text-2xl font-semibold text-fg">
          {formatCurrency(totals.total)}
        </span>
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-fg-muted">Avance</span>
          <span data-numeric className="text-sm font-semibold text-fg">
            {Math.round(row.progressPercent)} %
          </span>
        </div>
        <ProgressBar
          percent={row.progressPercent}
          label={`Avance de ${row.order.code}`}
          showValue={false}
          className="mt-2"
        />
        <p className="mt-3">
          <TrafficLightDot color={row.light.color} reason={row.light.reason} showLabel />
        </p>
      </div>
    </Panel>
  );
}

function Line({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-fg-muted">{label}</dt>
      <dd data-numeric className="font-medium text-fg">{value}</dd>
    </div>
  );
}

function CustomerPanel({
  order,
}: {
  readonly order: {
    readonly customer: string;
    readonly corporateClient: string | null;
    readonly customerPhone: string;
    readonly customerEmail: string;
    readonly customerAddress: string;
    readonly customerDocLast3: string;
  };
}) {
  return (
    <Panel title="Cliente">
      <p className="flex flex-wrap items-center gap-2">
        <span className="font-medium text-fg">{order.customer}</span>
        {order.corporateClient !== null && <CorporateBadge name={order.corporateClient} />}
      </p>

      <dl className="mt-3 space-y-2 text-sm">
        {/*
          El documento sale ENMASCARADO. El número completo solo se obtiene con
          `reveal_document_number()`, que exige permiso y deja registro en
          `audit_logs` (docs/04 §4.9). Pintarlo entero aquí regalaría el dato a
          cualquiera que pase por delante de la pantalla del asesor.
        */}
        <Meta icon={<Hash />} label="Documento">
          <span data-numeric>{maskDocument(order.customerDocLast3)}</span>
        </Meta>
        <Meta icon={<Phone />} label="Teléfono">
          <span data-numeric>{order.customerPhone}</span>
        </Meta>
        <Meta icon={<Mail />} label="Correo">
          {order.customerEmail}
        </Meta>
        <Meta icon={<MapPin />} label="Dirección">
          {order.customerAddress}
        </Meta>
      </dl>
    </Panel>
  );
}

function VehiclePanel({
  order,
  vocab,
}: {
  readonly order: {
    readonly vehicle: string;
    readonly modelYear: number;
    readonly usage: number;
    readonly color: string;
    readonly plate: string;
    readonly vin: string;
  };
  readonly vocab: { readonly usageUnit: string; readonly serialLabel: string };
}) {
  return (
    <Panel title="Información del vehículo">
      <dl className="space-y-2 text-sm">
        <Meta icon={<Car />} label="Modelo">{order.vehicle}</Meta>
        <Meta icon={<CalendarDays />} label="Año">
          <span data-numeric>{order.modelYear}</span>
        </Meta>
        <Meta icon={<Gauge />} label="Uso">
          <span data-numeric>
            {formatNumber(order.usage)} {vocab.usageUnit}
          </span>
        </Meta>
        <Meta icon={<Palette />} label="Color">{order.color}</Meta>
        <Meta icon={<FileText />} label={vocab.serialLabel}>
          <span data-numeric className="font-mono text-xs">{order.vin}</span>
        </Meta>
      </dl>
    </Panel>
  );
}

function QualityPanel({
  order,
}: {
  readonly order: { readonly qualityChecks: readonly { id: string; label: string; done: boolean }[] };
}) {
  const done = order.qualityChecks.filter((c) => c.done).length;

  return (
    <Panel
      title="Checklist de calidad"
      action={
        <span data-numeric className="text-xs text-fg-subtle">
          {done}/{order.qualityChecks.length}
        </span>
      }
    >
      <ul className="space-y-2.5">
        {order.qualityChecks.map((check) => (
          <li key={check.id} className="flex items-center gap-2.5 text-sm">
            <span
              aria-hidden
              className="size-4 shrink-0 rounded-[0.3rem] border-2 border-border-strong"
            />
            <span className="text-fg-muted">{check.label}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-fg-subtle">
        Lo marca control de calidad, no el técnico que hizo el trabajo.
      </p>
    </Panel>
  );
}
