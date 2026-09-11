import { cn } from '@/lib/utils/cn';

/**
 * Separador. `role="presentation"` a propósito: divide visualmente, no aporta
 * nada a quien no ve la pantalla, y anunciarlo solo añadiría ruido.
 */
export function Separator({
  orientation = 'horizontal',
  className,
}: {
  readonly orientation?: 'horizontal' | 'vertical';
  readonly className?: string;
}) {
  return (
    <div
      role="presentation"
      className={cn(
        'bg-border',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className,
      )}
    />
  );
}
