import { PartArt } from '@/components/art/part-art';
import { VehicleArt } from '@/components/art/vehicle-art';
import { cn } from '@/lib/utils/cn';

/**
 * Imagen del vehículo o de la evidencia.
 *
 * Orden de preferencia:
 *
 *   1. `src` — el archivo real, cuando exista en `public/`.
 *   2. Ilustración dibujada, elegida por carrocería o por tipo de pieza.
 *   3. Superficie plana, solo para fondos decorativos.
 *
 * El nivel 2 NO es un marcador de posición: un dibujo vectorial a 52 px se ve
 * mejor que una fotografía comprimida al mismo tamaño, escala sin pixelarse y
 * pesa dos kilobytes. En recepción, además, es lo único posible: la foto real
 * del vehículo del cliente se toma DESPUÉS de esta pantalla.
 *
 * Cuando se suban las fotos a `public/`, se pasa `src` y entran sin tocar la
 * maqueta: el hueco ya tiene su tamaño y su recorte.
 */
export function AssetImage({
  src,
  alt,
  kind = 'vehiculo',
  subject,
  equipmentKind = 'vehiculo',
  className,
  rounded = 'panel',
  decorative = false,
  fit = 'contain',
}: {
  readonly src?: string;
  readonly alt: string;
  readonly kind?: 'vehiculo' | 'evidencia';
  /** Qué se dibuja: el modelo del vehículo, o el texto del hallazgo. */
  readonly subject?: string;
  readonly equipmentKind?: 'vehiculo' | 'maquinaria';
  readonly className?: string;
  readonly rounded?: 'chip' | 'control' | 'panel';
  /** Fondo a sangre: superficie lisa, sin dibujo. */
  readonly decorative?: boolean;
  readonly fit?: 'contain' | 'cover';
}) {
  const radius =
    rounded === 'chip'
      ? 'rounded-chip'
      : rounded === 'control'
        ? 'rounded-control'
        : 'rounded-panel';

  if (src !== undefined) {
    /* eslint-disable-next-line @next/next/no-img-element -- rutas locales de
       tamaño conocido; el optimizador no aporta en miniaturas ya recortadas. */
    return <img src={src} alt={alt} className={cn('object-cover', radius, className)} />;
  }

  if (decorative) {
    return <span aria-hidden className={cn('block bg-graphite-900', radius, className)} />;
  }

  if (kind === 'evidencia') {
    return (
      <span className={cn('block overflow-hidden', radius, className)}>
        <PartArt label={subject ?? alt} />
      </span>
    );
  }

  return (
    <span
      className={cn(
        'grid place-items-center overflow-hidden bg-linear-to-b from-surface-sunken to-graphite-100',
        radius,
        className,
      )}
    >
      <VehicleArt vehicle={subject ?? alt} kind={equipmentKind} fit={fit} />
    </span>
  );
}
