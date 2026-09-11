'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CornerDownLeft, Search } from 'lucide-react';
import { Plate } from '@/components/ui/plate';
import { cn } from '@/lib/utils/cn';

/**
 * Búsqueda universal (⌘K / Ctrl+K).
 *
 * Un asesor con el cliente al teléfono no navega por el menú: teclea la placa.
 * Por eso la búsqueda alcanza a la vez vehículos, órdenes, clientes y las
 * propias pantallas, y se abre desde cualquier sitio sin tocar el ratón.
 *
 * La placa se normaliza antes de comparar —«abc 123», «ABC-123» y «abc123» son
 * el mismo vehículo—, que es justo como la dice la gente y como NO la guarda
 * una comparación literal.
 */

export interface CommandTarget {
  readonly id: string;
  readonly href: string;
  readonly kind: 'orden' | 'pantalla';
  readonly title: string;
  readonly subtitle?: string;
  readonly plate?: string;
  /** Todo lo que debe encontrar esta entrada, ya en minúsculas. */
  readonly haystack: string;
}

const normalize = (value: string): string =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/gu, '')
    .replace(/[^a-z0-9]/gu, '');

export function CommandPalette({ targets }: { readonly targets: readonly CommandTarget[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [cursor, setCursor] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const node = dialogRef.current;
    if (node === null) return;
    if (open && !node.open) {
      node.showModal();
      inputRef.current?.focus();
    } else if (!open && node.open) {
      node.close();
    }
  }, [open]);

  useEffect(() => {
    const node = dialogRef.current;
    if (node === null) return;
    const onClose = (): void => {
      setOpen(false);
      setQuery('');
      setCursor(0);
    };
    node.addEventListener('close', onClose);
    return () => node.removeEventListener('close', onClose);
  }, []);

  const results = useMemo(() => {
    const q = normalize(query);
    if (q === '') return targets.filter((t) => t.kind === 'pantalla').slice(0, 6);
    return targets.filter((t) => normalize(t.haystack).includes(q)).slice(0, 8);
  }, [targets, query]);

  const go = (href: string): void => {
    setOpen(false);
    router.push(href);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          // `min-w-0 flex-1`, no `w-full`: dentro de la barra superior, un
          // ancho del 100 % se mide contra el contenedor y empuja fuera de
          // pantalla al grupo de la derecha. A 390 px el documento desbordaba
          // 21 px de lado.
          'flex h-11 min-w-0 flex-1 max-w-lg items-center gap-3 rounded-[0.875rem] border border-border',
          'bg-surface-sunken px-4 text-sm text-fg-subtle',
          'transition-colors duration-150 hover:border-border-strong hover:text-fg-muted',
        )}
      >
        <Search aria-hidden className="size-[1.125rem] shrink-0" />
        <span className="truncate">Buscar placa, orden o cliente…</span>
        <kbd className="ml-auto hidden shrink-0 rounded-chip border border-border bg-surface px-2 py-1 text-[0.6875rem] font-medium text-fg-subtle sm:block">
          Ctrl K
        </kbd>
      </button>

      <dialog
        ref={dialogRef}
        aria-label="Búsqueda universal"
        className={cn(
          'w-[calc(100vw-2rem)] max-w-xl rounded-modal bg-surface-raised p-0 text-fg shadow-overlay',
          'mx-auto mt-[12vh] mb-auto animate-rise-in',
          'backdrop:bg-graphite-950/50 backdrop:backdrop-blur-[2px]',
        )}
      >
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search aria-hidden className="size-4 shrink-0 text-fg-subtle" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCursor(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setCursor((c) => Math.min(c + 1, results.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setCursor((c) => Math.max(c - 1, 0));
              } else if (e.key === 'Enter') {
                const target = results[cursor];
                if (target !== undefined) go(target.href);
              }
            }}
            placeholder="Buscar placa, orden o cliente…"
            aria-label="Buscar"
            className="h-14 w-full bg-transparent text-base text-fg outline-none placeholder:text-fg-subtle"
          />
        </div>

        {results.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-fg-subtle">
            Nada coincide con «{query}». Prueba con una placa o un número de orden.
          </p>
        ) : (
          <ul className="max-h-80 overflow-y-auto p-2">
            {results.map((target, index) => (
              <li key={target.id}>
                <button
                  type="button"
                  onClick={() => go(target.href)}
                  onPointerMove={() => setCursor(index)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-control px-2.5 py-2.5 text-left',
                    index === cursor ? 'bg-surface-sunken' : 'bg-transparent',
                  )}
                >
                  {target.plate !== undefined && <Plate value={target.plate} size="sm" />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-fg">
                      {target.title}
                    </span>
                    {target.subtitle !== undefined && (
                      <span className="block truncate text-xs text-fg-subtle">
                        {target.subtitle}
                      </span>
                    )}
                  </span>
                  {index === cursor && (
                    <CornerDownLeft aria-hidden className="size-3.5 shrink-0 text-fg-subtle" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}

        <footer className="flex items-center gap-4 border-t border-border px-4 py-2.5 text-[0.6875rem] text-fg-subtle">
          <span>↑ ↓ moverse</span>
          <span>↵ abrir</span>
          <span>Esc cerrar</span>
        </footer>
      </dialog>
    </>
  );
}
