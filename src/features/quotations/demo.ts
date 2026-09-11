import type { QuoteLine } from './services/quotation';

/**
 * Cotización de ejemplo de la orden 154.
 *
 * Las líneas son las MISMAS que los hallazgos del diagnóstico, para que el
 * recorrido —diagnóstico, cotización, autorización— cuente una sola historia.
 * En la Fase 8 se generan a partir de `diagnosis_items`.
 */
export const DEMO_QUOTE: readonly QuoteLine[] = [
  {
    id: 'q1',
    title: 'Cambio de pastillas delanteras',
    detail: 'Desgaste aproximado del 90 %. Se recomienda reemplazo.',
    priority: 'critico',
    partsCents: 32_000,
    labourCents: 13_000,
    photoCount: 3,
  },
  {
    id: 'q2',
    title: 'Cambio de discos delanteros',
    detail: 'Discos con desgaste y vibración al frenar.',
    priority: 'alto',
    partsCents: 65_000,
    labourCents: 15_000,
    photoCount: 4,
  },
  {
    id: 'q3',
    title: 'Alineamiento y balanceo',
    detail: 'Se recomienda por desgaste irregular en los neumáticos.',
    priority: 'medio',
    partsCents: 0,
    labourCents: 12_000,
    photoCount: 2,
  },
  {
    id: 'q4',
    title: 'Cambio de filtro de aire',
    detail: 'Parte del mantenimiento preventivo.',
    priority: 'recomendacion',
    partsCents: 8_000,
    labourCents: 4_000,
    photoCount: 1,
  },
];

/** Token del enlace de autorización. En la Fase 9 sale de `authorization_links`. */
export const DEMO_AUTH_TOKEN = 'os-154-demo';
