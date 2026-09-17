'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, FileText, Loader2, TriangleAlert } from 'lucide-react';
import { coverageOf, isDocumented } from '@/features/evidence/services/coverage';
import { orderIdForReception } from '@/features/orders/services/from-reception';
import { usePhotoCount } from '@/features/evidence/use-photo-count';
import { checkActa, type CompletedReception } from '@/features/reception/services/acta';
import { CHECKLIST, sectionProgress } from '@/features/reception/services/checklist';
import { summarize, ZONES, type DamageMark } from '@/features/reception/services/damage-map';
import { useChecklistState } from '@/features/reception/use-checklist-state';
import { useReceptions } from '@/features/reception/use-receptions';
import { usePersistentState } from '@/lib/demo/store';
import { cn } from '@/lib/utils/cn';
import {
  damageSlot,
  partPhotoAnchor,
  signatureSlot,
  signerSlot,
} from '@/features/reception/services/slots';

/** Las mismas seis tomas del paso 5. Si cambian allí, cambian aquí. */
const TOMAS = ['frontal', 'trasera', 'lateral-izquierdo', 'lateral-derecho', 'tablero', 'interior'];

/**
 * Paso 7 — confirmar el ingreso y abrir la orden.
 *
 * ── Por qué es un paso aparte de la firma ──────────────────────────────────
 *
 * Son dos actos distintos. La firma es del CLIENTE aceptando el estado en que
 * entrega el vehículo; esto es del TALLER dando el ingreso por bueno y
 * abriendo el trabajo. Quien firma y quien confirma no son la misma persona,
 * y juntarlo dejaría al cliente abriendo órdenes.
 *
 * ── Qué impide confirmar y qué solo avisa ──────────────────────────────────
 *
 * Bloquea lo que hace que el acta no pruebe nada —checklist a medias, sin
 * firma—. Avisa lo que puede faltar por una razón legítima: una foto de una
 * zona que no se ve. Bloquear por una foto deja el coche en el patio sin
 * orden, que le cuesta más al taller que la foto que falta. Ver `acta.ts`.
 */
export function ReceptionConfirmation({
  vehicle,
  plate,
  customer,
  advisorName,
}: {
  readonly vehicle: string;
  readonly plate: string;
  readonly customer: string;
  readonly advisorName: string;
}) {
  const [damage] = usePersistentState<readonly DamageMark[]>(damageSlot(plate), SIN_DANOS);
  const [firma] = usePersistentState<string | null>(signatureSlot(plate), null);
  const [firmante] = usePersistentState(signerSlot(plate), customer);
  const checklist = useChecklistState();
  const { close } = useReceptions();

  const [cerrando, setCerrando] = useState(false);
  const [acta, setActa] = useState<CompletedReception | null>(null);
  const [error, setError] = useState<string | null>(null);

  const revisados = CHECKLIST.reduce((n, s) => n + sectionProgress(s, checklist).done, 0);
  const total = CHECKLIST.reduce((n, s) => n + s.items.length, 0);
  const totales = summarize(damage);

  /* ZONES y TOMAS son constantes: el número de llamadas no cambia entre
     renders, que es lo único que la regla de los hooks exige. */
  const zonas = ZONES.map((zone) => ({
    id: zone.id,
    label: zone.label,
    marcada: damage.some((m) => m.zone === zone.id),
    // eslint-disable-next-line react-hooks/rules-of-hooks -- ZONES es constante
    photos: usePhotoCount(partPhotoAnchor(plate, zone.id)),
  }));
  // eslint-disable-next-line react-hooks/rules-of-hooks -- TOMAS es constante
  const tomas = TOMAS.map((t) => usePhotoCount(`recepcion:${plate}:${t}`));

  const cobertura = coverageOf(
    zonas.filter((z) => z.marcada).map(({ id, label, photos }) => ({ id, label, photos })),
    tomas,
  );
  const fotos = zonas.reduce((n, z) => n + z.photos, 0) + tomas.reduce((n, t) => n + t, 0);

  const revision = checkActa({
    checklistResolved: revisados,
    checklistTotal: total,
    signed: firma !== null,
    damagedWithoutPhoto: cobertura.missing.length,
    generalShots: cobertura.shots,
    generalShotsTotal: cobertura.shotsTotal,
  });

  const confirmar = (): void => {
    if (!revision.ready || cerrando) return;
    setCerrando(true);
    setError(null);

    const cerrada = close(
      {
        plate,
        vehicle,
        customer: firmante,
        customerId: null,
        checklistResolved: revisados,
        checklistTotal: total,
        damageCount: totales.total,
        photoCount: fotos,
        customerSignature:
          firma === null
            ? null
            : { dataUrl: firma, name: firmante, signedAt: new Date().toISOString() },
        advisorName,
      },
      new Date(),
    );

    setCerrando(false);
    if (cerrada === null) {
      setError('No cupo en el navegador. Libera espacio con «Comenzar de nuevo» y vuelve a intentarlo.');
      return;
    }
    setActa(cerrada);
  };

  if (acta !== null) return <ActaCerrada acta={acta} />;

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-fg lg:text-[1.75rem]">
            Confirmar la recepción
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            {vehicle} · <span data-numeric>{plate}</span>
          </p>
        </div>
        <p data-numeric className="text-sm text-fg-subtle">
          Paso 7 de 7
        </p>
      </header>

      <section className="rounded-panel border border-border bg-surface-raised p-5">
        <h2 className="font-display text-base font-semibold tracking-tight text-fg">
          Resumen del ingreso
        </h2>
        <dl className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">
          <Dato label="Checklist" value={`${String(revisados)} de ${String(total)}`} />
          <Dato label="Daños anotados" value={totales.total === 0 ? 'Ninguno' : String(totales.total)} />
          <Dato label="Fotos" value={String(fotos)} />
          <Dato label="Firma" value={firma === null ? 'Falta' : firmante} />
        </dl>

        {firma !== null && (
          <div className="mt-4 max-w-xs rounded-control border border-border bg-surface p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={firma} alt={`Firma de ${firmante}`} className="h-20 w-full object-contain" />
            <p className="mt-1 text-center text-[0.625rem] text-fg-subtle">{firmante}</p>
          </div>
        )}
      </section>

      {revision.blockers.length > 0 && (
        <section className="rounded-panel border border-crit-500/40 bg-crit-100 px-5 py-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-crit-700">
            <TriangleAlert aria-hidden className="size-4" />
            Falta esto para poder confirmar
          </p>
          <ul className="mt-2 space-y-1 text-sm text-crit-700">
            {revision.blockers.map((b) => (
              <li key={b}>· {b}</li>
            ))}
          </ul>
        </section>
      )}

      {revision.warnings.length > 0 && (
        <section className="rounded-panel border border-warn-500/40 bg-warn-100 px-5 py-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-warn-700">
            <TriangleAlert aria-hidden className="size-4" />
            Puedes confirmar igual, pero conviene saberlo
          </p>
          <ul className="mt-2 space-y-1 text-sm text-warn-700">
            {revision.warnings.map((w) => (
              <li key={w}>· {w}</li>
            ))}
          </ul>
        </section>
      )}

      {isDocumented(cobertura) && revision.ready && (
        <section className="rounded-panel border border-ok-500/40 bg-ok-100 px-5 py-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-ok-700">
            <Check aria-hidden className="size-4" />
            Todo documentado. El vehículo puede entrar al taller.
          </p>
        </section>
      )}

      {error !== null && (
        <p className="flex items-start gap-2 rounded-panel border border-crit-500/40 bg-crit-100 px-4 py-3 text-sm text-crit-700">
          <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      <section className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur lg:-mx-6 lg:px-6">
        <p className="text-xs text-fg-subtle">
          Al confirmar se cierra el acta y se abre la orden de trabajo.
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/recepcion/nueva/firma"
            className="inline-flex h-11 items-center gap-2 rounded-control border border-border-strong bg-surface-raised px-4 text-sm font-medium text-fg transition-colors duration-150 hover:bg-surface-sunken"
          >
            <ArrowLeft aria-hidden className="size-4" />
            Anterior
          </Link>
          <button
            type="button"
            onClick={confirmar}
            disabled={!revision.ready || cerrando}
            className={cn(
              'inline-flex h-11 items-center gap-2 rounded-control px-5 text-sm font-semibold',
              'transition-colors duration-150',
              revision.ready && !cerrando
                ? 'bg-romero-500 text-white hover:bg-romero-600 active:scale-[0.98]'
                : 'cursor-not-allowed bg-surface-sunken text-fg-subtle',
            )}
          >
            {cerrando ? (
              <Loader2 aria-hidden className="size-4 animate-spin" />
            ) : (
              <Check aria-hidden className="size-4" />
            )}
            {cerrando ? 'Cerrando…' : 'Confirmar y abrir la orden'}
          </button>
        </div>
      </section>
    </>
  );
}

/**
 * Lo que se ve cuando ya está cerrada.
 *
 * Los dos códigos, grandes y seleccionables: alguien los va a decir por
 * teléfono y otro los va a escribir a mano. Un «listo» con una palomita no
 * sirve para nada cuando media hora después hay que buscar esa recepción.
 */
function ActaCerrada({ acta }: { readonly acta: CompletedReception }) {
  return (
    <>
      <section className="rounded-panel border border-ok-500/40 bg-ok-100 px-6 py-7 text-center">
        <span aria-hidden className="mx-auto grid size-12 place-items-center rounded-full bg-ok-600 text-white">
          <Check className="size-6" />
        </span>
        <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight text-ok-700">
          Recepción cerrada
        </h1>
        <p className="mt-1 text-sm text-ok-700/85">
          {acta.vehicle} · {acta.plate} · recibido de {acta.customer}
        </p>

        <dl className="mx-auto mt-6 grid max-w-md gap-3 sm:grid-cols-2">
          <div className="rounded-panel border border-ok-500/30 bg-surface-raised px-4 py-3">
            <dt className="text-xs uppercase tracking-wide text-fg-subtle">Acta</dt>
            <dd data-numeric className="mt-0.5 select-all font-mono text-base font-bold text-fg">
              {acta.code}
            </dd>
          </div>
          <div className="rounded-panel border border-ok-500/30 bg-surface-raised px-4 py-3">
            <dt className="text-xs uppercase tracking-wide text-fg-subtle">Orden de trabajo</dt>
            <dd data-numeric className="mt-0.5 select-all font-mono text-base font-bold text-fg">
              {acta.orderCode}
            </dd>
          </div>
        </dl>
      </section>

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
        </dl>

        {/*
          Lo que esto NO es, dicho aquí y no en una nota al pie: sin base de
          datos la orden no aparece todavía en el taller, y descubrirlo al
          buscarla sería exactamente el tipo de sorpresa que hace desconfiar
          de todo lo demás.
        */}
        <p className="mt-5 rounded-control border border-border bg-surface-sunken px-4 py-3 text-xs leading-relaxed text-fg-muted">
          El acta queda en este navegador y aparece en «Recepciones de hoy». Cuando haya base de
          datos, este mismo paso abrirá la orden en el taller y la verá todo el mundo.
        </p>
      </section>

      {/*
        ⚠️ Aquí faltaba la puerta.
        El botón de arriba promete «Confirmar y abrir la orden», la pantalla
        enseña el código de la orden… y las únicas dos salidas eran volver a
        recepción o recibir otro vehículo. Quien acababa de recibir un
        vehículo se quedaba sin saber a dónde ir —y con razón: la orden que
        se le acababa de abrir no se enlazaba desde ninguna parte—.
      */}
      <section className="rounded-panel border border-border bg-surface-raised p-5">
        <h2 className="font-display text-base font-semibold tracking-tight text-fg">
          ¿Y ahora qué?
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">
          El vehículo ya está recibido. El trabajo continúa en la orden{' '}
          <span data-numeric className="font-mono font-semibold text-fg">
            {acta.orderCode}
          </span>
          : allí se asigna el técnico y se envía a diagnóstico. La orden lleva su{' '}
          <span className="font-semibold text-fg">expediente de trabajo</span>, que dice
          en cada momento cuál es el paso siguiente.
        </p>

        <Link
          href={`/ordenes/${orderIdForReception(acta.code)}`}
          className="mt-4 inline-flex h-12 items-center gap-2 rounded-control bg-romero-500 px-5 text-sm font-semibold text-white transition-colors duration-150 hover:bg-romero-600 active:scale-[0.98]"
        >
          Abrir la orden {acta.orderCode}
          <ArrowRight aria-hidden className="size-4" />
        </Link>
      </section>

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/recepcion/acta/${encodeURIComponent(acta.code)}`}
          className="inline-flex h-11 items-center gap-2 rounded-control border border-border-strong px-5 text-sm font-medium text-fg transition-colors duration-150 hover:bg-surface-sunken"
        >
          Ver el acta {acta.code}
        </Link>
        <Link
          href="/recepcion"
          className="inline-flex h-11 items-center gap-2 rounded-control border border-border-strong px-5 text-sm font-medium text-fg transition-colors duration-150 hover:bg-surface-sunken"
        >
          Ir a recepción
        </Link>
        <Link
          href="/recepcion/nueva"
          className="inline-flex h-11 items-center gap-2 rounded-control border border-border-strong px-5 text-sm font-medium text-fg transition-colors duration-150 hover:bg-surface-sunken"
        >
          Recibir otro vehículo
        </Link>
      </div>
    </>
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

const SIN_DANOS: readonly DamageMark[] = [];
