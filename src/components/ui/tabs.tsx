'use client';

import { useId, useState, type ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

/**
 * Pestañas.
 *
 * Teclado incluido: flechas para moverse, Inicio y Fin para los extremos. Es lo
 * que la especificación WAI-ARIA da por supuesto y lo que casi ninguna
 * implementación casera trae; sin ello, Tab recorre una a una las ocho
 * pestañas antes de llegar al contenido.
 */

export interface TabItem {
  readonly id: string;
  readonly label: string;
  readonly badge?: ReactNode;
  readonly content: ReactNode;
}

export function Tabs({
  items,
  initialId,
  className,
}: {
  readonly items: readonly TabItem[];
  readonly initialId?: string;
  readonly className?: string;
}) {
  const base = useId();
  const [active, setActive] = useState(initialId ?? items[0]?.id ?? '');

  const move = (from: number, delta: number): void => {
    const next = (from + delta + items.length) % items.length;
    const target = items[next];
    if (target === undefined) return;
    setActive(target.id);
    document.getElementById(`${base}-tab-${target.id}`)?.focus();
  };

  return (
    <div className={className}>
      <div role="tablist" className="flex gap-1 border-b border-border">
        {items.map((item, index) => {
          const selected = item.id === active;
          return (
            <button
              key={item.id}
              id={`${base}-tab-${item.id}`}
              role="tab"
              type="button"
              aria-selected={selected}
              aria-controls={`${base}-panel-${item.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(item.id)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight') move(index, 1);
                else if (e.key === 'ArrowLeft') move(index, -1);
                else if (e.key === 'Home') move(0, 0);
                else if (e.key === 'End') move(items.length - 1, 0);
                else return;
                e.preventDefault();
              }}
              className={cn(
                'relative -mb-px flex items-center gap-2 px-3.5 py-2.5 text-sm',
                'transition-colors duration-150 ease-snap',
                selected
                  ? 'border-b-2 border-brand-600 font-medium text-fg'
                  : 'border-b-2 border-transparent text-fg-muted hover:text-fg',
              )}
            >
              {item.label}
              {/*
                El contador va en su propio elemento y no suelto al lado de la
                etiqueta: dos nodos de texto contiguos dentro de un contenedor
                flex se funden en UNA sola caja anónima, así que el `gap-2` no
                se aplica entre ellos y en pantalla salía «Vehículos2».
              */}
              {item.badge !== undefined && (
                <span
                  data-numeric
                  className={cn(
                    'rounded-chip px-1.5 py-0.5 text-xs',
                    selected ? 'bg-brand-600/10 text-brand-700' : 'bg-surface-sunken text-fg-subtle',
                  )}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {items.map((item) => (
        <div
          key={item.id}
          id={`${base}-panel-${item.id}`}
          role="tabpanel"
          aria-labelledby={`${base}-tab-${item.id}`}
          hidden={item.id !== active}
          tabIndex={0}
          className="pt-5 focus-visible:outline-none"
        >
          {item.id === active && item.content}
        </div>
      ))}
    </div>
  );
}
