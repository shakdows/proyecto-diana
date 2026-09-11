/**
 * Hallazgos del diagnóstico.
 *
 * Cada hallazgo es lo que el técnico encontró, y lo que después se convierte
 * en una línea de la cotización que el cliente aprueba o rechaza. Por eso
 * lleva prioridad y tiempo estimado desde el principio: sin esas dos cosas,
 * el asesor no puede cotizar sin volver a preguntarle al técnico.
 *
 * Dominio PURO.
 */

export const FINDING_SYSTEMS = [
  'motor',
  'frenos',
  'suspension',
  'electrico',
  'direccion',
  'transmision',
  'carroceria',
  'otros',
] as const;

export type FindingSystem = (typeof FINDING_SYSTEMS)[number];

export const SYSTEM_LABELS: Readonly<Record<FindingSystem, string>> = {
  motor: 'Motor',
  frenos: 'Frenos',
  suspension: 'Suspensión',
  electrico: 'Eléctrico',
  direccion: 'Dirección',
  transmision: 'Transmisión',
  carroceria: 'Carrocería',
  otros: 'Otros',
};

/**
 * Prioridad.
 *
 * El orden importa y está declarado, no deducido de un texto: es lo que
 * ordena la lista y lo que decide qué ve primero el cliente cuando autoriza.
 */
export const PRIORITIES = ['critico', 'alto', 'medio', 'recomendacion'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const PRIORITY_LABELS: Readonly<Record<Priority, string>> = {
  critico: 'Crítico',
  alto: 'Alto',
  medio: 'Medio',
  recomendacion: 'Recomendación',
};

const PRIORITY_ORDER: Readonly<Record<Priority, number>> = {
  critico: 0,
  alto: 1,
  medio: 2,
  recomendacion: 3,
};

export interface Finding {
  readonly id: string;
  readonly system: FindingSystem;
  readonly title: string;
  readonly detail: string;
  readonly priority: Priority;
  readonly estimatedMinutes: number;
  readonly photoCount: number;
  readonly videoCount: number;
}

/** Hallazgos ordenados por gravedad; a igual gravedad, por tiempo descendente. */
export function sortByPriority(findings: readonly Finding[]): readonly Finding[] {
  return [...findings].sort((a, b) => {
    const byPriority = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    return byPriority !== 0 ? byPriority : b.estimatedMinutes - a.estimatedMinutes;
  });
}

export function countBySystem(
  findings: readonly Finding[],
): Readonly<Record<FindingSystem, number>> {
  const counts = Object.fromEntries(FINDING_SYSTEMS.map((s) => [s, 0])) as Record<
    FindingSystem,
    number
  >;
  for (const finding of findings) counts[finding.system] += 1;
  return counts;
}

export function countByPriority(
  findings: readonly Finding[],
): Readonly<Record<Priority, number>> {
  const counts = Object.fromEntries(PRIORITIES.map((p) => [p, 0])) as Record<Priority, number>;
  for (const finding of findings) counts[finding.priority] += 1;
  return counts;
}

export function totalEstimatedMinutes(findings: readonly Finding[]): number {
  return findings.reduce((sum, f) => sum + f.estimatedMinutes, 0);
}

export interface DiagnosisReadiness {
  readonly canFinish: boolean;
  /** Qué falta, en las palabras que el técnico necesita leer. */
  readonly blockers: readonly string[];
}

/**
 * ¿Se puede cerrar el diagnóstico?
 *
 * Cerrarlo dispara `DIAGNOSTICO_COMPLETADO` y avisa al asesor, que cotiza con
 * lo que haya. Un diagnóstico incompleto se convierte en una cotización
 * incompleta, y eso vuelve al taller como una ampliación a mitad de la
 * reparación, con el vehículo desarmado y el cliente esperando.
 *
 * Por eso:
 *   - Tiene que haber al menos un hallazgo. Un diagnóstico sin hallazgos se
 *     registra como «sin observaciones», que es otra acción distinta.
 *   - Todo hallazgo crítico o alto necesita evidencia. Son los que el cliente
 *     va a discutir: sin foto, el asesor defiende de memoria.
 *   - Todo hallazgo necesita tiempo estimado: sin él no hay mano de obra que
 *     cotizar ni hueco que reservar en el taller.
 */
export function readiness(findings: readonly Finding[]): DiagnosisReadiness {
  const blockers: string[] = [];

  if (findings.length === 0) {
    blockers.push('Registra al menos un hallazgo.');
  }

  const sinEvidencia = findings.filter(
    (f) => (f.priority === 'critico' || f.priority === 'alto') && f.photoCount + f.videoCount === 0,
  );
  if (sinEvidencia.length > 0) {
    blockers.push(
      sinEvidencia.length === 1
        ? `«${sinEvidencia[0]?.title}» es ${PRIORITY_LABELS[sinEvidencia[0]!.priority].toLowerCase()} y no tiene evidencia.`
        : `${sinEvidencia.length} hallazgos críticos o altos no tienen evidencia.`,
    );
  }

  const sinTiempo = findings.filter((f) => f.estimatedMinutes <= 0);
  if (sinTiempo.length > 0) {
    blockers.push(
      sinTiempo.length === 1
        ? `«${sinTiempo[0]?.title}» no tiene tiempo estimado.`
        : `${sinTiempo.length} hallazgos no tienen tiempo estimado.`,
    );
  }

  return { canFinish: blockers.length === 0, blockers };
}
