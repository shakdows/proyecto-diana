import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { connect } from '../db/client';

/**
 * Aplicador de migraciones.
 *
 * Aplica `db/migrations/*.sql` en orden de nombre, una sola vez, dentro de una
 * transacción cada una, y lo anota en `_diana_migrations`.
 *
 * Por qué propio y no `drizzle-kit migrate`: la mitad de este esquema es SQL
 * que Drizzle no puede generar —funciones SECURITY DEFINER, políticas RLS,
 * disparadores, secuencias de código legible, vistas—. Drizzle sigue siendo la
 * fuente de verdad del esquema y genera `0001_schema.sql`; el resto se escribe
 * a mano y se revisa en el pull request.
 *
 *   npm run db:migrate              aplica lo pendiente
 *   npm run db:migrate -- --shim    aplica antes el sustituto local de Supabase
 *   npm run db:migrate -- --status  solo informa
 */

const MIGRATIONS_DIR = join(process.cwd(), 'db', 'migrations');
const LOCAL_DIR = join(process.cwd(), 'db', 'local');
const BREAKPOINT = '--> statement-breakpoint';

interface Migration {
  readonly name: string;
  readonly sql: string;
  readonly checksum: string;
}

function load(dir: string): readonly Migration[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((name) => {
      const sql = readFileSync(join(dir, name), 'utf8');
      return { name, sql, checksum: createHash('sha256').update(sql).digest('hex').slice(0, 16) };
    });
}

/** Trocea por el marcador; ignora los fragmentos que solo son comentarios. */
function statements(sql: string): readonly string[] {
  return sql
    .split(BREAKPOINT)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !/^(--[^\n]*\n?)+$/.test(s));
}

async function main(): Promise<void> {
  const args = new Set(process.argv.slice(2));
  const sql = connect();

  try {
    await sql.unsafe(`
      create table if not exists _diana_migrations (
        name        text primary key,
        checksum    text not null,
        applied_at  timestamptz not null default now()
      )
    `);

    const appliedRows = await sql<{ name: string; checksum: string }[]>`
      select name, checksum from _diana_migrations
    `;
    const applied = new Map(appliedRows.map((r) => [r.name, r.checksum]));

    if (args.has('--status')) {
      for (const m of load(MIGRATIONS_DIR)) {
        const state = applied.has(m.name) ? 'aplicada' : 'PENDIENTE';
        console.log(`${state.padEnd(10)} ${m.name}`);
      }
      return;
    }

    if (args.has('--shim')) {
      console.log('· sustituto local de Supabase (no se aplica en Supabase)');
      for (const m of load(LOCAL_DIR)) {
        await sql.unsafe(m.sql);
        console.log(`  ✓ ${m.name}`);
      }
    }

    let pending = 0;

    for (const migration of load(MIGRATIONS_DIR)) {
      const previous = applied.get(migration.name);

      if (previous !== undefined) {
        // Una migración ya aplicada que cambió de contenido es un error de
        // proceso: el historial deja de describir la base real.
        if (previous !== migration.checksum) {
          throw new Error(
            `La migración ${migration.name} cambió después de aplicarse ` +
              `(${previous} → ${migration.checksum}). Crea una migración nueva.`,
          );
        }
        continue;
      }

      pending += 1;
      const chunks = statements(migration.sql);
      process.stdout.write(`· ${migration.name} (${chunks.length} sentencias) `);

      await sql.begin(async (tx) => {
        for (const statement of chunks) {
          await tx.unsafe(statement);
        }
        await tx`
          insert into _diana_migrations (name, checksum)
          values (${migration.name}, ${migration.checksum})
        `;
      });

      console.log('✓');
    }

    console.log(
      pending === 0 ? 'Sin migraciones pendientes.' : `${pending} migraciones aplicadas.`,
    );
  } finally {
    await sql.end();
  }
}

main().catch((error: unknown) => {
  console.error('\n✗ Falló la migración:\n', error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
