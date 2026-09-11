import { execFileSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { connect } from '../db/client';
import { computeProgress } from '../src/features/repairs/services/progress';
import type { OrderStatus } from '../src/features/orders/services/order-status';

/**
 * Verificación de la base de datos.
 *
 *  1. Ejecuta las pruebas SQL de `db/tests/` (aislamiento, reglas de negocio,
 *     portal anónimo) contra la base real.
 *  2. Compara la fórmula de avance en TypeScript con la implementación SQL.
 *
 * La segunda es la que protege el único punto de duplicación consciente del
 * sistema. `fn_order_progress` devuelve también sus ENTRADAS, así que la
 * comparación alimenta la versión TypeScript con exactamente lo que vio SQL:
 * se comparan las fórmulas, no dos consultas distintas.
 */

interface ProgressRow {
  readonly service_order_id: string;
  readonly percent: string;
  readonly effective_minutes: string;
  readonly estimated_minutes: string;
  readonly parts_ratio: string;
  readonly status: OrderStatus;
  readonly checklist_required: number;
  readonly checklist_resolved: number;
  readonly quotation_lines: number;
  readonly decided_items: number;
  readonly required_parts: string;
  readonly jobs_total: number;
  readonly jobs_done: number;
  readonly final_total: number;
  readonly final_done: number;
}

function runSqlTests(databaseUrl: string): boolean {
  let allPassed = true;
  const files = readdirSync(join(process.cwd(), 'db', 'tests'))
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    console.log(`\n── ${file} ${'─'.repeat(Math.max(0, 58 - file.length))}`);
    try {
      const out = execFileSync(
        'psql',
        [databaseUrl, '-v', 'ON_ERROR_STOP=1', '-q', '-f', join('db', 'tests', file)],
        { encoding: 'utf8', env: { ...process.env, PGOPTIONS: '--client-min-messages=notice' } },
      );
      const notices = out
        .split('\n')
        .filter((l) => l.includes('NOTICE:'))
        .map((l) => '  ' + l.replace(/^.*NOTICE:\s*/, ''));
      console.log(notices.join('\n'));
    } catch (error: unknown) {
      allPassed = false;
      const stderr =
        typeof error === 'object' && error !== null && 'stderr' in error
          ? String((error as { stderr: unknown }).stderr)
          : String(error);
      console.error(stderr.trim());
    }
  }
  return allPassed;
}

async function checkProgressParity(): Promise<boolean> {
  const sql = connect();
  try {
    const rows = await sql<ProgressRow[]>`select * from fn_order_progress() order by percent desc`;

    console.log(`\n── paridad TypeScript ↔ SQL del avance ${'─'.repeat(26)}`);
    console.log(
      `  ${'orden'.padEnd(10)} ${'estado'.padEnd(22)} ${'SQL'.padStart(7)} ${'TS'.padStart(7)}   `,
    );

    let allMatch = true;

    for (const row of rows) {
      const ts = computeProgress({
        status: row.status,
        checklistRequired: row.checklist_required,
        checklistResolved: row.checklist_resolved,
        quotationLineCount: row.quotation_lines,
        decidedItemCount: row.decided_items,
        requiredPartsCount: Number(row.required_parts),
        partsCoverageRatio: Number(row.parts_ratio),
        repairJobsTotal: row.jobs_total,
        repairJobsDone: row.jobs_done,
        estimatedMinutes: Number(row.estimated_minutes),
        effectiveMinutes: Number(row.effective_minutes),
        finalStagesTotal: row.final_total,
        finalStagesDone: row.final_done,
      });

      const sqlPercent = Number(row.percent);
      // Tolerancia de 0,1 punto: las dos implementaciones redondean en el
      // mismo sitio, pero `numeric` y IEEE-754 no son el mismo tipo.
      const match = Math.abs(sqlPercent - ts.percent) <= 0.1;
      if (!match) allMatch = false;

      console.log(
        `  ${row.service_order_id.slice(0, 8).padEnd(10)} ${row.status.padEnd(22)} ` +
          `${sqlPercent.toFixed(1).padStart(7)} ${ts.percent.toFixed(1).padStart(7)}  ` +
          `${match ? '✓' : '✗ DIVERGEN'}`,
      );
    }

    console.log(
      allMatch
        ? '  ✓ las dos implementaciones coinciden en las ' + rows.length + ' órdenes'
        : '  ✗ FALLO: la fórmula de avance divergió entre TypeScript y SQL',
    );
    return allMatch;
  } finally {
    await sql.end();
  }
}

async function main(): Promise<void> {
  const databaseUrl = process.env['DATABASE_URL'];
  if (databaseUrl === undefined || databaseUrl === '') {
    throw new Error('Falta DATABASE_URL.');
  }

  console.log('═══ VERIFICACIÓN DE LA BASE DE DATOS ═══');
  const sqlOk = runSqlTests(databaseUrl);
  const parityOk = await checkProgressParity();

  console.log('\n' + '═'.repeat(64));
  if (sqlOk && parityOk) {
    console.log('✓ TODAS LAS COMPROBACIONES SUPERADAS');
  } else {
    console.log('✗ HAY COMPROBACIONES FALLIDAS');
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error('\n✗ Falló la verificación:\n', error);
  process.exitCode = 1;
});
