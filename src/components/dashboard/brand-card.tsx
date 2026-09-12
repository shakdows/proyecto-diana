import { Car, ShieldCheck, Sparkles, Users } from 'lucide-react';
import { RomeroWordmark } from '@/components/brand/romero-logo';

/**
 * La tarjeta de marca del tablero.
 *
 * Es el único sitio de esta pantalla sin un solo dato operativo, y es a
 * propósito: mezclar una cifra del taller con un mensaje de marca hace que la
 * cifra parezca publicidad y el mensaje, un indicador.
 *
 * Los cuatro conceptos son los de la guía —personas, tecnología, confianza,
 * movilidad— y se dibujan con iconos, no con la imagen, por lo mismo que el
 * lema del hero: el texto dentro de una fotografía no escala ni se lee.
 *
 * El logotipo es el ARCHIVO OFICIAL —`RomeroWordmark`, que sirve
 * `public/marca/romero-motors-claro.png` sobre fondo oscuro—, no la marca
 * reconstruida con la tipografía del sistema. La reconstrucción existe para
 * cuando el archivo no está; estando, usarla es enseñar una imitación de la
 * marca de la empresa en su propia pantalla.
 */

const CONCEPTS = [
  { icon: Users, label: 'Personas' },
  { icon: Sparkles, label: 'Tecnología' },
  { icon: ShieldCheck, label: 'Confianza' },
  { icon: Car, label: 'Movilidad' },
] as const;

export function BrandCard() {
  return (
    <section className="@container relative isolate flex min-h-[13rem] overflow-hidden rounded-panel border border-border bg-surface">
      <span
        aria-hidden
        className="absolute inset-0 -z-20 bg-[radial-gradient(120%_100%_at_70%_50%,#122a44_0%,#0a1724_55%,#07111b_100%)]"
      />

      {/* La rueda, centrada y fundida por los dos lados: es fondo, no ilustración. */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-[30%] -z-10 hidden w-[55%] bg-cover bg-center opacity-80 @sm:block [mask-image:linear-gradient(to_right,transparent,black_32%,black_68%,transparent)]"
        style={{ backgroundImage: 'url(/fondos/rueda.webp)' }}
      />

      <div className="relative flex flex-1 flex-col justify-between gap-6 p-5 @xl:flex-row @xl:items-end">
        <div className="max-w-[16rem]">
          <p className="font-display text-lg font-semibold leading-snug text-fg">
            Más que mantenimiento,
            <br />
            confianza en cada km.
          </p>
          <span aria-hidden className="mt-3 block h-0.5 w-12 rounded-full bg-brand-600" />

          <RomeroWordmark on="dark" className="mt-5 h-8 w-auto" />
        </div>

        <ul className="space-y-2.5 @xl:text-right">
          {CONCEPTS.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-2.5 @xl:justify-end">
              <Icon aria-hidden className="size-4 shrink-0 text-brand-500 @xl:order-2" />
              <span className="text-sm text-fg-muted @xl:order-1">{label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
