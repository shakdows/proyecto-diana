/**
 * El monograma de Romero Motors.
 *
 * ── Por qué una R y no el logotipo ─────────────────────────────────────────
 *
 * El logotipo es un rótulo APAISADO —«ROMERO» con «MOTORS» debajo, 900 × 267—
 * y un icono es un CUADRADO que muchas veces se dibuja a 16 px. Encajar el
 * rótulo entero dentro deja una franja de tres píxeles de alto: a ese tamaño
 * no se lee «Romero Motors», se ve una mancha gris.
 *
 * Lo que sí sobrevive es la letra con la barra inclinada, que es el rasgo
 * distintivo de la marca —el mismo que está pintado en la pared del taller—.
 * Es la práctica normal de identidad: el rótulo para la cabecera, el
 * monograma para el icono.
 *
 * ── Por qué vive aquí y no en un `.svg` ────────────────────────────────────
 *
 * Porque hacen falta CUATRO salidas: la pestaña, y los PNG de 180, 192 y 512
 * que piden iOS, Android y el manifiesto. Con un archivo por salida, el día
 * que cambie la marca se actualizan tres y se olvida una —y la que se olvida
 * es siempre la que solo se ve al instalar—.
 */

/* `--color-graphite-950`, el mismo del armazón. Escrito a mano porque un
   icono se genera fuera de React y no puede leer una variable CSS. */
export const MARK_BG = '#0b1118';
export const MARK_RED = '#e8242b';
export const MARK_IVORY = '#f8f4ec';

/** La barra inclinada que cruza la R. */
const BARRA = 'M7.4 22.6 12.9 7.9h2.6L10 22.6z';

/** La R. */
const ERRE =
  'M13.2 8.2h5.9c3.1 0 5 1.7 5 4.4 0 2-1.1 3.4-3 4l3.4 5.6h-3.5l-3-5.1h-1.9v5.1h-2.9V8.2zm2.9 2.5v4.1h2.8c1.5 0 2.4-.8 2.4-2.1s-.9-2-2.4-2h-2.8z';

/**
 * El dibujo, sobre un lienzo de 32 × 32.
 *
 * `rounded` decide si lleva el cuadrado redondeado de fondo: la pestaña sí lo
 * necesita —se dibuja sobre el gris del navegador—, y el PNG del manifiesto
 * también, porque Android le pondría uno blanco detrás si no lo lleva.
 */
export function RomeroMark({ size = 32 }: { readonly size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="7" fill={MARK_BG} />
      <path d={BARRA} fill={MARK_RED} />
      <path d={ERRE} fill={MARK_IVORY} />
      {/* El filete de «MOTORS»: a 16 px desaparece y a 32 da el aire del rótulo. */}
      <rect x="13.2" y="24.4" width="11" height="1.4" rx="0.7" fill={MARK_RED} />
    </svg>
  );
}
