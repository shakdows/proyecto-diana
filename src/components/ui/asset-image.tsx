import { Car, ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils/cn';

/**
 * Hueco de fotografía.
 *
 * El diseño pide fotos —el vehículo en la cabecera, la miniatura de cada fila,
 * la evidencia de cada hallazgo— y todavía no hay archivos en el repositorio.
 * Dejar un `<img>` roto se ve como un error; dejar un rectángulo gris se ve
 * como algo sin terminar.
 *
 * Esto dibuja una superficie intencionada, del color del sistema, con el icono
 * de lo que irá ahí. Cuando exista el archivo se pasa `src` y entra la foto sin
 * tocar la maqueta: el hueco ya tiene su tamaño y su recorte.
 */
export function AssetImage({
  src,
  alt,
  kind = 'vehiculo',
  className,
  rounded = 'panel',
}: {
  readonly src?: string;
  readonly alt: string;
  readonly kind?: 'vehiculo' | 'evidencia';
  readonly className?: string;
  readonly rounded?: 'chip' | 'control' | 'panel';
}) {
  const radius =
    rounded === 'chip' ? 'rounded-chip' : rounded === 'control' ? 'rounded-control' : 'rounded-panel';

  if (src !== undefined) {
    /* eslint-disable-next-line @next/next/no-img-element -- las rutas son
       locales y de tamaño conocido; `next/image` añadiría el optimizador sin
       ganancia para miniaturas ya recortadas. */
    return <img src={src} alt={alt} className={cn('object-cover', radius, className)} />;
  }

  const Icon = kind === 'vehiculo' ? Car : ImageOff;

  return (
    <span
      role="img"
      aria-label={alt}
      className={cn(
        'grid place-items-center overflow-hidden bg-graphite-100 text-graphite-400',
        'ring-1 ring-inset ring-black/5',
        radius,
        className,
      )}
    >
      <Icon aria-hidden className="size-1/3 max-h-8 min-h-4 max-w-8 min-w-4" />
    </span>
  );
}
