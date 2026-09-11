import { Check } from 'lucide-react';
import {
  RECEPTION_STEPS,
  STEP_LABELS,
  canOpen,
  stepState,
  type ReceptionDraft,
} from '@/features/reception/services/steps';
import { cn } from '@/lib/utils/cn';

/**
 * Los siete pasos de la recepción.
 *
 * Un paso al que todavía no se puede llegar se dibuja apagado y NO es
 * pulsable. No es cosmética: saltarse el checklist y firmar deja una firma
 * del cliente sobre un estado del vehículo que nadie comprobó, y esa firma es
 * justo la que se saca cuando alguien reclama un rayón.
 */
export function ReceptionStepper({
  draft,
  onGo,
}: {
  readonly draft: ReceptionDraft;
  readonly onGo?: (index: number) => void;
}) {
  return (
    <ol className="flex min-w-0 gap-1 overflow-x-auto">
      {RECEPTION_STEPS.map((step, index) => {
        const state = stepState(draft, step);
        const open = canOpen(draft, step);
        const last = index === RECEPTION_STEPS.length - 1;

        return (
          <li key={step} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <span className="flex w-full items-center gap-1">
              <span
                aria-hidden
                className={cn(
                  'h-0.5 flex-1 rounded-full',
                  index === 0 ? 'opacity-0' : state === 'pendiente' ? 'bg-border' : 'bg-brand-600',
                )}
              />
              <button
                type="button"
                disabled={!open}
                onClick={() => onGo?.(index)}
                aria-current={state === 'en_progreso' ? 'step' : undefined}
                className={cn(
                  'grid size-9 shrink-0 place-items-center rounded-full text-sm font-semibold',
                  'transition-colors duration-150 ease-snap',
                  state === 'completado' && 'bg-brand-600 text-white',
                  state === 'en_progreso' && 'bg-brand-600 text-white ring-4 ring-brand-100',
                  state === 'pendiente' && 'border-2 border-border bg-surface text-fg-subtle',
                  open ? 'cursor-pointer' : 'cursor-not-allowed',
                )}
              >
                {state === 'completado' ? (
                  <Check aria-hidden className="size-4" strokeWidth={3} />
                ) : (
                  <span data-numeric>{index + 1}</span>
                )}
                <span className="sr-only">
                  {STEP_LABELS[step]} — {state.replace('_', ' ')}
                </span>
              </button>
              <span
                aria-hidden
                className={cn(
                  'h-0.5 flex-1 rounded-full',
                  last ? 'opacity-0' : state === 'completado' ? 'bg-brand-600' : 'bg-border',
                )}
              />
            </span>

            <span
              aria-hidden
              className={cn(
                'block truncate px-1 text-center text-xs',
                state === 'en_progreso' ? 'font-semibold text-fg' : 'text-fg-subtle',
              )}
            >
              {STEP_LABELS[step]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
