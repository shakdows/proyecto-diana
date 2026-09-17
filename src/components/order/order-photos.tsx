'use client';

import { AssetImage } from '@/components/ui/asset-image';
import { PhotoCapture } from '@/components/evidence/photo-capture';
import { usePhotoCount } from '@/features/evidence/use-photo-count';
import { useHydrated } from '@/lib/demo/store';

/**
 * Las fotos del servicio.
 *
 * El botón «Subir» de esta tarjeta no hacía nada: era el último superviviente
 * del patrón que ya se corrigió en el checklist y en la evidencia de la
 * recepción. Ahora usa el mismo `PhotoCapture` que el resto del sistema, así
 * que en el móvil abre la cámara, en la computadora abre el visor o el
 * selector de archivos, reduce la imagen y le quita el EXIF —que es donde
 * viaja la ubicación—, y borrar pide la clave porque una foto borrada no se
 * vuelve a tomar.
 *
 * Las fotos SEMBRADAS se quedan arriba y separadas de las tomadas aquí: son
 * de la demostración, no las tomó nadie, y mezclarlas haría creer que hay
 * evidencia real donde no la hay.
 */
export function OrderPhotos({
  orderId,
  serviceType,
  seeded,
}: {
  readonly orderId: string;
  /** Decide el dibujo de la evidencia sembrada: el TRABAJO, no el rótulo. */
  readonly serviceType: string;
  readonly seeded: readonly { readonly id: string; readonly label: string; readonly at: string }[];
}) {
  const anchor = `orden-${orderId}`;
  const propias = usePhotoCount(anchor);
  const hydrated = useHydrated();

  return (
    /*
      El ancla vive aquí y no en un envoltorio: el expediente enlaza a
      «#fotos» cuando falta la evidencia final, y un envoltorio con
      `display: contents` no genera caja, así que el navegador no tendría
      adónde desplazarse. Solo hay un panel de fotos por pantalla, así que el
      identificador no se repite.
    */
    <section id="fotos" className="rounded-panel border border-border bg-surface-raised">
      <header className="flex items-center justify-between gap-3 px-5 py-4">
        <h2 className="font-display text-base font-semibold tracking-tight text-fg">
          Fotos del servicio
        </h2>
        <span data-numeric className="text-xs text-fg-subtle">
          {hydrated ? seeded.length + propias : seeded.length}
        </span>
      </header>

      <div className="space-y-4 px-5 pb-5">
        {seeded.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.06em] text-fg-subtle">
              Del expediente
            </p>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {seeded.map((photo) => (
                <li key={photo.id}>
                  <AssetImage
                    alt={photo.label}
                    subject={`${photo.label} ${serviceType}`}
                    kind="evidencia"
                    rounded="control"
                    className="aspect-4/3 w-full"
                  />
                  <p className="mt-1.5 truncate text-xs font-medium text-fg">{photo.label}</p>
                  <p data-numeric className="text-[0.625rem] text-fg-subtle">{photo.at}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="border-t border-border pt-4">
          <PhotoCapture
            anchor={anchor}
            title="Foto del servicio"
            hint="Cómo quedó el trabajo, la pieza cambiada, la comparación antes y después. Es la evidencia final que «Terminar reparación» exige."
          />
        </div>
      </div>
    </section>
  );
}
