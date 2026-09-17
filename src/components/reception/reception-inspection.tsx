'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Cloud, TriangleAlert } from 'lucide-react';
import { ProgressBar } from '@/components/ui/progress-bar';
import { VehicleInspectionViewer } from '@/components/inspection/vehicle-inspection-viewer';
import { InspectionPartPanel } from '@/components/inspection/inspection-part-panel';
import { usePersistentStateChecked, useHydrated, readSlot } from '@/lib/demo/store';
import { slotFor, type EvidencePhoto } from '@/features/evidence/services/photos';
import type { DamageMark } from '@/features/reception/services/damage-map';
import {
  allSpotIds,
  labelOf,
  PLACEMENTS,
} from '@/features/inspection/services/placement';
import { damagePhotoAnchor } from '@/features/inspection/services/from-damage';
import type { Hotspot } from '@/features/inspection/services/hotspots';
import {
  EMPTY_RECORD,
  canFinish,
  clearPart,
  damageFromRecord,
  inspectionSlot,
  noteOf,
  pendingPhrase,
  pendingRequired,
  progressPhrase,
  readRecord,
  recordFromDamage,
  setPart,
  statusOf,
  summarizeRecord,
  type InspectionRecord,
  type SetPartInput,
} from '@/features/inspection/services/reception-inspection';
import { cn } from '@/lib/utils/cn';
import { damageSlot, legacyDamageSlot } from '@/features/reception/services/slots';

const SIN_DANOS: readonly DamageMark[] = [];

/**
 * Paso «Daños» de la recepción: el estado de ingreso del vehículo.
 *
 * ── Qué sustituye ──────────────────────────────────────────────────────────
 *
 * El diagrama de daños de la hoja del checklist. La lógica de detrás NO
 * cambia: lo que se guarda sigue llegando a `recepcion.<placa>.danos` como
 * `DamageMark[]`, que es lo que leen el acta, el recuento del borrador y la
 * ficha de la orden. Lo que cambia es que ahora el asesor TOCA EL VEHÍCULO, y
 * que el sistema sabe distinguir «lo miré y está bien» de «no lo he mirado».
 *
 * ── Una sola fuente de verdad ──────────────────────────────────────────────
 *
 * El registro de inspección manda. El dibujo, la lista y los daños salen
 * todos de él: tocar una pieza en el vehículo actualiza la lista en el mismo
 * renderizado, porque no hay dos estados que sincronizar.
 */
export function ReceptionInspection({
  vehicle,
  plate,
  customer,
  orderCode,
  advisor,
  equipmentKind = 'vehiculo',
}: {
  readonly vehicle: string;
  readonly plate: string;
  readonly customer?: string;
  readonly orderCode?: string;
  readonly advisor: string;
  readonly equipmentKind?: 'vehiculo' | 'maquinaria';
}) {
  const hydrated = useHydrated();
  const [guardado, setGuardado] = useState<'limpio' | 'guardando' | 'ok' | 'lleno'>('limpio');

  const [stored, setStored] = usePersistentStateChecked<InspectionRecord>(
    inspectionSlot(plate),
    EMPTY_RECORD,
  );
  /* Los daños siguen viviendo donde siempre: se DERIVAN, no se editan aquí. */
  const [damage, setDamage] = usePersistentStateChecked<readonly DamageMark[]>(
    damageSlot(plate),
    SIN_DANOS,
  );

  /*
   * La ranura anterior guardaba la placa tal cual —con guion—, y la orden la
   * leía sin él. Al canonizarla, una recepción empezada antes quedaría
   * huérfana: se lee una vez de la vieja y el primer cambio la reescribe en la
   * buena.
   */
  const heredados = useMemo<readonly DamageMark[]>(() => {
    if (!hydrated || damage.length > 0) return SIN_DANOS;
    const viejos = readSlot<readonly DamageMark[]>(legacyDamageSlot(plate));
    return Array.isArray(viejos) ? viejos : SIN_DANOS;
  }, [hydrated, damage, plate]);

  /*
   * Una recepción empezada con el diagrama anterior no puede perder lo
   * marcado porque el formato cambió: si el registro está vacío y hay daños,
   * se traducen. Es la misma técnica que salvó los clientes al añadir la
   * licencia.
   */
  const record = useMemo(() => {
    const leido = readRecord(stored);
    if (Object.keys(leido).length > 0) return leido;
    const previos = damage.length > 0 ? damage : heredados;
    if (previos.length === 0) return leido;
    return recordFromDamage(previos, new Date(), advisor);
  }, [stored, damage, heredados, advisor]);

  const partes = useMemo(() => allSpotIds(), []);
  const resumen = useMemo(() => summarizeRecord(record, partes), [record, partes]);
  const faltan = useMemo(() => pendingRequired(record), [record]);

  const fotos = useMemo(() => {
    if (!hydrated) return {};
    const out: Record<string, number> = {};
    for (const id of partes) {
      const guardadas = readSlot<readonly EvidencePhoto[]>(slotFor(damagePhotoAnchor(plate, id)));
      if (Array.isArray(guardadas) && guardadas.length > 0) out[id] = guardadas.length;
    }
    return out;
  }, [hydrated, plate, partes]);

  /**
   * Los puntos del visor salen del registro.
   *
   * La recepción está ABIERTA por definición mientras se está en este paso,
   * así que nada se pinta en verde por su cuenta: lo no anotado sale «sin
   * inspeccionar». Esa es la regla, y aquí es donde se aplica.
   */
  const hotspots = useMemo<readonly Hotspot[]>(
    () =>
      PLACEMENTS.map((p) => {
        const nota = noteOf(record, p.id);
        const n = fotos[p.id];
        return {
          id: p.id,
          view: p.view,
          x: p.x,
          y: p.y,
          label: p.label,
          status: statusOf(record, p.id, false),
          ...(nota === undefined ? {} : { note: nota }),
          ...(n === undefined ? {} : { photos: n }),
          ...(record[p.id] === undefined ? {} : { by: record[p.id]!.by }),
        };
      }),
    [record, fotos],
  );

  /** Guarda el registro y vuelve a derivar los daños de una sola vez. */
  const persistir = useCallback(
    (siguiente: InspectionRecord): void => {
      setGuardado('guardando');
      const ok = setStored(siguiente);
      const okDanos = setDamage(damageFromRecord(siguiente));
      setGuardado(ok && okDanos ? 'ok' : 'lleno');
    },
    [setStored, setDamage],
  );

  const guardarPieza = useCallback(
    (partId: string, input: SetPartInput): void => {
      persistir(setPart(record, partId, input, new Date(), advisor));
    },
    [record, advisor, persistir],
  );

  const quitarPieza = useCallback(
    (partId: string): void => {
      persistir(clearPart(record, partId));
    },
    [record, persistir],
  );

  const listo = canFinish(record);

  return (
    <>
      <Cabecera
        vehicle={vehicle}
        plate={plate}
        customer={customer}
        orderCode={orderCode}
        advisor={advisor}
        guardado={guardado}
      />

      <VehicleInspectionViewer
        vehicle={vehicle}
        plate={plate}
        equipmentKind={equipmentKind}
        hotspots={hotspots}
        panel={(h, close) => (
          <InspectionPartPanel
            /* La `key` remonta el panel al cambiar de pieza: sin ella se
               quedaría enseñando lo de la anterior durante un fotograma. */
            key={h.id}
            hotspot={h}
            record={record[h.id]}
            photoAnchor={damagePhotoAnchor(plate, h.id)}
            onSave={(input) => guardarPieza(h.id, input)}
            onClear={() => {
              quitarPieza(h.id);
              close();
            }}
            onClose={close}
          />
        )}
        progress={
          <div className="mt-4 rounded-control bg-surface-sunken px-3.5 py-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <span data-numeric className="text-sm font-semibold text-fg">
                {progressPhrase(resumen)}
              </span>
              {/* El avance NO es calidad: se dice con todas las letras. */}
              <span className="text-xs text-fg-subtle">
                Avance de la revisión, no de su resultado
              </span>
            </div>
            <ProgressBar
              percent={resumen.percent}
              label="Zonas revisadas"
              showValue={false}
              className="mt-2"
            />
          </div>
        }
      />

      <Cierre
        listo={listo}
        faltan={faltan}
        aviso={pendingPhrase(record)}
        resumen={resumen}
        fotos={Object.values(fotos).reduce((n, v) => n + v, 0)}
      />
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Cabecera
 * ------------------------------------------------------------------ */

function Cabecera({
  vehicle,
  plate,
  customer,
  orderCode,
  advisor,
  guardado,
}: {
  readonly vehicle: string;
  readonly plate: string;
  readonly customer?: string;
  readonly orderCode?: string;
  readonly advisor: string;
  readonly guardado: 'limpio' | 'guardando' | 'ok' | 'lleno';
}) {
  return (
    <section className="rounded-panel border border-border bg-surface-raised px-5 py-4">
      <Link
        href="/recepcion/nueva/checklist"
        className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 transition-colors hover:text-brand-700"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Volver al checklist
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="font-display text-xl font-semibold tracking-tight text-fg">
            {vehicle}
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-fg-muted">
            <span className="rounded-control border border-border-strong bg-surface px-2 py-0.5 font-mono text-xs font-bold tracking-[0.08em] text-fg">
              {plate}
            </span>
            {customer !== undefined && <span>{customer}</span>}
            {orderCode !== undefined && <span className="font-mono text-xs">{orderCode}</span>}
          </p>
          <p className="mt-1 text-xs text-fg-subtle">Asesor: {advisor}</p>
        </div>

        {/* Discreto a propósito: un modal por cada pieza sería insoportable. */}
        <p
          aria-live="polite"
          className={cn(
            'inline-flex items-center gap-1.5 text-xs',
            guardado === 'lleno' ? 'text-crit-700' : 'text-fg-subtle',
          )}
        >
          {guardado === 'limpio' && null}
          {guardado === 'guardando' && (
            <>
              <Cloud aria-hidden className="size-3.5 animate-pulse" />
              Guardando…
            </>
          )}
          {guardado === 'ok' && (
            <>
              <Check aria-hidden className="size-3.5 text-ok-600" />
              Guardado
            </>
          )}
          {guardado === 'lleno' && (
            <>
              <TriangleAlert aria-hidden className="size-3.5" />
              No cupo en el almacén: no sobrevivirá a la recarga.
            </>
          )}
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ *
 * Cierre
 * ------------------------------------------------------------------ */

function Cierre({
  listo,
  faltan,
  aviso,
  resumen,
  fotos,
}: {
  readonly listo: boolean;
  readonly faltan: readonly string[];
  readonly aviso: string | null;
  readonly resumen: ReturnType<typeof summarizeRecord>;
  readonly fotos: number;
}) {
  return (
    <section className="sticky bottom-0 -mx-4 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur lg:-mx-6 lg:px-6">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
        {/*
          `basis-64`: en un teléfono el botón ocupa casi todo el ancho y esta
          columna se encogía hasta caber una palabra por línea —«Aún / quedan /
          12 / zonas»—. Con una base mínima, cuando no queda sitio el botón
          baja a la línea siguiente en vez de estrujar el aviso.
        */}
        <div className="min-w-0 flex-1 basis-64">
          {aviso === null ? (
            <p className="text-sm text-fg">
              <span data-numeric className="font-semibold">
                {resumen.revisadas}
              </span>{' '}
              zonas revisadas ·{' '}
              <span className="text-ok-700">{resumen.conformes} conformes</span> ·{' '}
              <span className="text-crit-700">{resumen.observaciones} con observación</span> ·{' '}
              <span className="text-warn-700">{resumen.pendientes} pendientes</span> ·{' '}
              <span data-numeric className="text-fg-muted">
                {fotos} {fotos === 1 ? 'evidencia' : 'evidencias'}
              </span>
            </p>
          ) : (
            <div className="rounded-control border border-warn-500/40 bg-warn-100 px-3.5 py-2.5">
              <p className="flex items-center gap-2 text-xs font-semibold text-warn-700">
                <TriangleAlert aria-hidden className="size-3.5" />
                {aviso}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-warn-700">
                {faltan.slice(0, 4).map(labelOf).join(' · ')}
                {faltan.length > 4 && ` · y ${faltan.length - 4} más`}
              </p>
            </div>
          )}
        </div>

        <Link
          href={listo ? '/recepcion/nueva/evidencia' : '#'}
          aria-disabled={!listo}
          onClick={(e) => {
            if (!listo) e.preventDefault();
          }}
          className={cn(
            'inline-flex min-h-12 items-center justify-center gap-2 rounded-control px-5 text-sm font-semibold',
            listo
              ? 'bg-romero-500 text-white hover:bg-romero-600 active:scale-[0.98]'
              : 'cursor-not-allowed bg-surface-sunken text-fg-subtle',
          )}
        >
          Terminar inspección
          <ArrowRight aria-hidden className="size-4" />
        </Link>
      </div>
    </section>
  );
}
