import type { OrderRecord } from './services/metrics';

/**
 * Histórico de ejemplo para el panel.
 *
 * Se genera de forma DETERMINISTA a partir de una semilla: un panel que
 * cambia sus cifras en cada recarga es inútil para demostrar nada, y encima
 * hace imposible comprobar si un filtro funciona.
 *
 * Además se sortea POR VISITA y no por respuesta (trampa §7 del brief):
 * sortear cada pregunta por separado produce un NPS de −89 y un panel que
 * parece roto, porque una visita mala es mala en casi todo.
 *
 * En la Fase 15 esto lo sustituye una sola función SQL de agregación con RLS.
 */

const EMPRESAS: readonly (string | null)[] = ['BBVA', 'Mitsui', 'Relsa', 'Invetsa', 'MG', null];
const SEDES = ['Surco', 'Ate'] as const;
const ASESORES = ['Andrea López', 'Diego Salas', 'Ricardo Salazar'] as const;
const MARCAS = ['Toyota', 'Mitsubishi', 'Hyundai', 'Kia', 'Nissan', 'MG'] as const;
const SERVICIOS = [
  'Mantenimiento preventivo',
  'Frenos',
  'Diagnóstico electrónico',
  'Alineamiento y balanceo',
  'Suspensión',
] as const;

/** Generador congruencial lineal: mismo resultado en servidor y navegador. */
function rng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}

const pick = <T,>(random: () => number, list: readonly T[]): T =>
  list[Math.floor(random() * list.length)] as T;

export function demoHistory(now: Date, days = 90): readonly OrderRecord[] {
  const random = rng(20260911);
  const out: OrderRecord[] = [];

  for (let dayOffset = days - 1; dayOffset >= 0; dayOffset -= 1) {
    const date = new Date(now);
    date.setDate(date.getDate() - dayOffset);
    date.setHours(9, 0, 0, 0);

    // Domingo cerrado, sábado a medias: si no, el panel sugiere una operación
    // constante siete días a la semana que ningún taller tiene.
    const weekday = date.getDay();
    if (weekday === 0) continue;
    const base = weekday === 6 ? 2 : 5;
    const count = base + Math.floor(random() * 4);

    for (let i = 0; i < count; i += 1) {
      const closedAt = new Date(date);
      closedAt.setHours(9 + Math.floor(random() * 9), Math.floor(random() * 60));

      /*
       * La calidad de la visita se sortea UNA vez y de ahí salen el
       * cumplimiento, el ciclo y la encuesta. Sortearlos por separado daría
       * visitas puntuales a tiempo con clientes furiosos y al revés.
       */
      const quality = random();
      const onTime = quality > 0.22;
      const cycleHours = Math.round((onTime ? 18 + random() * 20 : 48 + random() * 40) * 10) / 10;

      /*
       * Reparto aproximado 55 / 25 / 20 entre promotores, pasivos y
       * detractores, que da un NPS cercano a 35. Un taller real no tiene el
       * 30 % de detractores: con esa proporción el panel sale con NPS 0 y
       * parece roto, que es justo la trampa §7 del brief con otra cara.
       */
      const respondio = random() > 0.38;
      const npsScore = respondio
        ? quality > 0.45
          ? 9 + Math.round(random())
          : quality > 0.2
            ? 7 + Math.round(random())
            : Math.floor(random() * 7)
        : null;

      out.push({
        orderId: `h-${dayOffset}-${i}`,
        closedAt,
        corporateClient: pick(random, EMPRESAS),
        branch: pick(random, SEDES),
        advisor: pick(random, ASESORES),
        brand: pick(random, MARCAS),
        serviceType: pick(random, SERVICIOS),
        cycleHours,
        onTime,
        revenueCents: Math.round((35_000 + random() * 340_000) / 100) * 100,
        npsScore,
        csatAverage:
          npsScore === null
            ? null
            : Math.round(Math.min(5, Math.max(1, 1 + quality * 4.2)) * 10) / 10,
      });
    }
  }

  return out;
}
