/**
 * Checklist de recepción.
 *
 * Es el documento que el cliente firma diciendo en qué estado entregó su
 * vehículo. Cuando dos meses después alguien reclama un rayón, esto es lo
 * único que hay. Por eso el módulo es estricto en tres cosas:
 *
 *   1. Un punto sin responder NO cuenta como conforme. El vacío es «nadie lo
 *      miró», y en una discusión eso vale en contra del taller.
 *   2. «No conforme» obliga a observación. Un daño marcado sin describir no
 *      sirve de prueba de nada.
 *   3. «No aplica» es una respuesta legítima y cuenta como resuelta: un
 *      vehículo sin radio no puede dejar la recepción bloqueada para siempre.
 *
 * Dominio PURO: sin React, sin base de datos.
 */

export type ItemKind = 'estado' | 'nivel_combustible' | 'nivel_fluido' | 'profundidad';

export type ItemAnswer = 'ok' | 'no_conforme' | 'no_aplica';

export interface ChecklistItem {
  readonly id: string;
  readonly label: string;
  readonly kind: ItemKind;
}

export interface ChecklistSection {
  readonly id: string;
  readonly label: string;
  readonly items: readonly ChecklistItem[];
}

/** Escalas de los puntos que no se responden con OK / no conforme. */
export const FUEL_LEVELS = ['vacio', 'un_cuarto', 'medio', 'tres_cuartos', 'lleno'] as const;
export const FLUID_LEVELS = ['bajo', 'normal', 'lleno'] as const;

export const FUEL_LABELS: Readonly<Record<(typeof FUEL_LEVELS)[number], string>> = {
  vacio: 'Vacío',
  un_cuarto: '1/4',
  medio: '1/2',
  tres_cuartos: '3/4',
  lleno: 'Lleno',
};

export const FLUID_LABELS: Readonly<Record<(typeof FLUID_LEVELS)[number], string>> = {
  bajo: 'Bajo',
  normal: 'Normal',
  lleno: 'Lleno',
};

const estado = (id: string, label: string): ChecklistItem => ({ id, label, kind: 'estado' });

/**
 * El catálogo: 42 puntos en siete bloques.
 *
 * SEMILLA: en la Fase 5 sale de `checklist_templates`, para que el taller lo
 * ajuste sin tocar código. La forma que consume la pantalla no cambia.
 */
export const CHECKLIST: readonly ChecklistSection[] = [
  {
    id: 'interior',
    label: 'Interior',
    items: [
      estado('int-tapiceria', 'Tapicería'),
      estado('int-cinturones', 'Cinturones de seguridad'),
      estado('int-radio', 'Radio'),
      estado('int-aire', 'Aire acondicionado'),
      estado('int-tablero', 'Tablero e instrumentos'),
      estado('int-retrovisor', 'Espejo retrovisor'),
      estado('int-alfombras', 'Alfombras'),
      estado('int-guantera', 'Guantera'),
      estado('int-luces', 'Luces interiores'),
      estado('int-palanca', 'Palanca de cambios'),
      estado('int-freno-mano', 'Freno de mano'),
      estado('int-asientos', 'Asientos'),
    ],
  },
  {
    id: 'exterior',
    label: 'Exterior',
    items: [
      estado('ext-espejos', 'Espejos laterales'),
      estado('ext-plumillas', 'Plumillas'),
      estado('ext-parabrisas', 'Parabrisas'),
      estado('ext-luna', 'Luna trasera'),
      estado('ext-faros', 'Faros delanteros'),
      estado('ext-traseras', 'Luces traseras'),
      estado('ext-direccionales', 'Direccionales'),
      estado('ext-paragolpes-del', 'Parachoques delantero'),
      estado('ext-paragolpes-tra', 'Parachoques trasero'),
      estado('ext-placas', 'Placas'),
    ],
  },
  {
    id: 'funciones',
    label: 'Funciones',
    items: [
      estado('fun-arranque', 'Arranque'),
      estado('fun-luces', 'Luces altas y bajas'),
      estado('fun-limpia', 'Limpiaparabrisas'),
      estado('fun-claxon', 'Claxon'),
      estado('fun-clima', 'Climatizador'),
      estado('fun-elevalunas', 'Elevalunas'),
    ],
  },
  {
    id: 'seguridad',
    label: 'Seguridad',
    items: [
      estado('seg-gata', 'Gata'),
      estado('seg-llave', 'Llave de ruedas'),
      estado('seg-triangulos', 'Triángulos de seguridad'),
    ],
  },
  {
    id: 'documentos',
    label: 'Documentos',
    items: [
      estado('doc-propiedad', 'Tarjeta de propiedad'),
      estado('doc-soat', 'SOAT'),
      estado('doc-revision', 'Revisión técnica'),
      estado('doc-otros', 'Otros documentos'),
    ],
  },
  {
    id: 'fluidos',
    label: 'Fluidos',
    items: [
      { id: 'flu-combustible', label: 'Combustible', kind: 'nivel_combustible' },
      { id: 'flu-aceite', label: 'Aceite de motor', kind: 'nivel_fluido' },
      { id: 'flu-refrigerante', label: 'Refrigerante', kind: 'nivel_fluido' },
    ],
  },
  {
    id: 'neumaticos',
    label: 'Neumáticos',
    items: [
      { id: 'neu-di', label: 'Delantero izquierdo', kind: 'profundidad' },
      { id: 'neu-dd', label: 'Delantero derecho', kind: 'profundidad' },
      { id: 'neu-pi', label: 'Posterior izquierdo', kind: 'profundidad' },
      { id: 'neu-pd', label: 'Posterior derecho', kind: 'profundidad' },
    ],
  },
];

/** Lo respondido en un punto. */
export interface ItemResult {
  readonly answer?: ItemAnswer;
  readonly level?: string;
  /** Milímetros de profundidad restante. */
  readonly depthMm?: number;
  readonly note?: string;
  readonly photoCount?: number;
}

export type ChecklistState = Readonly<Record<string, ItemResult>>;

export function allItems(): readonly ChecklistItem[] {
  return CHECKLIST.flatMap((section) => section.items);
}

export const TOTAL_ITEMS = allItems().length;

/**
 * ¿Está resuelto este punto?
 *
 * Resuelto NO es lo mismo que conforme: «no aplica» y «no conforme» también
 * son respuestas. Lo que no cuenta es el silencio.
 */
export function isResolved(item: ChecklistItem, result: ItemResult | undefined): boolean {
  if (result === undefined) return false;

  switch (item.kind) {
    case 'estado':
      // Un «no conforme» sin describir no prueba nada, así que no cierra el punto.
      if (result.answer === 'no_conforme') {
        return result.note !== undefined && result.note.trim() !== '';
      }
      return result.answer === 'ok' || result.answer === 'no_aplica';

    case 'nivel_combustible':
    case 'nivel_fluido':
      return result.level !== undefined && result.level !== '';

    case 'profundidad':
      return typeof result.depthMm === 'number' && Number.isFinite(result.depthMm);
  }
}

export function sectionProgress(
  section: ChecklistSection,
  state: ChecklistState,
): { done: number; total: number } {
  const done = section.items.filter((item) => isResolved(item, state[item.id])).length;
  return { done, total: section.items.length };
}

export function overallProgress(state: ChecklistState): {
  done: number;
  total: number;
  percent: number;
} {
  const done = allItems().filter((item) => isResolved(item, state[item.id])).length;
  return { done, total: TOTAL_ITEMS, percent: Math.round((done / TOTAL_ITEMS) * 100) };
}

export function isComplete(state: ChecklistState): boolean {
  return overallProgress(state).done === TOTAL_ITEMS;
}

/** Los puntos marcados como no conformes, que son los que viajan al diagnóstico. */
export function nonConformities(state: ChecklistState): readonly ChecklistItem[] {
  return allItems().filter((item) => state[item.id]?.answer === 'no_conforme');
}

/**
 * Neumático por debajo del mínimo legal.
 *
 * 1,6 mm es el límite en la mayoría de normativas. No bloquea la recepción
 * —el vehículo ya está en el taller—, pero sale marcado para que el asesor lo
 * mencione: entra en el checklist y se convierte en una recomendación.
 */
export const MIN_TREAD_MM = 1.6;

export function tyresBelowMinimum(state: ChecklistState): readonly ChecklistItem[] {
  return allItems().filter((item) => {
    if (item.kind !== 'profundidad') return false;
    const depth = state[item.id]?.depthMm;
    return typeof depth === 'number' && depth < MIN_TREAD_MM;
  });
}
