'use client';

import { useId, useRef, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

/**
 * Etiqueta emergente.
 *
 * Sirve para UNA cosa: nombrar un control que solo muestra un icono —el menú
 * colapsado, los botones de acción de una fila—. Nunca para esconder
 * información que haga falta para decidir: lo que no se puede tocar en una
 * tablet no existe, y en una tablet no hay puntero que se pose.
 *
 * Por eso el contenido va SIEMPRE también en `aria-label` del hijo, y esto solo
 * añade la ayuda visual para quien usa ratón.
 */
export function Tooltip({
  label,
  side = 'right',
  children,
  className,
}: {
  readonly label: string;
  readonly side?: 'top' | 'right';
  readonly children: ReactNode;
  readonly className?: string;
}) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Un retardo corto evita que la etiqueta parpadee al cruzar la barra lateral
  // de camino a otra cosa.
  const show = (): void => {
    timer.current = setTimeout(() => setOpen(true), 300);
  };
  const hide = (): void => {
    if (timer.current !== undefined) clearTimeout(timer.current);
    setOpen(false);
  };

  return (
    <span
      className={cn('relative inline-flex', className)}
      onPointerEnter={show}
      onPointerLeave={hide}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={hide}
    >
      <span aria-describedby={open ? id : undefined} className="inline-flex">
        {children}
      </span>
      {open && (
        <span
          role="tooltip"
          id={id}
          className={cn(
            'pointer-events-none absolute z-40 animate-fade-in whitespace-nowrap',
            'rounded-chip bg-graphite-900 px-2 py-1 text-xs font-medium text-graphite-50 shadow-overlay',
            side === 'right' && 'left-full top-1/2 ml-2 -translate-y-1/2',
            side === 'top' && 'bottom-full left-1/2 mb-2 -translate-x-1/2',
          )}
        >
          {label}
        </span>
      )}
    </span>
  );
}
