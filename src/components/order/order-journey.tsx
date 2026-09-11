import { Check } from 'lucide-react';
import { STATUS_LABELS, type OrderStatus } from '@/features/orders/services/order-status';
import { cn } from '@/lib/utils/cn';

/**
 * Recorrido de la orden.
 *
 * Seis hitos, no treinta y cuatro. La máquina de estados tiene 34 estados
 * porque el taller necesita esa precisión para decidir qué se puede hacer;
 * quien mira la orden necesita saber POR DÓNDE VA, y para eso seis puntos son
 * la respuesta y treinta y cuatro son ruido.
 *
 * El mapa de estado a hito está declarado abajo, y el hito actual se resuelve
 * desde el estado real: no hay un campo «etapa» que alguien pueda dejar
 * desincronizado con el estado verdadero.
 */

export interface JourneyStep {
  readonly key: string;
  readonly label: string;
  readonly statuses: readonly OrderStatus[];
}

const STEPS: readonly JourneyStep[] = [
  { key: 'recepcion', label: 'Recepción', statuses: ['DRAFT', 'RECEPCIONADO', 'CHECKLIST_COMPLETADO'] },
  {
    key: 'diagnostico',
    label: 'Diagnóstico',
    statuses: [
      'PENDIENTE_DIAGNOSTICO',
      'EN_DIAGNOSTICO',
      'DIAGNOSTICO_COMPLETADO',
      'COTIZACION_EN_PREPARACION',
      'COTIZACION_ENVIADA',
      'ESPERANDO_CLIENTE',
      'APROBACION_PARCIAL',
      'APROBADO',
    ],
  },
  {
    key: 'proceso',
    label: 'En proceso',
    statuses: [
      'SOLICITUD_REPUESTOS',
      'REPUESTOS_EN_COTIZACION',
      'COMPRA_PENDIENTE_AUTORIZACION',
      'COMPRA_AUTORIZADA',
      'ORDEN_COMPRA_GENERADA',
      'ESPERANDO_REPUESTOS',
      'REPUESTOS_PARCIALES',
      'REPUESTOS_COMPLETOS',
      'LISTO_PARA_REPARACION',
      'EN_REPARACION',
      'REPARACION_PAUSADA',
      'REPARACION_TERMINADA',
    ],
  },
  {
    key: 'calidad',
    label: 'Control de calidad',
    statuses: ['CONTROL_CALIDAD', 'OBSERVADO_CONTROL_CALIDAD', 'CONTROL_CALIDAD_APROBADO'],
  },
  {
    key: 'finales',
    label: 'Listo para entrega',
    statuses: [
      'PENDIENTE_LAVADO',
      'EN_LAVADO',
      'PENDIENTE_ALINEAMIENTO',
      'EN_ALINEAMIENTO',
      'LISTO_PARA_ENTREGA',
    ],
  },
  { key: 'entrega', label: 'Entregado', statuses: ['ENTREGADO', 'CERRADO'] },
];

export function currentStepIndex(status: OrderStatus): number {
  const index = STEPS.findIndex((step) => step.statuses.includes(status));
  return index === -1 ? 0 : index;
}

export function OrderJourney({
  status,
  timestamps,
}: {
  readonly status: OrderStatus;
  /** Hora de cada hito ya alcanzado, por clave. */
  readonly timestamps: Readonly<Record<string, string>>;
}) {
  const current = currentStepIndex(status);

  return (
    <ol className="flex min-w-0 gap-1 overflow-x-auto pb-1">
      {STEPS.map((step, index) => {
        const done = index < current;
        const active = index === current;
        const at = timestamps[step.key];

        return (
          <li key={step.key} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <span className="flex w-full items-center gap-1">
              <span
                aria-hidden
                className={cn(
                  'h-0.5 flex-1 rounded-full',
                  index === 0 ? 'opacity-0' : done || active ? 'bg-brand-600' : 'bg-border',
                )}
              />
              <span
                aria-hidden
                className={cn(
                  'grid size-6 shrink-0 place-items-center rounded-full transition-colors duration-150',
                  done && 'bg-brand-600 text-white',
                  active && 'border-[5px] border-brand-600 bg-surface',
                  !done && !active && 'border-2 border-border bg-surface',
                )}
              >
                {done && <Check className="size-3.5" strokeWidth={3} />}
              </span>
              <span
                aria-hidden
                className={cn(
                  'h-0.5 flex-1 rounded-full',
                  index === STEPS.length - 1 ? 'opacity-0' : done ? 'bg-brand-600' : 'bg-border',
                )}
              />
            </span>

            <span className="min-w-0 text-center">
              <span
                className={cn(
                  'block truncate px-1 text-xs',
                  active ? 'font-semibold text-fg' : done ? 'text-fg-muted' : 'text-fg-subtle',
                )}
              >
                {step.label}
              </span>
              {at !== undefined && (
                <span data-numeric className="block text-[0.625rem] text-fg-subtle">
                  {at}
                </span>
              )}
            </span>

            <span className="sr-only">
              {done ? 'completado' : active ? `en curso: ${STATUS_LABELS[status]}` : 'pendiente'}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
