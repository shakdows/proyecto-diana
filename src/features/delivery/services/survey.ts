/**
 * Encuesta de satisfacción posterior a la entrega.
 *
 * Dos medidas distintas que se confunden a menudo:
 *
 * - **NPS** (0–10, «¿nos recomendarías?»): mide la relación. Se agrega
 *   restando el % de detractores al de promotores, NO promediando notas.
 * - **CSAT** (1–5 por aspecto): mide esta visita concreta.
 *
 * Promediar el NPS es el error clásico: un 10 y un 0 dan 5, que parece
 * «normal», cuando en realidad hay un cliente encantado y otro que va a
 * contarlo. La resta de porcentajes devuelve −0, que es la verdad.
 *
 * Módulo puro: sin React y sin base de datos.
 */

export type NpsBucket = 'promotor' | 'pasivo' | 'detractor';

export interface SurveyQuestion {
  readonly id: string;
  readonly label: string;
  readonly hint?: string;
}

/** Aspectos de CSAT. Salen de `survey_questions` en la Fase 15. */
export const CSAT_QUESTIONS: readonly SurveyQuestion[] = [
  { id: 'atencion', label: 'Atención del asesor', hint: '¿Te explicaron con claridad?' },
  { id: 'tiempo', label: 'Cumplimiento del plazo', hint: '¿Se entregó cuando se prometió?' },
  { id: 'trabajo', label: 'Calidad del trabajo', hint: '¿El vehículo quedó como esperabas?' },
  { id: 'precio', label: 'Relación precio-valor' },
  { id: 'limpieza', label: 'Limpieza del vehículo' },
];

export const MAX_CSAT = 5;

/**
 * Clasificación NPS estándar. Los cortes no son negociables: son lo que hace
 * comparable la cifra con la del resto del sector.
 */
export function bucketOf(score: number): NpsBucket {
  if (score >= 9) return 'promotor';
  if (score >= 7) return 'pasivo';
  return 'detractor';
}

export const BUCKET_LABELS: Readonly<Record<NpsBucket, string>> = {
  promotor: 'Promotor',
  pasivo: 'Pasivo',
  detractor: 'Detractor',
};

export interface NpsResult {
  readonly responses: number;
  readonly promoters: number;
  readonly passives: number;
  readonly detractors: number;
  /** −100 a 100. */
  readonly score: number;
}

export function npsOf(scores: readonly number[]): NpsResult {
  const valid = scores.filter((s) => Number.isFinite(s) && s >= 0 && s <= 10);
  const promoters = valid.filter((s) => bucketOf(s) === 'promotor').length;
  const passives = valid.filter((s) => bucketOf(s) === 'pasivo').length;
  const detractors = valid.filter((s) => bucketOf(s) === 'detractor').length;

  // Sin respuestas el NPS no es 0: es «no hay dato». Devolver 0 pintaría un
  // taller mediocre donde en realidad no ha contestado nadie.
  const score =
    valid.length === 0
      ? 0
      : Math.round(((promoters - detractors) / valid.length) * 100);

  return { responses: valid.length, promoters, passives, detractors, score };
}

export type CsatAnswers = Readonly<Record<string, number>>;

export interface SurveyReadiness {
  readonly canSubmit: boolean;
  readonly blockers: readonly string[];
}

/**
 * Qué impide enviar la encuesta.
 *
 * El comentario es obligatorio SOLO para el detractor. Pedirlo a todo el
 * mundo hace que la mayoría escriba «bien» y se pierda la señal; no pedirlo
 * nunca deja al taller con un 3 sin saber qué arreglar.
 */
export function readiness(
  score: number | null,
  answers: CsatAnswers,
  comment: string,
): SurveyReadiness {
  const blockers: string[] = [];

  if (score === null) {
    blockers.push('Elige del 0 al 10 qué tan probable es que nos recomiendes.');
  }

  const sinResponder = CSAT_QUESTIONS.filter((q) => (answers[q.id] ?? 0) === 0).length;
  if (sinResponder > 0) {
    blockers.push(
      sinResponder === 1
        ? 'Falta puntuar 1 aspecto.'
        : `Faltan puntuar ${sinResponder} aspectos.`,
    );
  }

  if (score !== null && bucketOf(score) === 'detractor' && comment.trim() === '') {
    blockers.push('Cuéntanos qué salió mal para poder corregirlo.');
  }

  return { canSubmit: blockers.length === 0, blockers };
}

/** Promedio CSAT sobre lo respondido. `null` si no hay nada. */
export function csatAverage(answers: CsatAnswers): number | null {
  const values = Object.values(answers).filter((v) => v > 0);
  if (values.length === 0) return null;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10;
}

/**
 * Si el caso necesita que alguien llame.
 *
 * Un detractor SIEMPRE. Y también quien puntúa bien en general pero hunde un
 * aspecto: un 9 de NPS con un 1 en plazos es un cliente que volverá, pero al
 * que se le falló en algo concreto y arreglable.
 */
export const LOW_CSAT_THRESHOLD = 2;

export function needsFollowUp(score: number | null, answers: CsatAnswers): boolean {
  if (score !== null && bucketOf(score) === 'detractor') return true;
  return Object.values(answers).some((v) => v > 0 && v <= LOW_CSAT_THRESHOLD);
}
