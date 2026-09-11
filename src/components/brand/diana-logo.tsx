import { cn } from '@/lib/utils/cn';

/**
 * Marca del producto.
 *
 * DIANA es el sistema; Romero Motors es quien lo usa. En el armazón de la
 * aplicación manda DIANA, con el taller como respaldo debajo —«by Romero
 * Motors»—, que es el orden correcto: quien tiene la pantalla delante trabaja
 * DENTRO del producto, y el nombre de su propia empresa no le informa de nada.
 *
 * El logotipo de Romero Motors se reserva para lo que sale del taller hacia
 * fuera: los documentos que firma el cliente.
 *
 * La palabra va en fino y muy espaciada a propósito. En una barra lateral que
 * ya lleva doce entradas en semibold, una marca en negrita compite con la
 * navegación; espaciada y ligera se lee como rótulo y no como botón.
 */
export function DianaLockup({
  size = 'sm',
  on = 'dark',
  endorsement = true,
  className,
}: {
  readonly size?: 'sm' | 'lg';
  readonly on?: 'light' | 'dark';
  /** «by Romero Motors». Se quita donde el taller ya se nombra al lado. */
  readonly endorsement?: boolean;
  readonly className?: string;
}) {
  const strong = on === 'dark' ? 'text-white' : 'text-fg';
  const soft = on === 'dark' ? 'text-graphite-400' : 'text-fg-subtle';

  return (
    <span className={cn('block min-w-0', className)}>
      <span
        className={cn(
          'block font-display font-light uppercase leading-none',
          size === 'lg'
            ? 'text-[2.75rem] tracking-[0.16em] xl:text-[3.5rem]'
            : 'text-[1.375rem] tracking-[0.2em]',
          strong,
        )}
      >
        Diana
      </span>

      <span
        className={cn(
          'mt-1.5 block font-display font-medium uppercase leading-none',
          size === 'lg' ? 'text-sm tracking-[0.3em] xl:text-base' : 'text-[0.5rem] tracking-[0.22em]',
          on === 'dark' ? 'text-brand-400' : 'text-brand-600',
        )}
      >
        Automotive Operations
      </span>

      {endorsement && (
        <span
          className={cn(
            'mt-1.5 block leading-none',
            size === 'lg' ? 'text-sm' : 'text-[0.5625rem]',
            soft,
          )}
        >
          by Romero Motors
        </span>
      )}
    </span>
  );
}
