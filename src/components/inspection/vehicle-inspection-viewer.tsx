'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Camera,
  RotateCcw,
  Video,
  X,
  ZoomIn,
} from 'lucide-react';
import {
  DEFAULT_VIEW,
  VIEWS,
  nextView,
  viewById,
  type ViewId,
} from '@/features/inspection/services/views';
import {
  alertsByView,
  bySeverity,
  hotspotsForView,
  statusInfo,
  summarize,
  summaryPhrase,
  type Hotspot,
  type InspectionStatus,
} from '@/features/inspection/services/hotspots';
import { InspectionCanvas } from './inspection-canvas';
import { cn } from '@/lib/utils/cn';

/**
 * Inspección visual del vehículo.
 *
 * El vehículo no es una ilustración de adorno: es la superficie sobre la que
 * se consulta en qué estado está cada parte. Se cambia de ángulo, los puntos
 * se recolocan solos, y al tocar uno se abre lo que se vio ahí sin salir de
 * la pantalla.
 *
 * ── Lo que este componente NO sabe ─────────────────────────────────────────
 *
 * De dónde salen los puntos. Los recibe ya hechos, así que sirve igual para
 * la recepción —donde documentan el estado de entrada—, para el diagnóstico
 * —donde son sistemas: motor, frenos, suspensión— y para calidad. No hay un
 * modelo escrito dentro: funciona con cualquier vehículo.
 *
 * ── Los puntos van ENCIMA del dibujo, no dentro ────────────────────────────
 *
 * Son botones de verdad, colocados por porcentaje. Eso los hace responsivos
 * sin recalcular nada, accesibles con el teclado, y —lo importante—
 * independientes de la silueta: rehacer el dibujo los deja donde están y no
 * mueve ningún registro. La decisión y sus motivos están en
 * `inspection/services/hotspots.ts`.
 */

/** Cuánto dura el cambio de vista. Por debajo de 150 ms no se percibe. */
const TRANSICION_MS = 200;

const TONO: Readonly<Record<InspectionStatus, { punto: string; texto: string; chip: string }>> = {
  problema: {
    punto: 'bg-crit-600 text-white ring-white/70',
    texto: 'text-crit-700',
    chip: 'bg-crit-100 text-crit-700',
  },
  revisar: {
    punto: 'bg-warn-600 text-white ring-white/70',
    texto: 'text-warn-700',
    chip: 'bg-warn-100 text-warn-700',
  },
  info: {
    punto: 'bg-brand-600 text-white ring-white/70',
    texto: 'text-brand-700',
    chip: 'bg-brand-600/10 text-brand-700',
  },
  ok: {
    punto: 'bg-ok-600 text-white ring-white/70',
    texto: 'text-ok-700',
    chip: 'bg-ok-100 text-ok-700',
  },
  pendiente: {
    punto: 'bg-surface text-fg-subtle ring-border-strong',
    texto: 'text-fg-subtle',
    chip: 'bg-surface-sunken text-fg-muted',
  },
};

export function VehicleInspectionViewer({
  vehicle,
  plate,
  equipmentKind = 'vehiculo',
  hotspots,
  view: viewProp,
  onViewChange,
  onHotspotClick,
  panel,
  progress,
  footer,
}: {
  readonly vehicle: string;
  readonly plate?: string;
  readonly equipmentKind?: 'vehiculo' | 'maquinaria';
  readonly hotspots: readonly Hotspot[];
  /** Si se pasa, quien llama manda sobre la vista activa. */
  readonly view?: ViewId;
  readonly onViewChange?: (view: ViewId) => void;
  readonly onHotspotClick?: (hotspot: Hotspot) => void;
  /**
   * Lo que se abre al tocar un punto.
   *
   * Sin esto se enseña la ficha de solo lectura, que es lo que necesita la
   * orden. La recepción pasa aquí su panel de edición: así hay UN visor y no
   * dos que se parecen, que es como empiezan las divergencias.
   */
  readonly panel?: (hotspot: Hotspot, close: () => void) => React.ReactNode;
  /** Barra de avance opcional, encima de las miniaturas. */
  readonly progress?: React.ReactNode;
  /** Lo que va debajo, a la derecha de las miniaturas. */
  readonly footer?: React.ReactNode;
}) {
  const [interna, setInterna] = useState<ViewId>(DEFAULT_VIEW);
  const view = viewProp ?? interna;

  /** Se apaga un instante al cambiar de vista: es la transición. */
  const [cambiando, setCambiando] = useState(false);
  const [abierto, setAbierto] = useState<Hotspot | null>(null);
  const [zoom, setZoom] = useState(false);
  const temporizador = useRef<ReturnType<typeof setTimeout> | null>(null);

  const puntos = useMemo(() => hotspotsForView(hotspots, view), [hotspots, view]);

  /*
   * El punto abierto se vuelve a leer de la lista en cada renderizado.
   *
   * Sin esto, anotar «conforme» en el panel dejaba el panel enseñando el
   * estado viejo: el visor tendría una copia del punto de cuando se abrió, y
   * habría DOS fuentes de verdad. Se guarda solo el identificador.
   */
  const activo = useMemo(
    () => (abierto === null ? null : puntos.find((h) => h.id === abierto.id) ?? abierto),
    [abierto, puntos],
  );
  const resumen = useMemo(() => summarize(hotspots), [hotspots]);
  const avisos = useMemo(() => alertsByView(hotspots), [hotspots]);

  const irA = useCallback(
    (destino: ViewId): void => {
      if (destino === view) return;
      /*
       * El cambio NO es instantáneo a propósito: sin la transición, pasar de
       * «superior» a «frontal» parece que la pantalla se rompió y volvió. Con
       * doscientos milisegundos de fundido, se lee como girar el vehículo.
       */
      setCambiando(true);
      if (temporizador.current !== null) clearTimeout(temporizador.current);
      temporizador.current = setTimeout(() => {
        if (viewProp === undefined) setInterna(destino);
        onViewChange?.(destino);
        setCambiando(false);
        /*
         * La pieza abierta se conserva SI también se ve en la nueva vista: el
         * capó se mira de frente y luego de lado sin perder lo que se estaba
         * anotando. Si no está, el panel se cierra limpiamente en vez de
         * quedarse señalando algo que ya no se ve.
         */
        setAbierto((prev) => {
          if (prev === null) return null;
          const enDestino = hotspots.find((h) => h.id === prev.id && h.view === destino);
          return enDestino ?? null;
        });
      }, TRANSICION_MS / 2);
    },
    [view, viewProp, onViewChange, hotspots],
  );

  useEffect(
    () => () => {
      // Sin la limpieza, salir de la pantalla a mitad de la transición deja un
      // temporizador escribiendo estado de un componente que ya no existe.
      if (temporizador.current !== null) clearTimeout(temporizador.current);
    },
    [],
  );

  return (
    <section className="rounded-panel border border-border bg-surface-raised">
      <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 py-4">
        <h2 className="font-display text-base font-semibold tracking-tight text-fg">
          Inspección visual
        </h2>
        <p className="text-xs text-fg-muted">{summaryPhrase(resumen)}</p>
      </header>

      <div className="px-5 pb-5">
        {/* ── El vehículo ─────────────────────────────────────────────── */}
        {/*
          El marco copia la proporción EXACTA de la foto de esta vista.
          Con una proporción fija para todas, la foto se centraría dentro
          dejando bandas, y los puntos —colocados en porcentaje del marco—
          señalarían al lado de la pieza en vez de encima.

          El fondo es blanco y no `surface-sunken` porque las fotos vienen
          sobre blanco: cualquier otro color dibujaría un rectángulo alrededor
          del vehículo.
        */}
        <div
          style={{ aspectRatio: String(viewById(view).ratio) }}
          className={cn(
            'relative mx-auto w-full overflow-hidden rounded-panel bg-white',
            /* El plano superior lleva quince puntos: por debajo de unos 17rem
               se tapan entre ellos y dejan de señalar una pieza concreta. */
            view === 'superior' && 'max-w-[17rem]',
          )}
        >
          <div
            className="absolute inset-0 origin-center transition-[opacity,transform] ease-snap"
            style={{
              transitionDuration: `${TRANSICION_MS}ms`,
              opacity: cambiando ? 0 : 1,
              transform: `scale(${cambiando ? 0.985 : zoom ? 1.5 : 1})`,
            }}
          >
            <InspectionCanvas vehicle={vehicle} view={view} equipmentKind={equipmentKind} />

            {/*
              Los puntos viven en la MISMA capa que la silueta y comparten su
              transformación: sin eso, al ampliar el dibujo los puntos se
              quedarían en su sitio y señalarían la pieza equivocada.
            */}
            {!cambiando &&
              puntos.map((h) => (
                <HotspotButton
                  key={`${h.view}:${h.id}`}
                  hotspot={h}
                  activo={abierto?.id === h.id}
                  onClick={() => {
                    setAbierto((prev) => (prev?.id === h.id ? null : h));
                    onHotspotClick?.(h);
                  }}
                />
              ))}
          </div>

          {/* Ampliar. El máximo es 1,5×: más deja la silueta borrosa. */}
          <div className="absolute right-2 top-2 flex gap-1">
            <button
              type="button"
              onClick={() => setZoom((z) => !z)}
              aria-pressed={zoom}
              aria-label={zoom ? 'Restablecer la vista' : 'Ampliar la vista'}
              className="grid size-9 place-items-center rounded-control border border-border bg-surface/90 text-fg-muted backdrop-blur transition-colors hover:text-fg"
            >
              {zoom ? <RotateCcw className="size-4" /> : <ZoomIn className="size-4" />}
            </button>
          </div>

          <p className="pointer-events-none absolute inset-x-0 bottom-1 text-center text-[0.6875rem] text-graphite-600">
            Toca un punto para ver qué se encontró
          </p>
        </div>

        {/* ── La ficha del punto ──────────────────────────────────────── */}
        {abierto !== null &&
          activo !== null &&
          (panel === undefined ? (
            <HotspotCard hotspot={activo} onClose={() => setAbierto(null)} />
          ) : (
            panel(activo, () => setAbierto(null))
          ))}

        {progress}

        {/* ── Selector de vista ───────────────────────────────────────── */}
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div
            role="tablist"
            aria-label="Vista del vehículo"
            className="flex flex-wrap gap-2"
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight') irA(nextView(view, 1));
              else if (e.key === 'ArrowLeft') irA(nextView(view, -1));
              else return;
              e.preventDefault();
            }}
          >
            {VIEWS.map((v) => {
              const activa = v.id === view;
              const alerta = avisos[v.id] ?? 0;
              return (
                <button
                  key={v.id}
                  type="button"
                  role="tab"
                  aria-selected={activa}
                  tabIndex={activa ? 0 : -1}
                  onClick={() => irA(v.id)}
                  className={cn(
                    'relative min-h-11 rounded-control border px-3 py-1.5 text-left transition-colors duration-150 ease-snap',
                    activa
                      ? 'border-brand-600 bg-brand-600/5'
                      : 'border-border bg-surface hover:border-border-strong hover:bg-surface-sunken',
                  )}
                >
                  <span
                    className={cn(
                      'block text-xs font-semibold leading-tight',
                      activa ? 'text-brand-700' : 'text-fg',
                    )}
                  >
                    {v.label}
                  </span>
                  <span className="block text-[0.625rem] leading-tight text-fg-subtle">
                    {v.hint}
                  </span>
                  {alerta > 0 && (
                    <span
                      data-numeric
                      aria-label={`${alerta} puntos por revisar`}
                      className="absolute -right-1.5 -top-1.5 grid size-5 place-items-center rounded-full bg-crit-600 text-[0.625rem] font-bold text-white"
                    >
                      {alerta}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {footer}
        </div>

        {/* ── La misma información, en lista ──────────────────────────── */}
        <ZoneList puntos={puntos} onPick={setAbierto} />

        {plate !== undefined && (
          <p className="mt-3 text-[0.6875rem] text-fg-subtle">
            Las fotografías son de referencia, no de este vehículo: los puntos
            señalan la PIEZA, no un píxel de la imagen. Las fotos del vehículo
            del cliente son evidencia y van en cada punto.
          </p>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * El punto
 * ------------------------------------------------------------------ */

function HotspotButton({
  hotspot,
  activo,
  onClick,
}: {
  readonly hotspot: Hotspot;
  readonly activo: boolean;
  readonly onClick: () => void;
}) {
  const info = statusInfo(hotspot.status);
  const tono = TONO[hotspot.status];
  /* Solo late lo que pide atención. Si latieran todos, no destacaría ninguno. */
  const late = hotspot.status === 'problema';

  /*
   * El botón mide 44 px y el punto que se VE, 28.
   *
   * No es un capricho de diseño: el objetivo táctil no puede bajar de 44 px
   * —se pulsa de pie y con guantes—, pero quince círculos de 44 px sobre la
   * vista superior tapaban el vehículo entero. La zona sensible sigue siendo
   * grande e invisible; lo que se dibuja dentro es pequeño.
   */
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Inspeccionar ${hotspot.label}: ${info.label}`}
      aria-expanded={activo}
      style={{ left: `${hotspot.x}%`, top: `${hotspot.y}%` }}
      className={cn(
        'absolute grid size-11 -translate-x-1/2 -translate-y-1/2 place-items-center',
        'rounded-full transition-transform duration-150 ease-snap',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600',
        'hover:scale-[1.12]',
        activo && 'scale-[1.18]',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'grid size-7 place-items-center rounded-full ring-2 backdrop-blur-[2px]',
          'text-xs font-bold shadow-sm',
          activo && 'ring-4',
          late && 'animate-pulse',
          tono.punto,
        )}
      >
        {info.mark}
      </span>
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * La ficha
 * ------------------------------------------------------------------ */

function HotspotCard({
  hotspot,
  onClose,
}: {
  readonly hotspot: Hotspot;
  readonly onClose: () => void;
}) {
  const info = statusInfo(hotspot.status);
  const tono = TONO[hotspot.status];

  return (
    <article className="mt-3 rounded-panel border border-border bg-surface p-4">
      <header className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-sm font-semibold uppercase tracking-[0.06em] text-fg">
            {hotspot.label}
          </h3>
          <p className={cn('mt-1 inline-flex items-center gap-1.5 rounded-chip px-2 py-0.5 text-xs font-semibold', tono.chip)}>
            <span aria-hidden>{info.mark}</span>
            {info.label}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar la ficha"
          className="grid size-8 shrink-0 place-items-center rounded-control text-fg-subtle transition-colors hover:bg-surface-sunken hover:text-fg"
        >
          <X aria-hidden className="size-4" />
        </button>
      </header>

      {hotspot.note !== undefined && (
        <p className="mt-2.5 text-sm leading-relaxed text-fg-muted">{hotspot.note}</p>
      )}

      <p className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-fg-subtle">
        <span className="inline-flex items-center gap-1.5">
          <Camera aria-hidden className="size-3.5" />
          <span data-numeric>{hotspot.photos ?? 0}</span>
          {hotspot.photos === 1 ? 'fotografía' : 'fotografías'}
        </span>
        {hotspot.videos !== undefined && hotspot.videos > 0 && (
          <span className="inline-flex items-center gap-1.5">
            <Video aria-hidden className="size-3.5" />
            <span data-numeric>{hotspot.videos}</span>
            {hotspot.videos === 1 ? 'vídeo' : 'vídeos'}
          </span>
        )}
        {hotspot.by !== undefined && (
          <span>
            {hotspot.by}
            {hotspot.at !== undefined && ` · ${hotspot.at}`}
          </span>
        )}
      </p>

      {/* Sin destino no se pinta el botón: uno que no lleva a ningún sitio es
          exactamente lo que esta pantalla existe para no volver a tener. */}
      {hotspot.href !== undefined && (
        <Link
          href={hotspot.href}
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 transition-colors hover:text-brand-700"
        >
          Ver diagnóstico
          <ArrowRight aria-hidden className="size-3.5" />
        </Link>
      )}
    </article>
  );
}

/* ------------------------------------------------------------------ *
 * La lista
 * ------------------------------------------------------------------ */

/**
 * Lo mismo que el dibujo, escrito.
 *
 * No es redundancia: un lector de pantalla no puede recorrer puntos
 * colocados sobre una silueta, y quien mira la tablet al sol tampoco
 * distingue el ámbar del verde. Además ordena por gravedad, que es como se
 * quiere leer.
 */
function ZoneList({
  puntos,
  onPick,
}: {
  readonly puntos: readonly Hotspot[];
  readonly onPick: (h: Hotspot) => void;
}) {
  const orden = useMemo(() => bySeverity(puntos), [puntos]);
  if (orden.length === 0) return null;

  return (
    <ul className="mt-4 grid gap-1.5 border-t border-border pt-4 sm:grid-cols-2">
      {orden.map((h) => {
        const info = statusInfo(h.status);
        const tono = TONO[h.status];
        return (
          <li key={`${h.view}:${h.id}`}>
            <button
              type="button"
              onClick={() => onPick(h)}
              className="flex min-h-11 w-full items-center gap-2.5 rounded-control px-2 py-1.5 text-left transition-colors hover:bg-surface-sunken"
            >
              <span
                aria-hidden
                className={cn(
                  'grid size-5 shrink-0 place-items-center rounded-full text-[0.625rem] font-bold ring-1',
                  tono.punto,
                )}
              >
                {info.mark}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-fg">{h.label}</span>
              <span className={cn('shrink-0 text-xs', tono.texto)}>{info.label}</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
