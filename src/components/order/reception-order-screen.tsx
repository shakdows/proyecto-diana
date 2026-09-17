'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Car,
  FileCheck2,
  Gauge,
  Hash,
  Mail,
  MapPin,
  Palette,
  Pencil,
  Phone,
  User,
  Wrench,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { CorporateBadge } from '@/components/ui/plate';
import { Field } from '@/components/ui/field';
import { Input, Select } from '@/components/ui/input';
import { Modal, ModalActions } from '@/components/ui/modal';
import { ProgressBar } from '@/components/ui/progress-bar';
import { DataState } from '@/components/feedback/states';
import { useToast } from '@/components/feedback/toast';
import {
  LiveJourney,
  LiveStatusChip,
  OrderActionBar,
  OrderAdvanceHistory,
  OrderAdvanceProvider,
} from '@/components/order/order-advance';
import { OrderNotes } from '@/components/order/order-notes';
import { OrderWorkfilePanel } from '@/components/order/order-workfile';
import { OrderPhotos } from '@/components/order/order-photos';
import { vocabularyFor } from '@/features/equipment/services/equipment-kind';
import {
  SERVICE_TYPES,
  SIN_DEFINIR,
  checkServiceType,
} from '@/features/orders/services/from-reception';
import { useReceptionOrder } from '@/features/orders/use-reception-orders';
import { useOrderWorkfile } from '@/features/orders/use-order-workfile';
import type { Permission } from '@/lib/auth/permissions';
import { useHydrated } from '@/lib/demo/store';
import { formatDateTime, formatNumber, formatTime, maskDocument } from '@/lib/utils/format';

const NINGUNA: readonly never[] = [];

/**
 * La orden que abrió una recepción.
 *
 * ── Por qué es una pantalla aparte ─────────────────────────────────────────
 *
 * Porque es una orden en otro momento de su vida. La ficha de una orden
 * sembrada enseña la cotización, los repuestos y el checklist de calidad
 * porque esas órdenes ya pasaron por ahí; una recién recibida no tiene nada
 * de eso, y pintar cuatro tarjetas vacías no informa: hace creer que algo se
 * perdió.
 *
 * Lo que sí comparte es lo que importa: la MISMA barra de avance, la misma
 * máquina de estados, el mismo historial y las mismas notas y fotos. No hay
 * dos clases de orden, hay una orden en dos momentos.
 *
 * ⚠️ Vive en el navegador de quien la recibió. La pantalla lo dice en vez de
 * fingir que el taller entero la ve.
 */
export function ReceptionOrderScreen({
  orderId,
  profileId,
  permissions,
  actorName,
}: {
  readonly orderId: string;
  readonly profileId: string;
  readonly permissions: readonly Permission[];
  readonly actorName: string;
}) {
  const { order, serviceType, setServiceType } = useReceptionOrder(orderId);
  const { workfile } = useOrderWorkfile(orderId);
  const hydrated = useHydrated();

  if (!hydrated) return <Cargando />;

  if (order === null) {
    return (
      <>
        <Volver />
        <DataState
          data={NINGUNA}
          empty={{
            title: 'Esta orden no está en este dispositivo',
            hint: 'Las recepciones cerradas se guardan en el navegador donde se cerraron. Ábrela en el equipo donde recibiste el vehículo, o registra la recepción de nuevo.',
          }}
        >
          {() => null}
        </DataState>
      </>
    );
  }

  const { row, acta, facts, match } = order;
  const { order: data } = row;
  const vocab = vocabularyFor(data.equipmentKind);
  const cerrada = new Date(acta.closedAt);

  return (
    <OrderAdvanceProvider
      orderId={data.id}
      orderCode={data.code}
      baseStatus={data.status}
      baseFacts={facts}
      actor={{ profileId, permissions }}
      actorName={actorName}
    >
      <Volver />

      <section className="rounded-panel border border-border bg-surface-raised p-6">
        <div className="flex flex-wrap items-start gap-6">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <LiveStatusChip />
              <span className="inline-flex items-center gap-1.5 rounded-chip bg-brand-600/10 px-2.5 py-1 text-xs font-semibold text-brand-700">
                <FileCheck2 aria-hidden className="size-3.5" />
                Abierta desde recepción
              </span>
            </div>

            <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight text-fg">
              {data.code}
            </h1>
            <ServiceType
              value={serviceType}
              onSave={setServiceType}
              current={data.serviceType}
            />

            <dl className="mt-4 space-y-2 text-sm">
              <Meta icon={<CalendarDays />} label="Ingreso">
                {formatDateTime(cerrada)}
              </Meta>
              <Meta icon={<User />} label="Asesor">
                {acta.advisorName}
              </Meta>
              <Meta icon={<Wrench />} label="Técnico">
                {workfile.technician?.name ?? 'Sin asignar'}
              </Meta>
            </dl>
          </div>

          <div className="shrink-0">
            <p className="font-display text-xl font-semibold tracking-tight text-fg">
              {data.vehicle}
            </p>
            <p data-numeric className="mt-1 text-sm text-fg-muted">
              {data.modelYear === 0
                ? 'Año sin registrar'
                : `${data.modelYear} · ${formatNumber(data.usage)} ${vocab.usageUnit}`}
            </p>
            <p className="text-sm text-fg-muted">{data.color === '' ? 'Color sin registrar' : data.color}</p>
            <p className="mt-3 inline-flex rounded-control border border-border-strong bg-surface px-3.5 py-2 font-mono text-lg font-bold tracking-[0.08em] text-fg">
              {data.plate.replace(/^(.{3})(.*)$/u, '$1-$2')}
            </p>
          </div>
        </div>

        {/*
          Solo el acta y el expediente.
          ⚠️ Aquí había un enlace a «Cotización» y otro a «Diagnóstico», y los
          dos mentían: el primero daba 404 —esa pantalla solo existe para las
          órdenes sembradas— y el segundo abría el diagnóstico de OTRO
          vehículo, el de la orden de ejemplo. Lo puse yo al montar esta
          pantalla, que es justo el error que llevamos semanas quitando: un
          enlace sin destino es peor que ninguno.
        */}
        <nav aria-label="Pantallas de la orden" className="mt-6 flex flex-wrap gap-2">
          <NavLink href={`/recepcion/acta/${acta.code}`} label={`Acta ${acta.code}`} />
          <NavLink href="#expediente" label="Ir al expediente de trabajo" />
        </nav>

        <div className="mt-7 border-t border-border pt-6">
          <LiveJourney timestamps={{ recepcion: formatTime(cerrada) }} />
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="min-w-0 space-y-5">
          {/*
            El expediente va PRIMERO: es lo único de esta pantalla donde hay
            algo que hacer. Lo que dejó la recepción ya está hecho y se
            consulta; lo que la orden necesita para avanzar se rellena aquí.
          */}
          <OrderWorkfilePanel orderId={data.id} />
          <ReceptionSummary
            acta={acta}
            percent={row.progressPercent}
            code={data.code}
          />
          <div className="grid gap-5 lg:grid-cols-2">
            <OrderPhotos orderId={data.id} serviceType={data.serviceType} seeded={NINGUNA} />
            <OrderNotes orderId={data.id} author={actorName} seeded={NINGUNA} />
          </div>
        </div>

        <div className="min-w-0 space-y-5">
          <OrderAdvanceHistory />

          <Panel title="Cliente">
            <p className="flex flex-wrap items-center gap-2">
              <span className="font-medium text-fg">{acta.customer}</span>
              {match?.customer.corporateClient != null && (
                <CorporateBadge name={match.customer.corporateClient} />
              )}
            </p>
            {match === null ? (
              <p className="mt-3 text-sm text-fg-subtle">
                La placa no está registrada en la cartera, así que no hay ficha
                de cliente que enlazar. Regístrala en Clientes y los datos
                aparecerán aquí.
              </p>
            ) : (
              <>
                <dl className="mt-3 space-y-2 text-sm">
                  <Meta icon={<Hash />} label="Documento">
                    <span data-numeric>{maskDocument(match.customer.documentLast)}</span>
                  </Meta>
                  {match.customer.phone !== null && (
                    <Meta icon={<Phone />} label="Teléfono">
                      <span data-numeric>{match.customer.phone}</span>
                    </Meta>
                  )}
                  {match.customer.email !== null && (
                    <Meta icon={<Mail />} label="Correo">{match.customer.email}</Meta>
                  )}
                  {match.customer.address !== null && (
                    <Meta icon={<MapPin />} label="Dirección">{match.customer.address}</Meta>
                  )}
                </dl>
                <Link
                  href={`/clientes/${match.customer.id}`}
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
                >
                  Ver ficha del cliente
                  <ArrowRight aria-hidden className="size-3.5" />
                </Link>
              </>
            )}
          </Panel>

          <Panel title="Información del vehículo">
            <dl className="space-y-2 text-sm">
              <Meta icon={<Car />} label="Modelo">{data.vehicle}</Meta>
              {data.modelYear > 0 && (
                <Meta icon={<CalendarDays />} label="Año">
                  <span data-numeric>{data.modelYear}</span>
                </Meta>
              )}
              {data.usage > 0 && (
                <Meta icon={<Gauge />} label="Uso">
                  <span data-numeric>
                    {formatNumber(data.usage)} {vocab.usageUnit}
                  </span>
                </Meta>
              )}
              {data.color !== '' && <Meta icon={<Palette />} label="Color">{data.color}</Meta>}
            </dl>
          </Panel>
        </div>
      </div>

      <OrderActionBar orderId={data.id} />
    </OrderAdvanceProvider>
  );
}

function Volver() {
  return (
    <Link
      href="/ordenes"
      className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 transition-colors hover:text-brand-700"
    >
      <ArrowLeft aria-hidden className="size-4" />
      Volver a órdenes
    </Link>
  );
}

function Cargando() {
  return (
    <>
      <Volver />
      <div className="rounded-panel border border-border bg-surface-raised p-6">
        <p className="text-sm text-fg-subtle">Abriendo la orden…</p>
      </div>
    </>
  );
}

/**
 * El tipo de servicio, que en recepción no se sabe.
 *
 * Sin esto la orden nace en un callejón: «Enviar a diagnóstico» queda
 * bloqueado con «Falta definir el tipo de servicio» y no hay ninguna pantalla
 * donde definirlo. Es el mismo error de los botones sin destino, cometido un
 * paso más arriba.
 */
function ServiceType({
  value,
  current,
  onSave,
}: {
  readonly value: string;
  readonly current: string;
  readonly onSave: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [elegido, setElegido] = useState(value);
  const [otro, setOtro] = useState('');
  const toast = useToast();

  const enLista = SERVICE_TYPES.includes(elegido);
  const texto = elegido === '·otro·' ? otro : elegido;
  const check = checkServiceType(texto);
  const pendiente = current === SIN_DEFINIR;

  const guardar = (): void => {
    if (!check.valid) return;
    onSave(texto.trim());
    toast(`Tipo de servicio: ${texto.trim()}`, 'ok');
    setOpen(false);
  };

  return (
    <>
      <p className="mt-1 flex flex-wrap items-center gap-2">
        <span className={pendiente ? 'text-lg text-warn-700' : 'text-lg text-fg-muted'}>
          {current}
        </span>
        <button
          type="button"
          onClick={() => {
            setElegido(value === '' ? '' : SERVICE_TYPES.includes(value) ? value : '·otro·');
            setOtro(SERVICE_TYPES.includes(value) ? '' : value);
            setOpen(true);
          }}
          className="inline-flex items-center gap-1 rounded-control border border-border-strong px-2.5 py-1 text-xs font-medium text-fg transition-colors hover:bg-surface-sunken"
        >
          <Pencil aria-hidden className="size-3" />
          {pendiente ? 'Definir' : 'Cambiar'}
        </button>
      </p>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        width="sm"
        title="Tipo de servicio"
        subtitle="En recepción no se sabe qué hay que hacer: lo dice el cliente al dejar el vehículo o el diagnóstico al revisarlo."
        onSubmit={guardar}
        footer={
          <ModalActions
            onCancel={() => setOpen(false)}
            confirmLabel="Guardar"
            disabled={!check.valid}
          />
        }
      >
        <Field label="Motivo de ingreso" required>
          <Select value={elegido} onChange={(e) => setElegido(e.target.value)}>
            <option value="">Elige uno…</option>
            {SERVICE_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
            <option value="·otro·">Otro (escribir)</option>
          </Select>
        </Field>

        {!enLista && elegido === '·otro·' && (
          <Field label="Describe el trabajo" error={check.error ?? undefined}>
            <Input
              value={otro}
              onChange={(e) => setOtro(e.target.value)}
              placeholder="REVISIÓN DE RUIDO EN SUSPENSIÓN DELANTERA"
            />
          </Field>
        )}
      </Modal>
    </>
  );
}

function ReceptionSummary({
  acta,
  percent,
  code,
}: {
  readonly acta: {
    readonly code: string;
    readonly checklistResolved: number;
    readonly checklistTotal: number;
    readonly damageCount: number;
    readonly photoCount: number;
    readonly customerSignature: { readonly name: string; readonly signedAt: string } | null;
  };
  readonly percent: number;
  readonly code: string;
}) {
  return (
    <Panel
      title="Lo que dejó la recepción"
      action={
        <Link
          href={`/recepcion/acta/${acta.code}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
        >
          Ver el acta
          <ArrowRight aria-hidden className="size-3.5" />
        </Link>
      }
    >
      <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Cifra label="Checklist" value={`${acta.checklistResolved}/${acta.checklistTotal}`} />
        <Cifra label="Daños marcados" value={String(acta.damageCount)} />
        <Cifra label="Fotos" value={String(acta.photoCount)} />
        <Cifra
          label="Firma"
          value={acta.customerSignature === null ? 'Sin firma' : 'Firmada'}
        />
      </dl>

      <div className="mt-5 border-t border-border pt-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-fg-muted">Avance</span>
          <span data-numeric className="text-sm font-semibold text-fg">
            {Math.round(percent)} %
          </span>
        </div>
        <ProgressBar percent={percent} label={`Avance de ${code}`} showValue={false} className="mt-2" />
      </div>

      <p className="mt-4 rounded-control bg-surface-sunken px-3.5 py-2.5 text-xs text-fg-subtle">
        Esta orden vive en este navegador, igual que su acta. Cuando haya base
        de datos, cerrar la recepción escribirá la fila en{' '}
        <code className="font-mono">service_orders</code> y la verá todo el taller.
      </p>
    </Panel>
  );
}

function Cifra({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div>
      <dt className="text-xs text-fg-subtle">{label}</dt>
      <dd data-numeric className="font-display text-xl font-semibold text-fg">
        {value}
      </dd>
    </div>
  );
}

function NavLink({ href, label }: { readonly href: string; readonly label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-control border border-border-strong bg-surface px-3.5 py-2 text-sm font-medium text-fg transition-colors duration-150 hover:border-brand-600 hover:bg-surface-sunken"
    >
      {label}
      <ArrowRight aria-hidden className="size-3.5 text-brand-600" />
    </Link>
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
