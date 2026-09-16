import { NextResponse, type NextRequest } from 'next/server';
import { isPublicRoute } from '@/lib/auth/public-routes';
import { DEMO_ROLE_COOKIE } from '@/lib/auth/session';
import { refreshSession } from '@/lib/supabase/middleware';

/**
 * La puerta.
 *
 * ── Dos modos, y el de verdad gana ─────────────────────────────────────────
 *
 * CON Supabase configurado, esto es control de acceso real: sin una sesión
 * que Supabase reconozca, no se entra. Y además refresca el token en cada
 * petición —los de Supabase caducan en una hora—, porque este es el único
 * sitio de una petición de lectura donde se pueden escribir cookies: sin
 * ello, quien deja la pestaña abierta durante la mañana vuelve del almuerzo
 * y lo ha echado el sistema.
 *
 * SIN Supabase configurado, vuelve a ser lo que era: una puerta de
 * demostración que solo comprueba que haya un puesto elegido. Eso NO es
 * seguridad —la cookie se edita desde el navegador en diez segundos— y no
 * hace falta que lo sea, porque detrás no hay base de datos ni datos reales.
 *
 * La cookie de la demostración NO abre la puerta cuando hay autenticación
 * real. Si la abriera, bastaría con escribirla a mano para saltarse el login,
 * y todo lo anterior sería teatro.
 *
 * `/presentacion`, la salud del servicio y los estáticos quedan fuera: son
 * públicos a propósito.
 */

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  /*
   * La sesión se refresca SIEMPRE, también en las rutas públicas y en el
   * propio login. Si solo se refrescara en las privadas, quien pasa un rato
   * en la pantalla de entrada volvería con el token caducado.
   */
  const { response, userId, configured } = await refreshSession(request);

  if (isPublicRoute(pathname)) return response;

  const entra = configured ? userId !== null : request.cookies.get(DEMO_ROLE_COOKIE) !== undefined;
  if (entra) return response;

  const url = request.nextUrl.clone();
  url.pathname = '/login';
  // De dónde venía, para devolverlo ahí después de entrar.
  if (pathname !== '/') url.searchParams.set('desde', pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
