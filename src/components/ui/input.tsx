'use client';

import { ChevronDown } from 'lucide-react';
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/lib/utils/cn';
import { useFieldControl } from './field';

/**
 * Controles de texto.
 *
 * Los tres comparten una sola definición de superficie para que un formulario
 * no parezca ensamblado con piezas de sitios distintos. 44 px de alto: el
 * objetivo táctil mínimo para alguien de pie en el taller, quizá con guantes.
 *
 * El anillo de foco es `focus:`, no `focus-visible:`. En un campo de texto el
 * puntero también necesita ver dónde está escribiendo.
 */
const control = [
  'w-full rounded-control border bg-surface text-sm text-fg',
  'border-border-strong placeholder:text-fg-subtle',
  'transition-[border-color,box-shadow] duration-150 ease-snap',
  'hover:border-graphite-300',
  'focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-600/20',
  'disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:text-fg-subtle',
  'aria-[invalid=true]:border-crit-500 aria-[invalid=true]:ring-crit-500/20',
];

export function Input({
  className,
  prefix,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { readonly prefix?: ReactNode }) {
  const field = useFieldControl();

  if (prefix === undefined) {
    return <input {...field} className={cn(control, 'h-11 px-3', className)} {...props} />;
  }

  return (
    <div className="relative flex items-center">
      <span
        aria-hidden
        className="pointer-events-none absolute left-3 flex items-center text-fg-subtle"
      >
        {prefix}
      </span>
      <input {...field} className={cn(control, 'h-11 pl-9 pr-3', className)} {...props} />
    </div>
  );
}

export function Textarea({
  className,
  rows = 3,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const field = useFieldControl();
  return (
    <textarea
      {...field}
      rows={rows}
      className={cn(control, 'resize-y px-3 py-2.5 leading-relaxed', className)}
      {...props}
    />
  );
}

export function Select({
  className,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement>) {
  const field = useFieldControl();
  return (
    <div className="relative">
      <select
        {...field}
        className={cn(control, 'h-11 appearance-none pl-3 pr-9', className)}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle"
      />
    </div>
  );
}

/**
 * Campo de identificador: placa o código de equipo.
 *
 * Monoespaciado y en mayúsculas mientras se escribe, porque es un código de
 * ancho fijo que se compara de un vistazo con lo que está impreso en la
 * máquina. `autoCapitalize` y `spellCheck` apagados: ningún corrector tiene
 * algo útil que decir sobre «EXC-014».
 */
export function IdentifierInput({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  const field = useFieldControl();
  return (
    <input
      {...field}
      autoCapitalize="characters"
      autoComplete="off"
      spellCheck={false}
      className={cn(
        control,
        'h-14 px-4 font-mono text-2xl font-semibold uppercase tracking-[0.12em]',
        className,
      )}
      {...props}
    />
  );
}
