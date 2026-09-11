'use client';

import { createContext, useContext, useId, type ReactNode } from 'react';
import { TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

/**
 * Envoltura de un campo: etiqueta, control, pista y error.
 *
 * Existe para que la relación entre las cuatro piezas se construya UNA vez y
 * bien. Un `<label>` suelto junto a un `<input>` se ve igual en pantalla pero
 * no está asociado: quien navega con lector de pantalla oye «cuadro de edición»
 * sin saber de qué, y el mensaje de error no se anuncia nunca.
 *
 * `Field` genera los identificadores y los reparte por contexto; el control
 * los recoge sin que quien escribe la pantalla tenga que acordarse.
 */

interface FieldIds {
  readonly controlId: string;
  readonly describedBy: string | undefined;
  readonly invalid: boolean;
  readonly required: boolean;
}

const FieldContext = createContext<FieldIds | null>(null);

/** Lo consumen Input, Textarea y Select. Fuera de un Field, no hacen nada raro. */
export function useFieldControl(): Partial<{
  id: string;
  'aria-describedby': string;
  'aria-invalid': true;
  'aria-required': true;
}> {
  const ctx = useContext(FieldContext);
  if (ctx === null) return {};
  return {
    id: ctx.controlId,
    ...(ctx.describedBy === undefined ? {} : { 'aria-describedby': ctx.describedBy }),
    ...(ctx.invalid ? { 'aria-invalid': true as const } : {}),
    ...(ctx.required ? { 'aria-required': true as const } : {}),
  };
}

export function Field({
  label,
  hint,
  error,
  required = false,
  children,
  className,
}: {
  readonly label: string;
  readonly hint?: string;
  readonly error?: string;
  readonly required?: boolean;
  readonly children: ReactNode;
  readonly className?: string;
}) {
  const base = useId();
  const controlId = `${base}-control`;
  const hintId = `${base}-hint`;
  const errorId = `${base}-error`;

  // El error manda sobre la pista: si hay las dos, se describe por el error.
  const describedBy =
    error !== undefined ? errorId : hint !== undefined ? hintId : undefined;

  return (
    <FieldContext.Provider
      value={{ controlId, describedBy, invalid: error !== undefined, required }}
    >
      <div className={cn('flex flex-col gap-1.5', className)}>
        <label htmlFor={controlId} className="text-sm font-medium text-fg">
          {label}
          {required && (
            <>
              <span aria-hidden className="ml-0.5 text-crit-600">
                *
              </span>
              <span className="sr-only"> (obligatorio)</span>
            </>
          )}
        </label>

        {children}

        {/* La pista se oculta cuando hay error: dos mensajes compiten y
            el que importa es el que impide continuar. */}
        {error === undefined && hint !== undefined && (
          <p id={hintId} className="text-xs text-fg-subtle">
            {hint}
          </p>
        )}

        {error !== undefined && (
          <p id={errorId} className="flex items-start gap-1.5 text-xs text-crit-600">
            <TriangleAlert aria-hidden className="mt-px size-3.5 shrink-0" />
            <span>{error}</span>
          </p>
        )}
      </div>
    </FieldContext.Provider>
  );
}

/**
 * Varios campos en rejilla.
 *
 * En tablet siempre una columna: un formulario de recepción a dos columnas
 * obliga a mirar en zigzag con el cliente delante.
 */
export function FieldGrid({
  children,
  columns = 2,
  className,
}: {
  readonly children: ReactNode;
  readonly columns?: 1 | 2 | 3;
  readonly className?: string;
}) {
  return (
    <div
      className={cn(
        'grid gap-x-5 gap-y-4',
        columns === 1 && 'grid-cols-1',
        columns === 2 && 'grid-cols-1 lg:grid-cols-2',
        columns === 3 && 'grid-cols-1 lg:grid-cols-3',
        className,
      )}
    >
      {children}
    </div>
  );
}
