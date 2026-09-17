/**
 * Dónde se pinta cada punto en cada vista.
 *
 * ── Esto es DIBUJO, no dato ────────────────────────────────────────────────
 *
 * Nada de este archivo se guarda. Son las coordenadas con las que el visor
 * coloca los puntos SOBRE LA FOTOGRAFÍA, en porcentaje del marco para que
 * valgan igual en el móvil del asesor y en el monitor del taller. Cambiar la
 * fotografía se arregla tocando estos números; ningún registro se mueve.
 *
 * Están medidos sobre las fotos de `public/checklist/`, que llevan un margen
 * del 5 % por lado: el vehículo ocupa de 4,5 % a 95,5 % del marco. Por eso
 * ningún punto llega al borde.
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
 * El plano superior lleva LAS QUINCE zonas del diagrama de daños, y ninguna
 * más: son las que el parte sabe describir y las que el cliente firma.
 *
 * La foto está girada 180° respecto al original —el morro apunta ARRIBA—
 * porque es como se lee un vehículo en un parte: igual que el diagrama de
 * daños de la recepción y que cualquier peritaje. Girarla en el archivo, y no
 * aquí, deja estas coordenadas legibles: «5 % es el paragolpes delantero».
 */
const SUPERIOR: readonly Placement[] = [
  body('paragolpes-delantero', 'Paragolpes delantero', 'superior', 50, 7),
  body('capo', 'Capó', 'superior', 50, 20),
  body('parabrisas', 'Parabrisas', 'superior', 50, 37),
  body('techo', 'Techo', 'superior', 50, 58),
  body('luneta', 'Luneta trasera', 'superior', 50, 77),
  body('porton', 'Portón / maletero', 'superior', 50, 86),
  body('paragolpes-trasero', 'Paragolpes trasero', 'superior', 50, 93),
  /*
   * Los costados van a 15 y 85, no a 10 y 90.
   *
   * Desde arriba, el vehículo ocupa de 11,5 % a 88,5 % del marco en casi toda
   * su longitud —el 5 % restante lo abren los espejos, que sobresalen—. Los
   * puntos a 10 y 90 caían FUERA de la carrocería, señalando el fondo blanco
   * al lado de la puerta.
   */
  body('aleta-di', 'Aleta delantera izquierda', 'superior', 15, 25),
  body('puerta-di', 'Puerta delantera izquierda', 'superior', 15, 48),
  body('puerta-ti', 'Puerta trasera izquierda', 'superior', 15, 65),
  body('aleta-ti', 'Aleta trasera izquierda', 'superior', 15, 80),
  body('aleta-dd', 'Aleta delantera derecha', 'superior', 85, 25),
  body('puerta-dd', 'Puerta delantera derecha', 'superior', 85, 48),
  body('puerta-td', 'Puerta trasera derecha', 'superior', 85, 65),
  body('aleta-td', 'Aleta trasera derecha', 'superior', 85, 80),
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
  body('paragolpes-delantero', 'Paragolpes delantero', 'lateral-i', 6, 66),
  body('capo', 'Capó', 'lateral-i', 21, 45),
  body('parabrisas', 'Parabrisas', 'lateral-i', 35, 25),
  body('techo', 'Techo', 'lateral-i', 52, 13),
  body('luneta', 'Luneta trasera', 'lateral-i', 73, 22),
  body('porton', 'Portón / maletero', 'lateral-i', 89, 36),
  body('paragolpes-trasero', 'Paragolpes trasero', 'lateral-i', 93, 62),
  body('aleta-di', 'Aleta delantera izquierda', 'lateral-i', 15, 57),
  body('puerta-di', 'Puerta delantera izquierda', 'lateral-i', 45, 45),
  body('puerta-ti', 'Puerta trasera izquierda', 'lateral-i', 65, 45),
  body('aleta-ti', 'Aleta trasera izquierda', 'lateral-i', 82, 52),
  spot('llanta-di', 'Llanta delantera izquierda', 'lateral-i', 20, 72),
  spot('llanta-ti', 'Llanta trasera izquierda', 'lateral-i', 76, 72),
  spot('espejo-i', 'Espejo izquierdo', 'lateral-i', 35, 33),
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
  body('parabrisas', 'Parabrisas', 'frontal', 50, 18),
  body('capo', 'Capó', 'frontal', 50, 37),
  body('paragolpes-delantero', 'Paragolpes delantero', 'frontal', 50, 73),
  spot('faro-i', 'Faro izquierdo', 'frontal', 84, 44),
  spot('faro-d', 'Faro derecho', 'frontal', 16, 44),
  spot('rejilla', 'Rejilla y radiador', 'frontal', 50, 56),
  spot('espejo-i', 'Espejo izquierdo', 'frontal', 91, 27),
  spot('espejo-d', 'Espejo derecho', 'frontal', 9, 27),
];

/** Por detrás: SU izquierda queda a la izquierda de la pantalla. */
const POSTERIOR: readonly Placement[] = [
  body('luneta', 'Luneta trasera', 'posterior', 50, 18),
  body('porton', 'Portón / maletero', 'posterior', 50, 47),
  body('paragolpes-trasero', 'Paragolpes trasero', 'posterior', 50, 70),
  spot('farol-i', 'Farol izquierdo', 'posterior', 18, 41),
  spot('farol-d', 'Farol derecho', 'posterior', 84, 41),
  spot('escape', 'Escape', 'posterior', 22, 79),
];

/*
 * El interior NO está aquí, y no es un olvido.
 *
 * No hay fotografía de la cabina, y sus puntos —tablero, volante, asientos,
 * tapicería— son exactamente lo que el checklist de recepción ya pregunta uno
 * por uno. El motivo entero está en `views.ts`.
 */
export const PLACEMENTS: readonly Placement[] = [
  ...SUPERIOR,
  ...FRONTAL,
  ...LATERAL,
  ...LATERAL_D,
  ...POSTERIOR,
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
