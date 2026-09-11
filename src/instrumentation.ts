/**
 * Validación del entorno al ARRANCAR el servidor.
 *
 * Next.js ejecuta `register()` una vez, cuando el servidor levanta. Es el
 * momento correcto para comprobar la configuración: un despliegue mal
 * configurado falla aquí, de forma explícita y antes de atender la primera
 * petición, en vez de romperse a mitad de una recepción.
 *
 * Se salta durante `next build`, donde los secretos de producción no están ni
 * deberían estar disponibles.
 */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (process.env['NEXT_PHASE'] === 'phase-production-build') return;

  const { getServerEnv } = await import('./lib/env.server');
  getServerEnv();
}
