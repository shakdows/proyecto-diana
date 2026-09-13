import Image from 'next/image';
import Link from 'next/link';
import { moduleImage, type AdminModule } from '@/features/dashboard/services/modules';
import { cn } from '@/lib/utils/cn';

/**
 * Un módulo del tablero, como fotografía.
 *
 * La fotografía YA trae dentro el icono, el nombre y la flecha. Repetirlos en
 * HTML encima daría dos nombres y dos flechas sobre la misma tarjeta, así que
 * aquí no se dibuja ni una letra: la imagen entera es el botón.
 *
 * Eso obliga a resolver la accesibilidad aparte, y no es un detalle menor. El
 * texto de la imagen no existe para un lector de pantalla, ni para el buscador
 * del navegador, ni para quien traduce la página. El enlace lleva su propio
 * nombre accesible y la imagen va como decorativa, que es lo correcto cuando
 * el nombre ya lo pone el enlace: al revés se anunciaría dos veces.
 *
 * `object-cover` y no `object-fill`: la tarjeta conserva la proporción del
 * archivo —900 × 656— así que en la práctica no recorta nada, pero si un día
 * llega una entrega con otra medida, se recortará en vez de deformarse. Una
 * llave estirada se ve mal antes de saber por qué.
 */
export function AdminModuleCard({
  module,
  priority = false,
}: {
  readonly module: AdminModule;
  /** Las de la primera fila se cargan antes: son las que se ven sin bajar. */
  readonly priority?: boolean;
}) {
  return (
    <Link
      href={module.href}
      aria-label={`Abrir ${module.label}`}
      className={cn(
        'group relative block overflow-hidden rounded-[1rem] bg-graphite-950',
        'shadow-[0_4px_18px_rgb(20_20_20/0.08)]',
        'transition-[transform,box-shadow] duration-[180ms] ease-snap',
        'hover:-translate-y-[3px] hover:shadow-[0_12px_28px_rgb(20_20_20/0.14)]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-romero-500',
        'active:translate-y-0',
      )}
    >
      {/* La proporción es la del archivo, no un 4:3 redondeado: así el rótulo
          que viene pintado abajo no se recorta a ninguna anchura. */}
      <span className="relative block aspect-[900/656]">
        <Image
          src={moduleImage(module.id)}
          alt=""
          fill
          priority={priority}
          /* El módulo ocupa un cuarto del contenido en pantalla ancha, la
             mitad en tableta y todo en móvil. Sin esto el navegador pide
             siempre la variante más grande. */
          sizes="(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw"
          className="object-cover transition-transform duration-[220ms] ease-snap group-hover:scale-[1.015]"
        />
      </span>
    </Link>
  );
}
