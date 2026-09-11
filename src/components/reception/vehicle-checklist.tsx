'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Camera, Check, ChevronDown, Save, TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChoiceBar } from '@/components/ui/choice';
import { Field } from '@/components/ui/field';
import { Input, Textarea } from '@/components/ui/input';
import { ProgressBar } from '@/components/ui/progress-bar';
import {
  CHECKLIST,
  FLUID_LABELS,
  FLUID_LEVELS,
  FUEL_LABELS,
  FUEL_LEVELS,
  MIN_TREAD_MM,
  isResolved,
  overallProgress,
  sectionProgress,
  tyresBelowMinimum,
  type ChecklistItem,
  type ChecklistState,
  type ItemResult,
} from '@/features/reception/services/checklist';
import type { DamageMark } from '@/features/reception/services/damage-map';
import { usePersistentState } from '@/lib/demo/store';
import { DamageDiagram } from './damage-diagram';
import { cn } from '@/lib/utils/cn';

const STORAGE_KEY = 'diana:recepcion-checklist';

/**
 * Checklist de recepción.
 *
 * Pensado para una tablet sostenida con una mano: los tres botones de
 * respuesta miden 44 px y ocupan el ancho, en vez de tres círculos de radio
 * de 20 px que hay que acertar de pie junto al vehículo.
 *
 * La observación y la foto aparecen SOLO al marcar «no conforme». Mostrarlas
 * siempre convierte 42 puntos en 126 campos y nadie llega al final.
 */
export function VehicleChecklist({
  vehicle,
  plate,
}: {
  readonly vehicle: string;
  readonly plate: string;
}) {
  const [state, setState] = useState<ChecklistState>({});
  /* Los daños se guardan igual que el resto del trabajo de la demostración:
     quien deja la recepción a medias y vuelve, la encuentra como estaba. */
  const [damage, setDamage] = usePersistentState<readonly DamageMark[]>(
    `recepcion.${plate}.danos`,
    [],
  );
  const [open, setOpen] = useState<string>(CHECKLIST[0]?.id ?? '');
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    let saved: ChecklistState = {};
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw !== null) saved = JSON.parse(raw) as ChecklistState;
    } catch {
      /* Borrador ilegible: se empieza limpio. */
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect -- hidratación de `localStorage`, que no existe en el servidor
    setState(saved);
    setRestored(true);
  }, []);

  useEffect(() => {
    if (!restored) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* Sin almacenamiento se pierde al recargar; no bloquea el trabajo. */
    }
  }, [state, restored]);

  const patch = (id: string, change: Partial<ItemResult>): void =>
    setState((s) => ({ ...s, [id]: { ...s[id], ...change } }));

  const p = overallProgress(state);
  const lowTyres = tyresBelowMinimum(state);

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-fg lg:text-[1.75rem]">
            Checklist del vehículo
          </h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-fg-muted">
            <span>{vehicle}</span>
            <span className="inline-flex rounded-chip border border-border-strong bg-surface px-2 py-0.5 font-mono text-xs font-bold tracking-[0.06em] text-fg">
              {plate}
            </span>
          </p>
        </div>

        <div className="min-w-[14rem] flex-1 sm:max-w-xs">
          <p className="flex items-baseline justify-between text-sm">
            <span className="text-fg-muted">Revisados</span>
            <span data-numeric className="font-semibold text-fg">
              {p.done} / {p.total}
            </span>
          </p>
          <ProgressBar
            percent={p.percent}
            label="Avance del checklist"
            showValue={false}
            className="mt-1.5"
          />
        </div>
      </header>

      {lowTyres.length > 0 && (
        <p className="flex items-start gap-3 rounded-panel border border-warn-500/30 bg-warn-100 px-4 py-3">
          <TriangleAlert aria-hidden className="mt-0.5 size-5 shrink-0 text-warn-600" />
          <span className="text-sm text-warn-700">
            <span className="font-semibold">
              {lowTyres.length === 1
                ? 'Un neumático por debajo del mínimo legal'
                : `${lowTyres.length} neumáticos por debajo del mínimo legal`}
            </span>{' '}
            ({MIN_TREAD_MM} mm): {lowTyres.map((t) => t.label.toLowerCase()).join(', ')}. No
            bloquea la recepción; entra como recomendación.
          </span>
        </p>
      )}

      {/* Antes de las 42 comprobaciones: el estado en que llega la carrocería.
          Va primero porque es lo que se mira dando una vuelta al vehículo, que
          es lo primero que hace el asesor al recibirlo. */}
      <DamageDiagram marks={damage} onChange={setDamage} />

      <div className="space-y-3">
        {CHECKLIST.map((section) => {
          const sp = sectionProgress(section, state);
          const complete = sp.done === sp.total;
          const expanded = open === section.id;

          return (
            <section
              key={section.id}
              className="overflow-hidden rounded-panel border border-border bg-surface-raised"
            >
              <h2>
                <button
                  type="button"
                  onClick={() => setOpen(expanded ? '' : section.id)}
                  aria-expanded={expanded}
                  className="flex w-full items-center gap-3 px-5 py-4 text-left transition-colors duration-150 hover:bg-surface-sunken"
                >
                  <span
                    aria-hidden
                    className={cn(
                      'grid size-7 shrink-0 place-items-center rounded-full',
                      complete ? 'bg-ok-500 text-white' : 'bg-surface-sunken text-fg-subtle',
                    )}
                  >
                    {complete ? (
                      <Check className="size-4" strokeWidth={3} />
                    ) : (
                      <span data-numeric className="text-[0.625rem] font-bold">
                        {sp.done}
                      </span>
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block font-display text-base font-semibold tracking-tight text-fg">
                      {section.label}
                    </span>
                  </span>

                  <span
                    data-numeric
                    className={cn(
                      'shrink-0 text-sm font-medium',
                      complete ? 'text-ok-700' : 'text-fg-subtle',
                    )}
                  >
                    {sp.done} / {sp.total}
                  </span>

                  <ChevronDown
                    aria-hidden
                    className={cn(
                      'size-4 shrink-0 text-fg-subtle transition-transform duration-200 ease-snap',
                      expanded && 'rotate-180',
                    )}
                  />
                </button>
              </h2>

              {expanded && (
                <ul className="divide-y divide-border border-t border-border">
                  {section.items.map((item) => (
                    <li key={item.id} className="px-5 py-4">
                      <ChecklistRow
                        item={item}
                        result={state[item.id]}
                        onChange={(change) => patch(item.id, change)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>

      <section className="sticky bottom-0 -mx-4 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur lg:-mx-6 lg:px-6">
        <Button type="button" variant="ghost" size="sm">
          <Save aria-hidden className="size-4" />
          Guardar borrador
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/recepcion/nueva"
            className="inline-flex h-11 items-center gap-2 rounded-control border border-border-strong bg-surface-raised px-4 text-sm font-medium text-fg transition-colors duration-150 hover:bg-surface-sunken"
          >
            <ArrowLeft aria-hidden className="size-4" />
            Anterior
          </Link>
          <Button
            type="button"
            disabled={p.done < p.total}
            title={
              p.done < p.total
                ? `Faltan ${p.total - p.done} puntos por revisar`
                : undefined
            }
          >
            Continuar a daños
            <ArrowRight aria-hidden className="size-4" />
          </Button>
        </div>
      </section>
    </>
  );
}

function ChecklistRow({
  item,
  result,
  onChange,
}: {
  readonly item: ChecklistItem;
  readonly result: ItemResult | undefined;
  readonly onChange: (change: Partial<ItemResult>) => void;
}) {
  const resolved = isResolved(item, result);
  const failed = result?.answer === 'no_conforme';

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <p className="flex min-w-0 items-center gap-2 text-sm font-medium text-fg">
          <span
            aria-hidden
            className={cn(
              'size-1.5 shrink-0 rounded-full',
              resolved ? 'bg-ok-500' : 'bg-graphite-300',
            )}
          />
          {item.label}
        </p>

        <div className="w-full sm:w-auto sm:min-w-[19rem]">
          {item.kind === 'estado' && (
            <ChoiceBar
              name={item.label}
              value={result?.answer}
              onSelect={(value) => onChange({ answer: value as ItemResult['answer'] })}
              options={[
                { value: 'ok', label: 'OK', tone: 'ok' },
                { value: 'no_conforme', label: 'No conforme', tone: 'crit' },
                { value: 'no_aplica', label: 'N/A' },
              ]}
            />
          )}

          {item.kind === 'nivel_combustible' && (
            <ChoiceBar
              name={item.label}
              value={result?.level}
              onSelect={(value) => onChange({ level: value })}
              options={FUEL_LEVELS.map((level) => ({ value: level, label: FUEL_LABELS[level] }))}
            />
          )}

          {item.kind === 'nivel_fluido' && (
            <ChoiceBar
              name={item.label}
              value={result?.level}
              onSelect={(value) => onChange({ level: value })}
              options={FLUID_LEVELS.map((level) => ({ value: level, label: FLUID_LABELS[level] }))}
            />
          )}

          {item.kind === 'profundidad' && (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                inputMode="decimal"
                min={0}
                max={20}
                step={0.5}
                aria-label={`Profundidad de ${item.label} en milímetros`}
                value={result?.depthMm ?? ''}
                onChange={(e) =>
                  onChange({
                    depthMm: e.target.value === '' ? undefined : Number(e.target.value),
                  })
                }
                className="max-w-28"
              />
              <span className="text-sm text-fg-subtle">mm</span>
            </div>
          )}
        </div>
      </div>

      {/*
        Aparece SOLO al marcar «no conforme». Un daño anotado sin describir no
        prueba nada, y por eso el punto no se da por resuelto hasta que hay
        texto: es lo que sostiene la firma del cliente dos meses después.
      */}
      {failed && (
        <div className="mt-3 animate-rise-in space-y-3 rounded-control border border-crit-500/25 bg-crit-100/40 p-3.5">
          <Field
            label="Observación"
            required
            error={
              (result?.note ?? '').trim() === ''
                ? 'Describe qué encontraste: sin esto el punto queda sin resolver.'
                : undefined
            }
          >
            <Textarea
              rows={2}
              value={result?.note ?? ''}
              onChange={(e) => onChange({ note: e.target.value })}
              placeholder="Ej. rayón de 10 cm en la puerta delantera derecha"
            />
          </Field>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => onChange({ photoCount: (result?.photoCount ?? 0) + 1 })}
          >
            <Camera aria-hidden className="size-3.5" />
            Agregar foto
            {(result?.photoCount ?? 0) > 0 && (
              <span data-numeric className="ml-1 text-fg-subtle">
                ({result?.photoCount})
              </span>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
