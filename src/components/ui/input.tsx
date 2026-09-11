'use client';

import { ChevronDown } from 'lucide-react';
import type {
  InputHTMLAttributes,
  ReactNode,
  Ref,
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
  leading,
  ref,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & {
  /**
   * Icono a la izquierda, dentro del campo.
   *
   * Se llama `leading` y no `prefix` porque `prefix` es un atributo HTML real
   * —de RDFa— tipado como `string`. Al intersecarlo, la prop no podía aceptar
   * un elemento: quedaba `string & ReactNode`, que no admite nada. Nadie la
   * había usado todavía, así que el fallo estaba ahí sin dar la cara.
   */
  readonly leading?: ReactNode;
  /** Para poder llevar el foco al primer campo al abrir un formulario. */
  readonly ref?: Ref<HTMLInputElement>;
}) {
  const field = useFieldControl();

  if (leading === undefined) {
    return <input ref={ref} {...field} className={cn(control, 'h-11 px-3', className)} {...props} />;
  }

  return (
    <div className="relative flex items-center">
      <span
        aria-hidden
        className="pointer-events-none absolute left-3 flex items-center text-fg-subtle"
      >
        {leading}
      </span>
      <input
        ref={ref}
        {...field}
        className={cn(control, 'h-11 pl-9 pr-3', className)}
        {...props}
      />
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
