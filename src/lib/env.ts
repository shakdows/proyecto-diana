import { z } from 'zod';

/**
 * Variables PÚBLICAS del entorno.
 *
 * Este módulo es seguro de importar desde cualquier sitio, incluido un Client
 * Component. Las variables del servidor viven en `env.server.ts` y NO se
 * evalúan al importar esto: mezclarlas hacía que el `build` de producción
 * validara secretos que en ese momento no existen.
 */

/**
 * En un entorno de ejecución, `FOO=` y `FOO` sin declarar significan lo mismo:
 * no está configurada. Zod, en cambio, ve `''` como un valor presente e
 * inválido. Sin esta normalización, una variable declarada vacía en Vercel
 * rompe el despliegue con un error que apunta al sitio equivocado.
 */
export const optionalEnv = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === '' || v === undefined ? undefined : v), schema.optional());

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: optionalEnv(z.string().url()),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: optionalEnv(z.string().min(1)),
  NEXT_PUBLIC_APP_NAME: z.preprocess(
    (v) => (v === '' || v === undefined ? 'Diana' : v),
    z.string().min(1),
  ),
});

export type ClientEnv = z.infer<typeof clientSchema>;

export function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => `  · ${issue.path.join('.') || '(raíz)'}: ${issue.message}`)
    .join('\n');
}

/**
 * Se leen una a una y no desde `process.env` completo porque Next.js solo
 * sustituye los accesos literales en el bundle del navegador.
 */
const parsed = clientSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
});

if (!parsed.success) {
  throw new Error(`Entorno inválido (cliente):\n${formatIssues(parsed.error)}`);
}

export const clientEnv: ClientEnv = parsed.data;
