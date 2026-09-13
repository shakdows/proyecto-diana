/**
 * Si la evidencia del ingreso está completa.
 *
 * ── El problema que resuelve ───────────────────────────────────────────────
 *
 * Hay dos clases de foto en una recepción y es fácil confundirlas, porque las
 * dos son «fotos del vehículo»:
 *
 *   · LA DE UNA ZONA prueba UN daño concreto. Sin ella, «rayón en la aleta
 *     trasera derecha» es una letra en un dibujo: no demuestra nada.
 *   · LA VUELTA COMPLETA prueba el ESTADO GENERAL al llegar. Es lo que cubre
 *     lo que nadie marcó, que es precisamente donde aparecen las reclamaciones
 *     —un golpe que el asesor no vio—.
 *
 * Quitar cualquiera de las dos deja un hueco real. Sin la de zona: ocho daños
 * marcados y seis fotos generales, y nadie sabe cuál prueba cuál. Sin la
 * vuelta: solo hay prueba de lo que alguien se acordó de marcar.
 *
 * Así que no compiten: se CUENTAN. Este módulo dice qué falta, y esa cuenta
 * es lo que convierte dos listas sueltas en una sola tarea que se termina.
 */

export interface ZoneCoverage {
  readonly id: string;
  readonly label: string;
  readonly photos: number;
}

export interface Coverage {
  /** Zonas marcadas como dañadas. */
  readonly damaged: number;
  /** De esas, cuántas tienen al menos una foto. */
  readonly documented: number;
  /** Las que faltan, en el orden en que están en el dibujo. */
  readonly missing: readonly ZoneCoverage[];
  /** Tomas generales hechas, de las que se piden. */
  readonly shots: number;
  readonly shotsTotal: number;
}

export function coverageOf(
  zones: readonly ZoneCoverage[],
  shots: readonly number[],
): Coverage {
  const damaged = zones.length;
  const missing = zones.filter((z) => z.photos === 0);

  return {
    damaged,
    documented: damaged - missing.length,
    missing,
    shots: shots.filter((n) => n > 0).length,
    shotsTotal: shots.length,
  };
}

/**
 * Si la recepción se puede dar por documentada.
 *
 * Un daño sin foto NO bloquea: el asesor puede tener una razón —la zona no se
 * ve, el cliente tiene prisa— y bloquear la recepción por una foto deja el
 * vehículo en el patio sin orden, que es peor. Se avisa, se cuenta y se
 * decide; no se impide.
 */
export function isDocumented(c: Coverage): boolean {
  return c.missing.length === 0 && c.shots === c.shotsTotal;
}

export function coveragePhrase(c: Coverage): string {
  if (c.damaged === 0 && c.shots === 0) return 'Todavía no hay ninguna foto.';

  const partes: string[] = [];
  if (c.damaged > 0) {
    partes.push(
      c.missing.length === 0
        ? `${String(c.damaged)} ${c.damaged === 1 ? 'daño documentado' : 'daños documentados'}`
        : `${String(c.documented)} de ${String(c.damaged)} daños con foto`,
    );
  }
  partes.push(`${String(c.shots)} de ${String(c.shotsTotal)} tomas generales`);
  return partes.join(' · ');
}
