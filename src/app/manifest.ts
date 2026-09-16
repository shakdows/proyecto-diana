import type { MetadataRoute } from 'next';
import { clientEnv } from '@/lib/env';

/**
 * Lo que hace que esto se pueda INSTALAR.
 *
 * Con este archivo, «Instalar aplicación» aparece en Chrome de escritorio y
 * en Android, y «Añadir a pantalla de inicio» en iPad y iPhone. El resultado
 * es un icono de Romero Motors en el escritorio o en la pantalla del
 * dispositivo que abre el sistema sin barra de direcciones, como una
 * aplicación.
 *
 * ── `standalone` y no `browser` ────────────────────────────────────────────
 *
 * Sin la barra del navegador. En la tablet del taller esa barra son cuarenta
 * píxeles de alto que no sirven para nada y un campo donde se puede teclear
 * cualquier dirección: quien recibe un vehículo no necesita navegar, necesita
 * la pantalla entera.
 *
 * ── `portrait-primary` no se pone a propósito ──────────────────────────────
 *
 * La recepción se hace con la tablet en vertical y el tablero se mira en
 * horizontal. Fijar una orientación obligaría a girar el aparato para la
 * mitad del trabajo.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${clientEnv.NEXT_PUBLIC_APP_NAME} · Romero Motors`,
    /* El corto es el que cabe bajo el icono: doce caracteres y se corta. */
    short_name: 'Romero',
    description:
      'Gestión del taller: recepción, orden de servicio, diagnóstico, cotización, reparación y entrega.',
    start_url: '/',
    display: 'standalone',
    /* El mismo grafito del armazón: sin esto, la pantalla de arranque sale
       blanca y parpadea en blanco antes de abrir una interfaz oscura. */
    background_color: '#0b1118',
    theme_color: '#0b1118',
    lang: 'es',
    dir: 'ltr',
    categories: ['business', 'productivity'],
    icons: [
      {
        src: '/iconos/192',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/iconos/512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      /*
        `maskable` es el mismo dibujo, y se declara aparte porque Android lo
        RECORTA a la forma del lanzador. El icono ya deja margen suficiente,
        así que sirve para los dos usos; sin esta línea, Android le pinta
        detrás un cuadrado blanco y el resultado es una pegatina.
      */
      {
        src: '/iconos/512',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
