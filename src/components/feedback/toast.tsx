'use client';

import { Check, Info, TriangleAlert, X } from 'lucide-react';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils/cn';

/**
 * Avisos efímeros.
 *
 * Sustituyen a `alert()`, que bloquea el hilo, no se puede maquetar y en una
 * tablet tapa la pantalla entera hasta que alguien la acepta.
 *
 * La región es `aria-live="polite"`: el aviso se anuncia cuando el lector de
 * pantalla termina lo que estaba diciendo, en vez de interrumpir a media
 * palabra. Los errores usan `assertive`, porque ahí sí interesa cortar.
 *
 * Un aviso NUNCA es el único sitio donde vive una información: desaparece a los
 * pocos segundos. Lo que haya que poder consultar después va en la pantalla.
 */

export type ToastTone = 'ok' | 'crit' | 'info';

interface Toast {
  readonly id: number;
  readonly tone: ToastTone;
  readonly message: string;
}

const ToastContext = createContext<((message: string, tone?: ToastTone) => void) | null>(null);

export function useToast(): (message: string, tone?: ToastTone) => void {
  const ctx = useContext(ToastContext);
  if (ctx === null) {
    throw new Error('useToast() necesita <ToastProvider> por encima en el árbol.');
  }
  return ctx;
}

const ICONS = { ok: Check, crit: TriangleAlert, info: Info } as const;

export function ToastProvider({ children }: { readonly children: ReactNode }) {
  const [toasts, setToasts] = useState<readonly Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number): void => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (message: string, tone: ToastTone = 'ok'): void => {
      const id = (nextId.current += 1);
      setToasts((list) => [...list, { id, tone, message }]);
      // Los errores se quedan más tiempo: cuestan más de leer y de asimilar.
      setTimeout(() => dismiss(id), tone === 'crit' ? 8000 : 4500);
    },
    [dismiss],
  );

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end"
      >
        {toasts.map((toast) => {
          const Icon = ICONS[toast.tone];
          return (
            <output
              key={toast.id}
              aria-live={toast.tone === 'crit' ? 'assertive' : 'polite'}
              className={cn(
                'pointer-events-auto flex w-full max-w-sm animate-rise-in items-start gap-2.5',
                'rounded-panel border bg-surface-raised px-4 py-3 shadow-overlay',
                toast.tone === 'ok' && 'border-ok-500/30',
                toast.tone === 'crit' && 'border-crit-500/40',
                toast.tone === 'info' && 'border-border-strong',
              )}
            >
              <Icon
                aria-hidden
                className={cn(
                  'mt-0.5 size-4 shrink-0',
                  toast.tone === 'ok' && 'text-ok-600',
                  toast.tone === 'crit' && 'text-crit-600',
                  toast.tone === 'info' && 'text-fg-subtle',
                )}
              />
              <p className="min-w-0 flex-1 text-sm text-fg">{toast.message}</p>
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="Descartar aviso"
                className="-mr-1 -mt-0.5 grid size-6 shrink-0 place-items-center rounded-chip text-fg-subtle transition-colors duration-150 hover:bg-surface-sunken hover:text-fg"
              >
                <X aria-hidden className="size-3.5" />
              </button>
            </output>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
