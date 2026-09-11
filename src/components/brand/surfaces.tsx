import { cn } from '@/lib/utils/cn';

/**
 * Las superficies de marca.
 *
 * La guía entrega estos fondos como PNG de 1920 × 1080: patrón hexagonal,
 * patrón de puntos, ondas azules, degradados. Aquí están dibujados, no
 * importados, y no es por no tener los archivos: para esto el dibujo es
 * mejor que la imagen, y por cuatro motivos que se notan en producción.
 *
 *   · Pesan bytes en vez de cientos de kilobytes, y no hay descarga que
 *     esperar antes de que la sección se vea entera.
 *   · Escalan. Un PNG de 1920 puesto en un panel de 400 px se ve borroso en
 *     una pantalla de alta densidad, y en un monitor ancho se queda corto.
 *   · Siguen el tema. El mismo patrón vale en claro y en oscuro porque toma
 *     el color del contenedor; con imágenes harían falta dos juegos.
 *   · Se recolorean. Cambiar el azul de marca cambia los fondos; con PNG hay
 *     que volver a exportarlos todos y alguien se olvida de uno.
 *
 * Todos son decorativos: van con `aria-hidden` y nunca llevan información.
 */

/** Retícula hexagonal. Para tarjetas de datos y secciones técnicas. */
export function HexPattern({ className }: { readonly className?: string }) {
  return (
    <svg aria-hidden className={cn('absolute inset-0 size-full', className)}>
      <defs>
        <pattern
          id="diana-hex"
          width="56"
          height="48.5"
          patternUnits="userSpaceOnUse"
          patternTransform="scale(0.9)"
        >
          {/* Dos hexágonos desplazados medio alto: es lo que hace que la
              retícula continúe sin costura al repetirse. */}
          <path
            d="M14 0 42 0 56 24.25 42 48.5 14 48.5 0 24.25Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#diana-hex)" />
    </svg>
  );
}

/** Trama de puntos. El fondo más discreto: textura sin dibujo. */
export function DotPattern({ className }: { readonly className?: string }) {
  return (
    <svg aria-hidden className={cn('absolute inset-0 size-full', className)}>
      <defs>
        <pattern id="diana-dots" width="18" height="18" patternUnits="userSpaceOnUse">
          <circle cx="2" cy="2" r="1.2" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#diana-dots)" />
    </svg>
  );
}

/**
 * Ondas azules.
 *
 * El elemento de marca con más presencia: va donde la sección tiene que
 * sentirse de portada. Tres trazos y no diez, porque a partir de ahí el texto
 * que va encima deja de leerse.
 */
export function BlueWave({ className }: { readonly className?: string }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 1200 400"
      preserveAspectRatio="none"
      className={cn('absolute inset-0 size-full', className)}
    >
      <defs>
        <linearGradient id="diana-wave" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--color-brand-600)" stopOpacity="0" />
          <stop offset="45%" stopColor="var(--color-brand-500)" stopOpacity="0.9" />
          <stop offset="75%" stopColor="var(--color-accent-400)" stopOpacity="0.75" />
          <stop offset="100%" stopColor="var(--color-accent-400)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="url(#diana-wave)">
        <path d="M-50 300C200 300 300 120 600 120s420 190 660 150" strokeWidth="2" />
        <path d="M-50 340C220 340 320 180 620 180s400 180 640 140" strokeWidth="1.2" opacity="0.6" />
        <path d="M-50 258C180 258 280 66 580 66s440 200 680 160" strokeWidth="1" opacity="0.4" />
      </g>
    </svg>
  );
}

/**
 * Panel oscuro de marca.
 *
 * Envuelve el fondo grafito, el patrón y el degradado en una sola pieza, para
 * que las secciones oscuras del sistema se parezcan entre sí sin que cada una
 * vuelva a decidir su receta.
 */
export function BrandSurface({
  pattern = 'hex',
  glow = true,
  className,
  children,
}: {
  readonly pattern?: 'hex' | 'dots' | 'wave' | 'none';
  /** El resplandor azul de la esquina. */
  readonly glow?: boolean;
  readonly className?: string;
  readonly children: React.ReactNode;
}) {
  return (
    <section className={cn('relative isolate overflow-hidden bg-graphite-950', className)}>
      {pattern === 'hex' && <HexPattern className="text-white/5" />}
      {pattern === 'dots' && <DotPattern className="text-white/8" />}
      {pattern === 'wave' && <BlueWave className="opacity-70" />}

      {glow && (
        <span
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-brand-600/25 blur-3xl"
        />
      )}

      <div className="relative">{children}</div>
    </section>
  );
}
