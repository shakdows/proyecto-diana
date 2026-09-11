import type { RequestLine } from './services/request';

/**
 * Solicitud de repuestos de ejemplo de la orden 154.
 *
 * Sale de los trabajos que el cliente autorizó en la cotización (q1, q2, q4):
 * el alineamiento no pide piezas, así que no aparece. En la Fase 8 se genera
 * desde `quotation_items` aprobados y el stock sale de `inventory`.
 */
export const DEMO_PARTS_REQUEST: readonly RequestLine[] = [
  {
    id: 'r1',
    workId: 'q1',
    workTitle: 'Cambio de pastillas delanteras',
    description: 'Juego de pastillas delanteras cerámicas',
    partNumber: '04465-0K260',
    quantity: 1,
    urgency: 'normal',
    inStock: 0,
  },
  {
    id: 'r2',
    workId: 'q1',
    workTitle: 'Cambio de pastillas delanteras',
    description: 'Líquido de frenos DOT 4 · 500 ml',
    partNumber: 'DOT4-500',
    quantity: 2,
    urgency: 'normal',
    inStock: 2,
  },
  {
    id: 'r3',
    workId: 'q2',
    workTitle: 'Cambio de discos delanteros',
    description: 'Disco de freno delantero ventilado',
    partNumber: '43512-0K090',
    quantity: 2,
    urgency: 'urgente',
    note: 'El cliente viaja a Arequipa el viernes y no acepta postergar.',
    inStock: 0,
  },
  {
    id: 'r4',
    workId: 'q2',
    workTitle: 'Cambio de discos delanteros',
    description: 'Kit de pernos de disco',
    partNumber: '90105-08484',
    quantity: 8,
    urgency: 'normal',
    inStock: 3,
  },
  {
    id: 'r5',
    workId: 'q4',
    workTitle: 'Cambio de filtro de aire',
    description: 'Filtro de aire de motor',
    partNumber: '17801-0C010',
    quantity: 1,
    urgency: 'normal',
    inStock: 1,
  },
];
