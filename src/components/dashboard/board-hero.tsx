import Link from 'next/link';
import { ArrowRight, Plus } from 'lucide-react';
import type { Situation } from '@/features/dashboard/services/situation';
import { cn } from '@/lib/utils/cn';

/**
 * La banda de apertura del tablero.
 *
 * Una sola afirmación sobre el estado del taller, la acción que más se usa, y
 * el vehículo. Nada más: lo que se lee primero, siempre, es lo único que no
 * puede competir con nada.
 *
 * La fotografía va a la derecha y se funde con el fondo mediante una máscara,
 * no pegada encima. Una foto con borde recto sobre un panel oscuro se ve como
 * una foto sobre un panel; fundida, el panel ES la foto.
 *
 * Todo el texto se pinta en HTML aunque la imagen original ya traía «SERVICIO
 * QUE TE MUEVE» dibujado dentro: un texto dentro de un PNG no se escala, no se
 * selecciona, no se traduce y no lo lee un lector de pantalla. La imagen se
 * recortó para quitarlo.
 */
export function BoardHero({
  greeting,
  userName,
  situation,
}: {
  readonly greeting: string;
  readonly userName: string;
  readonly situation: Situation;
}) {
  const rest =
    situation.emphasis === '' ? situation.headline : situation.headline.slice(situation.emphasis.length);

  return (
    <section className="@container relative isolate overflow-hidden rounded-panel border border-border bg-surface">
      {/* Degradado propio: el panel no es plano, se abre hacia la derecha
          donde está el vehículo. */}
      <span
        aria-hidden
        className="absolute inset-0 -z-20 bg-[linear-gradient(100deg,#0b1a29_0%,#0c1f33_38%,#0a1724_70%,#07111b_100%)]"
      />

      <Vehicle />

      <div className="relative flex min-h-[8.5rem] flex-col justify-center gap-2 px-5 py-5 @xl:min-h-[9rem] @xl:px-8 @3xl:max-w-[58%]">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.22em] text-fg-muted">
          {greeting}, {userName}
        </p>

        <h1 className="font-display text-[1.5rem] font-bold leading-[1.15] tracking-tight text-fg @xl:text-[1.75rem] @3xl:text-[1.9375rem]">
          {situation.emphasis !== '' && (
            <span className="text-brand-600">{situation.emphasis}</span>
          )}
          {rest}
        </h1>

        <p className="text-sm text-fg-muted">{situation.detail}</p>

        <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-3">
          <Link
            href="/recepcion/nueva"
            className={cn(
              'inline-flex h-11 items-center gap-2 rounded-control bg-brand-600 px-5',
              'text-sm font-semibold text-white shadow-panel',
              'transition-colors duration-150 ease-snap hover:bg-brand-700 active:scale-[0.98]',
            )}
          >
            <Plus aria-hidden className="size-4" />
            Nueva recepción
          </Link>

          <Link
            href="/tablero/operacion"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted transition-colors duration-150 hover:text-fg"
          >
            Ver detalle
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}

/**
 * El vehículo y el lema.
 *
 * Se esconde por debajo de `@xl`: en un teléfono no hay 40 % de ancho que
 * regalar, y una foto recortada a una franja de cien píxeles no se lee como
 * un coche, se lee como una mancha.
 */
function Vehicle() {
  return (
    <>
      <span
        aria-hidden
        className={cn(
          'absolute inset-y-0 right-0 -z-10 hidden w-[42%] bg-cover bg-center @xl:block',
          // La máscara funde el borde izquierdo de la foto con el panel.
          '[mask-image:linear-gradient(to_right,transparent,black_28%)]',
        )}
        style={{ backgroundImage: 'url(/fondos/hero-vehiculo.webp)' }}
      />

      <span
        aria-hidden
        className="absolute bottom-6 right-6 -z-10 hidden flex-col items-end gap-1.5 @3xl:flex"
      >
        <span className="text-[0.6875rem] font-medium uppercase leading-[1.6] tracking-[0.3em] text-graphite-200/85">
          Servicio
          <br />
          que te mueve
        </span>
        <span className="block h-0.5 w-14 rounded-full bg-brand-600" />
      </span>
    </>
  );
}
