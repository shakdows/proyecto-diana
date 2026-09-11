'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { homeRouteForRole } from '@/lib/auth/navigation';
import { DEMO_ROLE_COOKIE, roleFromCookieValue } from '@/lib/auth/session';

/**
 * Entrar en modo demostración con un rol.
 *
 * `roleFromCookieValue` normaliza lo que llegue: si el formulario trae un rol
 * que no existe, cae al asesor en vez de guardar basura en la cookie. Lo que
 * escribe el navegador NUNCA se guarda tal cual sin validar, aunque esto sea
 * una demostración —el hábito contrario es el que produce los agujeros.
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

export async function leaveDemo(): Promise<void> {
  const store = await cookies();
  store.delete(DEMO_ROLE_COOKIE);
  redirect('/login');
}
