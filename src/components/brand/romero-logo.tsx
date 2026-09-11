import { cn } from '@/lib/utils/cn';

/**
 * Marca de Romero Motors.
 *
 * Dibujada como SVG y no como imagen: en la barra lateral mide 40 px, tiene
 * que verse nítida en cualquier densidad de pantalla y cambiar de color según
 * el fondo. Un PNG a ese tamaño se ve sucio y obliga a tener una versión por
 * cada fondo.
 *
 * ⚠️ Es una reconstrucción del logotipo, no el archivo original. Cuando exista
 * `public/marca/romero-motors.svg` se sustituye por el oficial. El archivo
 * real es ROJO; aquí la marca hereda el color del contenedor porque en la
 * interfaz operativa el rojo significa «retrasado» y no puede significar
 * también «la empresa».
 */
export function RomeroMark({ className }: { readonly className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      role="img"
      aria-label="Romero Motors"
      className={cn('shrink-0', className)}
    >
      <defs>
        <linearGradient id="romero-mark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="currentColor" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0.65" />
        </linearGradient>
      </defs>
      {/* Cuña izquierda: el corte diagonal característico del original. */}
      <path d="M3 14.5 12.5 6v12.5L3 27z" fill="url(#romero-mark)" />
      {/* Asta, panza y pierna de la R. */}
      <path
        d="M15.5 6h14.2c6.9 0 11.3 3.9 11.3 9.9 0 4.6-2.6 8-6.9 9.3L45 42h-9.4l-9.5-15.2h-2.9V42h-7.7V6zm7.7 6.6v8h6c3.2 0 5.2-1.5 5.2-4s-2-4-5.2-4h-6z"
        fill="url(#romero-mark)"
      />
    </svg>
  );
}

/** Marca + nombre, como va en la barra lateral y en el login. */
export function RomeroLockup({
  tagline = 'Taller inteligente',
  className,
}: {
  readonly tagline?: string;
  readonly className?: string;
}) {
  return (
    <span className={cn('flex items-center gap-2.5', className)}>
      <RomeroMark className="size-9 text-brand-500" />
      <span className="min-w-0 leading-none">
        <span className="block font-display text-[0.9375rem] font-bold uppercase tracking-[0.04em] text-white">
          Romero
        </span>
        <span className="mt-0.5 block font-display text-[0.9375rem] font-bold uppercase tracking-[0.04em] text-white">
          Motors
        </span>
        <span className="mt-1 block text-[0.625rem] tracking-wide text-graphite-400">
          {tagline}
        </span>
      </span>
    </span>
  );
}
