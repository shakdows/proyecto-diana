import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

const button = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'rounded-control font-medium',
    // La confirmación táctil importa más que en un escritorio: quien pulsa está
    // de pie, quizá con guantes, y no siempre oye ni mira el resultado.
    'transition-[background-color,border-color,color,transform] duration-150 ease-snap',
    'active:scale-[0.98]',
    'disabled:pointer-events-none disabled:opacity-50',
  ],
  {
    variants: {
      variant: {
        primary: 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800',
        secondary:
          'bg-surface-raised text-fg border border-border-strong hover:bg-surface-sunken hover:border-graphite-300 active:bg-graphite-100',
        ghost: 'text-fg-muted hover:bg-surface-sunken hover:text-fg active:bg-graphite-100',
        danger: 'bg-crit-600 text-white hover:bg-crit-700 active:bg-crit-700',
        /* Para la acción destacada sobre fondo grafito: menú, login, cabeceras. */
        inverted:
          'bg-white text-graphite-950 hover:bg-graphite-100 active:bg-graphite-200',
      },
      size: {
        // 44 px de alto en `md`: objetivo táctil mínimo para uso con guantes.
        sm: 'h-8 px-3 text-sm',
        md: 'h-11 px-4 text-sm',
        lg: 'h-13 px-6 text-base',
      },
      block: { true: 'w-full', false: '' },
    },
    defaultVariants: { variant: 'primary', size: 'md', block: false },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof button> {
  readonly children: ReactNode;
}

export function Button({ className, variant, size, block, ...props }: ButtonProps) {
  return <button className={cn(button({ variant, size, block }), className)} {...props} />;
}
