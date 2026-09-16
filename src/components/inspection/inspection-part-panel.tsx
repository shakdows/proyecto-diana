'use client';

import { useState } from 'react';
import { Check, CircleHelp, Trash2, TriangleAlert, X } from 'lucide-react';
import { Field } from '@/components/ui/field';
import { Textarea } from '@/components/ui/input';
import { PhotoCapture } from '@/components/evidence/photo-capture';
import type { DamageKind } from '@/features/reception/services/damage-map';
import {
  ACTION_LABELS,
  OBSERVATION_KINDS,
  canSave,
  type PartAction,
  type PartRecord,
} from '@/features/inspection/services/reception-inspection';
import { statusInfo, type Hotspot } from '@/features/inspection/services/hotspots';
import { cn } from '@/lib/utils/cn';

/**
 * Lo que se abre al tocar una pieza durante la recepción.
 *
 * ── Tres botones antes que un formulario ───────────────────────────────────
 *
 * La mayoría de las piezas de la mayoría de los vehículos están bien. Ese
 * caso tiene que costar UN toque, no un formulario: por eso «Conforme»
 * guarda y cierra, y los campos de la observación solo aparecen al elegir
 * «Con observación». Enseñarlos siempre convierte quince zonas en cuarenta y
 * cinco campos, y nadie llega al final.
 *
 * ── Se guarda solo ─────────────────────────────────────────────────────────
 *
 * Cada pieza se guarda en cuanto se decide. No hay un «Guardar todo» al final
 * porque una recepción se interrumpe siempre —llega otro cliente, suena el
 * teléfono— y lo que se perdería son las quince zonas ya miradas.
 */
export function InspectionPartPanel({
  hotspot,
  record,
  photoAnchor,
  onSave,
  onClear,
  onClose,
}: {
  readonly hotspot: Hotspot;
  /** Lo anotado hasta ahora, si lo hay. */
  readonly record: PartRecord | undefined;
  /** Dónde se guardan las fotos de ESTA pieza. */
  readonly photoAnchor: string;
  readonly onSave: (input: { action: PartAction; kind?: DamageKind; note?: string }) => void;
  readonly onClear: () => void;
  readonly onClose: () => void;
}) {
  /*
   * ⚠️ Quien use este panel DEBE darle `key={hotspot.id}`.
   *
   * Al cambiar de pieza, el panel tiene que empezar donde esté ESA pieza y no
   * donde estaba la anterior. La forma antigua era copiar las props a estado
   * dentro de un efecto; remontar con una `key` hace lo mismo sin un
   * renderizado de más y sin que el panel enseñe durante un fotograma los
   * datos de la pieza que se acaba de dejar.
   */
  const [action, setAction] = useState<PartAction | null>(record?.action ?? null);
  const [kind, setKind] = useState<DamageKind | undefined>(record?.kind);
  const [note, setNote] = useState(record?.note ?? '');

  const info = statusInfo(hotspot.status);

  const elegir = (siguiente: PartAction): void => {
    setAction(siguiente);
    /*
     * «Conforme» y «Pendiente» se guardan al instante: no hay nada más que
     * decir de ellas y pedir un segundo toque en «Guardar» es exactamente el
     * roce que hace que quince zonas se sientan como cuarenta y cinco.
     */
    if (siguiente !== 'observacion') {
      onSave({ action: siguiente, ...(note.trim() === '' ? {} : { note }) });
    }
  };

  const guardarObservacion = (): void => {
    if (!canSave({ action: 'observacion', kind })) return;
    onSave({ action: 'observacion', kind, ...(note.trim() === '' ? {} : { note }) });
  };

  return (
    <article className="mt-3 rounded-panel border border-border bg-surface p-4">
      <header className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-sm font-semibold uppercase tracking-[0.06em] text-fg">
            {hotspot.label}
          </h3>
          <p className="mt-0.5 text-xs text-fg-muted">
            Estado actual: <span className="font-semibold">{info.label}</span>
            {record !== undefined && ` · ${record.by}`}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar el panel"
          className="grid size-11 shrink-0 place-items-center rounded-control text-fg-subtle transition-colors hover:bg-surface-sunken hover:text-fg"
        >
          <X aria-hidden className="size-4" />
        </button>
      </header>

      {/* ── Los tres estados ─────────────────────────────────────────── */}
      <div role="group" aria-label="Estado de la pieza" className="mt-3 grid gap-2 sm:grid-cols-3">
        <Opcion
          activo={action === 'conforme'}
          onClick={() => elegir('conforme')}
          icon={<Check className="size-4" />}
          label={ACTION_LABELS.conforme}
          tono="ok"
        />
        <Opcion
          activo={action === 'observacion'}
          onClick={() => elegir('observacion')}
          icon={<TriangleAlert className="size-4" />}
          label={ACTION_LABELS.observacion}
          tono="crit"
        />
        <Opcion
          activo={action === 'pendiente'}
          onClick={() => elegir('pendiente')}
          icon={<CircleHelp className="size-4" />}
          label={ACTION_LABELS.pendiente}
          tono="warn"
        />
      </div>

      {/* ── Solo si hay observación ──────────────────────────────────── */}
      {action === 'observacion' && (
        <div className="mt-4 space-y-4 border-t border-border pt-4">
          <fieldset>
            <legend className="text-sm font-medium text-fg">
              Tipo de observación
              <span aria-hidden className="ml-0.5 text-crit-600">
                *
              </span>
            </legend>
            {/*
              La severidad NO se pregunta aparte: va DENTRO del tipo. Un rayón
              es leve y una rotura es grave siempre, y dejar elegir las dos
              cosas permite guardar «rotura leve», que en un peritaje no
              significa nada.
            */}
            <div className="mt-2 flex flex-wrap gap-2">
              {OBSERVATION_KINDS.map((k) => (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => setKind(k.id)}
                  aria-pressed={kind === k.id}
                  className={cn(
                    'inline-flex min-h-11 items-center gap-2 rounded-control border px-3 text-sm font-medium',
                    'transition-colors duration-150 ease-snap',
                    kind === k.id
                      ? 'border-crit-600 bg-crit-100 text-crit-700'
                      : 'border-border bg-surface text-fg hover:bg-surface-sunken',
                  )}
                >
                  <span
                    aria-hidden
                    className="grid size-5 place-items-center rounded-full bg-fg/10 text-[0.625rem] font-bold"
                  >
                    {k.mark}
                  </span>
                  {k.label}
                  <span className="text-xs text-fg-subtle">{severidad(k.severity)}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <Field label="Comentario" hint="Dónde está y qué tamaño tiene. Opcional.">
            <Textarea
              rows={2}
              value={note}
              maxLength={300}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Rayón de unos 12 cm junto al faro derecho."
            />
          </Field>

          <button
            type="button"
            onClick={guardarObservacion}
            disabled={kind === undefined}
            className={cn(
              'inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-control px-4 text-sm font-semibold sm:w-auto',
              kind === undefined
                ? 'cursor-not-allowed bg-surface-sunken text-fg-subtle'
                : 'bg-romero-500 text-white hover:bg-romero-600 active:scale-[0.98]',
            )}
          >
            <Check aria-hidden className="size-4" />
            Guardar observación
          </button>
          {kind === undefined && (
            <p className="text-xs text-fg-subtle">
              Elige el tipo: sin él, el parte no puede describir el daño.
            </p>
          )}
        </div>
      )}

      {/* ── Evidencia ────────────────────────────────────────────────── */}
      <div className="mt-4 border-t border-border pt-4">
        <PhotoCapture
          anchor={photoAnchor}
          title={`Foto de ${hotspot.label.toLowerCase()}`}
          hint={
            action === 'observacion'
              ? 'Una foto del daño es lo que se enseña cuando el cliente reclama. Para una rotura, tómala siempre.'
              : 'Opcional mientras no haya observación.'
          }
        />
      </div>

      {record !== undefined && (
        <button
          type="button"
          onClick={onClear}
          className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-fg-muted transition-colors hover:text-crit-700"
        >
          <Trash2 aria-hidden className="size-3.5" />
          Quitar lo anotado
        </button>
      )}
    </article>
  );
}

function severidad(s: 'leve' | 'media' | 'grave'): string {
  return s === 'leve' ? 'Leve' : s === 'media' ? 'Moderado' : 'Importante';
}

function Opcion({
  activo,
  onClick,
  icon,
  label,
  tono,
}: {
  readonly activo: boolean;
  readonly onClick: () => void;
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly tono: 'ok' | 'crit' | 'warn';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={cn(
        'flex min-h-12 items-center justify-center gap-2 rounded-control border px-3',
        'text-sm font-semibold transition-colors duration-150 ease-snap active:scale-[0.98]',
        !activo && 'border-border bg-surface text-fg hover:bg-surface-sunken',
        activo && tono === 'ok' && 'border-ok-600 bg-ok-100 text-ok-700',
        activo && tono === 'crit' && 'border-crit-600 bg-crit-100 text-crit-700',
        activo && tono === 'warn' && 'border-warn-600 bg-warn-100 text-warn-700',
      )}
    >
      <span aria-hidden className="shrink-0">
        {icon}
      </span>
      {label}
    </button>
  );
}
