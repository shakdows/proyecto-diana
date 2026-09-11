'use client';

import { useCallback, useState } from 'react';
import { RotateCcw, TriangleAlert } from 'lucide-react';
import { Modal } from '@/components/overlay/modal';
import { clearAll, readSummary, useSavedSummary } from '@/lib/demo/store';
import { formatDateTime } from '@/lib/utils/format';
import { cn } from '@/lib/utils/cn';

/**
 * «Comenzar de nuevo»: borra todo el trabajo guardado de la demostración.
 *
 * Pide confirmación y DICE QUÉ SE LLEVA —cuántas pantallas y de cuándo es lo
 * último—. Un botón destructivo que no dice el alcance se pulsa por error una
 * vez y ya no se vuelve a usar nunca.
 */
export function ResetDemo({ className }: { readonly className?: string }) {
  const [open, setOpen] = useState(false);
  const [summary, setSummary] = useState<ReturnType<typeof readSummary> | null>(null);

  /*
   * El resumen se lee al ABRIR el diálogo, no en cada renderizado: leer
   * `localStorage` entero en el render de la barra superior lo haría en cada
   * cambio de pantalla, y además `localStorage` no existe en el servidor.
   */
  const abrir = useCallback(() => {
    setSummary(readSummary());
    setOpen(true);
  }, []);

  const confirmar = useCallback(() => {
    clearAll();
    /*
     * Recarga completa en vez de solo vaciar el estado. Las pantallas leen su
     * valor inicial al montar; sin recargar, la que esté abierta seguiría
     * mostrando lo que acabamos de borrar hasta que alguien navegue.
     */
    window.location.reload();
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        title="Borrar el trabajo guardado y empezar de cero"
        className={cn(
          'inline-flex h-10 items-center gap-2 rounded-control px-2.5 text-sm font-medium',
          'text-fg-subtle transition-colors duration-150 hover:bg-surface-sunken hover:text-fg',
          className,
        )}
      >
        <RotateCcw aria-hidden className="size-4" />
        <span className="hidden lg:inline">Comenzar de nuevo</span>
        <span className="sr-only lg:hidden">Comenzar de nuevo</span>
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="¿Comenzar de nuevo?"
        description="Se borra todo el trabajo guardado en este navegador y las pantallas vuelven a su estado inicial."
      >
        <div className="space-y-4">
          {summary !== null && summary.slots === 0 ? (
            <p className="rounded-control bg-surface-sunken px-4 py-3 text-sm text-fg-muted">
              No hay nada guardado todavía. Las pantallas ya están en su estado inicial.
            </p>
          ) : (
            <div className="rounded-control border border-border-strong bg-surface-sunken px-4 py-3">
              <p className="text-sm text-fg">
                Se va a borrar el avance de{' '}
                <strong data-numeric className="font-semibold">
                  {summary?.slots ?? 0}
                </strong>{' '}
                {summary?.slots === 1 ? 'apartado' : 'apartados'}.
              </p>
              {summary?.lastSavedAt != null && (
                <p data-numeric className="mt-1 text-sm text-fg-muted">
                  Último guardado: {formatDateTime(new Date(summary.lastSavedAt))}.
                </p>
              )}
            </div>
          )}

          <p className="flex items-start gap-2 text-sm leading-relaxed text-fg-muted">
            <TriangleAlert aria-hidden className="mt-0.5 size-4 shrink-0 text-warn-600" />
            <span>
              Esto no se puede deshacer. Solo afecta a este navegador: el trabajo guardado en otro
              dispositivo sigue donde está.
            </span>
          </p>

          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-11 items-center rounded-control border border-border-strong bg-surface px-5 text-sm font-semibold text-fg-muted transition-colors hover:bg-surface-sunken"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={summary?.slots === 0}
              onClick={confirmar}
              className="inline-flex h-11 items-center gap-2 rounded-control bg-crit-600 px-5 text-sm font-semibold text-white transition-colors hover:bg-crit-700 disabled:opacity-50"
            >
              <RotateCcw aria-hidden className="size-4" />
              Borrar y empezar de cero
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

/**
 * Aviso discreto de que hay trabajo guardado.
 *
 * Existe porque la persistencia es invisible hasta que sorprende: alguien
 * vuelve al día siguiente, ve la cotización a medio marcar y no sabe si es un
 * dato real o lo suyo de ayer.
 */
export function SavedHint() {
  const { slots } = useSavedSummary();
  if (slots === 0) return null;

  return (
    <span className="hidden text-xs text-fg-subtle xl:inline">
      {slots === 1 ? '1 apartado guardado' : `${slots} apartados guardados`}
    </span>
  );
}
