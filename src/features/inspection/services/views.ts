/**
 * Las vistas del vehículo en la inspección.
 *
 * Cinco ángulos y no uno: «el capó está rayado» se comprueba desde arriba o
 * desde delante, y «la puerta está hundida» solo se ve de lado. Una sola
 * imagen obliga a describir con palabras lo que la vista correcta enseña
 * sola.
 *
 * El orden es el de quien rodea un vehículo con una hoja en la mano: se
 * empieza por el plano general, se baja al costado y se cierra por delante y
 * por detrás.
 *
 * ── Fotografías, no dibujo ─────────────────────────────────────────────────
 *
 * Cada vista tiene SU fotografía, en `public/checklist/`. Antes eran siluetas
 * dibujadas, por una razón que entonces era buena —no había cinco fotos de
 * cada ángulo y repetir una sola habría hecho que la pantalla dijera
 * «posterior» enseñando el frente—. Ahora las hay, y una fotografía se lee
 * sin traducir: el asesor ve la puerta que va a mirar, no un rectángulo que
 * la representa.
 *
 * `ratio` es el ancho partido por el alto de ESA fotografía. El marco se
 * dibuja con esa proporción exacta para que la imagen lo llene sin bandas: si
 * el marco fuera de otra forma, la foto quedaría centrada dentro y los puntos
 * —que se colocan en porcentaje del MARCO— señalarían al lado de la pieza.
 *
 * Dominio PURO.
 */

export const VIEW_IDS = [
  'superior',
  'frontal',
  'lateral-i',
  'lateral-d',
  'posterior',
] as const;

export type ViewId = (typeof VIEW_IDS)[number];

export interface InspectionView {
  readonly id: ViewId;
  readonly label: string;
  /** Qué se comprueba desde aquí. Va en la miniatura, no como adorno. */
  readonly hint: string;
  /** La fotografía de esta vista, servida desde `public/`. */
  readonly photo: string;
  /** Ancho ÷ alto de esa fotografía. El marco copia esta proporción. */
  readonly ratio: number;
}

/**
 * Los DOS costados, no uno.
 *
 * Con un solo lateral, las cuatro piezas del lado derecho —dos puertas y dos
 * aletas— solo se podían tocar desde el plano superior, que es justo la vista
 * donde peor se aprecia un golpe de costado. En una recepción se rodea el
 * vehículo entero: las dos existen.
 *
 * ⚠️ El interior ya NO es una vista.
 *
 * No hay fotografía de la cabina, y sus cinco puntos —tablero, volante,
 * asientos, tapicería— son EXACTAMENTE lo que el checklist de recepción ya
 * pregunta uno por uno, con más detalle del que cabe en un punto. Dejar una
 * silueta dibujada entre cuatro fotografías solo para conservarlos habría
 * sido peor: una vista que no se parece a las demás y que duplica una hoja
 * que ya se rellena.
 */
export const VIEWS: readonly InspectionView[] = [
  {
    id: 'superior',
    label: 'Superior',
    hint: 'Plano general',
    photo: '/checklist/superior.webp',
    ratio: 639 / 1363,
  },
  {
    id: 'frontal',
    label: 'Frontal',
    hint: 'Frente y luces',
    photo: '/checklist/frontal.webp',
    ratio: 1090 / 864,
  },
  {
    id: 'lateral-i',
    label: 'Lateral izq.',
    hint: 'Costado izquierdo',
    photo: '/checklist/lateral-i.webp',
    ratio: 1181 / 400,
  },
  {
    id: 'lateral-d',
    label: 'Lateral der.',
    hint: 'Costado derecho',
    photo: '/checklist/lateral-d.webp',
    ratio: 1195 / 405,
  },
  {
    id: 'posterior',
    label: 'Posterior',
    hint: 'Cola y portón',
    photo: '/checklist/posterior.webp',
    ratio: 1078 / 886,
  },
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
