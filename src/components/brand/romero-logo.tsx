import { OFFICIAL_LOGO, OFFICIAL_LOGO_DARK } from '@/features/brand/services/manifest';
import { cn } from '@/lib/utils/cn';

/**
 * Marca de Romero Motors.
 *
 * ⚠️ ESTO ES UNA RECONSTRUCCIÓN, NO EL LOGOTIPO ORIGINAL.
 *
 * Reproduce la composición del logotipo real: «ROMERO» en mayúsculas pesadas
 * con degradado de rojo a negro, la barra inclinada que atraviesa la R, y
 * «MOTORS» debajo en fino muy espaciado entre dos filetes. Las letras son la
 * tipográfica del sistema (Archivo), no los trazos originales, así que de
 * cerca no es idéntica.
 *
 * En cuanto exista `public/marca/romero-motors.svg` —o .png/.webp— se usa ese
 * archivo y esta reconstrucción deja de dibujarse. Basta con dejarlo en la
 * carpeta y correr `npm run assets`; ver `public/marca/README.md`.
 *
 * ── Por qué hay una versión monocroma ────────────────────────────────────
 *
 * El logotipo real es ROJO. En esta interfaz el rojo significa «retrasado»:
 * lo llevan el semáforo de las órdenes, los avisos críticos y el chip de
 * entrega vencida. Una marca roja en la barra lateral, a cuatro centímetros
 * de un chip rojo que sí es una alarma, le enseña al ojo que el rojo a veces
 * no significa nada.
 *
 * Por eso el color completo se reserva para los momentos de marca —el login,
 * el portal del cliente, los PDF que se le entregan— y el armazón operativo
 * lleva la versión monocroma. Es práctica normal de identidad, no un apaño.
 */

export function RomeroWordmark({
  on = 'light',
  mono = false,
  className,
}: {
  /** Sobre qué fondo se dibuja: decide hacia dónde va el degradado. */
  readonly on?: 'light' | 'dark';
  /**
   * Sin color de marca: hereda el del contenedor. Para el armazón operativo.
   * Solo afecta a la reconstrucción: el archivo oficial se muestra tal cual,
   * porque recolorear el logotipo de una empresa no es cosa del código.
   */
  readonly mono?: boolean;
  readonly className?: string;
}) {
  // El archivo oficial es rojo sobre negro: sobre grafito la «O» final y
  // «MOTORS» se pierden, así que ahí va la variante clara. Si solo hay una,
  // se usa esa y ya se verá; nunca se deja de mostrar el logotipo real.
  const oficial = (on === 'dark' ? OFFICIAL_LOGO_DARK : OFFICIAL_LOGO) ?? OFFICIAL_LOGO;

  if (oficial !== null) {
    /* eslint-disable-next-line @next/next/no-img-element -- archivo local de
       tamaño conocido; el optimizador no aporta en un logotipo. */
    return <img src={oficial} alt="Romero Motors" className={cn('block', className)} />;
  }

  /* ⚠️ Las coordenadas NO están puestas a ojo: se midieron con `getBBox()` en
     el navegador. A 62 px y peso 800, «ROMERO» ocupa 284 px de ancho y 46 px
     de altura de caja alta, con la línea base en y=72. Todo lo demás —dónde
     cruza la barra, dónde empiezan los filetes, dónde se centra «MOTORS»— sale
     de ahí. La primera versión llevaba números inventados y la barra tapaba la
     R en vez de cruzarla. */

  // El degradado del original termina en NEGRO. Sobre fondo oscuro eso borra
  // la última letra, así que ahí termina en claro: la misma idea de que la
  // palabra se apaga de izquierda a derecha, invertida para que se lea.
  const stops = mono
    ? ['currentColor', 'currentColor', 'currentColor']
    : on === 'dark'
      ? ['#ef3239', '#d0212a', '#f2f5f8']
      : ['#e8242b', '#c0161c', '#0b0b0b'];

  return (
    <svg
      viewBox="0 0 330 132"
      role="img"
      aria-label="Romero Motors"
      className={cn('block', className)}
    >
      <defs>
        <linearGradient id="romero-word" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={stops[0]} />
          <stop offset="45%" stopColor={stops[1]} />
          <stop offset="100%" stopColor={stops[2]} />
        </linearGradient>
      </defs>

      {/* La barra inclinada que cruza la R y sale por la izquierda. Es lo que
          hace reconocible el logotipo de lejos: sin ella queda un «ROMERO»
          cualquiera en negrita. Va a media altura de caja alta (y 44–58 sobre
          una caja de 26 a 72) y asoma 32 px a la izquierda de la palabra. */}
      <path d="M18 44 H76 L62 59 H4 Z" fill="url(#romero-word)" />

      <text
        x="36"
        y="72"
        className="font-display"
        fontSize="62"
        fontWeight="800"
        letterSpacing="-1.5"
        fill="url(#romero-word)"
      >
        ROMERO
      </text>

      {/* «MOTORS» centrado bajo la palabra (centro en 36 + 284/2 = 178), entre
          dos filetes que llegan justo hasta sus extremos medidos: 94 y 262. */}
      <line x1="36" y1="109" x2="84" y2="109" stroke="currentColor" strokeWidth="2.5" />
      <text
        x="178"
        y="118"
        textAnchor="middle"
        className="font-display"
        fontSize="26"
        fontWeight="300"
        letterSpacing="9"
        fill="currentColor"
      >
        MOTORS
      </text>
      <line x1="272" y1="109" x2="320" y2="109" stroke="currentColor" strokeWidth="2.5" />
    </svg>
  );
}

/**
 * Marca compacta, para donde no cabe la palabra entera.
 *
 * Conserva el rasgo que identifica: la R con su barra inclinada.
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
