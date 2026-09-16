/**
 * Los puntos de inspección sobre el vehículo.
 *
 * ── Lo que se GUARDA y lo que se DIBUJA no son lo mismo ────────────────────
 *
 * El diagrama de daños de la recepción decidió, con razón, guardar ZONAS y no
 * coordenadas: un punto a 62,148 sobre la silueta de un sedán no señala el
 * mismo sitio si el que entró es una camioneta, no se puede preguntar
 * «¿cuántos llegan golpeados por detrás?» sobre pares de números, y rediseñar
 * el dibujo movería todos los daños ya guardados sin que nadie se entere
 * hasta que un peritaje salga mal (`reception/services/damage-map.ts`).
 *
 * Aquí hay coordenadas, y no contradice nada: `x` e `y` son DÓNDE SE PINTA EL
 * PUNTO en una vista concreta, viven en el código y se recalculan cada vez
 * que se dibuja. Lo que identifica al punto —y lo único que llega a la base—
 * es su `id`. Cambiar el dibujo mueve los puntos en pantalla y no toca ni un
 * registro.
 *
 * Por eso el porcentaje y no el píxel: el mismo número vale en el móvil del
 * asesor y en el monitor del taller.
 *
 * Dominio PURO.
 */

import type { ViewId } from './views';

/**
 * El estado de una zona.
 *
 * Cinco y no tres: «no inspeccionado» NO es «correcto». Pintar en verde lo
 * que nadie ha mirado es exactamente la mentira que un checklist existe para
 * evitar, y es la que aparece cuando solo hay bien / regular / mal.
 */
export const STATUS_IDS = ['ok', 'info', 'revisar', 'problema', 'pendiente'] as const;

export type InspectionStatus = (typeof STATUS_IDS)[number];

export interface StatusInfo {
  readonly id: InspectionStatus;
  readonly label: string;
  /**
   * La letra o el signo que va DENTRO del punto.
   *
   * No es decoración: el color solo nunca basta. Un daltónico —uno de cada
   * doce hombres— no distingue el ámbar del verde, y una tablet al sol
   * tampoco. El punto tiene que decir qué es sin que haga falta el color.
   */
  readonly mark: string;
  /** Cuánto pesa al ordenar: lo grave primero. */
  readonly rank: number;
}

export const STATUSES: readonly StatusInfo[] = [
  { id: 'problema', label: 'Problema detectado', mark: '!', rank: 0 },
  { id: 'revisar', label: 'Requiere revisión', mark: '?', rank: 1 },
  { id: 'info', label: 'Sin observaciones', mark: 'i', rank: 2 },
  { id: 'ok', label: 'Conforme', mark: '✓', rank: 3 },
  { id: 'pendiente', label: 'Sin inspeccionar', mark: '·', rank: 4 },
];

export function statusInfo(id: InspectionStatus): StatusInfo {
  const found = STATUSES.find((s) => s.id === id);
  if (found === undefined) throw new Error(`Estado desconocido: ${id}`);
  return found;
}

export function isStatus(value: string): value is InspectionStatus {
  return (STATUS_IDS as readonly string[]).includes(value);
}

/**
 * Un punto de inspección.
 *
 * `id` es lo único estable y lo único que se guarda. `view`, `x` e `y` son
 * dibujo: dicen en qué vista aparece y dónde, y se pueden cambiar sin tocar
 * ningún dato.
 */
export interface Hotspot {
  readonly id: string;
  readonly view: ViewId;
  /** Porcentaje del ancho del lienzo, 0–100. */
  readonly x: number;
  /** Porcentaje del alto del lienzo, 0–100. */
  readonly y: number;
  readonly label: string;
  readonly status: InspectionStatus;
  /** Lo que se vio, en una frase. */
  readonly note?: string;
  readonly photos?: number;
  readonly videos?: number;
  /** Quién lo anotó y cuándo. Sin esto, la ficha no respalda nada. */
  readonly by?: string;
  readonly at?: string;
  /** A dónde lleva «Ver diagnóstico». Sin destino, el botón no se pinta. */
  readonly href?: string;
}

export function hotspotsForView(
  hotspots: readonly Hotspot[],
  view: ViewId,
): readonly Hotspot[] {
  return hotspots.filter((h) => h.view === view);
}

/** Lo grave primero; a igualdad, por etiqueta, para que el orden sea estable. */
export function bySeverity(hotspots: readonly Hotspot[]): readonly Hotspot[] {
  return [...hotspots].sort((a, b) => {
    const d = statusInfo(a.status).rank - statusInfo(b.status).rank;
    return d !== 0 ? d : a.label.localeCompare(b.label, 'es');
  });
}

export interface InspectionSummary {
  readonly total: number;
  readonly problema: number;
  readonly revisar: number;
  readonly pendiente: number;
  readonly revisados: number;
}

/**
 * Cuenta PIEZAS, no dibujos.
 *
 * El capó aparece en tres vistas y la puerta en dos: son el mismo hecho
 * pintado varias veces. Contando puntos, un capó rayado y una puerta rota
 * salían como «2 con problema · 6 por revisar», que es sencillamente falso y
 * además asusta. Se agrupa por identificador, que es justo lo que lo
 * identifica como pieza.
 */
export function summarize(hotspots: readonly Hotspot[]): InspectionSummary {
  const porPieza = new Map<string, InspectionStatus>();
  for (const h of hotspots) {
    const previo = porPieza.get(h.id);
    /* Si dos vistas discreparan, manda lo más grave: no se esconde un daño. */
    if (previo === undefined || statusInfo(h.status).rank < statusInfo(previo).rank) {
      porPieza.set(h.id, h.status);
    }
  }

  let problema = 0;
  let revisar = 0;
  let pendiente = 0;
  for (const estado of porPieza.values()) {
    if (estado === 'problema') problema += 1;
    else if (estado === 'revisar') revisar += 1;
    else if (estado === 'pendiente') pendiente += 1;
  }

  return {
    total: porPieza.size,
    problema,
    revisar,
    pendiente,
    revisados: porPieza.size - pendiente,
  };
}

/** «2 con problema · 1 por revisar · 3 sin inspeccionar» */
export function summaryPhrase(s: InspectionSummary): string {
  if (s.total === 0) return 'Sin puntos de inspección.';
  const partes: string[] = [];
  if (s.problema > 0) partes.push(`${s.problema} con problema`);
  if (s.revisar > 0) partes.push(`${s.revisar} por revisar`);
  if (s.pendiente > 0) partes.push(`${s.pendiente} sin inspeccionar`);
  if (partes.length === 0) {
    return s.total === 1 ? '1 punto, conforme' : `${s.total} puntos, todos conformes`;
  }
  return partes.join(' · ');
}

/** Cuántos puntos con algo que mirar hay en cada vista, para la miniatura. */
export function alertsByView(hotspots: readonly Hotspot[]): Readonly<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const h of hotspots) {
    if (h.status !== 'problema' && h.status !== 'revisar') continue;
    out[h.view] = (out[h.view] ?? 0) + 1;
  }
  return out;
}
