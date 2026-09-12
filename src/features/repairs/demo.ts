/**
 * ⚠️ DATOS DE DEMOSTRACIÓN — la jornada del técnico.
 *
 * Adapta las órdenes de `features/demo/board` al tipo que lee `my-day`. No
 * inventa nada: el estado, las sesiones de tiempo y los hechos salen de la
 * misma fuente que el tablero, así que la pantalla del técnico y la del jefe
 * de taller no pueden contar historias distintas del mismo vehículo.
 *
 * En la Fase 12 esto se sustituye por una consulta con RLS —`service_orders`
 * filtradas por `assigned_technician_id`— sin tocar `my-day`.
 */

import { factsFor, type BoardRow, type DemoOrder } from '@/features/demo/board';
import {
  pauseBlocks,
  pauseLabel,
  type DayJob,
  type OpenPause,
} from './services/my-day';
import { summarizeSessions } from './services/time-tracking';

function openPauseOf(order: DemoOrder): OpenPause | null {
  const pause = order.sessions.find((s) => s.kind === 'pausa' && s.endedAt === null);
  if (pause === undefined) return null;
  const reason = pause.pauseReason ?? 'otro';
  return {
    reason,
    label: pauseLabel(reason),
    /* El catálogo manda sobre la fila: `blocksEta` es una propiedad del motivo,
       no de la sesión, y dejarla suelta permitiría dos pausas por «espera de
       repuestos» que bloquean distinto. */
    blocks: pauseBlocks(reason),
    since: pause.startedAt,
  };
}

function lastWorkEnd(order: DemoOrder): Date | null {
  const ends = order.sessions
    .filter((s) => s.kind === 'trabajo' && s.endedAt !== null)
    .map((s) => s.endedAt as Date);
  if (ends.length === 0) return null;
  return ends.reduce((latest, d) => (d > latest ? d : latest));
}

/**
 * Convierte una fila del tablero en un trabajo de la jornada.
 *
 * `profileId` es quién mira. La demostración guarda el técnico por su nombre,
 * y `factsFor` fabrica un identificador sintético que nunca coincide con el de
 * la sesión; sin esta corrección, las guardas «solo el técnico asignado»
 * rechazarían al propio técnico asignado y la pantalla saldría entera
 * deshabilitada. En producción el identificador ya es el de `profiles` y esto
 * desaparece.
 */
export function toDayJob(row: BoardRow, viewerProfileId: string, now: Date): DayJob {
  const { order } = row;
  const facts = factsFor(order);

  return {
    id: order.id,
    code: order.code,
    plate: order.plate,
    vehicle: order.vehicle,
    serviceType: order.serviceType,
    customer: order.customer,
    status: order.status,
    facts: { ...facts, assignedTechnicianId: viewerProfileId },
    sessions: order.sessions,
    totals: summarizeSessions(order.sessions, now),
    estimatedMinutes: order.estimatedMinutes,
    promisedAt: row.promisedAt,
    openPause: openPauseOf(order),
    lastWorkEndedAt: lastWorkEnd(order),
    jobsTotal: order.repairJobsTotal,
    jobsDone: order.repairJobsDone,
  };
}

/**
 * Las órdenes de un técnico, por su nombre.
 *
 * Filtrar aquí es COMODIDAD, no control de acceso: en producción la lista la
 * recorta RLS en la base de datos a partir del JWT, y una orden de otro
 * técnico no existe para esta sesión (docs/05-roles-y-permisos.md §5.3).
 */
export function demoJobsFor(
  rows: readonly BoardRow[],
  technicianName: string,
  viewerProfileId: string,
  now: Date,
): readonly DayJob[] {
  return rows
    .filter((row) => row.order.technician === technicianName)
    .map((row) => toDayJob(row, viewerProfileId, now));
}
