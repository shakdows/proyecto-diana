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
      {/* Filete diagonal: el corte característico, separado del asta para que
          la letra siga leyéndose como R a 40 px. */}
      <path d="M2 40 12 8h5.2L7.2 40z" fill="url(#romero-mark)" opacity="0.55" />
      {/* R: asta, panza y pierna. */}
      <path
        d="M18 8h13.4c6.9 0 11.4 3.8 11.4 9.6 0 4.3-2.5 7.5-6.7 8.8L46 40h-8.9l-7.8-12.4h-4V40H18V8zm6.3 5.8v8h6.4c3.3 0 5.4-1.5 5.4-4s-2.1-4-5.4-4h-6.4z"
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
