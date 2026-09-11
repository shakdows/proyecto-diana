'use client';

import { useMemo } from 'react';
import { usePersistentState } from '@/lib/demo/store';
import Link from 'next/link';
import {
  ArrowLeft,
  Check,
  CircleCheckBig,
  FileText,
  Gauge,
  KeyRound,
  PenLine,
  TriangleAlert,
  User,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input, Select } from '@/components/ui/input';
import { Plate } from '@/components/ui/plate';
import { AssetImage } from '@/components/ui/asset-image';
import {
  balanceCents,
  PAYMENT_METHOD_LABELS,
  readiness,
  toSoles,
  usageDelta,
  type HandoverFacts,
  type PaymentMethod,
  type PickupPerson,
} from '@/features/delivery/services/handover';
import { formatCurrency, formatNumber } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

/**
 * Entrega del vehículo.
 *
 * Es el único paso irreversible del flujo: cuando el vehículo sale, lo que no
 * se comprobó ya no se comprueba. Por eso la pantalla pide las cosas en el
 * orden en que ocurren en el mostrador —dinero, quién recoge, kilometraje,
 * llaves y documentos, firma— y la firma va la última: es el acto que cierra
 * todo lo anterior.
 */
export function HandoverForm({
  vehicle,
  plate,
  orderCode,
  orderId,
  customer,
  corporateClient,
  totalCents,
  paidCents,
  hasCorporateCredit,
  usageAtReception,
  usageUnit,
  surveyHref,
}: {
  readonly vehicle: string;
  readonly plate: string;
  readonly orderCode: string;
  readonly orderId: string;
  readonly customer: string;
  readonly corporateClient: string | null;
  readonly totalCents: number;
  readonly paidCents: number;
  readonly hasCorporateCredit: boolean;
  readonly usageAtReception: number;
  readonly usageUnit: string;
  readonly surveyHref: string;
}) {
  const [facts, setFacts] = usePersistentState<HandoverFacts>(`entrega.${orderId}`, {
    totalCents,
    paidCents,
    method: null,
    hasCorporateCredit,
    pickupPerson: 'titular',
    authorizedName: '',
    authorizedDocLast3: '',
    signatureCaptured: false,
    keysReturned: false,
    documentsReturned: false,
    usageAtReception,
    usageAtDelivery: null,
  });
  const [delivered, setDelivered] = usePersistentState(`entrega.${orderId}.entregado`, false);

  const state = useMemo(() => readiness(facts), [facts]);
  const saldo = balanceCents(facts);
  const patch = (change: Partial<HandoverFacts>): void =>
    setFacts((f) => ({ ...f, ...change }));

  if (delivered) {
    return (
      <Delivered
        orderCode={orderCode}
        orderId={orderId}
        vehicle={vehicle}
        plate={plate}
        surveyHref={surveyHref}
        recipient={
          facts.pickupPerson === 'titular' ? customer : facts.authorizedName
        }
      />
    );
  }

  return (
    <div className="space-y-5">
      <Link
        href="/seguimiento"
        className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 transition-colors hover:text-brand-700"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Volver a vehículos listos
      </Link>

      <header className="flex flex-wrap items-center gap-5 rounded-panel border border-border bg-surface-raised p-6">
        <AssetImage
          alt={vehicle}
          subject={vehicle}
          fit="cover"
          rounded="control"
          className="h-20 w-32 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-fg">
            Entrega del vehículo
          </h1>
          <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <Plate value={plate} />
            <span className="text-sm text-fg-muted">{vehicle}</span>
            <span data-numeric className="font-mono text-xs text-fg-subtle">
              {orderCode}
            </span>
          </p>
        </div>
      </header>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="min-w-0 space-y-5">
          <Section icon={<FileText />} title="Pago" step={1}>
            <dl className="space-y-2.5 text-sm">
              <Row label="Total del servicio" value={formatCurrency(toSoles(totalCents))} />
              <Row label="Pagado" value={formatCurrency(toSoles(paidCents))} />
            </dl>
            <p className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
              <span className="text-sm font-medium text-fg">Saldo</span>
              <span
                data-numeric
                className={cn(
                  'font-display text-xl font-semibold',
                  saldo > 0 ? 'text-warn-700' : 'text-ok-600',
                )}
              >
                {formatCurrency(toSoles(saldo))}
              </span>
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Forma de pago">
                <Select
                  value={facts.method ?? ''}
                  onChange={(e) =>
                    patch({
                      method: e.target.value === '' ? null : (e.target.value as PaymentMethod),
                    })
                  }
                >
                  <option value="">Elige una forma de pago</option>
                  {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[])
                    .filter((m) => m !== 'credito_corporativo' || hasCorporateCredit)
                    .map((m) => (
                      <option key={m} value={m}>
                        {PAYMENT_METHOD_LABELS[m]}
                      </option>
                    ))}
                </Select>
              </Field>

              {saldo > 0 && (
                <Field label="Cobrar ahora" hint="Deja el saldo en cero para poder entregar.">
                  <Button
                    variant="secondary"
                    block
                    className="h-11"
                    onClick={() => patch({ paidCents: totalCents })}
                  >
                    <Check aria-hidden className="size-4" />
                    Registrar {formatCurrency(toSoles(saldo))}
                  </Button>
                </Field>
              )}
            </div>

            {saldo > 0 && hasCorporateCredit && (
              <p className="mt-3 rounded-control bg-surface-sunken px-3 py-2.5 text-sm text-fg-muted">
                {corporateClient} tiene crédito corporativo: el vehículo puede salir y el saldo se
                factura a la cuenta.
              </p>
            )}
          </Section>

          <Section icon={<Users />} title="Quién recoge el vehículo" step={2}>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {(
                [
                  { value: 'titular' as const, label: customer, hint: 'Titular de la orden' },
                  { value: 'autorizado' as const, label: 'Otra persona', hint: 'Tercero autorizado' },
                ] satisfies readonly {
                  value: PickupPerson;
                  label: string;
                  hint: string;
                }[]
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={facts.pickupPerson === option.value}
                  onClick={() => patch({ pickupPerson: option.value })}
                  className={cn(
                    'flex items-center gap-3 rounded-control border px-4 py-3 text-left',
                    'transition-colors duration-150 ease-snap active:scale-[0.99]',
                    facts.pickupPerson === option.value
                      ? 'border-brand-600 bg-brand-50'
                      : 'border-border-strong bg-surface hover:bg-surface-sunken',
                  )}
                >
                  <User
                    aria-hidden
                    className={cn(
                      'size-5 shrink-0',
                      facts.pickupPerson === option.value ? 'text-brand-600' : 'text-fg-subtle',
                    )}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-fg">
                      {option.label}
                    </span>
                    <span className="block text-xs text-fg-subtle">{option.hint}</span>
                  </span>
                </button>
              ))}
            </div>

            {facts.pickupPerson === 'autorizado' && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Field label="Nombre completo" required>
                  <Input
                    value={facts.authorizedName}
                    placeholder="Nombre de quien recoge"
                    onChange={(e) => patch({ authorizedName: e.target.value })}
                  />
                </Field>
                {/*
                  Solo tres dígitos. El documento completo no se pide ni se
                  pinta: se obtiene con `reveal_document_number()`, que exige
                  permiso y deja registro (docs/04 §4.9).
                */}
                <Field
                  label="Últimos 3 dígitos del documento"
                  required
                  hint="No pedimos el número completo."
                >
                  <Input
                    inputMode="numeric"
                    maxLength={3}
                    value={facts.authorizedDocLast3}
                    placeholder="456"
                    onChange={(e) =>
                      patch({ authorizedDocLast3: e.target.value.replace(/\D/gu, '').slice(0, 3) })
                    }
                  />
                </Field>
              </div>
            )}
          </Section>

          <Section icon={<Gauge />} title="Lectura de salida" step={3}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={`${usageUnit === 'km' ? 'Kilometraje' : 'Horómetro'} de salida`} required>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={facts.usageAtDelivery === null ? '' : String(facts.usageAtDelivery)}
                  placeholder={String(usageAtReception)}
                  onChange={(e) =>
                    patch({
                      usageAtDelivery: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                />
              </Field>
              <div className="self-end pb-1 text-sm text-fg-muted">
                <p data-numeric>
                  Entró con {formatNumber(usageAtReception)} {usageUnit}
                </p>
                {usageDelta(facts) !== null && (
                  <p data-numeric className="mt-0.5 text-fg-subtle">
                    Recorrido en el taller: {formatNumber(usageDelta(facts) ?? 0)} {usageUnit}
                  </p>
                )}
              </div>
            </div>
          </Section>

          <Section icon={<KeyRound />} title="Devolución" step={4}>
            <div className="space-y-2.5">
              <Toggle
                checked={facts.keysReturned}
                onChange={(v) => patch({ keysReturned: v })}
                label="Llaves entregadas"
                hint="Incluido el duplicado, si lo dejó."
              />
              <Toggle
                checked={facts.documentsReturned}
                onChange={(v) => patch({ documentsReturned: v })}
                label="Documentos entregados"
                hint="Tarjeta de propiedad, SOAT y comprobante."
              />
            </div>
          </Section>

          <Section icon={<PenLine />} title="Firma de conformidad" step={5}>
            <button
              type="button"
              onClick={() => patch({ signatureCaptured: !facts.signatureCaptured })}
              className={cn(
                'flex h-32 w-full flex-col items-center justify-center gap-2 rounded-control border-2 border-dashed',
                'transition-colors duration-150 ease-snap',
                facts.signatureCaptured
                  ? 'border-ok-600 bg-ok-100/40 text-ok-700'
                  : 'border-border-strong bg-surface-sunken text-fg-subtle hover:border-brand-600 hover:text-brand-600',
              )}
            >
              {facts.signatureCaptured ? (
                <>
                  <CircleCheckBig aria-hidden className="size-7" />
                  <span className="text-sm font-medium">Firma capturada</span>
                  <span className="text-xs">Toca para rehacerla</span>
                </>
              ) : (
                <>
                  <PenLine aria-hidden className="size-7" />
                  <span className="text-sm font-medium">Firmar aquí</span>
                  <span className="text-xs">
                    El cliente firma en la tablet dando conformidad al trabajo
                  </span>
                </>
              )}
            </button>
          </Section>
        </div>

        <aside className="min-w-0 xl:sticky xl:top-5 xl:self-start">
          <section className="rounded-panel border border-border bg-surface-raised p-5">
            <h2 className="font-display text-base font-semibold tracking-tight text-fg">
              Entregar
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-fg-muted">
              Cuando el vehículo sale, lo que no se comprobó ya no se comprueba.
            </p>

            <Button
              block
              size="lg"
              className="mt-4"
              disabled={!state.canDeliver}
              onClick={() => setDelivered(true)}
            >
              <KeyRound aria-hidden className="size-4" />
              Entregar vehículo
            </Button>

            {state.blockers.length > 0 ? (
              <ul className="mt-4 space-y-2">
                {state.blockers.map((b) => (
                  <li key={b} className="flex items-start gap-2 text-sm text-fg-muted">
                    <TriangleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0 text-warn-600" />
                    {b}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 flex items-start gap-2 rounded-control bg-ok-100 px-3 py-2.5 text-sm text-ok-700">
                <Check aria-hidden className="mt-0.5 size-4 shrink-0" />
                Todo en orden. Puedes entregar las llaves.
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  step,
  children,
}: {
  readonly icon: React.ReactNode;
  readonly title: string;
  readonly step: number;
  readonly children: React.ReactNode;
}) {
  return (
    <section className="rounded-panel border border-border bg-surface-raised p-5">
      <h2 className="flex items-center gap-3 font-display text-base font-semibold tracking-tight text-fg">
        <span
          aria-hidden
          className="grid size-8 shrink-0 place-items-center rounded-full bg-surface-sunken text-fg-muted [&>svg]:size-4"
        >
          {icon}
        </span>
        <span data-numeric className="text-fg-subtle">
          {step}.
        </span>
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  readonly checked: boolean;
  readonly onChange: (value: boolean) => void;
  readonly label: string;
  readonly hint: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'flex w-full items-center gap-3 rounded-control border px-4 py-3 text-left',
        'transition-colors duration-150 ease-snap active:scale-[0.99]',
        checked
          ? 'border-ok-600 bg-ok-100/40'
          : 'border-border-strong bg-surface hover:bg-surface-sunken',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'grid size-6 shrink-0 place-items-center rounded-[0.4rem] border-2',
          checked ? 'border-ok-600 bg-ok-600 text-white' : 'border-border-strong text-transparent',
        )}
      >
        <Check className="size-3.5" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-fg">{label}</span>
        <span className="block text-xs text-fg-subtle">{hint}</span>
      </span>
    </button>
  );
}

function Delivered({
  orderCode,
  orderId,
  vehicle,
  plate,
  recipient,
  surveyHref,
}: {
  readonly orderCode: string;
  readonly orderId: string;
  readonly vehicle: string;
  readonly plate: string;
  readonly recipient: string;
  readonly surveyHref: string;
}) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <span
        aria-hidden
        className="mx-auto grid size-16 place-items-center rounded-full bg-ok-100 text-ok-600"
      >
        <CircleCheckBig className="size-8" />
      </span>

      <h1 className="mt-5 font-display text-2xl font-semibold tracking-tight text-fg">
        Vehículo entregado
      </h1>
      <p className="mt-2 text-base leading-relaxed text-fg-muted">
        {vehicle} · {plate} · {orderCode}
      </p>
      <p className="mt-1 text-sm text-fg-muted">Recibido por {recipient}</p>

      <p className="mt-5 rounded-panel border border-border bg-surface-raised px-5 py-4 text-sm leading-relaxed text-fg-muted">
        La encuesta de satisfacción se envía al cliente. La orden queda ABIERTA hasta que responda
        o venza el plazo: cerrarla ahora perdería la única medida de si el trabajo valió la pena.
      </p>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link
          href={surveyHref}
          className="inline-flex h-11 items-center gap-2 rounded-control bg-brand-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
        >
          Ver la encuesta del cliente
        </Link>
        <Link
          href={`/ordenes/${orderId}`}
          className="inline-flex h-11 items-center rounded-control border border-border-strong bg-surface px-5 text-sm font-semibold text-fg-muted transition-colors hover:bg-surface-sunken"
        >
          Volver a la orden
        </Link>
      </div>
    </div>
  );
}

function Row({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-fg-muted">{label}</dt>
      <dd data-numeric className="font-medium text-fg">
        {value}
      </dd>
    </div>
  );
}
