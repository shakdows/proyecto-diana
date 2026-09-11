/**
 * Escalas para gráficos.
 *
 * El brief pedía Recharts «porque la geometría se comparte con el PDF». No
 * puede: Recharts renderiza DOM a través de React, y `@react-pdf/renderer`
 * dibuja en su propio motor. Lo que SÍ se comparte es esto: funciones puras
 * que convierten un dato en una coordenada. El mismo `linear()` alimenta el
 * `<svg>` del navegador y el `<Svg>` del PDF.
 *
 * Son cuarenta líneas. Traer d3-scale para esto añadiría una dependencia que
 * versionar a cambio de nada.
 */

export interface LinearScale {
  (value: number): number;
  readonly domain: readonly [number, number];
  readonly range: readonly [number, number];
  /** Marcas «redondas» para el eje. */
  ticks(count?: number): readonly number[];
}

/**
 * Escala lineal. Un dominio de ancho cero devuelve el centro del rango: sin
 * esto, una serie de valores idénticos divide entre cero y pinta NaN, que en
 * SVG se traduce en un gráfico vacío sin ningún error en consola.
 */
export function linear(
  domain: readonly [number, number],
  range: readonly [number, number],
): LinearScale {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0;

  const scale = ((value: number): number => {
    if (span === 0) return (r0 + r1) / 2;
    return r0 + ((value - d0) / span) * (r1 - r0);
  }) as { (value: number): number; domain: typeof domain; range: typeof range; ticks: (count?: number) => readonly number[] };

  scale.domain = domain;
  scale.range = range;
  scale.ticks = (count = 5): readonly number[] => niceTicks(d0, d1, count);
  return scale as LinearScale;
}

/**
 * Marcas de eje en números redondos.
 *
 * Un eje con marcas en 0, 23.7, 47.4 es ilegible aunque sea matemáticamente
 * correcto. Se busca el paso «bonito» más cercano: 1, 2, 5 o 10 por década.
 */
export function niceTicks(min: number, max: number, count = 5): readonly number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || count < 1) return [];
  if (min === max) return [min];

  const rawStep = (max - min) / count;
  const magnitude = 10 ** Math.floor(Math.log10(rawStep));
  const normalized = rawStep / magnitude;
  const step = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude;

  /*
   * Los decimales se derivan del PASO, no del valor. Redondear al múltiplo
   * del paso no basta: 0.2 no es exacto en binario, así que 3 × 0.2 vuelve a
   * dar 0.6000000000000001 y el eje se rotula con dieciséis decimales. Con
   * paso 0.2 hacen falta 1 decimal; con paso 20, ninguno.
   */
  const decimals = Math.max(0, -Math.floor(Math.log10(step)));
  const snap = (v: number): number => Number(v.toFixed(decimals));

  const start = Math.ceil(min / step) * step;
  const out: number[] = [];
  // Se compara con una tolerancia porque acumular sumas de 0.1 acaba en
  // 0.30000000000000004 y la última marca se pierde.
  for (let v = start; v <= max + step * 1e-9; v += step) {
    out.push(snap(v));
  }
  return out;
}

export interface BandScale {
  (index: number): number;
  readonly bandwidth: number;
  readonly step: number;
}

/**
 * Escala de bandas para barras. `padding` es la fracción del paso que queda
 * como hueco: 0 pega las barras, 0.9 las deja como líneas.
 */
export function band(
  count: number,
  range: readonly [number, number],
  padding = 0.25,
): BandScale {
  const [r0, r1] = range;
  const width = r1 - r0;
  const safeCount = Math.max(1, count);
  const step = width / safeCount;
  const clamped = Math.min(0.95, Math.max(0, padding));
  const bandwidth = step * (1 - clamped);

  const scale = ((index: number): number => r0 + index * step + (step - bandwidth) / 2) as {
    (index: number): number;
    bandwidth: number;
    step: number;
  };
  scale.bandwidth = bandwidth;
  scale.step = step;
  return scale as BandScale;
}

/**
 * Dominio que empieza en cero para gráficos de barras.
 *
 * Una barra cuyo eje no arranca en cero exagera las diferencias: es la forma
 * más común de mentir con un gráfico sin escribir un solo número falso.
 */
export function zeroBasedDomain(values: readonly number[]): readonly [number, number] {
  const max = values.length === 0 ? 0 : Math.max(...values, 0);
  const min = values.length === 0 ? 0 : Math.min(...values, 0);
  if (max === 0 && min === 0) return [0, 1];
  return [min, max];
}

/** Ruta SVG de una línea. Devuelve cadena vacía si no hay puntos que unir. */
export function linePath(points: readonly (readonly [number, number])[]): string {
  if (points.length === 0) return '';
  return points
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${round(x)},${round(y)}`)
    .join(' ');
}

/** Arco de dona, en coordenadas absolutas. */
export function donutArc(
  cx: number,
  cy: number,
  outer: number,
  inner: number,
  startAngle: number,
  endAngle: number,
): string {
  // Un arco de exactamente 360° tiene inicio y fin en el mismo punto, y el
  // navegador no dibuja nada. Se recorta un pelo para que sí se vea.
  const sweep = Math.min(endAngle - startAngle, Math.PI * 2 - 1e-6);
  const end = startAngle + sweep;
  const large = sweep > Math.PI ? 1 : 0;

  const p = (r: number, a: number): string =>
    `${round(cx + r * Math.cos(a))},${round(cy + r * Math.sin(a))}`;

  return [
    `M${p(outer, startAngle)}`,
    `A${round(outer)},${round(outer)} 0 ${large} 1 ${p(outer, end)}`,
    `L${p(inner, end)}`,
    `A${round(inner)},${round(inner)} 0 ${large} 0 ${p(inner, startAngle)}`,
    'Z',
  ].join(' ');
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

export interface DonutSegment<T> {
  readonly item: T;
  readonly startAngle: number;
  readonly endAngle: number;
  readonly fraction: number;
}

/**
 * Reparte un total en arcos, acumulando el ángulo de forma PURA.
 *
 * Vive aquí y no en el componente porque acumular una variable dentro del
 * `map` del render es una mutación durante el renderizado: React puede
 * reejecutar ese cuerpo, y entonces el segundo arco arranca donde terminó la
 * pasada anterior y la dona sale girada. Además, así el PDF reutiliza el
 * mismo reparto.
 *
 * Empieza a las 12 en punto, no a las 3: es donde la gente espera que empiece
 * un gráfico circular.
 */
export function donutSegments<T>(
  items: readonly T[],
  valueOf: (item: T) => number,
): readonly DonutSegment<T>[] {
  const total = items.reduce((n, item) => n + Math.max(0, valueOf(item)), 0);
  if (total === 0) return [];

  const out: DonutSegment<T>[] = [];
  let angle = -Math.PI / 2;

  for (const item of items) {
    const value = Math.max(0, valueOf(item));
    if (value === 0) continue;
    const sweep = (value / total) * Math.PI * 2;
    out.push({ item, startAngle: angle, endAngle: angle + sweep, fraction: value / total });
    angle += sweep;
  }

  return out;
}
