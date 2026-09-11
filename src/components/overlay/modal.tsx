'use client';

import { X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

/**
 * Diálogo y panel lateral, los dos sobre `<dialog>` nativo.
 *
 * Escribir esto a mano significa escribir también la trampa de foco, el cierre
 * con Escape, el bloqueo del desplazamiento de fondo y la capa inerte de
 * detrás. `showModal()` trae las cuatro cosas del navegador, ya correctas. Una
 * versión casera con `div` y `z-index` deja el foco escapándose por detrás del
 * diálogo: un fallo de accesibilidad clásico e invisible si solo se prueba con
 * ratón.
 *
 * Cuándo usar cuál (§46, §47):
 *
 *   - `Modal`  → una DECISIÓN concreta: confirmar una compra, cancelar una
 *                orden, finalizar una reparación.
 *   - `Drawer` → CONSULTAR o editar algo sin perder la lista de detrás: el
 *                detalle rápido de una orden, una evidencia, una ficha.
 */

function useDialog(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (node === null) return;
    if (open && !node.open) node.showModal();
    else if (!open && node.open) node.close();
  }, [open]);

  useEffect(() => {
    const node = ref.current;
    if (node === null) return;
    // `close` cubre tanto Escape como el cierre por método, así que el estado
    // de React nunca se queda creyendo que sigue abierto.
    const handle = (): void => onClose();
    node.addEventListener('close', handle);
    return () => node.removeEventListener('close', handle);
  }, [onClose]);

  return ref;
}

const shell = 'backdrop:bg-graphite-950/50 backdrop:backdrop-blur-[2px] open:flex';

export function Modal({
  open,
  onClose,
  title,
  description,
  footer,
  children,
  size = 'md',
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly description?: string;
  readonly footer?: ReactNode;
  readonly children?: ReactNode;
  readonly size?: 'sm' | 'md' | 'lg';
}) {
  const ref = useDialog(open, onClose);

  return (
    <dialog
      ref={ref}
      aria-labelledby="modal-title"
      className={cn(
        shell,
        'm-auto w-[calc(100vw-2rem)] flex-col rounded-modal bg-surface-raised p-0 text-fg shadow-overlay',
        'animate-rise-in',
        size === 'sm' && 'max-w-sm',
        size === 'md' && 'max-w-lg',
        size === 'lg' && 'max-w-2xl',
      )}
    >
      <header className="flex items-start justify-between gap-4 px-6 pt-6">
        <div>
          <h2 id="modal-title" className="font-display text-lg font-semibold tracking-tight">
            {title}
          </h2>
          {description !== undefined && (
            <p className="mt-1 text-sm text-fg-muted">{description}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="-mr-2 -mt-1 grid size-9 shrink-0 place-items-center rounded-control text-fg-subtle transition-colors duration-150 hover:bg-surface-sunken hover:text-fg"
        >
          <X aria-hidden className="size-4" />
        </button>
      </header>

      {children !== undefined && <div className="px-6 py-5">{children}</div>}

      {footer !== undefined && (
        <footer className="flex flex-wrap justify-end gap-2 border-t border-border px-6 py-4">
          {footer}
        </footer>
      )}
    </dialog>
  );
}

export function Drawer({
  open,
  onClose,
  title,
  description,
  footer,
  children,
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly description?: string;
  readonly footer?: ReactNode;
  readonly children: ReactNode;
}) {
  const ref = useDialog(open, onClose);

  return (
    <dialog
      ref={ref}
      aria-labelledby="drawer-title"
      className={cn(
        shell,
        // Pegado al borde derecho y a toda la altura: `m-0` vence al centrado
        // que el navegador aplica por defecto a un diálogo modal.
        'fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-none w-full max-w-lg flex-col',
        'rounded-none bg-surface-raised p-0 text-fg shadow-overlay',
        'animate-slide-left',
      )}
    >
      <header className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <h2 id="drawer-title" className="font-display text-base font-semibold tracking-tight">
            {title}
          </h2>
          {description !== undefined && (
            <p className="mt-0.5 truncate text-sm text-fg-muted">{description}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="-mr-1.5 grid size-9 shrink-0 place-items-center rounded-control text-fg-subtle transition-colors duration-150 hover:bg-surface-sunken hover:text-fg"
        >
          <X aria-hidden className="size-4" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>

      {footer !== undefined && (
        <footer className="shrink-0 border-t border-border px-5 py-4">{footer}</footer>
      )}
    </dialog>
  );
}
