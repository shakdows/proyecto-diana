/**
 * El panel de encuestas del taller.
 *
 * La pantalla del cliente ya existe y su dominio también —`npsOf`,
 * `csatAverage`, `needsFollowUp`—. Esto agrega lo que contestaron muchos y
 * responde a la única pregunta que justifica mirar esta pantalla: **¿a quién
 * hay que llamar hoy?**
 *
 * Un panel de satisfacción que solo enseña un número grande es un adorno. El
 * número dice si el taller va bien; la lista dice qué hacer.
 */

import {
  bucketOf,
  csatAverage,
  needsFollowUp,
  npsOf,
  type CsatAnswers,
  type NpsBucket,
  type NpsResult,
} from '@/features/delivery/services/survey';

export interface SurveyResponse {
  readonly id: string;
  readonly orderId: string;
  readonly orderCode: string;
  readonly plate: string;
  readonly vehicle: string;
  readonly customer: string;
  readonly corporateClient: string | null;
  readonly advisor: string;
  /** 0–10. `null` si la encuesta se envió y nadie contestó. */
  readonly npsScore: number | null;
  readonly answers: CsatAnswers;
  readonly comment: string;
  readonly answeredDaysAgo: number | null;
  /** Alguien del taller ya llamó a este cliente. */
  readonly followedUp: boolean;
}

export function isAnswered(response: SurveyResponse): boolean {
  return response.npsScore !== null;
}

export interface SurveySummary {
  /** Encuestas enviadas, contestadas o no. */
  readonly sent: number;
  readonly answered: number;
  /** 0–100. `null` cuando no se envió ninguna: dividir por cero no es 0 %. */
  readonly responseRate: number | null;
  readonly nps: NpsResult;
  /** Promedio de todos los aspectos de todas las respuestas. `null` si nadie contestó. */
  readonly csat: number | null;
  readonly pendingFollowUps: number;
}

export function summarize(responses: readonly SurveyResponse[]): SurveySummary {
  const answered = responses.filter(isAnswered);

  const scores = answered
    .map((r) => r.npsScore)
    .filter((s): s is number => s !== null);

  // El CSAT global es el promedio de los promedios por respuesta, NO el
  // promedio de todas las notas sueltas. Si no, quien contestó los cinco
  // aspectos pesaría cinco veces más que quien contestó uno, y un solo
  // cliente muy hablador movería la cifra del taller entero.
  const perResponse = answered
    .map((r) => csatAverage(r.answers))
    .filter((v): v is number => v !== null);

  const csat =
    perResponse.length === 0
      ? null
      : Math.round((perResponse.reduce((a, b) => a + b, 0) / perResponse.length) * 10) / 10;

  return {
    sent: responses.length,
    answered: answered.length,
    responseRate:
      responses.length === 0
        ? null
        : Math.round((answered.length / responses.length) * 100),
    nps: npsOf(scores),
    csat,
    pendingFollowUps: pendingFollowUps(responses).length,
  };
}

/**
 * Quién necesita una llamada y todavía no la ha recibido.
 *
 * Ordenados por urgencia real: primero los detractores, después quien hundió
 * un aspecto concreto, y dentro de cada grupo el más reciente antes —una queja
 * de hace dos días todavía se puede arreglar; una de hace tres semanas ya es
 * una disculpa—.
 */
export function pendingFollowUps(
  responses: readonly SurveyResponse[],
): readonly SurveyResponse[] {
  return responses
    .filter((r) => isAnswered(r) && !r.followedUp && needsFollowUp(r.npsScore, r.answers))
    .sort((a, b) => {
      const pesoA = a.npsScore !== null && bucketOf(a.npsScore) === 'detractor' ? 0 : 1;
      const pesoB = b.npsScore !== null && bucketOf(b.npsScore) === 'detractor' ? 0 : 1;
      if (pesoA !== pesoB) return pesoA - pesoB;
      return (a.answeredDaysAgo ?? 999) - (b.answeredDaysAgo ?? 999);
    });
}

/**
 * El aspecto peor valorado del taller.
 *
 * Es lo accionable: «CSAT 4,2» no se puede arreglar, «el plazo de entrega es
 * lo peor valorado» sí.
 */
export interface AspectScore {
  readonly id: string;
  readonly average: number;
  readonly responses: number;
}

export function byAspect(responses: readonly SurveyResponse[]): readonly AspectScore[] {
  const acc = new Map<string, { total: number; count: number }>();

  for (const r of responses) {
    if (!isAnswered(r)) continue;
    for (const [id, value] of Object.entries(r.answers)) {
      if (value <= 0) continue;
      const prev = acc.get(id) ?? { total: 0, count: 0 };
      acc.set(id, { total: prev.total + value, count: prev.count + 1 });
    }
  }

  return [...acc.entries()]
    .map(([id, { total, count }]) => ({
      id,
      average: Math.round((total / count) * 10) / 10,
      responses: count,
    }))
    // De peor a mejor: lo primero que se lee es lo que hay que arreglar.
    .sort((a, b) => a.average - b.average || a.id.localeCompare(b.id));
}

/** Cuántos de cada clase, para la barra de reparto. */
export function bucketCounts(
  responses: readonly SurveyResponse[],
): Readonly<Record<NpsBucket, number>> {
  const counts: Record<NpsBucket, number> = { promotor: 0, pasivo: 0, detractor: 0 };
  for (const r of responses) {
    if (r.npsScore === null) continue;
    counts[bucketOf(r.npsScore)] += 1;
  }
  return counts;
}
