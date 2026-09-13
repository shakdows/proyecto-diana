'use client';

import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

/**
 * Diálogo centrado.
 *
 * Es `<dialog>` nativo y no un `<div>` con posición fija, y eso no es un
 * detalle: `showModal()` trae gratis la trampa de foco, el cierre con Escape,
 * el fondo inerte para el lector de pantalla y la capa superior del navegador
 * —que es la única forma de estar de verdad por encima de todo sin pelearse
 * con los `z-index` del resto de la aplicación—. Reimplementar eso a mano es
 * el camino largo a un diálogo del que se puede salir con el tabulador.
 *
 * ── Por qué existe esta envoltura ──────────────────────────────────────────
 *
 * Porque las mismas veinte líneas de mecánica —abrir, cerrar, escuchar el
 * evento `close`, centrar sin márgenes, limitar el alto, hacer que solo scroll
 * el cuerpo— estaban a punto de aparecer en tres pantallas. Tres copias
 * divergen: una se olvida del `close`, otra pone `ml-auto` y se pega al borde,
 * y el alta de cliente y el alta de vehículo dejan de parecer el mismo
 * producto.
 */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  onSubmit,
  initialFocusRef,
  width = 'md',
}: {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly title: string;
  readonly subtitle?: string;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
  /** Si se pasa, el cuerpo va dentro de un `<form>` y Enter envía. */
  readonly onSubmit?: () => void;
  /** Dónde cae el cursor al abrir. Sin esto cae en el botón de cerrar. */
  readonly initialFocusRef?: React.RefObject<HTMLElement | null>;
  readonly width?: 'sm' | 'md';
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const node = ref.current;
    if (node === null) return;
    if (open && !node.open) {
      node.showModal();
      initialFocusRef?.current?.focus();
    } else if (!open && node.open) {
      node.close();
    }
  }, [open, initialFocusRef]);

  useEffect(() => {
    const node = ref.current;
    if (node === null) return undefined;
    // Escape y el cierre nativo pasan por aquí: sin esto, el diálogo se cierra
    // en pantalla pero quien lo abrió sigue creyendo que está abierto.
    node.addEventListener('close', onClose);
    return () => node.removeEventListener('close', onClose);
  }, [onClose]);

  const cuerpo = (
    <>
      <header className="flex items-start gap-3 border-b border-border px-6 py-5">
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="font-display text-xl font-semibold tracking-tight">
            {title}
          </h2>
          {subtitle !== undefined && <p className="mt-0.5 text-sm text-fg-muted">{subtitle}</p>}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="grid size-9 shrink-0 place-items-center rounded-control text-fg-muted transition-colors duration-150 hover:bg-surface-sunken hover:text-fg"
        >
          <X aria-hidden className="size-4" />
        </button>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">{children}</div>

      {footer !== undefined && (
        <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-6 py-4">
          {footer}
        </footer>
      )}
    </>
  );

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      className={cn(
        /*
         * Centrado de verdad. `<dialog>` lo hace solo con `m-auto`, pero solo
         * si no hay márgenes puestos: un `ml-auto` suelto lo pega al borde.
         */
        'm-auto w-[calc(100vw-2rem)] p-0',
        width === 'sm' ? 'max-w-[34rem]' : 'max-w-[45rem]',
        'max-h-[calc(100dvh-2rem)] sm:max-h-[85vh]',
        'rounded-modal bg-surface-raised text-fg shadow-overlay',
        'animate-rise-in backdrop:bg-graphite-950/50 backdrop:backdrop-blur-[3px]',
      )}
    >
      {onSubmit === undefined ? (
        <div className="flex max-h-[inherit] flex-col">{cuerpo}</div>
      ) : (
        /*
          `noValidate` no desactiva las comprobaciones: desactiva LAS DEL
          NAVEGADOR. Con `type="email"`, Chrome interrumpe el envío antes de
          que corra nada nuestro y enseña su propio globo —«Please include an
          '@' in the email address»— en inglés y apuntando al campo. El
          resultado era que los mensajes en español de debajo del campo no
          llegaban a pintarse nunca.

          Los `type` se quedan: son los que abren el teclado correcto en el
          móvil. Lo único que se va es el globo.
        */
        <form
          noValidate
          className="flex max-h-[inherit] flex-col"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit();
          }}
        >
          {cuerpo}
        </form>
      )}
    </dialog>
  );
}

/** Los dos botones del pie, que son siempre los mismos. */
export function ModalActions({
  onCancel,
  confirmLabel,
  confirmIcon,
  disabled = false,
  hint,
}: {
  readonly onCancel: () => void;
  readonly confirmLabel: string;
  readonly confirmIcon?: ReactNode;
  readonly disabled?: boolean;
  readonly hint?: string;
}) {
  return (
    <>
      {hint === undefined ? (
        <span className="flex-1" />
      ) : (
        <p className="hidden min-w-0 flex-1 text-xs text-fg-subtle sm:block">{hint}</p>
      )}

      <div className="flex flex-1 gap-3 sm:flex-none">
        <button
          type="button"
          onClick={onCancel}
          className="h-11 flex-1 whitespace-nowrap rounded-control border border-border-strong px-4 text-sm font-semibold text-fg transition-colors duration-150 hover:bg-surface-sunken sm:flex-none sm:px-5"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={disabled}
          className={cn(
            'inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-control text-sm font-semibold',
            /* En un móvil de 390 los dos botones se reparten el ancho, y con
               `px-5` la etiqueta parte en dos líneas dentro del botón. */
            'whitespace-nowrap px-4 sm:px-5',
            'transition-colors duration-150 sm:flex-none',
            disabled
              ? 'cursor-not-allowed bg-surface-sunken text-fg-subtle'
              : 'bg-romero-500 text-white hover:bg-romero-600 active:scale-[0.98]',
          )}
        >
          {confirmIcon}
          {confirmLabel}
        </button>
      </div>
    </>
  );
}
