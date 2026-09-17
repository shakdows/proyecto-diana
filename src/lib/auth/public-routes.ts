/**
 * Rutas que la puerta de la demostración deja pasar sin rol elegido.
 *
 * Vive en su propio módulo, separado del middleware, por una razón muy
 * concreta: `middleware.ts` importa `next/server` y no se puede cargar desde
 * una prueba de Node. Sacando la lista aquí, una prueba puede comprobar que
 * toda carpeta de `public/` esté declarada — que es el fallo que se ha colado
 * cuatro veces.
 */

export const PUBLIC_ROUTES: readonly string[] = [
  '/login',
  '/presentacion',
  '/api/health',
  '/icon.svg',
  // El icono y el manifiesto de la aplicación instalable.
  //
  // Tienen que ser públicos por el MISMO motivo que las carpetas de abajo, y
  // encima en el peor momento: el navegador pide el manifiesto y los iconos
  // justo cuando alguien está en la pantalla de entrada, es decir SIN sesión.
  // Redirigidos al login, Chrome recibe una página HTML donde esperaba un
  // JSON, no ofrece «Instalar aplicación», y en iOS el icono de la pantalla de
  // inicio sale en blanco.
  '/manifest.webmanifest',
  '/iconos',
  // ⚠️ CARPETAS DE `public/`. Cada vez que se añade una, hay que añadirla
  // aquí, y es un error que no avisa: el middleware las redirige a /login, el
  // navegador recibe una página HTML donde esperaba una imagen, y lo único
  // que se ve es un icono de imagen rota. Ha pasado CUATRO veces —
  // `/fotos-de-carros`, `/fondos`, `/marca` y `/assets`—, así que la regla es:
  // carpeta nueva en `public/`, línea nueva aquí.
  //
  // `/assets` además lo pide el optimizador de imágenes de Next, que va a
  // buscar el archivo por HTTP contra este mismo servidor: si el middleware
  // le contesta con el login, la imagen no se genera.
  //
  // Son públicas por definición: las ve el cliente en el portal de
  // autorización y cualquiera en la portada, ambos sin sesión.
  //
  // La evidencia del cliente NO vive aquí: va a almacenamiento privado con
  // URL firmada. Ver public/fotos-de-carros/README.md.
  '/fotos-de-carros',
  /* Las cinco vistas del checklist de inspección. */
  '/checklist',
  '/fondos',
  '/marca',
  '/assets',
  // El cliente llega por enlace y no tiene —ni debe tener— sesión del taller.
  '/autorizacion',
  '/encuesta',
];


/** ¿Esta ruta pasa sin sesión? Coincidencia exacta o por segmento completo. */
export function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}
