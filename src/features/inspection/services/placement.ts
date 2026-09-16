/**
 * Dónde se pinta cada punto en cada vista.
 *
 * ── Esto es DIBUJO, no dato ────────────────────────────────────────────────
 *
 * Nada de este archivo se guarda. Son las coordenadas con las que el visor
 * coloca los puntos sobre la silueta, en porcentaje del lienzo para que valgan
 * igual en el móvil del asesor y en el monitor del taller. Rediseñar la
 * silueta se arregla tocando estos números; ningún registro se mueve.
 *
 * Lo que sí es dato es el `id`, y las zonas de carrocería reutilizan el mismo
 * `ZoneId` del diagrama de daños de la recepción. Ese es el objetivo: un
 * golpe marcado al recibir el vehículo aparece aquí sin copiar nada.
 *
 * ── Izquierda y derecha son DEL VEHÍCULO ───────────────────────────────────
 *
 * La convención del taller y de cualquier peritaje. Por eso el faro izquierdo
 * cae a la DERECHA de la pantalla en la vista frontal —estás mirando al
 * vehículo de frente— y a la izquierda en la posterior. Invertirlo para que
 * «cuadre» con lo que se ve haría que el parte no cuadre con el vehículo.
 *
 * Dominio PURO.
 */

import type { ZoneId } from '@/features/reception/services/damage-map';
import type { ViewId } from './views';

export interface Placement {
  /** Estable, y lo único que llega a un registro. */
  readonly id: string;
  readonly label: string;
  readonly view: ViewId;
  /** Porcentaje del ancho, 0–100. Solo dibujo. */
  readonly x: number;
  /** Porcentaje del alto, 0–100. Solo dibujo. */
  readonly y: number;
  /**
   * La zona del diagrama de daños, cuando el punto es una parte de la
   * carrocería. Sin esto, un punto es propio de la inspección —una llanta, el
   * tablero— y no pretende ser una zona de daños.
   */
  readonly zone?: ZoneId;
}

/** Atajo: los puntos que SON zona de carrocería llevan el mismo identificador. */
function body(zone: ZoneId, label: string, view: ViewId, x: number, y: number): Placement {
  return { id: zone, label, view, x, y, zone };
}

function spot(id: string, label: string, view: ViewId, x: number, y: number): Placement {
  return { id, label, view, x, y };
}

/**
 * La vista superior reutiliza EXACTAMENTE las quince zonas del diagrama de
 * daños, convertidas del lienzo de 220 × 460 al porcentaje. Si allí se mueve
 * una zona, aquí hay que moverla: la prueba lo comprueba sola.
 */
const SUPERIOR: readonly Placement[] = [
  body('paragolpes-delantero', 'Paragolpes delantero', 'superior', 50, 5.7),
  body('capo', 'Capó', 'superior', 50, 17.6),
  body('parabrisas', 'Parabrisas', 'superior', 50, 30.9),
  body('techo', 'Techo', 'superior', 50, 48.3),
  body('luneta', 'Luneta trasera', 'superior', 50, 65.7),
  body('porton', 'Portón / maletero', 'superior', 50, 78.9),
  body('paragolpes-trasero', 'Paragolpes trasero', 'superior', 50, 90.9),
  body('aleta-di', 'Aleta delantera izquierda', 'superior', 20, 20.4),
  body('puerta-di', 'Puerta delantera izquierda', 'superior', 20, 38.5),
  body('puerta-ti', 'Puerta trasera izquierda', 'superior', 20, 58),
  body('aleta-ti', 'Aleta trasera izquierda', 'superior', 20, 76.5),
  body('aleta-dd', 'Aleta delantera derecha', 'superior', 80, 20.4),
  body('puerta-dd', 'Puerta delantera derecha', 'superior', 80, 38.5),
  body('puerta-td', 'Puerta trasera derecha', 'superior', 80, 58),
  body('aleta-td', 'Aleta trasera derecha', 'superior', 80, 76.5),
];

/**
 * Costado izquierdo, morro a la izquierda de la pantalla.
 *
 * El derecho es el MISMO reparto con el morro a la derecha: se mira el
 * vehículo desde el otro lado, así que lo que estaba a la izquierda queda a
 * la derecha. Se genera espejando en vez de copiarse a mano —dos listas
 * paralelas se desincronizan a la primera corrección—.
 */
const LATERAL: readonly Placement[] = [
  body('paragolpes-delantero', 'Paragolpes delantero', 'lateral-i', 7, 63),
  body('capo', 'Capó', 'lateral-i', 20, 48),
  body('parabrisas', 'Parabrisas', 'lateral-i', 34, 33),
  body('techo', 'Techo', 'lateral-i', 50, 24),
  body('luneta', 'Luneta trasera', 'lateral-i', 66, 33),
  body('porton', 'Portón / maletero', 'lateral-i', 81, 48),
  body('paragolpes-trasero', 'Paragolpes trasero', 'lateral-i', 93, 63),
  body('aleta-di', 'Aleta delantera izquierda', 'lateral-i', 22, 62),
  body('puerta-di', 'Puerta delantera izquierda', 'lateral-i', 41, 50),
  body('puerta-ti', 'Puerta trasera izquierda', 'lateral-i', 59, 50),
  body('aleta-ti', 'Aleta trasera izquierda', 'lateral-i', 78, 62),
  spot('llanta-di', 'Llanta delantera izquierda', 'lateral-i', 25, 83),
  spot('llanta-ti', 'Llanta trasera izquierda', 'lateral-i', 75, 83),
  spot('espejo-i', 'Espejo izquierdo', 'lateral-i', 36, 44),
];

/** Del costado izquierdo al derecho: se espeja y se cambian las piezas de lado. */
const DERECHA: Readonly<Record<string, { id: string; label: string }>> = {
  'aleta-di': { id: 'aleta-dd', label: 'Aleta delantera derecha' },
  'puerta-di': { id: 'puerta-dd', label: 'Puerta delantera derecha' },
  'puerta-ti': { id: 'puerta-td', label: 'Puerta trasera derecha' },
  'aleta-ti': { id: 'aleta-td', label: 'Aleta trasera derecha' },
  'llanta-di': { id: 'llanta-dd', label: 'Llanta delantera derecha' },
  'llanta-ti': { id: 'llanta-td', label: 'Llanta trasera derecha' },
  'espejo-i': { id: 'espejo-d', label: 'Espejo derecho' },
};

const LATERAL_D: readonly Placement[] = LATERAL.map((p): Placement => {
  const otro = DERECHA[p.id];
  const x = 100 - p.x;
  if (otro === undefined) {
    /* Las piezas centrales —capó, techo, portón— son las mismas desde los dos
       lados: conservan su identificador y solo se espeja el dibujo. */
    return { ...p, view: 'lateral-d', x };
  }
  return p.zone === undefined
    ? { id: otro.id, label: otro.label, view: 'lateral-d', x, y: p.y }
    : { id: otro.id, label: otro.label, view: 'lateral-d', x, y: p.y, zone: otro.id as typeof p.zone };
});

/** De frente al vehículo: SU izquierda queda a la derecha de la pantalla. */
const FRONTAL: readonly Placement[] = [
  body('parabrisas', 'Parabrisas', 'frontal', 50, 20),
  body('capo', 'Capó', 'frontal', 50, 38),
  body('paragolpes-delantero', 'Paragolpes delantero', 'frontal', 50, 79),
  spot('faro-i', 'Faro izquierdo', 'frontal', 71, 55),
  spot('faro-d', 'Faro derecho', 'frontal', 29, 55),
  spot('rejilla', 'Rejilla y radiador', 'frontal', 50, 60),
];

/** Por detrás: SU izquierda queda a la izquierda de la pantalla. */
const POSTERIOR: readonly Placement[] = [
  body('luneta', 'Luneta trasera', 'posterior', 50, 24),
  body('porton', 'Portón / maletero', 'posterior', 50, 48),
  body('paragolpes-trasero', 'Paragolpes trasero', 'posterior', 50, 79),
  spot('farol-i', 'Farol izquierdo', 'posterior', 28, 56),
  spot('farol-d', 'Farol derecho', 'posterior', 72, 56),
  spot('escape', 'Escape', 'posterior', 35, 89),
];

/**
 * El interior no tiene zonas de carrocería: son otros puntos.
 *
 * Coinciden a propósito con lo que ya pregunta el checklist de recepción
 * —tapicería, cinturones, mandos—, para que la inspección visual y la hoja
 * hablen de las mismas cosas.
 */
const INTERIOR: readonly Placement[] = [
  spot('tablero', 'Tablero e instrumentos', 'interior', 50, 27),
  spot('volante', 'Volante y mandos', 'interior', 31, 45),
  spot('asientos-delanteros', 'Asientos delanteros', 'interior', 50, 63),
  spot('asientos-traseros', 'Asientos traseros', 'interior', 50, 85),
  spot('tapiceria', 'Tapicería y cinturones', 'interior', 78, 68),
];

export const PLACEMENTS: readonly Placement[] = [
  ...SUPERIOR,
  ...FRONTAL,
  ...LATERAL,
  ...LATERAL_D,
  ...POSTERIOR,
  ...INTERIOR,
];

export function placementsForView(view: ViewId): readonly Placement[] {
  return PLACEMENTS.filter((p) => p.view === view);
}

/** En qué vistas aparece un punto. Sirve para llevar al usuario donde se ve. */
export function viewsShowing(id: string): readonly ViewId[] {
  return PLACEMENTS.filter((p) => p.id === id).map((p) => p.view);
}

/** Todos los identificadores distintos, sin repetir los que salen en dos vistas. */
export function allSpotIds(): readonly string[] {
  return [...new Set(PLACEMENTS.map((p) => p.id))];
}

export function labelOf(id: string): string {
  return PLACEMENTS.find((p) => p.id === id)?.label ?? id;
}
