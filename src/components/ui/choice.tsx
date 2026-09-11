'use client';

import { Check, Minus } from 'lucide-react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

/**
 * Casilla, opción y conmutador.
 *
 * Los tres se construyen sobre un `<input>` real oculto con `peer`, no sobre un
 * `<div>` con `onClick`. Así llegan gratis el foco por teclado, la barra
 * espaciadora, el envío del formulario y el anuncio correcto en un lector de
 * pantalla —cosas que un div simula mal y que en una pantalla de checklist
 * firmada por un cliente no son opcionales.
 *
 * El área tocable es la fila entera, no el cuadradito de 16 px.
 */

const row =
  'flex cursor-pointer items-start gap-3 rounded-control py-2.5 transition-colors duration-150 hover:bg-surface-sunken has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50';

/*
 * `peer-checked:` compila a `:is(:where(.peer):checked ~ *)`: hermano general,
 * NO descendiente. Poner la variante directamente sobre el icono de dentro
 * parece correcto y no aplica nunca —la casilla se vería siempre sin marcar—.
 * La variante va sobre el hermano y alcanza al icono con `[&_svg]`.
 */
const box = [
  'grid size-5 shrink-0 place-items-center rounded-[0.3rem] border-2 border-border-strong bg-surface',
  'transition-colors duration-150 ease-snap',
  'peer-checked:border-brand-600 peer-checked:bg-brand-600',
  'peer-checked:[&_svg]:opacity-100',
  'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus',
];

export function Checkbox({
  label,
  hint,
  indeterminate = false,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  readonly label: ReactNode;
  readonly hint?: string;
  readonly indeterminate?: boolean;
}) {
  return (
    <label className={cn(row, className)}>
      <input type="checkbox" className="peer sr-only" {...props} />
      <span aria-hidden className={cn(box, 'mt-0.5')}>
        {indeterminate ? (
          <Minus className="size-3.5 text-white opacity-0 transition-opacity" strokeWidth={3} />
        ) : (
          <Check className="size-3.5 text-white opacity-0 transition-opacity" strokeWidth={3} />
        )}
      </span>
      <span className="min-w-0">
        <span className="block text-sm text-fg">{label}</span>
        {hint !== undefined && <span className="block text-xs text-fg-subtle">{hint}</span>}
      </span>
    </label>
  );
}

export function Radio({
  label,
  hint,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  readonly label: ReactNode;
  readonly hint?: string;
}) {
  return (
    <label className={cn(row, className)}>
      <input type="radio" className="peer sr-only" {...props} />
      <span
        aria-hidden
        className={cn(
          'mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2 border-border-strong bg-surface',
          'transition-colors duration-150 ease-snap peer-checked:border-brand-600',
          'peer-checked:[&>span]:scale-100',
          'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus',
        )}
      >
        <span className="size-2.5 scale-0 rounded-full bg-brand-600 transition-transform duration-150 ease-snap" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm text-fg">{label}</span>
        {hint !== undefined && <span className="block text-xs text-fg-subtle">{hint}</span>}
      </span>
    </label>
  );
}

export function Switch({
  label,
  hint,
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  readonly label: ReactNode;
  readonly hint?: string;
}) {
  return (
    <label className={cn(row, 'items-center justify-between gap-4', className)}>
      <span className="min-w-0">
        <span className="block text-sm text-fg">{label}</span>
        {hint !== undefined && <span className="block text-xs text-fg-subtle">{hint}</span>}
      </span>
      <input type="checkbox" role="switch" className="peer sr-only" {...props} />
      <span
        aria-hidden
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full bg-graphite-300',
          'transition-colors duration-150 ease-snap peer-checked:bg-brand-600',
          'peer-checked:[&>span]:translate-x-5',
          'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus',
        )}
      >
        <span className="absolute left-0.5 top-0.5 size-5 rounded-full bg-white shadow-raise transition-transform duration-150 ease-snap" />
      </span>
    </label>
  );
}

/**
 * Grupo de opciones excluyentes en forma de botones grandes.
 *
 * Es el control del checklist: OK / NO CONFORME / NO APLICA. En una tablet, tres
 * botones de 44 px se aciertan de pie; tres círculos de radio de 20 px, no.
 */
export function ChoiceBar({
  name,
  options,
  value,
  onSelect,
  className,
}: {
  readonly name: string;
  readonly options: readonly { readonly value: string; readonly label: string; readonly tone?: 'ok' | 'crit' | 'neutral' }[];
  readonly value?: string;
  readonly onSelect?: (value: string) => void;
  readonly className?: string;
}) {
  return (
    <div role="radiogroup" aria-label={name} className={cn('flex gap-2', className)}>
      {options.map((option) => {
        const selected = value === option.value;
        const tone = option.tone ?? 'neutral';
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onSelect?.(option.value)}
            className={cn(
              'h-11 flex-1 rounded-control border text-sm font-medium transition-colors duration-150 ease-snap',
              'active:scale-[0.98]',
              !selected && 'border-border-strong bg-surface text-fg-muted hover:bg-surface-sunken',
              selected && tone === 'ok' && 'border-ok-600 bg-ok-100 text-ok-700',
              selected && tone === 'crit' && 'border-crit-600 bg-crit-100 text-crit-700',
              selected && tone === 'neutral' && 'border-graphite-400 bg-graphite-100 text-graphite-700',
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
