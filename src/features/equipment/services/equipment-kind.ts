/**
 * Tipo de equipo: vehículo liviano o maquinaria pesada.
 *
 * El taller atiende flota mixta. Una camioneta y una excavadora recorren el
 * MISMO flujo —recepción, diagnóstico, cotización, autorización, repuestos,
 * reparación, calidad, entrega— y por eso comparten orden, máquina de estados
 * y cálculo de avance. Lo que NO comparten es cómo se nombran:
 *
 *   - una camioneta tiene PLACA y se mantiene por KILÓMETROS;
 *   - una excavadora tiene CÓDIGO DE EQUIPO y se mantiene por HORAS.
 *
 * Meter las dos cosas en la palabra «vehículo» obliga al usuario a traducir
 * mentalmente en cada pantalla, y en un parte de trabajo esa traducción se
 * equivoca: 8.420 leído como kilómetros en una máquina que lleva 8.420 horas
 * cambia por completo qué mantenimiento toca.
 *
 * Este módulo es la ÚNICA fuente de esos nombres. Dominio PURO: sin React, sin
 * Next.js, sin base de datos. La columna sigue llamándose `plate` y el permiso
 * `vehicles:read`; esto solo decide qué lee la persona.
 */

export const EQUIPMENT_KINDS = ['vehiculo', 'maquinaria'] as const;
export type EquipmentKind = (typeof EQUIPMENT_KINDS)[number];

export interface EquipmentVocabulary {
  /** «Vehículo» / «Equipo» — singular, para títulos y etiquetas. */
  readonly noun: string;
  readonly nounPlural: string;
  /** «Placa» / «Código de equipo» — cómo se llama el identificador. */
  readonly identifier: string;
  readonly identifierShort: string;
  /** «Kilometraje» / «Horómetro» — el contador de uso. */
  readonly usageMeter: string;
  /** «km» / «h» — la unidad que acompaña a la cifra. */
  readonly usageUnit: string;
  /** «VIN» / «N.º de serie» — el identificador de fábrica. */
  readonly serialLabel: string;
}

const VOCABULARY: Readonly<Record<EquipmentKind, EquipmentVocabulary>> = {
  vehiculo: {
    noun: 'Vehículo',
    nounPlural: 'Vehículos',
    identifier: 'Placa',
    identifierShort: 'Placa',
    usageMeter: 'Kilometraje',
    usageUnit: 'km',
    serialLabel: 'VIN',
  },
  maquinaria: {
    noun: 'Equipo',
    nounPlural: 'Equipos',
    identifier: 'Código de equipo',
    identifierShort: 'Código',
    usageMeter: 'Horómetro',
    usageUnit: 'h',
    serialLabel: 'N.º de serie',
  },
};

export function vocabularyFor(kind: EquipmentKind): EquipmentVocabulary {
  return VOCABULARY[kind];
}

export function isEquipmentKind(value: string): value is EquipmentKind {
  return (EQUIPMENT_KINDS as readonly string[]).includes(value);
}

/**
 * Vocabulario para una LISTA heterogénea.
 *
 * El tablero muestra camionetas y excavadoras en la misma tabla, así que la
 * cabecera no puede decir «Placa» ni «Código de equipo»: mentiría en la mitad
 * de las filas. Cuando la lista es mixta se usa el término neutro; cuando toda
 * la lista es de un tipo, se usa el término preciso de ese tipo.
 */
export function vocabularyForMany(kinds: readonly EquipmentKind[]): EquipmentVocabulary {
  const first = kinds[0];
  if (first === undefined) return VOCABULARY.maquinaria;
  if (kinds.every((k) => k === first)) return VOCABULARY[first];

  return {
    noun: 'Equipo',
    nounPlural: 'Equipos',
    identifier: 'Identificador',
    identifierShort: 'ID',
    usageMeter: 'Uso acumulado',
    // Una lista mixta no tiene unidad común: cada fila trae la suya.
    usageUnit: '',
    serialLabel: 'Serie',
  };
}

/**
 * La cifra del contador con su unidad, ya formateada.
 *
 * Recibe el formateador en vez de importarlo para no atar el dominio a la
 * localización: la capa que pinta decide en qué idioma se separan los miles.
 */
export function formatUsage(
  value: number,
  kind: EquipmentKind,
  formatNumber: (n: number) => string,
): string {
  return `${formatNumber(value)} ${VOCABULARY[kind].usageUnit}`;
}
