import { allItems, type ChecklistState } from '@/features/reception/services/checklist';
import type { Finding } from '@/features/diagnosis/services/findings';
import type { JobStep, PauseReason } from '@/features/repairs/services/job-steps';

/**
 * Datos de ejemplo para los documentos.
 *
 * Cuentan la MISMA historia que las pantallas: los hallazgos son los que
 * justifican la cotización de la orden 154, y los pasos del trabajo son los
 * que ejecuta la bahía. Un PDF de demostración que hablara de otro vehículo
 * rompería el recorrido completo justo donde se enseña.
 */

/**
 * Checklist con tres observaciones.
 *
 * Se rellena programáticamente para que las 42 respuestas existan: un
 * checklist de ejemplo a medio responder haría creer que el documento imprime
 * huecos cuando lo que imprime es la verdad de un checklist incompleto.
 */
const OBSERVACIONES: Readonly<Record<string, string>> = {
  'ext-traseras': 'Luz de freno derecha fundida.',
  'ext-plumillas': 'Plumilla del conductor rayando el vidrio.',
  'int-aire': 'Enfría poco; se sugiere revisar carga de gas.',
};

export const DEMO_CHECKLIST_STATE: ChecklistState = Object.fromEntries(
  allItems().map((item) => {
    const nota = OBSERVACIONES[item.id];
    if (item.kind === 'nivel_combustible') return [item.id, { level: 'tres_cuartos' }];
    if (item.kind === 'nivel_fluido') return [item.id, { level: 'normal' }];
    if (item.kind === 'profundidad') {
      // El delantero izquierdo va por debajo del mínimo legal, para que el
      // documento tenga que advertirlo.
      return [item.id, { depthMm: item.id === 'neu-di' ? 1.4 : 5.2 }];
    }
    if (nota !== undefined) {
      return [item.id, { answer: 'no_conforme' as const, note: nota, photoCount: 1 }];
    }
    return [item.id, { answer: 'ok' as const }];
  }),
);

/** Los mismos hallazgos que muestra la pantalla de diagnóstico. */
export const DEMO_FINDINGS: readonly Finding[] = [
  {
    id: 'h1',
    system: 'frenos',
    title: 'Pastillas delanteras con desgaste',
    detail: 'Desgaste aproximado del 90 %. Se recomienda reemplazo antes de los próximos 500 km.',
    priority: 'critico',
    estimatedMinutes: 90,
    photoCount: 3,
    videoCount: 0,
  },
  {
    id: 'h2',
    system: 'suspension',
    title: 'Amortiguador delantero izquierdo',
    detail: 'Fuga de aceite visible en el vástago. Se recomienda reemplazo del par completo.',
    priority: 'alto',
    estimatedMinutes: 60,
    photoCount: 2,
    videoCount: 1,
  },
  {
    id: 'h3',
    system: 'motor',
    title: 'Filtro de aire en mal estado',
    detail: 'Filtro con suciedad acumulada. Cambio incluido en el mantenimiento preventivo.',
    priority: 'medio',
    estimatedMinutes: 30,
    photoCount: 1,
    videoCount: 0,
  },
  {
    id: 'h4',
    system: 'transmision',
    title: 'Revisión general de transmisión',
    detail: 'Sin observaciones críticas. Se recomienda mantenimiento preventivo en la próxima visita.',
    priority: 'recomendacion',
    estimatedMinutes: 45,
    photoCount: 0,
    videoCount: 0,
  },
];

const STEPS: readonly JobStep[] = [
  { id: 's1', label: 'Desmontaje de ruedas', state: 'hecho' },
  { id: 's2', label: 'Retiro de pastillas usadas', state: 'hecho' },
  { id: 's3', label: 'Instalación de pastillas nuevas', state: 'hecho' },
  { id: 's4', label: 'Montaje de ruedas', state: 'hecho' },
  { id: 's5', label: 'Prueba de frenado', state: 'hecho' },
];

/**
 * Reporte de trabajo con dos pausas.
 *
 * Una de ellas de 52 minutos esperando herramienta: es el caso que justifica
 * imprimir las pausas con su motivo. Sin ese desglose, el trabajo parecería
 * haber tardado casi cuatro horas para un cambio de pastillas.
 */
export const DEMO_WORK_REPORT = {
  supervisor: 'Rosa Huamán',
  jobTitle: 'Cambio de pastillas delanteras',
  steps: STEPS,
  effectiveSeconds: 2 * 3600 + 38 * 60,
  estimatedSeconds: 3 * 3600,
  pauses: [
    {
      reason: 'espera_herramienta' as PauseReason,
      minutes: 52,
      note: 'Extractor de pistones ocupado en la bahía 3.',
    },
    { reason: 'prueba' as PauseReason, minutes: 14 },
  ],
  evidenceCount: 4,
  finalNotes:
    'Pastillas cerámicas instaladas con el juego correcto. Discos dentro de tolerancia, no ' +
    'requirieron rectificado. Prueba en pista sin ruido ni tirón. Se purgó el circuito y se ' +
    'completó el nivel de líquido.',
};
