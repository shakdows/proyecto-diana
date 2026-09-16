/**
 * Lo que se comprueba ANTES de preguntarle a Supabase.
 *
 * ── Por qué validar aquí si el servidor ya valida ──────────────────────────
 *
 * Porque los dos errores son distintos. «Escribe tu correo» es un campo
 * vacío y se responde al instante; «correo o contraseña incorrectos» exige un
 * viaje y, sobre todo, NO PUEDE decir cuál de los dos falló: un mensaje que
 * distingue «ese correo no existe» de «la contraseña no es esa» convierte la
 * pantalla de entrada en un comprobador de qué cuentas existen.
 *
 * Dominio PURO: sin red, sin Supabase, sin React.
 */

export interface CredentialsCheck {
  readonly valid: boolean;
  readonly error: string | null;
}

/** Lo justo para saber que es una dirección, sin pretender validar el mundo. */
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u;

export function checkEmail(value: string): boolean {
  return CORREO.test(value.trim());
}

export function checkCredentials(email: string, password: string): CredentialsCheck {
  if (email.trim() === '') return { valid: false, error: 'Escribe tu correo.' };
  if (!checkEmail(email)) return { valid: false, error: 'Ese correo no tiene un formato válido.' };
  if (password === '') return { valid: false, error: 'Escribe tu contraseña.' };
  return { valid: true, error: null };
}

/**
 * El mensaje que se enseña cuando Supabase rechaza el acceso.
 *
 * Los suyos vienen en inglés y a veces cuentan de más. «Invalid login
 * credentials» se traduce a un mensaje que NO distingue si falló el correo o
 * la contraseña —a propósito—; el resto se traduce cuando se reconoce y se
 * deja pasar cuando no, porque un mensaje raro en inglés informa más que un
 * «error desconocido».
 */
export function signInError(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes('invalid login credentials')) return 'Correo o contraseña incorrectos.';
  if (m.includes('email not confirmed')) {
    return 'La cuenta existe pero el correo no está confirmado. Pídele al administrador que la active.';
  }
  if (m.includes('too many requests') || m.includes('rate limit')) {
    return 'Demasiados intentos seguidos. Espera un momento y vuelve a probar.';
  }
  if (m.includes('user is banned') || m.includes('disabled')) {
    return 'Esta cuenta está desactivada.';
  }
  return `No se pudo entrar: ${raw}`;
}
