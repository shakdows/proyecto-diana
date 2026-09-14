'use client';

import Link from 'next/link';
import { useState } from 'react';
import {
  ArrowLeft,
  Camera,
  Check,
  FileText,
  History,
  Lock,
  PenLine,
  TriangleAlert,
  Unlock,
} from 'lucide-react';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Modal } from '@/components/ui/modal';
import { EmptyState } from '@/components/feedback/states';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/feedback/toast';
import { photoWhen, slotFor, type EvidencePhoto } from '@/features/evidence/services/photos';
import { wasCorrected, type CompletedReception } from '@/features/reception/services/acta';
import { ZONES, zoneLabel } from '@/features/reception/services/damage-map';
import { useReceptions } from '@/features/reception/use-receptions';
import { checkDeleteCode } from '@/lib/auth/confirm-code';
import { usePersistentState, useHydrated } from '@/lib/demo/store';
import { formatPlate } from '@/features/vehicles/services/vehicle';
import { cn } from '@/lib/utils/cn';

const TOMAS: readonly { id: string; label: string }[] = [
  { id: 'frontal', label: 'Frontal' },
  { id: 'trasera', label: 'Trasera' },
  { id: 'lateral-izquierdo', label: 'Lateral izquierdo' },
  { id: 'lateral-derecho', label: 'Lateral derecho' },
  { id: 'tablero', label: 'Tablero' },
  { id: 'interior', label: 'Interior' },
];

/**
 * El acta de una recepción cerrada.
 *
 * ── Por qué es de solo lectura ─────────────────────────────────────────────
 *
 * Porque está firmada. Un acta que se puede editar con el mismo gesto con el
 * que se lee no prueba nada: el cliente firmó una cosa y el taller puede
 * enseñar otra. Por eso hay un candado, y por eso al abrirlo TODO lo que se
 * cambie queda escrito con su hora y su autor.
 *
 * ── Qué se corrige y qué no ────────────────────────────────────────────────
 *
 * Se corrigen los datos de FORMA: el nombre mal tecleado, la placa con un
 * dígito cambiado. NO se corrige lo que el cliente aceptó —los daños, el
 * checklist—: eso no es una corrección, es otra recepción, y se hace
 * reabriendo el recorrido para que vuelva a firmarse.
 */
export function ActaView({
  code,
  viewerName,
}: {
  readonly code: string;
  readonly viewerName: string;
}) {
  const { find, correct } = useReceptions();
  const hydrated = useHydrated();
  const toast = useToast();
  const [corrigiendo, setCorrigiendo] = useState(false);

  const acta = find(code);

  if (!hydrated) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (acta === undefined) {
    return (
      <div className="space-y-6">
        <Volver />
        <EmptyState
          title="Esta acta no está aquí"
          hint="Las recepciones cerradas durante la prueba viven en el navegador donde se cerraron. Si la cerraste en otro equipo —o usaste «Comenzar de nuevo»—, ya no está."
        />
      </div>
    );
  }

  return (
    <>
      <Volver />

      <header className="rounded-panel border border-border bg-surface-raised px-5 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="flex flex-wrap items-center gap-2">
              <span
                data-numeric
                className="select-all rounded-chip bg-graphite-950 px-2.5 py-1 font-mono text-sm font-bold text-white"
              >
                {acta.code}
              </span>
              <span className="rounded-chip bg-ok-100 px-2 py-0.5 text-xs font-medium text-ok-700">
                Cerrada
              </span>
              {wasCorrected(acta) && (
                <span className="flex items-center gap-1 rounded-chip bg-warn-100 px-2 py-0.5 text-xs font-medium text-warn-700">
                  <History aria-hidden className="size-3" />
                  Corregida
                </span>
              )}
            </p>
            <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight text-fg">
              {acta.vehicle}
            </h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-3 text-sm text-fg-muted">
              <span
                data-numeric
                className="rounded-chip border border-border-strong bg-surface px-2 py-0.5 font-mono font-bold text-fg"
              >
                {formatPlate(acta.plate)}
              </span>
              <span>Recibido de {acta.customer}</span>
              <span data-numeric>{new Date(acta.closedAt).toLocaleString('es-PE')}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={() => setCorrigiendo(true)}
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-control border border-border px-4 text-sm font-medium text-fg transition-colors duration-150 hover:bg-surface-sunken"
          >
            <Lock aria-hidden className="size-4" />
            Corregir
          </button>
        </div>
      </header>

      <section className="rounded-panel border border-border bg-surface-raised p-5">
        <h2 className="flex items-center gap-2 font-display text-base font-semibold tracking-tight text-fg">
          <FileText aria-hidden className="size-4 text-fg-subtle" />
          Lo que quedó registrado
        </h2>
        <dl className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          <Dato
            label="Checklist"
            value={`${String(acta.checklistResolved)} de ${String(acta.checklistTotal)}`}
          />
          <Dato label="Daños" value={acta.damageCount === 0 ? 'Ninguno' : String(acta.damageCount)} />
          <Dato label="Fotos" value={String(acta.photoCount)} />
          <Dato label="Recibió" value={acta.advisorName} />
          <Dato label="Orden de trabajo" value={acta.orderCode} />
        </dl>
      </section>

      <Danos plate={acta.plate} />
      <Fotos plate={acta.plate} />

      <section className="rounded-panel border border-border bg-surface-raised p-5">
        <h2 className="flex items-center gap-2 font-display text-base font-semibold tracking-tight text-fg">
          <PenLine aria-hidden className="size-4 text-fg-subtle" />
          Firma del cliente
        </h2>
        {acta.customerSignature === null ? (
          <p className="mt-3 text-sm text-fg-subtle">Sin firma registrada.</p>
        ) : (
          <div className="mt-3 max-w-xs rounded-control border border-border bg-surface p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={acta.customerSignature.dataUrl}
              alt={`Firma de ${acta.customerSignature.name}`}
              className="h-24 w-full object-contain"
            />
            <p className="mt-1 text-center text-xs text-fg-muted">{acta.customerSignature.name}</p>
            <p data-numeric className="text-center text-[0.625rem] text-fg-subtle">
              {new Date(acta.customerSignature.signedAt).toLocaleString('es-PE')}
            </p>
          </div>
        )}
      </section>

      {/*
        El historial de correcciones va en el acta y no en un registro aparte:
        quien la enseña tiene que ver lo mismo que quien la audita, o el acta
        vuelve a ser un papel que dice lo que le conviene a quien lo saca.
      */}
      {wasCorrected(acta) && (
        <section className="rounded-panel border border-warn-500/40 bg-warn-100 p-5">
          <h2 className="flex items-center gap-2 font-display text-base font-semibold tracking-tight text-warn-700">
            <History aria-hidden className="size-4" />
            Correcciones
          </h2>
          <ul className="mt-3 space-y-2">
            {(acta.corrections ?? []).map((c) => (
              <li key={c.at} className="text-sm text-warn-700">
                <span data-numeric className="text-warn-700/80">
                  {new Date(c.at).toLocaleString('es-PE')}
                </span>{' '}
                · {c.by} · {c.note}
              </li>
            ))}
          </ul>
        </section>
      )}

      {corrigiendo && (
        <CorregirModal
          acta={acta}
          onClose={() => setCorrigiendo(false)}
          onSave={(patch) => {
            const r = correct(acta.code, patch, viewerName, new Date());
            toast(
              r === null
                ? 'No se pudo guardar la corrección.'
                : 'Corrección guardada, con su rastro en el acta.',
              r === null ? 'crit' : 'ok',
            );
          }}
        />
      )}
    </>
  );
}

function Volver() {
  return (
    <Link
      href="/recepcion"
      className="inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted transition-colors duration-150 hover:text-fg"
    >
      <ArrowLeft aria-hidden className="size-4" />
      Recepción
    </Link>
  );
}

/** Los daños tal como se marcaron, con su foto si la tienen. */
function Danos({ plate }: { readonly plate: string }) {
  const [marks] = usePersistentState<readonly { zone: string; kind: string }[]>(
    `recepcion.${plate}.danos`,
    SIN_DANOS,
  );

  if (marks.length === 0) {
    return (
      <section className="rounded-panel border border-border bg-surface-raised p-5">
        <h2 className="font-display text-base font-semibold tracking-tight text-fg">Daños</h2>
        <p className="mt-2 flex items-center gap-2 text-sm text-ok-700">
          <Check aria-hidden className="size-4" />
          Ninguno anotado al ingreso.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-panel border border-border bg-surface-raised p-5">
      <h2 className="font-display text-base font-semibold tracking-tight text-fg">
        Daños al ingreso
      </h2>
      <ul className="mt-3 space-y-2">
        {marks.map((m) => (
          <li key={m.zone}>
            <ZonaConFotos plate={plate} zone={m.zone} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function ZonaConFotos({ plate, zone }: { readonly plate: string; readonly zone: string }) {
  const [fotos] = usePersistentState<readonly EvidencePhoto[]>(
    slotFor(`danos:${plate}:${zone}`),
    SIN_FOTOS,
  );
  const conocida = ZONES.some((z) => z.id === zone);

  return (
    <div className="rounded-control border border-border px-3.5 py-3">
      <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-fg">
        {conocida ? zoneLabel(zone as never) : zone}
        <span
          className={cn(
            'rounded-chip px-1.5 py-0.5 text-[0.6875rem] font-semibold',
            fotos.length === 0 ? 'bg-warn-100 text-warn-700' : 'bg-ok-100 text-ok-700',
          )}
        >
          {fotos.length === 0
            ? 'sin foto'
            : `${String(fotos.length)} ${fotos.length === 1 ? 'foto' : 'fotos'}`}
        </span>
      </p>
      {fotos.length > 0 && <Miniaturas fotos={fotos} />}
    </div>
  );
}

/** Las seis tomas generales del paso de evidencia. */
function Fotos({ plate }: { readonly plate: string }) {
  return (
    <section className="rounded-panel border border-border bg-surface-raised p-5">
      <h2 className="flex items-center gap-2 font-display text-base font-semibold tracking-tight text-fg">
        <Camera aria-hidden className="size-4 text-fg-subtle" />
        Evidencia del ingreso
      </h2>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOMAS.map((t) => (
          <li key={t.id}>
            <TomaGeneral plate={plate} id={t.id} label={t.label} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function TomaGeneral({
  plate,
  id,
  label,
}: {
  readonly plate: string;
  readonly id: string;
  readonly label: string;
}) {
  const [fotos] = usePersistentState<readonly EvidencePhoto[]>(
    slotFor(`recepcion:${plate}:${id}`),
    SIN_FOTOS,
  );

  return (
    <div>
      <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-fg-subtle">
        {label}
        {fotos.length === 0 && <span className="text-warn-700">· sin tomar</span>}
      </p>
      {fotos.length === 0 ? (
        <div className="mt-1.5 grid h-20 place-items-center rounded-control border border-dashed border-border-strong text-xs text-fg-subtle">
          No se tomó
        </div>
      ) : (
        <Miniaturas fotos={fotos} />
      )}
    </div>
  );
}

function Miniaturas({ fotos }: { readonly fotos: readonly EvidencePhoto[] }) {
  const [viendo, setViendo] = useState<EvidencePhoto | null>(null);

  return (
    <>
      <ul className="mt-1.5 flex flex-wrap gap-2">
        {fotos.map((f) => (
          <li key={f.id}>
            <button
              type="button"
              onClick={() => setViendo(f)}
              className="block overflow-hidden rounded-control border border-border transition-shadow duration-150 hover:shadow-panel"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={f.dataUrl} alt={photoWhen(f.takenAt, new Date())} className="h-20 w-28 object-cover" />
              <span className="block bg-surface-sunken px-1.5 py-1 text-[0.625rem] text-fg-subtle">
                {photoWhen(f.takenAt, new Date())}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {viendo !== null && (
        <Modal
          open
          onClose={() => setViendo(null)}
          title="Foto del ingreso"
          subtitle={photoWhen(viendo.takenAt, new Date())}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={viendo.dataUrl} alt="Foto del ingreso" className="w-full rounded-control" />
        </Modal>
      )}
    </>
  );
}

/**
 * Corregir un acta firmada.
 *
 * Pide la clave, avisa de que va a quedar escrito, y solo deja tocar datos de
 * forma. Los daños y el checklist no están aquí a propósito: cambiarlos no es
 * corregir un tecleo, es cambiar lo que el cliente aceptó, y eso exige volver
 * a firmarlo.
 */
function CorregirModal({
  acta,
  onClose,
  onSave,
}: {
  readonly acta: CompletedReception;
  readonly onClose: () => void;
  readonly onSave: (
    patch: Partial<Pick<CompletedReception, 'customer' | 'vehicle' | 'plate'>>,
  ) => void;
}) {
  const [clave, setClave] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [customer, setCustomer] = useState(acta.customer);
  const [vehicle, setVehicle] = useState(acta.vehicle);
  const [plate, setPlate] = useState(acta.plate);

  const check = checkDeleteCode(clave);
  const mostrarError = clave.trim().length >= 4 && !check.valid;
  const cambio =
    customer !== acta.customer || vehicle !== acta.vehicle || plate !== acta.plate;

  return (
    <Modal
      open
      width="sm"
      onClose={onClose}
      onSubmit={() => {
        if (!abierto) {
          if (check.valid) setAbierto(true);
          return;
        }
        if (!cambio) return;
        onSave({ customer, vehicle, plate });
        onClose();
      }}
      title={abierto ? 'Corregir el acta' : 'Acta bloqueada'}
      subtitle={acta.code}
      footer={
        <>
          <span className="hidden flex-1 sm:block" />
          <div className="flex flex-1 gap-3 sm:flex-none">
            <button
              type="button"
              onClick={onClose}
              className="h-11 flex-1 whitespace-nowrap rounded-control border border-border-strong px-4 text-sm font-semibold text-fg transition-colors duration-150 hover:bg-surface-sunken sm:flex-none sm:px-5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={abierto ? !cambio : !check.valid}
              className={cn(
                'inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-control text-sm font-semibold',
                'whitespace-nowrap px-4 sm:flex-none sm:px-5',
                (abierto ? cambio : check.valid)
                  ? 'bg-romero-500 text-white hover:bg-romero-600 active:scale-[0.98]'
                  : 'cursor-not-allowed bg-surface-sunken text-fg-subtle',
              )}
            >
              {abierto ? <Check aria-hidden className="size-4" /> : <Unlock aria-hidden className="size-4" />}
              {abierto ? 'Guardar corrección' : 'Desbloquear'}
            </button>
          </div>
        </>
      }
    >
      <p className="flex items-start gap-2 rounded-panel border border-warn-500/40 bg-warn-100 px-4 py-3 text-sm text-warn-700">
        <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
        <span>
          El cliente ya firmó esta acta. Lo que cambies queda escrito con la hora y tu nombre, y
          se ve en la propia acta.
        </span>
      </p>

      {!abierto ? (
        <Field
          label="Clave de confirmación"
          required
          hint="No es una contraseña: solo evita que se corrija de un toque sin querer."
          error={mostrarError ? check.problem : undefined}
        >
          <Input
            autoFocus
            type="password"
            inputMode="numeric"
            autoComplete="off"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
            placeholder="••••"
            className="font-mono tracking-[0.3em]"
          />
        </Field>
      ) : (
        <>
          <Field label="Cliente">
            <Input autoFocus value={customer} onChange={(e) => setCustomer(e.target.value)} />
          </Field>
          <Field label="Vehículo">
            <Input value={vehicle} onChange={(e) => setVehicle(e.target.value)} />
          </Field>
          <Field label="Placa">
            <Input
              value={plate}
              onChange={(e) => setPlate(e.target.value.toUpperCase())}
              className="font-mono font-bold tracking-[0.08em]"
            />
          </Field>
          {/* Lo que NO se corrige aquí, dicho donde se busca. */}
          <p className="text-xs text-fg-subtle">
            Los daños y el checklist no se corrigen aquí: cambiarlos no es arreglar un tecleo, es
            cambiar lo que el cliente aceptó, y eso exige volver a firmar. Haz una recepción nueva.
          </p>
        </>
      )}
    </Modal>
  );
}

function Dato({ label, value }: { readonly label: string; readonly value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-fg-subtle">{label}</dt>
      <dd data-numeric className="mt-0.5 text-sm text-fg">
        {value}
      </dd>
    </div>
  );
}

const SIN_DANOS: readonly { zone: string; kind: string }[] = [];
const SIN_FOTOS: readonly EvidencePhoto[] = [];
