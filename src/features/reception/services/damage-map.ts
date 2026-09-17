/**
 * Diagrama de daños de la recepción.
 *
 * Es la prueba de en qué estado entró el vehículo. Cuando el cliente vuelve
 * diciendo «ese golpe no estaba», lo que se mira es esto, así que la decisión
 * de fondo no es de dibujo sino de qué se guarda.
 *
 * ── Se marca por ZONA, no por coordenada ────────────────────────────────────
 *
 * Lo intuitivo es guardar dónde tocó el dedo: un par de números sobre la
 * imagen. Es peor por tres motivos, y los tres se descubren tarde:
 *
 *   1. La silueta es genérica. Un punto a 62,148 sobre el dibujo de un sedán
 *      no señala el mismo sitio del vehículo si el que entró es una camioneta.
 *   2. No se puede preguntar. «¿Cuántos vehículos llegan golpeados por detrás?»
 *      es una consulta trivial sobre zonas e imposible sobre coordenadas.
 *   3. Se rompe al rediseñar. Cambiar el dibujo mueve todos los daños
 *      guardados, y nadie se entera hasta que un peritaje sale mal.
 *
 * «Puerta delantera izquierda» significa lo mismo dentro de diez años y sobre
 * cualquier carrocería. La coordenada es una forma de dibujo; la zona es un
 * hecho sobre el vehículo.
 */

export type ZoneId =
  | 'paragolpes-delantero'
  | 'capo'
  | 'parabrisas'
  | 'techo'
  | 'luneta'
  | 'porton'
  | 'paragolpes-trasero'
  | 'aleta-di'
  | 'puerta-di'
  | 'puerta-ti'
  | 'aleta-ti'
  | 'aleta-dd'
  | 'puerta-dd'
  | 'puerta-td'
  | 'aleta-td';

export interface Zone {
  readonly id: ZoneId;
  readonly label: string;
  /** Rectángulo de la zona sobre el lienzo de 220 × 460. */
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/**
 * Las quince zonas, sobre un lienzo de 220 × 460 con el morro arriba.
 *
 * Rectángulos y no contornos recortados: una zona tiene que ser fácil de
 * acertar con el dedo junto al vehículo, de pie. Un polígono con la forma
 * exacta de la aleta se ve mejor en una captura y se falla al tocarlo.
 *
 * «i» es izquierda y «d» derecha DEL VEHÍCULO, no de quien mira el dibujo. Es
 * la convención del taller y de cualquier peritaje; invertirla para que
 * coincida con la pantalla haría que el parte no cuadre con el vehículo.
 */
export const ZONES: readonly Zone[] = [
  { id: 'paragolpes-delantero', label: 'Paragolpes delantero', x: 46, y: 14, w: 128, h: 24 },
  { id: 'capo', label: 'Capó', x: 62, y: 42, w: 96, h: 78 },
  { id: 'parabrisas', label: 'Parabrisas', x: 62, y: 124, w: 96, h: 36 },
  { id: 'techo', label: 'Techo', x: 62, y: 164, w: 96, h: 116 },
  { id: 'luneta', label: 'Luneta trasera', x: 62, y: 284, w: 96, h: 36 },
  { id: 'porton', label: 'Portón / maletero', x: 62, y: 324, w: 96, h: 78 },
  { id: 'paragolpes-trasero', label: 'Paragolpes trasero', x: 46, y: 406, w: 128, h: 24 },

  { id: 'aleta-di', label: 'Aleta delantera izquierda', x: 30, y: 58, w: 28, h: 72 },
  { id: 'puerta-di', label: 'Puerta delantera izquierda', x: 30, y: 134, w: 28, h: 86 },
  { id: 'puerta-ti', label: 'Puerta trasera izquierda', x: 30, y: 224, w: 28, h: 86 },
  { id: 'aleta-ti', label: 'Aleta trasera izquierda', x: 30, y: 314, w: 28, h: 76 },

  { id: 'aleta-dd', label: 'Aleta delantera derecha', x: 162, y: 58, w: 28, h: 72 },
  { id: 'puerta-dd', label: 'Puerta delantera derecha', x: 162, y: 134, w: 28, h: 86 },
  { id: 'puerta-td', label: 'Puerta trasera derecha', x: 162, y: 224, w: 28, h: 86 },
  { id: 'aleta-td', label: 'Aleta trasera derecha', x: 162, y: 314, w: 28, h: 76 },
];

export const CANVAS = { width: 220, height: 460 } as const;

export type DamageKind =
  | 'rayon'
  | 'abolladura'
  | 'rotura'
  | 'faltante'
  | 'oxido'
  /*
   * El daño que se marcó sin detallar de qué clase es.
   *
   * La inspección de recepción se anota con dos toques —bien o daño— y el
   * tipo es opcional: pedirlo siempre convertía quince zonas en un
   * formulario que nadie termina. Pero el parte NO puede quedarse sin la
   * marca: sin ella, el acta diría «sin daños» de un vehículo que entró
   * golpeado. Este valor es lo que se guarda mientras nadie precise más, y
   * dice exactamente eso.
   */
  | 'otro';

export interface DamageKindInfo {
  readonly id: DamageKind;
  readonly label: string;
  /** Una sola letra: es lo que cabe dentro del punto sobre el dibujo. */
  readonly mark: string;
  readonly severity: 'leve' | 'media' | 'grave';
}

export const DAMAGE_KINDS: readonly DamageKindInfo[] = [
  { id: 'rayon', label: 'Rayón', mark: 'R', severity: 'leve' },
  { id: 'abolladura', label: 'Abolladura', mark: 'A', severity: 'media' },
  { id: 'oxido', label: 'Óxido', mark: 'O', severity: 'media' },
  { id: 'rotura', label: 'Rotura', mark: 'X', severity: 'grave' },
  { id: 'faltante', label: 'Falta la pieza', mark: 'F', severity: 'grave' },
  { id: 'otro', label: 'Daño sin detallar', mark: '✗', severity: 'media' },
];

export interface DamageMark {
  readonly zone: ZoneId;
  readonly kind: DamageKind;
}

export function zoneById(id: ZoneId): Zone | undefined {
  return ZONES.find((z) => z.id === id);
}

export function zoneLabel(id: ZoneId): string {
  return zoneById(id)?.label ?? id;
}

export function kindInfo(id: DamageKind): DamageKindInfo {
  const found = DAMAGE_KINDS.find((k) => k.id === id);
  if (found === undefined) throw new Error(`Tipo de daño desconocido: ${id}`);
  return found;
}

/**
 * Marca o desmarca una zona.
 *
 * Una zona admite UN daño. Dos golpes en la misma puerta siguen siendo «la
 * puerta está dañada»; lo que cambia el parte es de qué gravedad, y para eso
 * vuelve a pulsarse y se elige otro tipo. Permitir varios por zona obliga a
 * decidir cuál manda al pintar el punto, y esa decisión no la quiere nadie.
 */
export function toggleMark(
  marks: readonly DamageMark[],
  zone: ZoneId,
  kind: DamageKind,
): readonly DamageMark[] {
  const existing = marks.find((m) => m.zone === zone);

  // Mismo tipo sobre la misma zona: se estaba deshaciendo.
  if (existing !== undefined && existing.kind === kind) {
    return marks.filter((m) => m.zone !== zone);
  }

  return [...marks.filter((m) => m.zone !== zone), { zone, kind }];
}

export function markAt(marks: readonly DamageMark[], zone: ZoneId): DamageMark | undefined {
  return marks.find((m) => m.zone === zone);
}

export interface DamageSummary {
  readonly total: number;
  readonly leve: number;
  readonly media: number;
  readonly grave: number;
}

export function summarize(marks: readonly DamageMark[]): DamageSummary {
  const counts = { leve: 0, media: 0, grave: 0 };
  for (const mark of marks) counts[kindInfo(mark.kind).severity] += 1;
  return { total: marks.length, ...counts };
}

/**
 * El parte en una línea, en el orden en que se lee un vehículo: por delante,
 * los lados, y por detrás.
 */
export function describe(marks: readonly DamageMark[]): string {
  if (marks.length === 0) return 'Sin daños registrados al ingreso.';

  const order = new Map(ZONES.map((z, i) => [z.id, i]));

  return [...marks]
    .sort((a, b) => (order.get(a.zone) ?? 0) - (order.get(b.zone) ?? 0))
    .map((m) => `${zoneLabel(m.zone)}: ${kindInfo(m.kind).label.toLowerCase()}`)
    .join(' · ');
}
