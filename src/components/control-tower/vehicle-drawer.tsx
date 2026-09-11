'use client';

import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { FileText, Phone, X } from 'lucide-react';
import { ProgressBar } from '@/components/ui/progress-bar';
import { StatusChip } from '@/components/ui/status-chip';
import { TrafficLightDot } from '@/components/ui/traffic-light';
import { AssetImage } from '@/components/ui/asset-image';
import { CorporateBadge } from '@/components/ui/plate';
import type { BoardRow } from '@/features/demo/board';
import { formatDayTime } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

/**
 * Ficha del vehículo, en un cajón lateral.
 *
 * Sustituye a la tarjeta fija que ocupaba un tercio de la pantalla para hablar
 * de UN vehículo mientras los otros siete competían por el espacio sobrante.
 * Consultar deja de costar una navegación: el asesor abre, mira, cierra, y
 * sigue en el mismo punto de la lista.
 *
 * Es un `<dialog>` nativo y no un `<div>` con posición fija. Eso trae gratis lo
 * que casi nunca se implementa a mano y siempre se echa en falta: el foco
 * atrapado dentro, Escape que cierra, el fondo inerte para el lector de
 * pantalla y la pila de capas correcta. Escribirlo a mano es firmar el
 * compromiso de mantener las cuatro cosas.
 */
export function VehicleDrawer({
  row,
  now,
  onClose,
}: {
  readonly row: BoardRow | null;
  readonly now: Date;
  readonly onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const open = row !== null;

  useEffect(() => {
    const node = ref.current;
    if (node === null) return;
    if (open && !node.open) node.showModal();
    else if (!open && node.open) node.close();
  }, [open]);

  useEffect(() => {
    const node = ref.current;
    if (node === null) return undefined;
    node.addEventListener('close', onClose);
    return () => node.removeEventListener('close', onClose);
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      aria-label={row === null ? 'Ficha del vehículo' : `Ficha de ${row.order.plate}`}
      className={cn(
        // `ml-auto` con márgenes verticales a cero: el diálogo nativo se centra
        // por defecto, y un cajón centrado es una ventana.
        'ml-auto mr-0 my-0 h-dvh max-h-dvh w-[calc(100vw-3rem)] max-w-[26rem]',
        'rounded-none rounded-l-modal bg-surface-raised p-0 text-fg shadow-overlay',
        'animate-slide-left backdrop:bg-graphite-950/40 backdrop:backdrop-blur-[2px]',
      )}
    >
      {row !== null && <DrawerBody row={row} now={now} onClose={onClose} />}
    </dialog>
  );
}

function DrawerBody({
  row,
  now,
  onClose,
}: {
  readonly row: BoardRow;
  readonly now: Date;
  readonly onClose: () => void;
}) {
  const { order, eta, light } = row;
  const currentJob = order.items.find((i) => i.kind === 'servicio');

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-start gap-3 border-b border-border px-5 py-4">
        <AssetImage
          alt={order.vehicle}
          subject={order.vehicle}
          equipmentKind={order.equipmentKind}
          fit="cover"
          rounded="control"
          className="h-12 w-16 shrink-0"
        />
        <div className="min-w-0 flex-1">
          <p className="font-mono text-sm font-bold tracking-[0.06em] text-fg">
            {order.plate.replace(/^(.{3})(.*)$/u, '$1-$2')}
          </p>
          <p className="truncate text-sm text-fg-muted">
            {order.vehicle} · {order.modelYear}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar la ficha"
          className="grid size-9 shrink-0 place-items-center rounded-control text-fg-muted transition-colors duration-150 hover:bg-surface-sunken hover:text-fg"
        >
          <X aria-hidden className="size-4" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        <div className="flex flex-wrap items-center gap-2">
          <StatusChip status={order.status} />
          <TrafficLightDot color={light.color} reason={light.reason} showLabel />
        </div>

        <div className="mt-5 flex items-center gap-3">
          <ProgressBar
            percent={row.progressPercent}
            label={`Avance de ${order.code}`}
            showValue={false}
          />
          <span data-numeric className="shrink-0 text-sm font-semibold text-fg">
            {Math.round(row.progressPercent)}%
          </span>
        </div>

        <dl className="mt-6 space-y-4">
          <Field label="Hora estimada">
            {eta.etaAt === null ? (
              <span className="text-fg-muted">Sin estimación todavía</span>
            ) : (
              <span data-numeric>{formatDayTime(eta.etaAt, now)}</span>
            )}
          </Field>

          <Field label="Cliente">
            <span className="flex flex-wrap items-center gap-1.5">
              {order.customer}
              {order.corporateClient !== null && <CorporateBadge name={order.corporateClient} />}
            </span>
          </Field>

          <Field label="Técnico">
            {order.technician ?? <span className="text-fg-muted">Sin asignar</span>}
          </Field>

          <Field label="Trabajo actual">
            {currentJob?.description ?? <span className="text-fg-muted">Sin trabajo abierto</span>}
          </Field>

          <Field label="Repuestos">
            {row.partsComplete ? (
              <span className="text-ok-700">Completos</span>
            ) : (
              <span data-numeric className="text-warn-700">
                {row.partsPercent}% recibido
              </span>
            )}
          </Field>
        </dl>
      </div>

      <footer className="shrink-0 space-y-2 border-t border-border px-5 py-4">
        <Link
          href={`/ordenes/${order.id}`}
          className="flex h-11 items-center justify-center gap-2 rounded-control bg-brand-600 text-sm font-semibold text-white transition-colors duration-150 hover:bg-brand-700"
        >
          <FileText aria-hidden className="size-4" />
          Ver orden completa
        </Link>
        <Link
          href="/clientes"
          className="flex h-11 items-center justify-center gap-2 rounded-control border border-border text-sm font-medium text-fg transition-colors duration-150 hover:bg-surface-sunken"
        >
          <Phone aria-hidden className="size-4" />
          Contactar cliente
        </Link>
      </footer>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  readonly label: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-fg-subtle">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium text-fg">{children}</dd>
    </div>
  );
}
