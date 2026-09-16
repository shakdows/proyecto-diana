'use client';

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { clientEnv } from '@/lib/env';

/**
 * Supabase en el NAVEGADOR.
 *
 * Viaja con la clave publicable y con el JWT del usuario. Eso significa que
 * cualquier consulta que haga está sujeta a RLS: la base decide qué filas
 * existen para quien pregunta, y no hay forma de pedir más desde aquí. Es la
 * razón por la que esta clave puede vivir en el bundle sin que eso sea un
 * agujero —y por la que la de servicio NUNCA puede—.
 */
export function createClient(): SupabaseClient {
  const url = clientEnv.NEXT_PUBLIC_SUPABASE_URL;
  const key = clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url === undefined || key === undefined) {
    throw new Error(
      'Supabase no está configurado: faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }
  return createBrowserClient(url, key);
}

/** ¿Hay autenticación real disponible, o seguimos en la demostración? */
export function supabaseConfigured(): boolean {
  return (
    clientEnv.NEXT_PUBLIC_SUPABASE_URL !== undefined &&
    clientEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY !== undefined
  );
}
