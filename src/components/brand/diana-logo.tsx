import { OFFICIAL_DIANA } from '@/features/brand/services/manifest';
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
/**
 * La «A» del rótulo: un chevrón sin travesaño, en azul de marca.
 *
 * Va dimensionada en `em` y no en píxeles, así acompaña al tamaño de la
 * palabra sin tener una medida por cada sitio donde aparece el logotipo.
 */
function BlueA() {
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden
      className="mx-[0.06em] h-[0.72em] w-[0.62em] shrink-0 text-brand-500"
      // El trazo se ajusta al ancho del asta de la tipográfica fina.
      fill="none"
      stroke="currentColor"
      strokeWidth="11"
      strokeLinecap="square"
    >
      <path d="M8 96 50 6 92 96" />
    </svg>
  );
}

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

  if (OFFICIAL_DIANA !== null) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element -- archivo local de
         tamaño conocido; el optimizador no aporta en un logotipo. */
      <img
        src={OFFICIAL_DIANA}
        alt="DIANA · Automotive Operations"
        className={cn('block', size === 'lg' ? 'h-24 w-auto' : 'h-14 w-auto', className)}
      />
    );
  }

  return (
    <span className={cn('block min-w-0', className)}>
      {/* La «A» va azul y sin travesaño: es el único rasgo que distingue este
          rótulo de la palabra «DIANA» escrita en cualquier tipografía fina, y
          por eso se dibuja en vez de escribirse. El texto accesible sigue
          diciendo «DIANA» entero —el lector de pantalla no ve el chevrón—. */}
      <span
        className={cn(
          'flex items-center font-display font-light uppercase leading-none',
          size === 'lg'
            ? 'text-[2.75rem] tracking-[0.16em] xl:text-[3.5rem]'
            : 'text-[1.375rem] tracking-[0.2em]',
          strong,
        )}
      >
        <span aria-hidden>DI</span>
        <BlueA />
        <span aria-hidden>NA</span>
        <span className="sr-only">DIANA</span>
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
