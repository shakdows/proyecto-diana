import { NextResponse, type NextRequest } from 'next/server';
import { DEMO_ROLE_COOKIE } from '@/lib/auth/session';

/**
 * Puerta de la demostración.
 *
 * Sin rol elegido, cualquier ruta de la aplicación lleva a la pantalla de
 * entrada. NO es control de acceso —la cookie se edita desde el navegador en
 * diez segundos—: es lo que hace que el sistema se abra por su puerta en vez
 * de caer directamente en un tablero. La frontera de seguridad real llega en
 * la Fase 3 y vive en la base de datos, no aquí.
 *
 * `/presentacion`, la salud del servicio y los estáticos quedan fuera: son
 * públicos a propósito.
 */
const PUBLIC = [
  '/login',
  '/presentacion',
  '/api/health',
  '/icon.svg',
  // ⚠️ Recursos de marca: fotos de catálogo, fondos y logotipos.
  //
  // Son públicos por definición —los ve el cliente en el portal de
  // autorización y cualquiera en la portada, ambos sin sesión— y sin estas
  // líneas el middleware los redirige a /login y salen rotos. Pasó ya una vez
  // con `/fotos-de-carros`; las tres carpetas tienen el mismo problema.
  //
  // La evidencia del cliente NO vive aquí: va a almacenamiento privado con
  // URL firmada. Ver public/fotos-de-carros/README.md.
  '/fotos-de-carros',
  '/fondos',
  '/marca',
  // El cliente llega por enlace y no tiene —ni debe tener— sesión del taller.
  '/autorizacion',
  '/encuesta',
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC.some((route) => pathname === route || pathname.startsWith(`${route}/`))) {
    return NextResponse.next();
  }

  if (request.cookies.get(DEMO_ROLE_COOKIE) !== undefined) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = '/login';
  // De dónde venía, para devolverlo ahí después de elegir rol.
  if (pathname !== '/') url.searchParams.set('desde', pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
