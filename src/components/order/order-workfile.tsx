'use client';

import { useState } from 'react';
import { Check, CircleDot, Plus, Trash2, ThumbsDown, ThumbsUp } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/choice';
import { Field } from '@/components/ui/field';
import { Input, Select, Textarea } from '@/components/ui/input';
import { useToast } from '@/components/feedback/toast';
import {
  useLiveStatus,
  useOrderEvidenceCount,
  useRunAction,
} from '@/components/order/order-advance';
import { PRIORITIES, PRIORITY_LABELS, type Priority } from '@/features/diagnosis/services/findings';
import { FINAL_STAGE_LABELS, FINAL_STAGES, type FinalStage } from '@/features/orders/services/final-stages';
import { statusLabel } from '@/features/orders/services/order-status';
import { ACTION_LABELS, type OrderAction } from '@/features/orders/services/state-machine';
import {
  STANDARD_QUALITY_CHECKS,
  STEP_LABELS,
  WORKFILE_STEPS,
  approvedLines,
  centsFromSoles,
  decidedCount,
  minutesPhrase,
  proposedMinutes,
  requiredParts,
  stepDone,
  stepFor,
  toSoles,
  totalCents,
  type LineDecision,
  type LineKind,
  type OrderWorkfile,
  type WorkfileLine,
  type WorkfileStep,
} from '@/features/orders/services/workfile';
import { TECHNICIANS, useOrderWorkfile } from '@/features/orders/use-order-workfile';
import { useHydrated } from '@/lib/demo/store';
import { cn } from '@/lib/utils/cn';
import { formatCurrency } from '@/lib/utils/format';

/**
 * El expediente de la orden: donde se hace lo que la barra pide.
 *
 * ── El puente ──────────────────────────────────────────────────────────────
 *
 * La barra de abajo sabía decir con precisión qué faltaba —«La orden no tiene
 * técnico asignado», «Registra al menos un ítem de diagnóstico», «Hay líneas
 * sin precio»— y no había ningún sitio donde hacer nada de eso para una orden
 * abierta desde recepción: las pantallas de diagnóstico, cotización,
 * repuestos, calidad y entrega solo existen para las órdenes sembradas. El
 * recorrido se cortaba en el primer paso.
 *
 * Esto lo cierra: un paso por tramo, el del estado actual abierto, y lo que
 * se anota alimenta EXACTAMENTE los hechos que leen las guardas. No decide
 * nada —eso sigue siendo `canTransition`, y el botón sigue estando en la
 * barra—; solo da de comer a la máquina.
 *
 * ── Lo que NO es ───────────────────────────────────────────────────────────
 *
 * No sustituye a las pantallas de cada área. Cuando una orden real pase por
 * diagnóstico, el técnico trabajará en `/taller/diagnostico` con su catálogo,
 * su evidencia y sus tiempos; aquí solo está lo mínimo para que el recorrido
 * exista y se pueda ver funcionar de punta a punta.
 *
 * ⚠️ No es control de acceso: quien puede APLICAR la transición lo decide la
 * máquina de estados con los permisos del actor, y en producción lo decide
 * RLS. Esconder un campo aquí no protegería nada, así que no se finge que sí.
 */
export function OrderWorkfilePanel({ orderId }: { readonly orderId: string }) {
  const { workfile, update } = useOrderWorkfile(orderId);
  const status = useLiveStatus();
  const hydrated = useHydrated();

  const actual = stepFor(status);
  const hechos = WORKFILE_STEPS.filter((s) => stepDone(s, workfile)).length;

  return (
    <section id="expediente" className="rounded-panel border border-border bg-surface-raised">
      <header className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border px-5 py-4">
        <div className="min-w-0">
          <h2 className="font-display text-base font-semibold tracking-tight text-fg">
            Expediente de trabajo
          </h2>
          <p className="mt-0.5 text-sm text-fg-subtle">
            {actual === null
              ? `La orden está en «${statusLabel(status)}»: no hay nada que rellenar aquí.`
              : `Ahora toca: ${STEP_LABELS[actual]}.`}
          </p>
        </div>
        <span data-numeric className="text-xs text-fg-subtle">
          {hechos}/{WORKFILE_STEPS.length}
        </span>
      </header>

      <ol className="divide-y divide-border">
        {WORKFILE_STEPS.map((step, index) => {
          const done = stepDone(step, workfile);
          const current = step === actual;
          return (
            <li key={step} className={cn('px-5 py-3.5', current && 'bg-surface-sunken/60')}>
              <div className="flex items-center gap-3">
                <StepMark index={index + 1} done={done} current={current} />
                <span
                  className={cn(
                    'min-w-0 flex-1 text-sm',
                    current ? 'font-semibold text-fg' : 'text-fg-muted',
                  )}
                >
                  {STEP_LABELS[step]}
                </span>
                <span className="shrink-0 text-xs text-fg-subtle">
                  {current ? 'Ahora' : done ? 'Hecho' : 'Pendiente'}
                </span>
              </div>

              {/*
                Solo se abre el paso del estado actual. Abrirlos todos
                convertiría la ficha en un formulario de cuarenta campos donde
                el siguiente paso deja de verse, que es justo lo contrario de
                lo que hacía falta.
              */}
              {current && hydrated && (
                <div className="mt-3.5 pl-9">
                  <StepBody step={step} workfile={workfile} update={update} />
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <p className="border-t border-border px-5 py-3 text-xs text-fg-subtle">
        Lo que se anota aquí es lo que la barra de abajo comprueba antes de
        dejar avanzar. Se guarda en este navegador, como el resto de la
        demostración.
      </p>
    </section>
  );
}

function StepMark({
  index,
  done,
  current,
}: {
  readonly index: number;
  readonly done: boolean;
  readonly current: boolean;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-6 shrink-0 place-items-center rounded-full border text-[0.7rem] font-semibold',
        done && 'border-ok-600 bg-ok-600 text-white',
        !done && current && 'border-brand-600 text-brand-700',
        !done && !current && 'border-border-strong text-fg-subtle',
      )}
    >
      {done ? <Check className="size-3.5" strokeWidth={3} /> : current ? <CircleDot className="size-3.5" /> : index}
    </span>
  );
}

type Update = (fn: (previous: OrderWorkfile) => OrderWorkfile) => void;

function StepBody({
  step,
  workfile,
  update,
}: {
  readonly step: WorkfileStep;
  readonly workfile: OrderWorkfile;
  readonly update: Update;
}) {
  switch (step) {
    case 'tecnico':
      return <TechnicianStep workfile={workfile} update={update} />;
    case 'hallazgos':
      return <FindingsStep workfile={workfile} update={update} />;
    case 'precios':
      return <PricesStep workfile={workfile} update={update} />;
    case 'decision':
      return <DecisionStep workfile={workfile} update={update} />;
    case 'repuestos':
      return <PartsStep workfile={workfile} update={update} />;
    case 'tiempo':
      return <TimeStep workfile={workfile} update={update} />;
    case 'trabajos':
      return <JobsStep workfile={workfile} update={update} />;
    case 'calidad':
      return <QualityStep workfile={workfile} update={update} />;
    case 'etapas':
      return <StagesStep workfile={workfile} update={update} />;
    case 'entrega':
      return <HandoverStep workfile={workfile} update={update} />;
    default:
      return null;
  }
}

function Hint({ children }: { readonly children: ReactNode }) {
  return <p className="mt-2 text-xs leading-relaxed text-fg-subtle">{children}</p>;
}

/**
 * Las transiciones que no son de ningún puesto.
 *
 * La barra solo pinta acciones con permiso, y estas tres no lo tienen a
 * propósito: las da el portal del cliente o el mostrador. Aquí se ofrecen
 * donde corresponden, con el mismo camino que cualquier otra —`run` pregunta
 * a `canTransition` y acata—, así que si falta algo lo dice igual.
 */
function SystemAction({
  action,
  label,
  disabled = false,
}: {
  readonly action: OrderAction;
  readonly label: string;
  readonly disabled?: boolean;
}) {
  const run = useRunAction();
  const toast = useToast();

  return (
    <Button
      type="button"
      variant="primary"
      disabled={disabled}
      onClick={() => {
        const result = run(action);
        if (result.ok) {
          toast(
            `${ACTION_LABELS[result.applied.action]} · la orden pasa a ${statusLabel(result.applied.to)}`,
            'ok',
          );
          return;
        }
        toast([result.message, ...result.unmet].join(' · '), 'crit');
      }}
    >
      {label}
    </Button>
  );
}

/* ------------------------------------------------------------------ *
 * 1 · Técnico
 * ------------------------------------------------------------------ */

function TechnicianStep({
  workfile,
  update,
}: {
  readonly workfile: OrderWorkfile;
  readonly update: Update;
}) {
  const toast = useToast();

  return (
    <>
      <Field label="Técnico responsable">
        <Select
          value={workfile.technician?.id ?? ''}
          onChange={(e) => {
            const elegido = TECHNICIANS.find((t) => t.id === e.target.value) ?? null;
            update((w) => ({
              ...w,
              technician: elegido === null ? null : { id: elegido.id, name: elegido.name },
            }));
            toast(
              elegido === null ? 'Orden sin técnico asignado' : `Asignada a ${elegido.name}`,
              elegido === null ? 'info' : 'ok',
            );
          }}
        >
          <option value="">Sin asignar</option>
          {TECHNICIANS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} · {t.roleLabel}
            </option>
          ))}
        </Select>
      </Field>
      <Hint>
        El diagnóstico y la reparación solo los puede iniciar el técnico
        asignado: es una guarda de la máquina de estados, no un adorno. Para
        andarlo en la demostración, cambia de puesto en el selector de arriba y
        entra como esa persona.
      </Hint>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * 2 · Hallazgos
 * ------------------------------------------------------------------ */

function FindingsStep({
  workfile,
  update,
}: {
  readonly workfile: OrderWorkfile;
  readonly update: Update;
}) {
  const [title, setTitle] = useState('');
  const [kind, setKind] = useState<LineKind>('servicio');
  const [priority, setPriority] = useState<Priority>('medio');
  const [minutes, setMinutes] = useState('60');
  const toast = useToast();

  const limpio = title.trim();
  const valido = limpio.length >= 4;

  const add = (): void => {
    if (!valido) return;
    const line: WorkfileLine = {
      id: `w${Date.now().toString(36)}`,
      title: limpio,
      kind,
      priority,
      minutes: Math.max(0, Number.parseInt(minutes, 10) || 0),
      cents: 0,
      decision: 'pendiente',
      done: false,
    };
    update((w) => ({ ...w, lines: [...w.lines, line] }));
    setTitle('');
    toast(`Hallazgo registrado: ${limpio}`, 'ok');
  };

  return (
    <>
      <LineList
        lines={workfile.lines}
        onRemove={(id) =>
          update((w) => ({ ...w, lines: w.lines.filter((l) => l.id !== id) }))
        }
      />

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="Qué encontraste" className="sm:col-span-2">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Pastillas delanteras al límite"
          />
        </Field>
        <Field label="Tipo">
          <Select value={kind} onChange={(e) => setKind(e.target.value as LineKind)}>
            <option value="servicio">Servicio (mano de obra)</option>
            <option value="repuesto">Repuesto</option>
          </Select>
        </Field>
        <Field label="Gravedad">
          <Select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Minutos de trabajo">
          <Input
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            inputMode="numeric"
          />
        </Field>
        <div className="flex items-end">
          <Button type="button" onClick={add} disabled={!valido} variant="secondary">
            <Plus aria-hidden className="size-4" />
            Añadir hallazgo
          </Button>
        </div>
      </div>

      <Hint>
        Cada hallazgo se convierte en una línea de la cotización y, si el
        cliente la aprueba, en un trabajo que el técnico marca como hecho. Es
        la misma fila en los tres momentos: así no se pierde por el camino un
        trabajo aprobado que nadie llegó a hacer.
      </Hint>
    </>
  );
}

function LineList({
  lines,
  onRemove,
}: {
  readonly lines: readonly WorkfileLine[];
  readonly onRemove?: (id: string) => void;
}) {
  if (lines.length === 0) {
    return <p className="text-sm text-fg-subtle">Todavía no hay hallazgos registrados.</p>;
  }

  return (
    <ul className="space-y-1.5">
      {lines.map((line) => (
        <li
          key={line.id}
          className="flex items-center gap-3 rounded-control border border-border bg-surface px-3 py-2"
        >
          <span className="min-w-0 flex-1 text-sm text-fg">{line.title}</span>
          <span className="shrink-0 text-xs text-fg-subtle">
            {line.kind === 'repuesto' ? 'Repuesto' : 'Servicio'} ·{' '}
            {PRIORITY_LABELS[line.priority]} · {minutesPhrase(line.minutes)}
          </span>
          {onRemove !== undefined && (
            <button
              type="button"
              onClick={() => onRemove(line.id)}
              className="shrink-0 rounded-control p-1 text-fg-subtle transition-colors hover:bg-surface-sunken hover:text-crit-600"
              aria-label={`Quitar ${line.title}`}
            >
              <Trash2 aria-hidden className="size-4" />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ *
 * 3 · Precios
 * ------------------------------------------------------------------ */

function PricesStep({
  workfile,
  update,
}: {
  readonly workfile: OrderWorkfile;
  readonly update: Update;
}) {
  const total = totalCents(workfile.lines);

  return (
    <>
      {workfile.lines.length === 0 ? (
        <p className="text-sm text-fg-subtle">
          No hay líneas que cotizar: vuelven del diagnóstico.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {workfile.lines.map((line) => (
            <li
              key={line.id}
              className="flex flex-wrap items-center gap-3 rounded-control border border-border bg-surface px-3 py-2"
            >
              <span className="min-w-0 flex-1 text-sm text-fg">{line.title}</span>
              <PriceInput
                line={line}
                onChange={(cents) =>
                  update((w) => ({
                    ...w,
                    lines: w.lines.map((l) => (l.id === line.id ? { ...l, cents } : l)),
                  }))
                }
              />
            </li>
          ))}
        </ul>
      )}

      <p className="mt-3 flex items-baseline justify-between border-t border-border pt-3">
        <span className="text-sm text-fg-muted">Total cotizado</span>
        <span data-numeric className="font-display text-xl font-semibold text-fg">
          {formatCurrency(toSoles(total))}
        </span>
      </p>

      <Checkbox
        label="Enlace de autorización emitido al cliente"
        hint="Es el enlace del portal por el que el cliente aprueba o rechaza cada línea."
        checked={workfile.linkIssued}
        onChange={(e) => {
          const value = e.target.checked;
          update((w) => ({ ...w, linkIssued: value }));
        }}
      />
    </>
  );
}

function PriceInput({
  line,
  onChange,
}: {
  readonly line: WorkfileLine;
  readonly onChange: (cents: number) => void;
}) {
  const [raw, setRaw] = useState(line.cents === 0 ? '' : String(toSoles(line.cents)));
  const cents = centsFromSoles(raw);

  return (
    <span className="flex shrink-0 items-center gap-2">
      <span className="text-xs text-fg-subtle">S/</span>
      <Input
        value={raw}
        onChange={(e) => {
          setRaw(e.target.value);
          const leido = centsFromSoles(e.target.value);
          onChange(leido ?? 0);
        }}
        inputMode="decimal"
        placeholder="0.00"
        className="w-28"
        aria-label={`Precio de ${line.title}`}
        aria-invalid={raw.trim() !== '' && cents === null}
      />
    </span>
  );
}

/* ------------------------------------------------------------------ *
 * 4 · Decisión del cliente
 * ------------------------------------------------------------------ */

function DecisionStep({
  workfile,
  update,
}: {
  readonly workfile: OrderWorkfile;
  readonly update: Update;
}) {
  const aprobadas = approvedLines(workfile.lines);
  const decididas = decidedCount(workfile.lines);
  const status = useLiveStatus();

  const decide = (id: string, decision: LineDecision): void => {
    update((w) => ({
      ...w,
      lines: w.lines.map((l) => (l.id === id ? { ...l, decision } : l)),
    }));
  };

  return (
    <>
      <ul className="space-y-1.5">
        {workfile.lines.map((line) => (
          <li
            key={line.id}
            className="flex flex-wrap items-center gap-3 rounded-control border border-border bg-surface px-3 py-2"
          >
            <span className="min-w-0 flex-1 text-sm text-fg">{line.title}</span>
            <span data-numeric className="shrink-0 text-xs text-fg-subtle">
              {formatCurrency(toSoles(line.cents))}
            </span>
            <span className="flex shrink-0 gap-1.5">
              <DecisionButton
                active={line.decision === 'aprobado'}
                tone="ok"
                onClick={() => decide(line.id, line.decision === 'aprobado' ? 'pendiente' : 'aprobado')}
              >
                <ThumbsUp aria-hidden className="size-3.5" />
                Aprueba
              </DecisionButton>
              <DecisionButton
                active={line.decision === 'rechazado'}
                tone="crit"
                onClick={() =>
                  decide(line.id, line.decision === 'rechazado' ? 'pendiente' : 'rechazado')
                }
              >
                <ThumbsDown aria-hidden className="size-3.5" />
                Rechaza
              </DecisionButton>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {status === 'COTIZACION_ENVIADA' && (
          <SystemAction action="cliente_abrio_enlace" label="El cliente abrió el enlace" />
        )}
        <SystemAction
          action="registrar_decision"
          label="Registrar la decisión del cliente"
          disabled={decididas !== workfile.lines.length || aprobadas.length === 0}
        />
      </div>

      <p className="mt-3 text-sm text-fg-muted">
        <span data-numeric>{decididas}</span> de{' '}
        <span data-numeric>{workfile.lines.length}</span> decididas ·{' '}
        <span data-numeric>{aprobadas.length}</span> aprobadas por{' '}
        <span data-numeric>{formatCurrency(toSoles(totalCents(aprobadas)))}</span>
      </p>
      <Hint>
        Así la registra el asesor cuando el cliente contesta por teléfono; por
        el portal la escribe el propio cliente, y por eso este paso no está en
        la barra de abajo. La orden no avanza hasta que estén decididas TODAS:
        una línea sin respuesta es un trabajo que alguien va a dar por hecho.
        Si no aprueba ninguna, la salida es «Cerrar sin trabajos aprobados»,
        que sí está en la barra.
      </Hint>
    </>
  );
}

function DecisionButton({
  active,
  tone,
  onClick,
  children,
}: {
  readonly active: boolean;
  readonly tone: 'ok' | 'crit';
  readonly onClick: () => void;
  readonly children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-control border px-2.5 py-1.5 text-xs font-medium transition-colors duration-150',
        !active && 'border-border-strong bg-surface text-fg-muted hover:bg-surface-sunken',
        active && tone === 'ok' && 'border-ok-600 bg-ok-600 text-white',
        active && tone === 'crit' && 'border-crit-600 bg-crit-600 text-white',
      )}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ *
 * 5 · Repuestos y compra
 * ------------------------------------------------------------------ */

function PartsStep({
  workfile,
  update,
}: {
  readonly workfile: OrderWorkfile;
  readonly update: Update;
}) {
  const repuestos = requiredParts(workfile.lines);
  const status = useLiveStatus();

  if (repuestos.length === 0) {
    return (
      <>
        <p className="text-sm text-fg-muted">
          Ninguna línea aprobada necesita repuestos.
        </p>
        <Hint>
          La orden pasa directa a reparación con «Continuar sin repuestos». El
          tramo de compras no se recorre vacío.
        </Hint>
      </>
    );
  }

  return (
    <>
      <LineList lines={repuestos} />

      <div className="mt-2 space-y-0.5">
        <Checkbox
          label="Proveedor elegido para todas las líneas"
          hint="Compras compara ofertas y elige; no autoriza su propio gasto."
          checked={workfile.supplierChosen}
          onChange={(e) => {
            const value = e.target.checked;
            update((w) => ({ ...w, supplierChosen: value }));
          }}
        />
        <Checkbox
          label="Monto dentro del límite de quien autoriza"
          hint="Mientras no exista la tabla de límites, se registra el acto de autorizar y quién lo hizo."
          checked={workfile.purchaseApproved}
          onChange={(e) => {
            const value = e.target.checked;
            update((w) => ({ ...w, purchaseApproved: value }));
          }}
        />
        <Checkbox
          label="Orden de compra emitida al proveedor"
          checked={workfile.purchaseOrderIssued}
          onChange={(e) => {
            const value = e.target.checked;
            update((w) => ({ ...w, purchaseOrderIssued: value }));
          }}
        />
      </div>

      {status === 'REPUESTOS_COMPLETOS' && (
        <p className="mt-3">
          <SystemAction action="liberar_para_reparacion" label="Liberar para reparación" />
        </p>
      )}

      <Field label="Recepción de los repuestos" className="mt-3">
        <Select
          value={workfile.partsReceived}
          onChange={(e) => {
            const value = e.target.value as OrderWorkfile['partsReceived'];
            update((w) => ({ ...w, partsReceived: value }));
          }}
        >
          <option value="ninguno">No ha llegado nada</option>
          <option value="parcial">Llegaron algunos</option>
          <option value="completo">Llegaron todos</option>
        </Select>
      </Field>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * 6 · Tiempo estimado
 * ------------------------------------------------------------------ */

function TimeStep({
  workfile,
  update,
}: {
  readonly workfile: OrderWorkfile;
  readonly update: Update;
}) {
  const propuesto = proposedMinutes(workfile.lines);
  const [raw, setRaw] = useState(
    workfile.estimatedMinutes === null ? String(propuesto) : String(workfile.estimatedMinutes),
  );
  const minutos = Number.parseInt(raw, 10);
  const valido = Number.isFinite(minutos) && minutos > 0;
  const toast = useToast();

  return (
    <>
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Minutos de trabajo">
          <Input
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            inputMode="numeric"
            className="w-32"
          />
        </Field>
        <Button
          type="button"
          variant="secondary"
          disabled={!valido}
          onClick={() => {
            update((w) => ({ ...w, estimatedMinutes: minutos }));
            toast(`Tiempo estimado: ${minutesPhrase(minutos)}`, 'ok');
          }}
        >
          Confirmar
        </Button>
        {workfile.estimatedMinutes !== null && (
          <span className="text-sm text-fg-muted">
            Confirmado: {minutesPhrase(workfile.estimatedMinutes)}
          </span>
        )}
      </div>
      <Hint>
        Los hallazgos aprobados suman {minutesPhrase(propuesto)}. Se confirma a
        mano porque de esta cifra sale la hora que se le promete al cliente, y
        una suma automática promete lo que nadie ha mirado.
      </Hint>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * 7 · Trabajos
 * ------------------------------------------------------------------ */

function JobsStep({
  workfile,
  update,
}: {
  readonly workfile: OrderWorkfile;
  readonly update: Update;
}) {
  const aprobadas = approvedLines(workfile.lines);
  const fotos = useOrderEvidenceCount();

  return (
    <>
      <div className="space-y-0.5">
        {aprobadas.map((line) => (
          <Checkbox
            key={line.id}
            label={line.title}
            hint={`${line.kind === 'repuesto' ? 'Repuesto' : 'Servicio'} · ${minutesPhrase(line.minutes)}`}
            checked={line.done}
            onChange={(e) => {
              const value = e.target.checked;
              update((w) => ({
                ...w,
                lines: w.lines.map((l) => (l.id === line.id ? { ...l, done: value } : l)),
              }));
            }}
          />
        ))}
      </div>
      {/*
        La evidencia final se adjunta en el panel de fotos de esta misma
        pantalla, así que aquí va el enlace y no una explicación: la barra
        manda al expediente a resolver «adjunta la evidencia final», y el
        expediente tenía que saber adónde sigue.
      */}
      {fotos === 0 ? (
        <a
          href="#fotos"
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-700 underline-offset-2 hover:underline"
        >
          Adjuntar la evidencia final en «Fotos del servicio»
        </a>
      ) : (
        <p className="mt-3 text-sm text-ok-700">
          <span data-numeric>{fotos}</span>{' '}
          {fotos === 1 ? 'foto adjunta' : 'fotos adjuntas'} como evidencia final.
        </p>
      )}

      <Hint>
        Solo los trabajos APROBADOS: lo que el cliente rechazó no se hace, y
        marcarlo aquí sería cobrar por algo que no se autorizó.
      </Hint>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * 8 · Calidad
 * ------------------------------------------------------------------ */

function QualityStep({
  workfile,
  update,
}: {
  readonly workfile: OrderWorkfile;
  readonly update: Update;
}) {
  const [hallazgo, setHallazgo] = useState('');

  if (workfile.quality.length === 0) {
    return (
      <>
        <Button
          type="button"
          variant="secondary"
          onClick={() => update((w) => ({ ...w, quality: [...STANDARD_QUALITY_CHECKS] }))}
        >
          Usar el checklist estándar
        </Button>
        <Hint>
          Cinco puntos mínimos. Sin ninguno, «Aprobar control de calidad» pedía
          un checklist completo que no existía en ninguna parte.
        </Hint>
      </>
    );
  }

  return (
    <>
      <div className="space-y-0.5">
        {workfile.quality.map((check) => (
          <Checkbox
            key={check.id}
            label={check.label}
            checked={check.done}
            onChange={(e) => {
              const value = e.target.checked;
              update((w) => ({
                ...w,
                quality: w.quality.map((c) => (c.id === check.id ? { ...c, done: value } : c)),
              }));
            }}
          />
        ))}
      </div>

      <Field label="Hallazgo de calidad" className="mt-3">
        <Textarea
          value={hallazgo}
          onChange={(e) => setHallazgo(e.target.value)}
          rows={2}
          placeholder="Queda un ruido al frenar en seco"
        />
      </Field>
      <Button
        type="button"
        variant="secondary"
        disabled={hallazgo.trim().length < 4}
        onClick={() => {
          const texto = hallazgo.trim();
          update((w) => ({ ...w, qualityFindings: [...w.qualityFindings, texto] }));
          setHallazgo('');
        }}
      >
        <Plus aria-hidden className="size-4" />
        Anotar hallazgo
      </Button>

      {workfile.qualityFindings.length > 0 && (
        <ul className="mt-3 space-y-1">
          {workfile.qualityFindings.map((texto) => (
            <li key={texto} className="text-sm text-warn-700">
              · {texto}
            </li>
          ))}
        </ul>
      )}

      <Hint>
        Un hallazgo devuelve la orden al taller con «Observar control de
        calidad». Sin hallazgos, la única salida es aprobarla: calidad no
        puede rechazar sin decir qué está mal.
      </Hint>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * 9 · Servicios finales
 * ------------------------------------------------------------------ */

function StagesStep({
  workfile,
  update,
}: {
  readonly workfile: OrderWorkfile;
  readonly update: Update;
}) {
  const toggle = (stage: FinalStage, on: boolean): void => {
    update((w) => ({
      ...w,
      finalStages: on
        ? FINAL_STAGES.filter((s) => s === stage || w.finalStages.includes(s))
        : w.finalStages.filter((s) => s !== stage),
    }));
  };

  return (
    <>
      <div className="space-y-0.5">
        {FINAL_STAGES.map((stage) => (
          <Checkbox
            key={stage}
            label={FINAL_STAGE_LABELS[stage]}
            checked={workfile.finalStages.includes(stage)}
            onChange={(e) => toggle(stage, e.target.checked)}
          />
        ))}
      </div>
      <Hint>
        Sin ninguna marcada, la orden sale por «Finalizar sin servicios
        adicionales». El orden lo decide la máquina de estados, no esta lista.
      </Hint>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * 10 · Entrega
 * ------------------------------------------------------------------ */

function HandoverStep({
  workfile,
  update,
}: {
  readonly workfile: OrderWorkfile;
  readonly update: Update;
}) {
  const toast = useToast();

  if (workfile.deliverySigned) {
    return (
      <p className="text-sm text-ok-700">
        Acta de entrega firmada. El último paso lo da la barra: «Registrar
        entrega».
      </p>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        onClick={() => {
          update((w) => ({ ...w, deliverySigned: true }));
          toast('Acta de entrega firmada', 'ok');
        }}
      >
        Registrar la firma del acta
      </Button>
      <Hint>
        En la pantalla de entrega el cliente firma en el propio dispositivo y
        el acta sale en PDF. Aquí se registra el hecho —que firmó— para que el
        recorrido pueda cerrarse; la firma dibujada vive en esa pantalla.
      </Hint>
    </>
  );
}
