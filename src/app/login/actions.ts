'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { homeRouteForRole } from '@/lib/auth/navigation';
import { DEMO_ROLE_COOKIE, roleFromCookieValue } from '@/lib/auth/session';
import { createClient, supabaseConfigured } from '@/lib/supabase/server';
import { checkCredentials, signInError } from '@/features/auth/services/credentials';

/**
 * Entrar con correo y contraseña.
 *
 * Devuelve el mensaje de error en vez de lanzarlo: un error de acceso no es
 * una excepción del programa, es la respuesta normal a una contraseña mal
 * escrita, y tiene que poder pintarse debajo del campo.
 *
 * Al acertar NO devuelve nada: `redirect()` corta la ejecución. Y borra la
 * cookie de la demostración, porque dejar las dos a la vez es la clase de
 * detalle que hace que alguien crea que entró con su cuenta cuando sigue
 * siendo el asesor de mentira.
 */
export async function signIn(
  _previous: string | null,
  formData: FormData,
): Promise<string | null> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');

  const check = checkCredentials(email, password);
  if (!check.valid) return check.error;

  if (!supabaseConfigured()) {
    return 'El acceso con credenciales todavía no está configurado en este despliegue.';
  }

  const supabase = await createClient();
  if (supabase === null) {
    return 'El acceso con credenciales todavía no está configurado en este despliegue.';
  }

  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error !== null) return signInError(error.message);

  const store = await cookies();
  store.delete(DEMO_ROLE_COOKIE);

  redirect('/');
}

/**
 * Entrar en modo demostración con un rol.
 *
 * `roleFromCookieValue` normaliza lo que llegue: si el formulario trae un rol
 * que no existe, cae al asesor en vez de guardar basura en la cookie. Lo que
 * escribe el navegador NUNCA se guarda tal cual sin validar, aunque esto sea
 * una demostración —el hábito contrario es el que produce los agujeros—.
 *
 * Cada rol aterriza donde le sirve: `homeRouteFor` devuelve la primera
 * pantalla que sus permisos le dejan ver. El técnico no entra al tablero del
 * asesor, entra a su bandeja.
 */
export async function enterDemo(formData: FormData): Promise<void> {
  const raw = formData.get('role');
  const role = roleFromCookieValue(typeof raw === 'string' ? raw : undefined);

  const store = await cookies();
  store.set(DEMO_ROLE_COOKIE, role, {
    httpOnly: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8,
  });

  redirect(homeRouteForRole(role));
}

/** Salir: cierra la sesión real si la hay, y borra la de demostración. */
export async function leaveDemo(): Promise<void> {
  const supabase = await createClient();
  if (supabase !== null) await supabase.auth.signOut();

  const store = await cookies();
  store.delete(DEMO_ROLE_COOKIE);
  redirect('/login');
}
