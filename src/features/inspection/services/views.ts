/**
 * Las vistas del vehículo en la inspección.
 *
 * Cinco ángulos y no uno: «el capó está rayado» se comprueba desde arriba o
 * desde delante, y «la puerta está hundida» solo se ve de lado. Una sola
 * imagen obliga a describir con palabras lo que la vista correcta enseña
 * sola.
 *
 * El orden es el de quien rodea un vehículo con una hoja en la mano: se
 * empieza por el plano general, se baja al costado y se cierra por delante,
 * por detrás y dentro.
 *
 * Dominio PURO.
 */

export const VIEW_IDS = [
  'superior',
  'frontal',
  'lateral-i',
  'lateral-d',
  'posterior',
  'interior',
] as const;

export type ViewId = (typeof VIEW_IDS)[number];

export interface InspectionView {
  readonly id: ViewId;
  readonly label: string;
  /** Qué se comprueba desde aquí. Va en la miniatura, no como adorno. */
  readonly hint: string;
  /** Proporción del lienzo. La vista superior es alta; las demás, anchas. */
  readonly aspect: 'alto' | 'ancho';
}

/**
 * Los DOS costados, no uno.
 *
 * Con un solo lateral, las cuatro piezas del lado derecho —dos puertas y dos
 * aletas— solo se podían tocar desde el plano superior, que es justo la vista
 * donde peor se aprecia un golpe de costado. En una recepción se rodea el
 * vehículo entero: las dos existen.
 */
export const VIEWS: readonly InspectionView[] = [
  { id: 'superior', label: 'Superior', hint: 'Plano general', aspect: 'alto' },
  { id: 'frontal', label: 'Frontal', hint: 'Frente y luces', aspect: 'ancho' },
  { id: 'lateral-i', label: 'Lateral izq.', hint: 'Costado izquierdo', aspect: 'ancho' },
  { id: 'lateral-d', label: 'Lateral der.', hint: 'Costado derecho', aspect: 'ancho' },
  { id: 'posterior', label: 'Posterior', hint: 'Cola y portón', aspect: 'ancho' },
  { id: 'interior', label: 'Interior', hint: 'Cabina y mandos', aspect: 'ancho' },
];

export function isViewId(value: string): value is ViewId {
  return (VIEW_IDS as readonly string[]).includes(value);
}

export function viewById(id: ViewId): InspectionView {
  const found = VIEWS.find((v) => v.id === id);
  if (found === undefined) throw new Error(`Vista desconocida: ${id}`);
  return found;
}

export const DEFAULT_VIEW: ViewId = 'superior';

/** La siguiente y la anterior, para moverse con el teclado. */
export function nextView(current: ViewId, delta: 1 | -1): ViewId {
  const i = VIEW_IDS.indexOf(current);
  const n = VIEW_IDS.length;
  return VIEW_IDS[(i + delta + n) % n] as ViewId;
}
