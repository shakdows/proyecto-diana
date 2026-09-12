/**
 * ⚠️ DATOS DE DEMOSTRACIÓN.
 *
 * Las encuestas se derivan del MISMO histórico determinista que alimenta el
 * panel de analítica (`demoHistory`). Generarlas aparte haría que el panel
 * dijera «NPS 35» y esta pantalla «NPS 12» sobre el mismo periodo, que es la
 * clase de contradicción de la que este proyecto ya ha salido dos veces.
 *
 * El vehículo, la placa y el cliente salen de la cartera real, no se inventan:
 * una placa con el dueño equivocado es peor que una placa genérica.
 */

import { demoCustomers } from '@/features/customers/demo';
import { demoHistory } from '@/features/analytics/demo';
import { CSAT_QUESTIONS, type CsatAnswers } from '@/features/delivery/services/survey';
import { displayName } from '@/features/customers/services/identity';
import type { SurveyResponse } from './services/board';

/**
 * Reparte una nota media entre los cinco aspectos.
 *
 * Los aspectos son enteros del 1 al 5 y su promedio tiene que acercarse a la
 * media que ya guarda el histórico. El reparto NO es plano: un cliente que
 * pone 3 de media no pone 3 en todo, pone 5 en el trato y 1 en el plazo. Un
 * panel donde todos los aspectos valen lo mismo no señala nada que arreglar,
 * que es justo para lo que sirve.
 *
 * Queda una diferencia de hasta 0,1 contra la media del histórico: cinco
 * enteros solo pueden promediar múltiplos de 0,2. Es cuantización, no
 * desacuerdo.
 */
function spread(average: number, seed: number): CsatAnswers {
  const total = Math.round(average * CSAT_QUESTIONS.length);
  const base = Math.floor(total / CSAT_QUESTIONS.length);
  let resto = total - base * CSAT_QUESTIONS.length;

  // El aspecto que se lleva el golpe rota con la semilla, para que no salga
  // siempre el mismo peor valorado del taller entero.
  const orden = CSAT_QUESTIONS.map((q, i) => ({
    q,
    rank: (i + seed) % CSAT_QUESTIONS.length,
  })).sort((a, b) => a.rank - b.rank);

  const answers: Record<string, number> = {};
  for (const { q } of orden) {
    const extra = resto > 0 ? 1 : 0;
    resto -= extra;
    answers[q.id] = Math.min(5, Math.max(1, base + extra));
  }

  // Un punto de contraste: se sube el primero y se baja el último, sin salirse
  // del rango. Así la media apenas se mueve y el reparto deja de ser plano.
  const ids = orden.map((o) => o.q.id);
  const alto = ids[0];
  const bajo = ids[ids.length - 1];
  if (alto !== undefined && bajo !== undefined && alto !== bajo) {
    const subido = Math.min(5, (answers[alto] ?? base) + 1);
    const bajado = Math.max(1, (answers[bajo] ?? base) - 1);
    // Solo si el cambio se compensa: si uno topa, no se mueve ninguno.
    if (subido - (answers[alto] ?? base) === (answers[bajo] ?? base) - bajado) {
      answers[alto] = subido;
      answers[bajo] = bajado;
    }
  }

  return answers;
}

/*
 * Las listas son largas a propósito. Con cuatro frases y diecinueve casos por
 * atender, la misma queja literal salía en cinco filas seguidas, y nada delata
 * antes unos datos inventados que ver al «cliente» decir lo mismo palabra por
 * palabra.
 *
 * Las vacías también cuentan: la mayoría de la gente puntúa y no escribe.
 */
const COMENTARIOS_BUENOS: readonly string[] = [
  'Excelente servicio, muy profesionales. Totalmente recomendado.',
  'Me explicaron todo con claridad y cumplieron el plazo.',
  'El vehículo quedó impecable. Volveré sin dudarlo.',
  'Rápidos y transparentes con el presupuesto. Gracias.',
  'El asesor me mantuvo informado todo el tiempo.',
  'Buen trabajo, aunque el lavado final pudo ser mejor.',
  'Llevo tres años trayendo mi camioneta y nunca he tenido queja.',
  '',
  '',
  '',
];

const COMENTARIOS_MALOS: readonly string[] = [
  'Se pasaron dos días del plazo prometido y nadie me avisó.',
  'El presupuesto final subió bastante respecto a lo que me dijeron.',
  'Tuve que llamar tres veces para saber cómo iba mi vehículo.',
  'Me devolvieron el auto sucio por dentro.',
  'Cambiaron una pieza que yo no autoricé.',
  'El ruido por el que lo llevé sigue igual.',
  'Esperé cuarenta minutos en recepción para que me atendieran.',
  'Nadie supo explicarme por qué se retrasó tanto.',
  'Prometieron llamarme cuando estuviera listo y nunca lo hicieron.',
];

/** Revuelto estable de una cadena. Mismo resultado en servidor y navegador. */
function hashOf(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/**
 * Las encuestas de los últimos `days` días.
 *
 * Solo de órdenes cerradas: una encuesta antes de la entrega no tiene sentido.
 */
export function demoSurveys(now: Date, days = 30): readonly SurveyResponse[] {
  const flota = demoCustomers(now).flatMap((c) =>
    c.vehicles.map((v) => ({
      plate: v.plate,
      vehicle: `${v.brand} ${v.model}`,
      customer: displayName(c),
      corporateClient: c.corporateClient,
    })),
  );

  if (flota.length === 0) return [];

  const desde = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  return demoHistory(now)
    .filter((record) => record.closedAt >= desde)
    .map((record, index): SurveyResponse => {
      const unidad = flota[index % flota.length];
      const answers =
        record.csatAverage === null ? {} : spread(record.csatAverage, hashOf(record.orderId));

      /*
       * Sin tope daba «hace -1 d». El histórico cierra órdenes a una hora
       * concreta del día, que puede caer más tarde que la hora actual: la
       * resta sale negativa y la pantalla escribe un número imposible. Hoy
       * es hoy, aunque el reloj todavía no haya llegado.
       */
      const dias = Math.max(
        0,
        Math.floor((now.getTime() - record.closedAt.getTime()) / 86_400_000),
      );
      const malo = record.npsScore !== null && record.npsScore <= 6;
      const pool = malo ? COMENTARIOS_MALOS : COMENTARIOS_BUENOS;
      /*
       * El índice de la lista NO sirve para elegir el comentario: los casos
       * malos no están repartidos uniformemente, así que `index % 4` los hacía
       * caer casi siempre en el mismo resto y la pantalla mostraba la misma
       * queja literal en cinco filas seguidas. Nada delata antes unos datos
       * inventados.
       *
       * Se usa un revuelto del identificador, que sí está repartido.
       */
      const semilla = hashOf(record.orderId);

      return {
        id: `enc-${record.orderId}`,
        orderId: record.orderId,
        orderCode: `OS-2026-${String(100 + index).padStart(6, '0')}`,
        plate: unidad?.plate ?? 'SIN-PLACA',
        vehicle: unidad?.vehicle ?? 'Vehículo',
        customer: unidad?.customer ?? 'Cliente',
        corporateClient: record.corporateClient,
        advisor: record.advisor,
        npsScore: record.npsScore,
        answers,
        comment: record.npsScore === null ? '' : (pool[semilla % pool.length] ?? ''),
        answeredDaysAgo: record.npsScore === null ? null : dias,
        // Los más viejos ya se atendieron; los de esta semana, no.
        followedUp: dias > 7,
      };
    })
    .sort((a, b) => (a.answeredDaysAgo ?? 999) - (b.answeredDaysAgo ?? 999));
}
