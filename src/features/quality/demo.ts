import type { QualityCheck } from './services/inspection';

/**
 * Comprobaciones de calidad de la orden 154.
 *
 * Se agrupan por el trabajo que las origina, para revisar en el mismo orden
 * en que se reparó. Las tres últimas son de entrega y aplican a cualquier
 * orden. En la Fase 13 salen de `quality_check_templates`.
 */
export const DEMO_QUALITY_CHECKS: readonly QualityCheck[] = [
  {
    id: 'q1',
    workTitle: 'Cambio de pastillas delanteras',
    label: 'Pastillas montadas con el sentido y el juego correctos',
    critical: true,
  },
  {
    id: 'q2',
    workTitle: 'Cambio de pastillas delanteras',
    label: 'Prueba de frenado en pista, sin ruido ni tirón',
    critical: true,
  },
  {
    id: 'q3',
    workTitle: 'Cambio de pastillas delanteras',
    label: 'Nivel de líquido de frenos dentro de rango',
    critical: true,
  },
  {
    id: 'q4',
    workTitle: 'Cambio de discos delanteros',
    label: 'Discos sin alabeo perceptible al frenar',
    critical: true,
  },
  {
    id: 'q5',
    workTitle: 'Cambio de discos delanteros',
    label: 'Torque de pernos verificado con llave dinamométrica',
    critical: true,
  },
  {
    id: 'q6',
    workTitle: 'Cambio de filtro de aire',
    label: 'Filtro asentado y carcasa cerrada',
    critical: false,
  },
  {
    id: 'q7',
    workTitle: 'Entrega',
    label: 'Sin testigos encendidos en el tablero',
    critical: true,
  },
  {
    id: 'q8',
    workTitle: 'Entrega',
    label: 'Interior sin manchas de grasa ni huellas',
    critical: false,
  },
  {
    id: 'q9',
    workTitle: 'Entrega',
    label: 'Herramienta y repuesto usado retirados del vehículo',
    critical: false,
  },
];
