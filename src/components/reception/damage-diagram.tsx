'use client';

import { useState } from 'react';
import { Camera, RotateCcw } from 'lucide-react';
import {
  CANVAS,
  DAMAGE_KINDS,
  ZONES,
  describe,
  kindInfo,
  markAt,
  summarize,
  toggleMark,
  type DamageKind,
  type DamageMark,
} from '@/features/reception/services/damage-map';
import { PhotoCapture } from '@/components/evidence/photo-capture';
import { Modal } from '@/components/ui/modal';
import { cn } from '@/lib/utils/cn';

/**
 * Diagrama de daños al ingreso.
 *
 * Es la prueba de en qué estado entró el vehículo. Cuando el cliente vuelve
 * diciendo «ese golpe no estaba», lo que se mira es esto.
 *
 * Se usa de pie, junto al vehículo, con una tablet en una mano: primero se
 * elige el tipo de daño, luego se toca la zona. Ese orden y no el contrario
 * —tocar y que salga un menú— porque marcar ocho rayones seguidos es el caso
 * normal, y así son ocho toques en vez de veinticuatro.
 *
 * Cada zona es un rectángulo generoso y no el contorno recortado de la aleta:
 * el contorno se ve mejor en una captura y se falla al tocarlo con el dedo.
 */
export function DamageDiagram({
  marks,
  onChange,
  plate,
}: {
  readonly marks: readonly DamageMark[];
  readonly onChange: (next: readonly DamageMark[]) => void;
  /** Ancla las fotos a ESTE vehículo y no a «la zona» en abstracto. */
  readonly plate: string;
}) {
  const [kind, setKind] = useState<DamageKind>('rayon');
  const totals = summarize(marks);
  /* El tipo elegido ahora mismo. Se enseña dentro de cada círculo vacío para
     que se vea QUÉ va a pasar al tocar, antes de tocar. */
  const elegido = kindInfo(kind);
  /** La zona cuyas fotos se están mirando. */
  const [fotografiando, setFotografiando] = useState<(typeof ZONES)[number] | null>(null);

  const TONE = {
    leve: { dot: 'bg-warn-500', ring: 'stroke-warn-500', fill: 'fill-warn-500/20' },
    media: { dot: 'bg-warn-600', ring: 'stroke-warn-600', fill: 'fill-warn-600/25' },
    grave: { dot: 'bg-crit-500', ring: 'stroke-crit-500', fill: 'fill-crit-500/25' },
  } as const;

  return (
    <section className="rounded-panel border border-border bg-surface-raised p-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-base font-semibold tracking-tight text-fg">
          Daños al ingreso
        </h2>
        {marks.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="inline-flex items-center gap-1.5 rounded-control px-2 py-1 text-xs font-medium text-fg-muted transition-colors duration-150 hover:bg-surface-sunken hover:text-fg"
          >
            <RotateCcw aria-hidden className="size-3.5" />
            Empezar de nuevo
          </button>
        )}
      </header>

      {/* Primero el tipo, después la zona: marcar ocho rayones seguidos son
          ocho toques en vez de veinticuatro. */}
      <fieldset className="mt-4">
        <legend className="text-xs uppercase tracking-wide text-fg-subtle">
          1 · Qué tipo de daño
        </legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {DAMAGE_KINDS.map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => setKind(k.id)}
              aria-pressed={kind === k.id}
              className={cn(
                'flex h-11 items-center gap-2 rounded-control border px-3 text-sm transition-colors duration-150',
                kind === k.id
                  ? 'border-brand-600 bg-brand-50 font-semibold text-brand-700'
                  : 'border-border text-fg-muted hover:bg-surface-sunken',
              )}
            >
              <span
                aria-hidden
                data-numeric
                className={cn(
                  'grid size-6 shrink-0 place-items-center rounded-full text-[0.625rem] font-bold text-white',
                  TONE[k.severity].dot,
                )}
              >
                {k.mark}
              </span>
              {k.label}
            </button>
          ))}
        </div>
      </fieldset>

      <p className="mt-5 text-xs uppercase tracking-wide text-fg-subtle">
        2 · Dónde · toca la zona del vehículo
      </p>

      <div className="mt-3 grid gap-5 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
        <div className="mx-auto w-full max-w-[15rem]">
          <svg
            viewBox={`0 0 ${String(CANVAS.width)} ${String(CANVAS.height)}`}
            className="w-full"
            role="group"
            aria-label="Zonas del vehículo"
          >
            {/* Silueta de referencia. No es tocable: solo sitúa las zonas. */}
            <rect
              x="24"
              y="8"
              width="172"
              height="444"
              rx="56"
              className="fill-surface-sunken stroke-border"
              strokeWidth="2"
            />

            {ZONES.map((zone) => {
              const mark = markAt(marks, zone.id);
              const tone = mark === undefined ? null : TONE[kindInfo(mark.kind).severity];

              return (
                <g key={zone.id}>
                  <rect
                    x={zone.x}
                    y={zone.y}
                    width={zone.w}
                    height={zone.h}
                    rx="6"
                    className={cn(
                      'cursor-pointer transition-colors duration-150',
                      tone === null
                        ? 'fill-surface stroke-border-strong hover:fill-brand-50'
                        : cn(tone.fill, tone.ring),
                    )}
                    strokeWidth="1.5"
                    onClick={() => onChange(toggleMark(marks, zone.id, kind))}
                  >
                    <title>{zone.label}</title>
                  </rect>

                  {mark !== undefined && (
                    <text
                      x={zone.x + zone.w / 2}
                      y={zone.y + zone.h / 2 + 5}
                      textAnchor="middle"
                      className="pointer-events-none fill-fg font-display text-[14px] font-bold"
                    >
                      {kindInfo(mark.kind).mark}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          <p className="mt-2 text-center text-[0.6875rem] text-fg-subtle">
            Izquierda y derecha son las <strong className="font-semibold">del vehículo</strong>.
          </p>
        </div>

        <div className="min-w-0">
          {/*
            Los mismos botones en lista.

            No es una leyenda ni un resumen: es la MISMA acción que la figura,
            escrita. Existe por tres razones y ninguna es decorativa —el
            diagrama no se puede recorrer con teclado ni leer con lector de
            pantalla; el dedo falla al acertar en una aleta pequeña; y quien
            no conoce el dibujo reconoce «Aleta trasera derecha» al leerlo—.

            ⚠️ Se veía como un radio apagado y por eso parecía que no servía
            para nada: círculo vacío, texto gris y sin borde. Ahora cada fila
            es un botón con su contorno, y el círculo enseña EN GRIS la letra
            del daño elegido, de modo que se ve qué va a pasar antes de tocar.
          */}
          <p className="text-xs text-fg-muted">
            <span className="font-semibold text-fg">O elige la zona por su nombre.</span>{' '}
            Es la misma lista del dibujo. Toca una para marcarla con{' '}
            <span
              data-numeric
              className={cn(
                'mx-0.5 inline-grid size-4 translate-y-0.5 place-items-center rounded-full text-[0.5rem] font-bold text-white',
                TONE[elegido.severity].dot,
              )}
            >
              {elegido.mark}
            </span>{' '}
            <span className="font-medium text-fg">{elegido.label}</span>, y vuelve a tocarla para
            quitarla.
          </p>

          <ul className="mt-3 space-y-1.5">
            {ZONES.map((zone) => {
              const mark = markAt(marks, zone.id);
              const tone = mark === undefined ? null : TONE[kindInfo(mark.kind).severity];

              return (
                <li key={zone.id}>
                  {/*
                    Una zona por fila y la cámara a su lado. En dos columnas la
                    fila era estrecha y no cabía nada más; en una cabe el botón
                    de la foto, que es lo que de verdad sostiene el parte: «así
                    llegó» se prueba con una imagen, no con una letra.
                  */}
                  <div
                    className={cn(
                      'flex items-center gap-2 rounded-control border pr-1.5 transition-colors duration-150',
                      mark === undefined
                        ? 'border-border hover:border-brand-600/50'
                        : 'border-transparent bg-surface-sunken',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => onChange(toggleMark(marks, zone.id, kind))}
                      aria-pressed={mark !== undefined}
                      title={
                        mark === undefined
                          ? `Marcar ${zone.label} como ${elegido.label}`
                          : `Quitar la marca de ${zone.label}`
                      }
                      className={cn(
                        /* Alto de 40 px: es un objetivo táctil para un dedo de
                           pie junto al vehículo, no una línea de texto. */
                        'flex min-w-0 flex-1 items-center gap-2 rounded-control px-2.5 py-2 text-left text-xs',
                        'transition-colors duration-150',
                        mark === undefined
                          ? 'text-fg-muted hover:text-fg'
                          : 'font-medium text-fg',
                      )}
                    >
                      <span
                        aria-hidden
                        data-numeric
                        className={cn(
                          'grid size-5 shrink-0 place-items-center rounded-full text-[0.5625rem] font-bold',
                          /* Vacío: contorno discontinuo y la letra del daño
                             elegido en gris. Dice «aquí cabe una marca» en vez
                             de «esto no hace nada». */
                          tone === null
                            ? 'border border-dashed border-border-strong text-fg-subtle'
                            : cn(tone.dot, 'text-white'),
                        )}
                      >
                        {mark === undefined ? elegido.mark : kindInfo(mark.kind).mark}
                      </span>
                      <span className="min-w-0 truncate">{zone.label}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFotografiando(zone)}
                      aria-label={`Fotos de ${zone.label}`}
                      title={`Fotos de ${zone.label}`}
                      className="grid size-9 shrink-0 place-items-center rounded-control text-fg-subtle transition-colors duration-150 hover:bg-surface hover:text-brand-700"
                    >
                      <Camera aria-hidden className="size-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      {fotografiando !== null && (
        <Modal
          open
          width="sm"
          onClose={() => setFotografiando(null)}
          title={fotografiando.label}
          subtitle="Cómo llegó, o de qué viene el daño."
        >
          <PhotoCapture
            anchor={`danos:${plate}:${fotografiando.id}`}
            title={`${fotografiando.label} · ${plate}`}
            hint="En el móvil se abre la cámara; en la computadora, el visor o un archivo."
          />
        </Modal>
      )}

      <footer className="mt-5 border-t border-border pt-4">
        <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <span data-numeric className="font-semibold text-fg">
            {totals.total} {totals.total === 1 ? 'zona marcada' : 'zonas marcadas'}
          </span>
          {totals.grave > 0 && (
            <span data-numeric className="text-crit-700">
              {totals.grave} grave{totals.grave === 1 ? '' : 's'}
            </span>
          )}
          {totals.media > 0 && (
            <span data-numeric className="text-warn-700">
              {totals.media} media{totals.media === 1 ? '' : 's'}
            </span>
          )}
          {totals.leve > 0 && (
            <span data-numeric className="text-fg-muted">
              {totals.leve} leve{totals.leve === 1 ? '' : 's'}
            </span>
          )}
        </p>

        {/* El parte escrito: es lo que va al acta y lo que se lee en voz alta
            delante del cliente. Un diagrama no se puede leer por teléfono. */}
        <p className="mt-2 text-xs leading-relaxed text-fg-muted">{describe(marks)}</p>
      </footer>
    </section>
  );
}
