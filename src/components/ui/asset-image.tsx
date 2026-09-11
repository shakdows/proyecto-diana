import { PartArt } from '@/components/art/part-art';
import { VehicleArt } from '@/components/art/vehicle-art';
import { PHOTO_MANIFEST } from '@/features/vehicles/services/manifest';
import { findPhoto } from '@/features/vehicles/services/photos';
import { cn } from '@/lib/utils/cn';

/**
 * Imagen del vehículo o de la evidencia.
 *
 * Orden de preferencia:
 *
 *   1. `src` — un archivo concreto, cuando quien llama ya sabe cuál es.
 *   2. La fotografía del modelo, si alguien dejó una en
 *      `public/fotos-de-carros/` (ver el README de esa carpeta).
 *   3. Ilustración dibujada, elegida por carrocería o por tipo de pieza.
 *   4. Superficie plana, solo para fondos decorativos.
 *
 * El nivel 3 NO es un marcador de posición: un dibujo vectorial a 52 px se ve
 * mejor que una fotografía comprimida al mismo tamaño, escala sin pixelarse y
 * pesa dos kilobytes. En recepción, además, es lo único posible: la foto real
 * del vehículo del cliente se toma DESPUÉS de esta pantalla.
 *
 * Por eso el nivel 2 se resuelve por modelo y no por unidad: son fotos
 * genéricas de catálogo —«así es un Hyundai Tucson»—, nunca evidencia del
 * cliente, que vive en almacenamiento privado con URL firmada.
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

  // Una foto de catálogo solo sustituye al dibujo del vehículo. La evidencia
  // no se ilustra con la foto de otro coche, y el fondo decorativo es fondo.
  const photo =
    src ?? (decorative || kind !== 'vehiculo' ? null : findPhoto(PHOTO_MANIFEST, subject ?? alt));

  if (photo !== null) {
    /* Siempre recortada, nunca encajada: los huecos tienen alto y ancho fijos,
       y una foto en `contain` dejaría dos franjas vacías. `fit` sigue mandando
       sobre el dibujo, que sí se escala entero. */
    /* eslint-disable-next-line @next/next/no-img-element -- rutas locales de
       tamaño conocido; el optimizador no aporta en miniaturas ya recortadas. */
    return <img src={photo} alt={alt} className={cn('object-cover', radius, className)} />;
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
