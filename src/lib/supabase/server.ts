import 'server-only';

import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { clientEnv } from '@/lib/env';

/**
 * Supabase en el SERVIDOR (componentes de servidor y Server Actions).
 *
 * Usa la misma clave publicable que el navegador, no la de servicio: así la
 * consulta sigue viajando con el JWT del usuario y RLS sigue decidiendo. Usar
 * aquí la clave de servicio «porque es el servidor» es el atajo que convierte
 * la frontera de seguridad en un adorno —el servidor pasaría a ver TODO y
 * cualquier olvido de filtrar se volvería una fuga—.
 *
 * Devuelve `null` cuando Supabase no está configurado, para que la aplicación
 * siga funcionando en modo demostración en vez de reventar.
 */
export async function createClient(): Promise<SupabaseClient | null> {
  const url = clientEnv.NEXT_PUBLIC_SUPABASE_URL;
  const key = clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url === undefined || key === undefined) return null;

  const store = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return store.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            store.set(name, value, options);
          }
        } catch {
          /*
           * Un componente de servidor NO puede escribir cookies: solo pueden
           * las Server Actions y el middleware. Aquí se ignora a propósito
           * —el middleware ya refrescó la sesión en esta misma petición—, que
           * es justo lo que recomienda `@supabase/ssr`.
           */
        }
      },
    },
  });
}

/** Igual que en el cliente, pero legible desde el servidor. */
export function supabaseConfigured(): boolean {
  return (
    clientEnv.NEXT_PUBLIC_SUPABASE_URL !== undefined &&
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY !== undefined
  );
}
