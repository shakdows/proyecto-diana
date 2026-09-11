import { z } from 'zod';

/**
 * Validación del entorno al arrancar.
 *
 * Un despliegue mal configurado debe fallar de inmediato y de forma explícita,
 * no romperse a mitad de una recepción. `SKIP_ENV_VALIDATION` existe como
 * escape para que el build de CI no exija secretos de producción.
 */

const serverSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // Base de datos — solo la usan los scripts de `scripts/` y `db/`.
  DATABASE_URL: z.string().url().optional(),

  // Supabase (Fase 2 en adelante).
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

  // HMAC del documento de identidad. Sin esto no se puede buscar por DNI
  // sin leer el DNI. Obligatorio desde la Fase 4.
  DOCUMENT_HASH_SECRET: z.string().min(32).optional(),

  // Los datos DEMO nunca se mezclan con datos reales.
  // Ausente o distinto de 'true' ⇒ false. Los datos DEMO nunca se activan
  // por descuido: hay que pedirlos explícitamente.
  ENABLE_DEMO_DATA: z
    .string()
    .optional()
    .transform((v) => v === 'true'),
});

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_APP_NAME: z.string().min(1).default('Diana'),
});

export type ServerEnv = z.infer<typeof serverSchema>;
export type ClientEnv = z.infer<typeof clientSchema>;

function parse<T extends z.ZodType>(schema: T, source: unknown, scope: string): z.infer<T> {
  const result = schema.safeParse(source);

  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `  · ${issue.path.join('.') || '(raíz)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Entorno inválido (${scope}):\n${detail}`);
  }

  return result.data;
}

const skip = process.env['SKIP_ENV_VALIDATION'] === 'true';

/**
 * Variables del servidor. Nunca se exponen al navegador.
 * Importar este módulo desde un Client Component es un error de programación.
 */
export const serverEnv: ServerEnv = skip
  ? (serverSchema.parse({}) as ServerEnv)
  : parse(serverSchema, process.env, 'servidor');

/**
 * Variables públicas. Se leen una a una y no desde `process.env` completo
 * porque Next.js solo sustituye los accesos literales en el bundle del
 * navegador.
 */
export const clientEnv: ClientEnv = parse(
  clientSchema,
  {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  },
  'cliente',
);
