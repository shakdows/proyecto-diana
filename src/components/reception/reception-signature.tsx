'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, TriangleAlert } from 'lucide-react';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { CHECKLIST, sectionProgress } from '@/features/reception/services/checklist';
import { useChecklistState } from '@/features/reception/use-checklist-state';
import { summarize, type DamageMark } from '@/features/reception/services/damage-map';
import { usePersistentState } from '@/lib/demo/store';
import { cn } from '@/lib/utils/cn';
import { SignaturePad } from './signature-pad';
import {
  damageSlot,
  signatureSlot,
  signerSlot,
} from '@/features/reception/services/slots';

/**
 * Paso 6 — la firma del cliente.
 *
 * ── Qué se firma ───────────────────────────────────────────────────────────
 *
 * No un botón que dice «acepto»: el RESUMEN de lo que se anotó. Arriba está
 * lo que el cliente está aceptando —cuántos daños se marcaron y cuáles, y
 * qué se revisó— y debajo el espacio para firmar. Firmar sin ver qué se firma
 * es lo que convierte un acta en un papel que no sostiene nada el día que hay
 * que enseñarlo.
 *
 * ── Por qué la firma no bloquea el paso anterior ───────────────────────────
 *
 * Porque se firma al final y no en medio: si se pudiera firmar antes de
 * terminar el checklist, el cliente estaría aceptando algo que todavía se
 * puede cambiar. Por eso este paso viene después de la evidencia y no antes.
 */
export function ReceptionSignature({
  vehicle,
  plate,
  customer,
}: {
  readonly vehicle: string;
  readonly plate: string;
  readonly customer: string;
}) {
  const router = useRouter();
  const [damage] = usePersistentState<readonly DamageMark[]>(damageSlot(plate), SIN_DANOS);
  const checklist = useChecklistState();
  const [firma, setFirma] = usePersistentState<string | null>(signatureSlot(plate), null);
  const [nombre, setNombre] = usePersistentState(signerSlot(plate), customer);

  const [trazo, setTrazo] = useState<string | null>(firma);
  const totales = summarize(damage);
  const revisados = CHECKLIST.reduce((n, s) => n + sectionProgress(s, checklist).done, 0);
  const total = CHECKLIST.reduce((n, s) => n + s.items.length, 0);

  const listo = trazo !== null && nombre.trim() !== '';

  const continuar = (): void => {
    if (!listo) return;
    setFirma(trazo);
    router.push('/recepcion/nueva/confirmacion');
  };

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-fg lg:text-[1.75rem]">
            Firma del cliente
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            {vehicle} · <span data-numeric>{plate}</span>
          </p>
        </div>
        <p data-numeric className="text-sm text-fg-subtle">
          Paso 6 de 7
        </p>
      </header>

      {/* Lo que se firma, antes del sitio donde se firma. Un acta que se firma
          sin ver qué dice no sostiene nada el día que hay que enseñarla. */}
      <section className="rounded-panel border border-border bg-surface-raised p-5">
        <h2 className="font-display text-base font-semibold tracking-tight text-fg">
          Esto es lo que se acepta
        </h2>

        <dl className="mt-4 grid gap-x-8 gap-y-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs uppercase tracking-wide text-fg-subtle">Checklist</dt>
            <dd data-numeric className="mt-0.5 text-sm text-fg">
              {revisados} de {total} puntos revisados
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-fg-subtle">Daños anotados</dt>
            <dd data-numeric className="mt-0.5 text-sm text-fg">
              {totales.total === 0 ? 'Ninguno' : `${String(totales.total)} zonas`}
              {totales.grave > 0 && (
                <span className="ml-1.5 text-crit-700">{totales.grave} grave(s)</span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-fg-subtle">Vehículo</dt>
            <dd className="mt-0.5 text-sm text-fg">{vehicle}</dd>
          </div>
        </dl>

        {totales.total > 0 && (
          <p className="mt-4 flex items-start gap-2 rounded-control border border-warn-500/30 bg-warn-100 px-3.5 py-2.5 text-xs text-warn-700">
            <TriangleAlert aria-hidden className="mt-px size-3.5 shrink-0" />
            <span>
              Léele en voz alta los daños anotados antes de que firme. Es lo que evita la
              discusión de la entrega.
            </span>
          </p>
        )}
      </section>

      <section className="rounded-panel border border-border bg-surface-raised p-5">
        <Field label="Quién firma" required hint="Como aparece en su documento.">
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder={customer} />
        </Field>

        <div className="mt-4">
          <SignaturePad onChange={setTrazo} />
        </div>

        {trazo !== null && (
          <p className="mt-3 flex items-center gap-1.5 text-sm text-ok-700">
            <Check aria-hidden className="size-4" />
            Firma capturada.
          </p>
        )}
      </section>

      <section className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur lg:-mx-6 lg:px-6">
        <p className="text-xs text-fg-subtle">La firma se guarda al continuar.</p>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/recepcion/nueva/evidencia"
            className="inline-flex h-11 items-center gap-2 rounded-control border border-border-strong bg-surface-raised px-4 text-sm font-medium text-fg transition-colors duration-150 hover:bg-surface-sunken"
          >
            <ArrowLeft aria-hidden className="size-4" />
            Anterior
          </Link>
          <button
            type="button"
            onClick={continuar}
            disabled={!listo}
            title={listo ? undefined : 'Falta la firma o el nombre de quien firma.'}
            className={cn(
              'inline-flex h-11 items-center gap-2 rounded-control px-4 text-sm font-semibold',
              'transition-colors duration-150',
              listo
                ? 'bg-brand-600 text-white hover:bg-brand-700 active:scale-[0.98]'
                : 'cursor-not-allowed bg-surface-sunken text-fg-subtle',
            )}
          >
            Continuar a confirmación
            <ArrowRight aria-hidden className="size-4" />
          </button>
        </div>
      </section>
    </>
  );
}

const SIN_DANOS: readonly DamageMark[] = [];
