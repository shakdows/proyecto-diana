/**
 * Pasos de la recepción.
 *
 * La recepción no es un formulario: es un procedimiento con orden y con
 * puntos de no retorno. Este módulo decide qué paso toca, cuál se puede
 * abrir y cuándo el ingreso está listo para cerrarse.
 *
 * Dominio PURO: sin React, sin Next.js, sin base de datos. Lo que se guarda
 * es el borrador; lo que decide si el borrador vale es esto.
 */

export const RECEPTION_STEPS = [
  'cliente',
  'vehiculo',
  'checklist',
  'danos',
  'evidencia',
  'firma',
  'confirmacion',
] as const;

export type ReceptionStep = (typeof RECEPTION_STEPS)[number];

export const STEP_LABELS: Readonly<Record<ReceptionStep, string>> = {
  cliente: 'Cliente',
  vehiculo: 'Vehículo',
  checklist: 'Checklist',
  danos: 'Daños',
  evidencia: 'Evidencia',
  firma: 'Firma',
  confirmacion: 'Confirmación',
};

export type StepState = 'completado' | 'en_progreso' | 'pendiente';

/** Lo que el borrador sabe hasta ahora. */
export interface ReceptionDraft {
  readonly plate: string;
  readonly customerConfirmed: boolean;
  readonly vehicleConfirmed: boolean;
  readonly checklistRequired: number;
  readonly checklistResolved: number;
  readonly damageCount: number;
  readonly damagesReviewed: boolean;
  readonly photoCount: number;
  readonly customerSigned: boolean;
  readonly advisorSigned: boolean;
}

export const EMPTY_DRAFT: ReceptionDraft = {
  plate: '',
  customerConfirmed: false,
  vehicleConfirmed: false,
  checklistRequired: 42,
  checklistResolved: 0,
  damageCount: 0,
  damagesReviewed: false,
  photoCount: 0,
  customerSigned: false,
  advisorSigned: false,
};

/**
 * ¿Qué pasos están terminados?
 *
 * «Daños» se completa cuando alguien lo REVISÓ, no cuando hay daños: un
 * vehículo sin un solo rayón es un resultado válido del paso, y tratarlo como
 * pendiente dejaría la recepción bloqueada para siempre en los coches nuevos.
 *
 * El checklist exige TODOS los puntos resueltos, no un porcentaje: el que
 * falta es justo el que después nadie sabe si se miró.
 */
export function completedSteps(draft: ReceptionDraft): ReadonlySet<ReceptionStep> {
  const done = new Set<ReceptionStep>();

  if (draft.plate !== '' && draft.customerConfirmed) done.add('cliente');
  if (done.has('cliente') && draft.vehicleConfirmed) done.add('vehiculo');
  if (
    done.has('vehiculo') &&
    draft.checklistRequired > 0 &&
    draft.checklistResolved >= draft.checklistRequired
  ) {
    done.add('checklist');
  }
  if (done.has('checklist') && draft.damagesReviewed) done.add('danos');
  if (done.has('danos') && draft.photoCount > 0) done.add('evidencia');
  if (done.has('evidencia') && draft.customerSigned && draft.advisorSigned) done.add('firma');

  return done;
}

/** El primer paso que aún no está terminado. */
export function currentStep(draft: ReceptionDraft): ReceptionStep {
  const done = completedSteps(draft);
  return RECEPTION_STEPS.find((step) => !done.has(step)) ?? 'confirmacion';
}

export function stepState(draft: ReceptionDraft, step: ReceptionStep): StepState {
  if (completedSteps(draft).has(step)) return 'completado';
  return step === currentStep(draft) ? 'en_progreso' : 'pendiente';
}

/**
 * ¿Se puede abrir este paso?
 *
 * Los terminados sí —hay que poder volver a corregir— y el actual también.
 * Los de más adelante no: saltarse el checklist y firmar deja una recepción
 * firmada sobre un estado del vehículo que nadie comprobó, y esa firma es
 * justo la que se usa cuando el cliente reclama un rayón.
 */
export function canOpen(draft: ReceptionDraft, step: ReceptionStep): boolean {
  const done = completedSteps(draft);
  if (done.has(step)) return true;
  return step === currentStep(draft);
}

/** Cuántos pasos van, para la barra de progreso. */
export function progress(draft: ReceptionDraft): { done: number; total: number; percent: number } {
  const done = completedSteps(draft).size;
  const total = RECEPTION_STEPS.length;
  return { done, total, percent: Math.round((done / total) * 100) };
}
