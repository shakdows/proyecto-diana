import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { clientEnv } from '@/lib/env';

/**
 * Refresca la sesión en cada petición.
 *
 * Los tokens de Supabase caducan en una hora. Sin este paso, quien deja la
 * pestaña abierta durante la mañana vuelve del almuerzo y la aplicación lo
 * ha echado, aunque su sesión siguiera siendo válida: el token estaba
 * caducado y nadie lo renovó.
 *
 * Tiene que ocurrir en el middleware porque es el único sitio de una petición
 * de lectura donde se pueden ESCRIBIR cookies. Devuelve la respuesta con las
 * cookies ya puestas y quién es el usuario, para que la puerta decida sin
 * volver a preguntar.
 */
export async function refreshSession(request: NextRequest): Promise<{
  readonly response: NextResponse;
  readonly userId: string | null;
  readonly configured: boolean;
}> {
  const url = clientEnv.NEXT_PUBLIC_SUPABASE_URL;
  const key = clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (url === undefined || key === undefined) {
    return { response: NextResponse.next({ request }), userId: null, configured: false };
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  /*
   * `getUser()` y no `getSession()`: el segundo lee la cookie y se la cree.
   * El primero le pregunta al servidor de Supabase, que es el único que puede
   * decir si el token es auténtico. En el middleware —que es la puerta— creer
   * a la cookie sería dejar entrar a quien sepa escribirla.
   */
  const { data } = await supabase.auth.getUser();

  return { response, userId: data.user?.id ?? null, configured: true };
}
