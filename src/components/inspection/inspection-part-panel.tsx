'use client';

import { useState } from 'react';
import { Check, Trash2, X } from 'lucide-react';
import { Field } from '@/components/ui/field';
import { Textarea } from '@/components/ui/input';
import { PhotoCapture } from '@/components/evidence/photo-capture';
import type { DamageKind } from '@/features/reception/services/damage-map';
import {
  ACTION_LABELS,
  OBSERVATION_KINDS,
  type PartAction,
  type PartRecord,
} from '@/features/inspection/services/reception-inspection';
import { statusInfo, type Hotspot } from '@/features/inspection/services/hotspots';
import { cn } from '@/lib/utils/cn';

/**
 * Lo que se abre al tocar una pieza durante la recepción.
 *
 * ── Dos botones, y ya ──────────────────────────────────────────────────────
 *
 * ✓ está bien, ✗ tiene daño. Nada más, porque esa es la decisión que se toma
 * de pie, con el cliente al lado y quince piezas por delante.
 *
 * Antes eran tres botones y, al marcar el daño, un formulario obligatorio con
 * el tipo de golpe. Era más completo y era peor: quince zonas se convertían
 * en cuarenta y cinco decisiones, y un trámite que cuesta cuarenta y cinco
 * decisiones se acaba rellenando a lo tonto —o no se rellena—. El tipo sigue
 * estando, debajo y OPCIONAL, para quien quiera precisar.
 *
 * ── El comentario, siempre a la vista ──────────────────────────────────────
 *
 * También cuando la pieza está bien: «tiene los faros nuevos» o «el cliente
 * avisa de un ruido aquí» son cosas que se dicen en la recepción y que antes
 * no tenían dónde escribirse salvo declarando un daño que no existe.
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

  const guardar = (
    siguiente: PartAction,
    tipo: DamageKind | undefined,
    texto: string,
  ): void => {
    onSave({
      action: siguiente,
      ...(siguiente === 'observacion' && tipo !== undefined ? { kind: tipo } : {}),
      ...(texto.trim() === '' ? {} : { note: texto }),
    });
  };

  const elegir = (siguiente: PartAction): void => {
    setAction(siguiente);
    /* Al pasar de daño a bien, el tipo deja de tener sentido y se va con él. */
    const tipo = siguiente === 'observacion' ? kind : undefined;
    if (siguiente !== 'observacion') setKind(undefined);
    guardar(siguiente, tipo, note);
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

      {/* ── Bien o daño ──────────────────────────────────────────────── */}
      <div role="group" aria-label="Estado de la pieza" className="mt-3 grid gap-2 sm:grid-cols-2">
        <Opcion
          activo={action === 'conforme'}
          onClick={() => elegir('conforme')}
          icon={<Check className="size-5" strokeWidth={3} />}
          label={ACTION_LABELS.conforme}
          tono="ok"
        />
        <Opcion
          activo={action === 'observacion'}
          onClick={() => elegir('observacion')}
          icon={<X className="size-5" strokeWidth={3} />}
          label={ACTION_LABELS.observacion}
          tono="crit"
        />
      </div>

      {/* ── El tipo, solo si hay daño y solo si se quiere ─────────────── */}
      {action === 'observacion' && (
        <fieldset className="mt-3">
          <legend className="text-xs text-fg-subtle">
            ¿De qué tipo? Opcional: sin elegir, queda como «daño sin detallar».
          </legend>
          {/*
            La severidad NO se pregunta aparte: va DENTRO del tipo. Un rayón
            es leve y una rotura es grave siempre, y dejar elegir las dos
            cosas permite guardar «rotura leve», que en un peritaje no
            significa nada.
          */}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {OBSERVATION_KINDS.map((k) => {
              const elegido = kind === k.id;
              return (
                <button
                  key={k.id}
                  type="button"
                  onClick={() => {
                    /* Volver a pulsar el mismo tipo lo quita: se guardó por error. */
                    const siguiente = elegido ? undefined : k.id;
                    setKind(siguiente);
                    guardar('observacion', siguiente, note);
                  }}
                  aria-pressed={elegido}
                  className={cn(
                    'inline-flex min-h-11 items-center gap-1.5 rounded-control border px-3 text-sm font-medium',
                    'transition-colors duration-150 ease-snap',
                    elegido
                      ? 'border-crit-600 bg-crit-100 text-crit-700'
                      : 'border-border bg-surface text-fg hover:bg-surface-sunken',
                  )}
                >
                  {k.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {/* ── El comentario ────────────────────────────────────────────── */}
      <div className="mt-3">
        <Field
          label="Comentario"
          hint={
            action === null
              ? 'Se guarda al marcar ✓ o ✗.'
              : 'Se guarda al salir del campo.'
          }
        >
          <Textarea
            rows={2}
            value={note}
            maxLength={300}
            onChange={(e) => setNote(e.target.value)}
            /*
              Al salir del campo, y no en cada tecla: escribir en el almacén
              letra a letra reescribiría el registro —y su hora— treinta veces
              por comentario. Si todavía no hay ✓ ni ✗, no hay nada que
              guardar: el comentario entra con la decisión.
            */
            onBlur={() => {
              if (action === null) return;
              if ((record?.note ?? '') === note.trim()) return;
              guardar(action, kind, note);
            }}
            placeholder={
              action === 'observacion'
                ? 'Rayón de unos 12 cm junto al faro derecho.'
                : 'Lo que haga falta dejar dicho de esta pieza.'
            }
          />
        </Field>
      </div>

      {/* ── Evidencia ────────────────────────────────────────────────── */}
      <div className="mt-4 border-t border-border pt-4">
        <PhotoCapture
          anchor={photoAnchor}
          title={`Foto de ${hotspot.label.toLowerCase()}`}
          hint={
            action === 'observacion'
              ? 'Una foto del daño es lo que se enseña cuando el cliente reclama. Para una rotura, tómala siempre.'
              : 'Opcional mientras no haya daño marcado.'
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
  readonly tono: 'ok' | 'crit';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={activo}
      className={cn(
        'flex min-h-14 items-center justify-center gap-2.5 rounded-control border px-3',
        'text-base font-semibold transition-colors duration-150 ease-snap active:scale-[0.98]',
        !activo && 'border-border bg-surface text-fg hover:bg-surface-sunken',
        activo && tono === 'ok' && 'border-ok-600 bg-ok-600 text-white',
        activo && tono === 'crit' && 'border-crit-600 bg-crit-600 text-white',
      )}
    >
      <span aria-hidden className="shrink-0">
        {icon}
      </span>
      {label}
    </button>
  );
}
