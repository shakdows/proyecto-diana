import 'server-only';
import { z } from 'zod';
import { formatIssues, optionalEnv } from './env';

/**
 * Variables del SERVIDOR. Nunca se exponen al navegador.
 *
 * Se validan de forma PEREZOSA y memorizada, no al importar el módulo.
 *
 * El motivo es concreto: durante `next build` Next evalúa los módulos para
 * recolectar la configuración de las páginas, y en ese momento los secretos de
 * producción no están —ni deberían estar— disponibles. Validar al importar
 * hacía fallar el despliegue con un error que señalaba a `/_not-found`.
 *
 * El arranque sigue fallando rápido: `src/instrumentation.ts` llama a
 * `getServerEnv()` cuando el servidor levanta. Un despliegue mal configurado
 * revienta ahí, de forma explícita, y no a mitad de una recepción.
 */

const serverSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // Solo la usan los scripts de `scripts/` y `db/`; nunca el runtime.
  DATABASE_URL: optionalEnv(z.string().url()),

  // Supabase (Fase 3 en adelante).
  SUPABASE_SERVICE_ROLE_KEY: optionalEnv(z.string().min(1)),

  // HMAC del documento de identidad: permite buscar por DNI sin leer el DNI.
  // Obligatoria desde la Fase 4.
  DOCUMENT_HASH_SECRET: optionalEnv(z.string().min(32)),

  // Solo "true" activa los datos DEMO. Nunca por descuido.
  ENABLE_DEMO_DATA: z.preprocess((v) => v === 'true', z.boolean()),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  if (cached !== undefined) return cached;

  // Escape para que el build de integración continua no exija secretos.
  if (process.env['SKIP_ENV_VALIDATION'] === 'true') {
    cached = serverSchema.parse({ NODE_ENV: process.env.NODE_ENV });
    return cached;
  }

  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Entorno inválido (servidor):\n${formatIssues(parsed.error)}`);
  }

  cached = parsed.data;
  return cached;
}
