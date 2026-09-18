'use client';

import { useState } from 'react';
import {
  Check,
  ChevronDown,
  CircleDot,
  Minus,
  Pencil,
  Plus,
  ThumbsDown,
  ThumbsUp,
  Trash2,
  UserCheck,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/choice';
import { Field } from '@/components/ui/field';
import { Input, Select, Textarea } from '@/components/ui/input';
import { useToast } from '@/components/feedback/toast';
import {
  NextActionButton,
  useLiveStatus,
  useOrderEvidenceCount,
  useRunAction,
} from '@/components/order/order-advance';
import { PRIORITIES, PRIORITY_LABELS, type Priority } from '@/features/diagnosis/services/findings';
import {
  SERVICE_TYPES,
  checkServiceType,
} from '@/features/orders/services/from-reception';
import { FINAL_STAGE_LABELS, FINAL_STAGES, type FinalStage } from '@/features/orders/services/final-stages';
import { statusLabel } from '@/features/orders/services/order-status';
import { ACTION_LABELS, type OrderAction } from '@/features/orders/services/state-machine';
import {
  AREA_LABELS,
  AREA_WHO,
  STANDARD_QUALITY_CHECKS,
  STEP_LABELS,
  STEP_STATE_LABELS,
  WORKFILE_STEPS,
  approvedLines,
  areaOf,
  areaRuns,
  centsFromSoles,
  decidedCount,
  minutesPhrase,
  proposedMinutes,
  requiredParts,
  stepDone,
  stepFor,
  stepState,
  toSoles,
  totalCents,
  type LineDecision,
  type LineKind,
  type OrderWorkfile,
  type StepState,
  type WorkfileLine,
  type WorkfileStep,
} from '@/features/orders/services/workfile';
import {
  TECHNICIANS,
  useOrderWorkfile,
  useServiceType,
} from '@/features/orders/use-order-workfile';
import type { Permission } from '@/lib/auth/permissions';
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
export function OrderWorkfilePanel({
  orderId,
  profileId,
  actorName,
  permissions,
}: {
  readonly orderId: string;
  /** Quién está mirando: para poder asignarse la orden de un toque. */
  readonly profileId: string;
  readonly actorName: string;
  /**
   * Lo que este usuario puede hacer.
   *
   * NO es la frontera de seguridad —esconder un campo no protege nada, y la
   * frontera es RLS en la base—. Es para no PEDIRLE a la persona equivocada
   * un dato que no le toca: el precio lo pone quien vende, y el tiempo lo
   * pone quien cotiza, no quien va a trabajar esas horas.
   */
  readonly permissions: readonly Permission[];
}) {
  const { workfile, update } = useOrderWorkfile(orderId);
  const status = useLiveStatus();
  const hydrated = useHydrated();
  /*
   * La lista de los once pasos, plegada.
   *
   * Abierta era lo primero que se veía al abrir la orden: once renglones
   * donde solo uno se puede tocar. «No entiendo cómo avanzar» es exactamente
   * lo que produce eso. Ahora arriba hay UNA cosa que hacer y su botón, y la
   * lista completa —que sigue haciendo falta para ver dónde va el trabajo—
   * está a un clic.
   */
  const [lista, setLista] = useState(false);

  const actual = stepFor(status);
  const hechos = WORKFILE_STEPS.filter((s) => stepDone(s, workfile)).length;
  const puedeCotizar = permissions.includes('quotations:write');

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
              : 'Haz lo de aquí abajo y pulsa el botón. Nada más.'}
          </p>
        </div>
        <span data-numeric className="text-xs text-fg-subtle">
          {hechos}/{WORKFILE_STEPS.length}
        </span>
      </header>

      {/* ── LO QUE TOCA AHORA ─────────────────────────────────────────── */}
      {actual !== null && hydrated && (
        <div className="border-b border-border bg-surface-sunken/50 px-5 py-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-700">
            Ahora · paso {WORKFILE_STEPS.indexOf(actual) + 1} de {WORKFILE_STEPS.length}
          </p>
          <h3 className="mt-1 font-display text-xl font-semibold tracking-tight text-fg">
            {STEP_LABELS[actual]}
          </h3>
          {/* De qué área es y quién lo hace: sin esto, once pasos seguidos se
              leen como once tareas de la misma persona, y no lo son. */}
          <p className="mt-1.5 inline-flex flex-wrap items-center gap-2">
            <span className="rounded-chip bg-graphite-950 px-2 py-0.5 text-[0.6875rem] font-semibold uppercase tracking-[0.08em] text-white">
              {AREA_LABELS[areaOf(actual)]}
            </span>
            <span className="text-xs text-fg-muted">{AREA_WHO[areaOf(actual)]}</span>
          </p>

          <div className="mt-3.5">
            <StepBody
              step={actual}
              orderId={orderId}
              profileId={profileId}
              actorName={actorName}
              puedeCotizar={puedeCotizar}
              workfile={workfile}
              update={update}
            />
          </div>

          {/* Y el botón que avanza, DEBAJO de lo que hay que rellenar. Estaba
              solo en la barra de abajo, a setecientos píxeles de aquí. */}
          <div className="mt-5 border-t border-border pt-4">
            <NextActionButton />
          </div>
        </div>
      )}

      {/* ── Los once pasos, para ver por dónde va ─────────────────────── */}
      <button
        type="button"
        onClick={() => setLista((v) => !v)}
        aria-expanded={lista}
        className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left text-sm font-medium text-fg-muted transition-colors hover:bg-surface-sunken"
      >
        <span>{lista ? 'Ocultar el recorrido' : `Ver el recorrido completo (${WORKFILE_STEPS.length} pasos)`}</span>
        <ChevronDown aria-hidden className={cn('size-4 transition-transform', lista && 'rotate-180')} />
      </button>

      <div className={cn('border-t border-border', !lista && 'hidden')}>
        {areaRuns().map((run, i) => (
          <section key={`${run.area}-${String(i)}`}>
            {/* El recorrido se lee por tramos: quién hace qué, en el orden en
                que toca. Asesoría sale tres veces porque el trabajo vuelve a
                ella tres veces; ordenarlo por área contaría otra historia. */}
            <header className="flex items-baseline gap-2 border-b border-border bg-surface-sunken/40 px-5 py-2">
              <span className="text-xs font-semibold uppercase tracking-[0.08em] text-fg">
                {AREA_LABELS[run.area]}
              </span>
              <span className="text-xs text-fg-subtle">{AREA_WHO[run.area]}</span>
            </header>
            <ol className="divide-y divide-border">
              {run.steps.map((step) => {
                const estado = stepState(step, workfile);
                const current = step === actual;
                const index = WORKFILE_STEPS.indexOf(step);
                return (
                  <li key={step} className={cn('px-5 py-3.5', current && 'bg-surface-sunken/60')}>
                    <div className="flex items-center gap-3">
                      <StepMark index={index + 1} estado={estado} current={current} />
                      <span
                        className={cn(
                          'min-w-0 flex-1 text-sm',
                          current ? 'font-semibold text-fg' : 'text-fg-muted',
                        )}
                      >
                        {STEP_LABELS[step]}
                      </span>
                      <span className="shrink-0 text-xs text-fg-subtle">
                        {current ? 'Ahora' : STEP_STATE_LABELS[estado]}
                      </span>
                    </div>

                    {/* El paso actual NO se repite aquí: está arriba, con su
                        botón. Dos formularios iguales en la misma pantalla son
                        dos sitios donde escribir lo mismo y uno donde
                        equivocarse. */}
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>

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
  estado,
  current,
}: {
  readonly index: number;
  readonly estado: StepState;
  readonly current: boolean;
}) {
  /* El verde es para lo que alguien hizo. Lo que no hacía falta va en gris:
     un paso en verde que nadie tocó hace dudar de los que sí. */
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-6 shrink-0 place-items-center rounded-full border text-[0.7rem] font-semibold',
        estado === 'hecho' && 'border-ok-600 bg-ok-600 text-white',
        estado === 'sin_falta' && 'border-border-strong text-fg-subtle',
        estado === 'pendiente' && current && 'border-brand-600 text-brand-700',
        estado === 'pendiente' && !current && 'border-border-strong text-fg-subtle',
      )}
    >
      {estado === 'hecho' ? (
        <Check className="size-3.5" strokeWidth={3} />
      ) : estado === 'sin_falta' ? (
        <Minus className="size-3.5" strokeWidth={3} />
      ) : current ? (
        <CircleDot className="size-3.5" />
      ) : (
        index
      )}
    </span>
  );
}

type Update = (fn: (previous: OrderWorkfile) => OrderWorkfile) => void;

function StepBody({
  step,
  orderId,
  profileId,
  actorName,
  puedeCotizar,
  workfile,
  update,
}: {
  readonly step: WorkfileStep;
  readonly orderId: string;
  readonly profileId: string;
  readonly actorName: string;
  /** Quien cotiza pone el precio y el tiempo. Quien repara, no. */
  readonly puedeCotizar: boolean;
  readonly workfile: OrderWorkfile;
  readonly update: Update;
}) {
  switch (step) {
    case 'servicio':
      return <ServiceTypeStep orderId={orderId} />;
    case 'tecnico':
      return (
        <TechnicianStep
          workfile={workfile}
          update={update}
          profileId={profileId}
          actorName={actorName}
        />
      );
    case 'hallazgos':
      return <FindingsStep workfile={workfile} update={update} puedeCotizar={puedeCotizar} />;
    case 'precios':
      return <PricesStep workfile={workfile} update={update} puedeCotizar={puedeCotizar} />;
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
 * 1 · Tipo de servicio
 * ------------------------------------------------------------------ */

/**
 * A qué vino el vehículo.
 *
 * ── Por qué está aquí y ya no junto al título ──────────────────────────────
 *
 * Porque es una decisión, no un dato del encabezado. Estaba como un lápiz
 * pequeño al lado del nombre de la orden, y ahí confunde: parece parte de la
 * cabecera —algo que el sistema ya sabe— cuando en realidad es LO PRIMERO que
 * hay que decidir, y sin ello la máquina de estados no deja mandar la orden a
 * diagnóstico. En el expediente está donde se lee: paso uno de once.
 *
 * ── Lista corta y campo libre ──────────────────────────────────────────────
 *
 * Sin lista, cada asesor escribe el mismo trabajo de tres maneras y el
 * informe de «qué se hace más» deja de servir. Sin campo libre, el trabajo
 * raro no se puede registrar y alguien lo mete en el más parecido, que es
 * peor.
 */
function ServiceTypeStep({ orderId }: { readonly orderId: string }) {
  const { serviceType, setServiceType } = useServiceType(orderId);
  const toast = useToast();

  const enLista = SERVICE_TYPES.includes(serviceType);
  const [otro, setOtro] = useState(enLista ? '' : serviceType);
  const [escribiendo, setEscribiendo] = useState(!enLista && serviceType !== '');
  const check = checkServiceType(otro);

  const elegir = (valor: string): void => {
    setServiceType(valor);
    toast(`Tipo de servicio: ${valor}`, 'ok');
  };

  return (
    <>
      <div role="group" aria-label="Tipo de servicio" className="flex flex-wrap gap-1.5">
        {SERVICE_TYPES.map((t) => {
          const activo = serviceType === t;
          return (
            <button
              key={t}
              type="button"
              onClick={() => {
                setEscribiendo(false);
                elegir(t);
              }}
              aria-pressed={activo}
              className={cn(
                'inline-flex min-h-11 items-center rounded-control border px-3 text-sm font-medium',
                'transition-colors duration-150 ease-snap',
                activo
                  ? 'border-brand-600 bg-brand-600 text-white'
                  : 'border-border bg-surface text-fg hover:bg-surface-sunken',
              )}
            >
              {t}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setEscribiendo(true)}
          aria-pressed={escribiendo}
          className={cn(
            'inline-flex min-h-11 items-center gap-1.5 rounded-control border px-3 text-sm font-medium',
            'transition-colors duration-150 ease-snap',
            escribiendo
              ? 'border-brand-600 bg-brand-600/10 text-brand-700'
              : 'border-border bg-surface text-fg hover:bg-surface-sunken',
          )}
        >
          <Pencil aria-hidden className="size-3.5" />
          Otro
        </button>
      </div>

      {escribiendo && (
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <Field label="Describe el trabajo" error={check.error ?? undefined}>
            <Input
              value={otro}
              onChange={(e) => setOtro(e.target.value)}
              placeholder="REVISIÓN DE RUIDO EN SUSPENSIÓN DELANTERA"
              className="w-80 max-w-full"
            />
          </Field>
          <Button
            type="button"
            variant="secondary"
            disabled={!check.valid}
            onClick={() => elegir(otro.trim())}
          >
            Guardar
          </Button>
        </div>
      )}

      <Hint>
        En recepción no se sabe qué hay que hacer: lo dice el cliente al dejar
        el vehículo o el diagnóstico al revisarlo. Sin esto, «Enviar a
        diagnóstico» queda bloqueado.
      </Hint>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * 2 · Técnico
 * ------------------------------------------------------------------ */

function TechnicianStep({
  workfile,
  update,
  profileId,
  actorName,
}: {
  readonly workfile: OrderWorkfile;
  readonly update: Update;
  readonly profileId: string;
  readonly actorName: string;
}) {
  const toast = useToast();

  /*
   * Quien mira, si puede ejecutar reparaciones.
   *
   * Sin esto la pantalla era un callejón conocido: el asesor asignaba la
   * orden al primer nombre de la lista, y el botón «Iniciar diagnóstico» se
   * quedaba apagado para siempre con «Solo el técnico asignado puede iniciar
   * el diagnóstico». Cierto, y sin salida: para andarlo hay que ENTRAR como
   * esa persona. Asignársela a uno mismo es un toque y desbloquea el paso.
   */
  const yo = TECHNICIANS.find((t) => t.id === profileId) ?? null;
  const asignada = workfile.technician?.id ?? '';

  const asignar = (id: string, nombre: string): void => {
    update((w) => ({ ...w, technician: { id, name: nombre } }));
    toast(`Asignada a ${nombre}`, 'ok');
  };

  return (
    <>
      {yo !== null && asignada !== yo.id && (
        <Button
          type="button"
          variant="secondary"
          className="mb-3"
          onClick={() => asignar(yo.id, yo.name)}
        >
          <UserCheck aria-hidden className="size-4" />
          Asignármela a mí ({actorName})
        </Button>
      )}

      <Field label="Técnico responsable">
        <Select
          value={asignada}
          onChange={(e) => {
            const elegido = TECHNICIANS.find((t) => t.id === e.target.value) ?? null;
            if (elegido === null) {
              update((w) => ({ ...w, technician: null }));
              toast('Orden sin técnico asignado', 'info');
              return;
            }
            asignar(elegido.id, elegido.name);
          }}
        >
          <option value="">Sin asignar</option>
          {TECHNICIANS.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name} · {t.roleLabel}
              {t.id === profileId ? ' · TÚ' : ''}
            </option>
          ))}
        </Select>
      </Field>
      <Hint>
        El diagnóstico y la reparación solo los puede iniciar el técnico
        asignado: es una guarda de la máquina de estados, no un adorno. Si la
        asignas a otra persona, el siguiente paso lo dará ella desde su
        sesión.
      </Hint>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * 3 · Hallazgos
 * ------------------------------------------------------------------ */

function FindingsStep({
  workfile,
  update,
  puedeCotizar,
}: {
  readonly workfile: OrderWorkfile;
  readonly update: Update;
  readonly puedeCotizar: boolean;
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
      /*
       * Los minutos los pone quien COTIZA, no quien repara.
       *
       * Un técnico estimando las horas que le van a pagar es pedirle que se
       * ponga el sueldo, y el tiempo real ni siquiera hace falta pedirlo: lo
       * mide el cronómetro de la bahía. Aquí entra a cero y se rellena en el
       * paso de la cotización.
       */
      minutes: puedeCotizar ? Math.max(0, Number.parseInt(minutes, 10) || 0) : 0,
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
        conTiempo={puedeCotizar}
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
        {puedeCotizar && (
          <Field label="Minutos de trabajo" hint="Para la cotización.">
            <Input
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              inputMode="numeric"
            />
          </Field>
        )}
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
        {!puedeCotizar && (
          <>
            {' '}
            Aquí se dice QUÉ se encontró; el precio y el tiempo los pone
            asesoría al cotizar, y el tiempo real lo mide el cronómetro de la
            bahía.
          </>
        )}
      </Hint>
    </>
  );
}

function LineList({
  lines,
  onRemove,
  conTiempo = true,
}: {
  readonly lines: readonly WorkfileLine[];
  readonly onRemove?: (id: string) => void;
  /** El tiempo estimado es cosa de la cotización: no se le enseña al taller. */
  readonly conTiempo?: boolean;
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
            {PRIORITY_LABELS[line.priority]}
            {conTiempo && ` · ${minutesPhrase(line.minutes)}`}
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
 * 4 · Precios
 * ------------------------------------------------------------------ */

function PricesStep({
  workfile,
  update,
  puedeCotizar,
}: {
  readonly workfile: OrderWorkfile;
  readonly update: Update;
  readonly puedeCotizar: boolean;
}) {
  const total = totalCents(workfile.lines);

  /*
   * El precio lo ve y lo pone quien VENDE.
   *
   * Un técnico no necesita saber por cuánto se vendió lo que va a hacer, y
   * enseñárselo convierte cada orden en una conversación sobre márgenes. La
   * frontera de verdad es el permiso en el servidor; esto es no ponérselo
   * delante.
   */
  if (!puedeCotizar) {
    return (
      <>
        <LineList lines={workfile.lines} conTiempo={false} />
        <Hint>
          Los precios y el tiempo los pone asesoría. Esta orden está esperando
          esa parte; en cuanto esté cotizada y el cliente decida, vuelve al
          taller.
        </Hint>
      </>
    );
  }

  return (
    <>
      {workfile.lines.length === 0 ? (
        <p className="text-sm text-fg-subtle">
          No hay líneas que cotizar: vuelven del diagnóstico.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {workfile.lines.map((line) => (
            <PriceRow
              key={line.id}
              line={line}
              onChange={(cents, minutes) =>
                update((w) => ({
                  ...w,
                  lines: w.lines.map((l) => (l.id === line.id ? { ...l, cents, minutes } : l)),
                }))
              }
            />
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

/**
 * Una línea con su precio: PUESTO, no en un campo abierto.
 *
 * El precio de un trabajo no es una opinión que se teclea cada vez: está
 * establecido, y por eso se lee como texto. Cambiarlo es un acto aparte —el
 * botón «Editar»—, que además es el que dejará rastro el día que el precio
 * venga de la tarifa y alguien haga una excepción.
 *
 * Mientras no exista esa tarifa en el sistema, la primera vez hay que
 * ponerlo: el botón lo dice, «Poner precio», en vez de fingir un valor por
 * defecto que nadie ha decidido.
 */
function PriceRow({
  line,
  onChange,
}: {
  readonly line: WorkfileLine;
  readonly onChange: (cents: number, minutes: number) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [raw, setRaw] = useState(line.cents === 0 ? '' : String(toSoles(line.cents)));
  const [min, setMin] = useState(String(line.minutes));

  const cents = centsFromSoles(raw);
  const minutos = Number.parseInt(min, 10);
  const valido = cents !== null && Number.isFinite(minutos) && minutos >= 0;

  const guardar = (): void => {
    if (!valido) return;
    onChange(cents, minutos);
    setEditando(false);
  };

  if (!editando) {
    return (
      <li className="flex flex-wrap items-center gap-3 rounded-control border border-border bg-surface px-3 py-2">
        <span className="min-w-0 flex-1 text-sm text-fg">{line.title}</span>
        <span className="shrink-0 text-right">
          <span data-numeric className="block text-sm font-semibold text-fg">
            {line.cents === 0 ? 'Sin precio' : formatCurrency(toSoles(line.cents))}
          </span>
          <span data-numeric className="block text-xs text-fg-subtle">
            {minutesPhrase(line.minutes)}
          </span>
        </span>
        <button
          type="button"
          onClick={() => setEditando(true)}
          className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-control border border-border-strong px-3 text-xs font-medium text-fg transition-colors hover:bg-surface-sunken"
        >
          <Pencil aria-hidden className="size-3.5" />
          {line.cents === 0 ? 'Poner precio' : 'Editar'}
        </button>
      </li>
    );
  }

  return (
    <li className="rounded-control border border-brand-600 bg-surface px-3 py-3">
      <p className="text-sm font-medium text-fg">{line.title}</p>
      <div className="mt-2 flex flex-wrap items-end gap-3">
        <Field label="Precio (S/)">
          <Input
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            inputMode="decimal"
            placeholder="0.00"
            className="w-32"
            aria-label={`Precio de ${line.title}`}
            aria-invalid={raw.trim() !== '' && cents === null}
          />
        </Field>
        <Field label="Minutos">
          <Input
            value={min}
            onChange={(e) => setMin(e.target.value)}
            inputMode="numeric"
            className="w-24"
            aria-label={`Minutos de ${line.title}`}
          />
        </Field>
        <Button type="button" variant="secondary" disabled={!valido} onClick={guardar}>
          Guardar
        </Button>
        <Button type="button" variant="ghost" onClick={() => setEditando(false)}>
          Cancelar
        </Button>
      </div>
    </li>
  );
}

/* ------------------------------------------------------------------ *
 * 5 · Decisión del cliente
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
 * 6 · Repuestos y compra
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
 * 7 · Tiempo estimado
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
 * 8 · Trabajos
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
 * 9 · Calidad
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
 * 10 · Servicios finales
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
 * 11 · Entrega
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
