import type { Metadata, Viewport } from 'next';
import { Archivo, IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';
import { clientEnv } from '@/lib/env';
import './globals.css';

const archivo = Archivo({
  subsets: ['latin'],
  variable: '--font-archivo',
  display: 'swap',
});

const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-sans',
  display: 'swap',
});

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: clientEnv.NEXT_PUBLIC_APP_NAME,
    template: `%s · ${clientEnv.NEXT_PUBLIC_APP_NAME}`,
  },
  description:
    'Gestión integral de taller automotriz: recepción, orden de servicio, diagnóstico, cotización, compras, reparación, entrega y satisfacción del cliente.',
  robots: { index: false, follow: false },
  /*
   * El icono de la aplicación instalada.
   *
   * `icon.svg` lo recoge Next por convención para la pestaña; esto declara los
   * que la convención no cubre: el de iOS —que exige PNG y no admite SVG— y
   * los del manifiesto. Los tres salen del mismo dibujo, generado en
   * `/iconos/<tamaño>`.
   */
  icons: {
    apple: [{ url: '/iconos/180', sizes: '180x180', type: 'image/png' }],
  },
  /* Sin esto, iOS abre la aplicación instalada CON la barra del navegador. */
  appleWebApp: {
    capable: true,
    title: 'Romero',
    statusBarStyle: 'black-translucent',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  /* El mismo que el manifiesto: si discrepan, la barra del sistema cambia de
     color entre la pantalla de arranque y la aplicación ya abierta. */
  themeColor: '#0b1118',
};

export default function RootLayout({ children }: { readonly children: React.ReactNode }) {
  return (
    <html lang="es" className={`${archivo.variable} ${plexSans.variable} ${plexMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
