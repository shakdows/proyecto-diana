'use client';

import Link from 'next/link';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  ArrowRight,
  CircleAlert,
  CircleCheckBig,
  History,
  Undo2,
  Wrench,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal, ModalActions } from '@/components/ui/modal';
import { StatusChip } from '@/components/ui/status-chip';
import { OrderJourney } from '@/components/order/order-journey';
import { useToast } from '@/components/feedback/toast';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { checkDeleteCode } from '@/lib/auth/confirm-code';
import { useHydrated } from '@/lib/demo/store';
import { useOrderAdvance } from '@/features/orders/use-order-advance';
import {
  advanceRank,
  isAdvancing,
  nextStepOwner,
  ownerPhrase,
  screenFor,
  type AppliedTransition,
  type OrderAdvance,
} from '@/features/orders/services/advance';
import { ROLE_LABELS, ROLE_PERMISSIONS } from '@/lib/auth/permissions';
import { benchPhrase, type BenchState } from '@/features/orders/services/bench-facts';
import { statusLabel, type OrderStatus } from '@/features/orders/services/order-status';
import {
  ACTION_LABELS,
  allTransitions,
  availableActions,
  type Actor,
  type ActionOption,
  type OrderAction,
  type OrderFacts,
} from '@/features/orders/services/state-machine';
import { cn } from '@/lib/utils/cn';

/**
 * Avanzar la orden, de verdad.
 *
 * ── Lo que había ──────────────────────────────────────────────────────────
 *
 * La barra inferior de la orden pintaba los botones correctos —los calculaba
 * la máquina de estados, no estaban escritos a mano— y ninguno tenía nada
 * detrás. «Terminar reparación» era un `<button>` sin `onClick`. Los
 * requisitos que faltaban se enseñaban en un `title`, es decir: solo al pasar
 * el ratón por encima. En la tablet del taller, donde no hay ratón, la
 * pantalla no decía absolutamente nada sobre qué hacer a continuación.
 *
 * ── Lo que hay ────────────────────────────────────────────────────────────
 *
 * · El botón aplica la transición y la orden cambia de estado, en la ficha,
 *   en el recorrido y en el semáforo, sin recargar.
 * · Lo que falta se LEE, no se descubre pasando el ratón, y cada requisito
 *   viene con el enlace a la pantalla donde se resuelve.
 * · Cada paso deja rastro —quién, cuándo, de qué estado a cuál— y se puede
 *   deshacer el último, porque en una tablet se pulsa el botón de al lado.
 *
 * ⚠️ El estado se guarda en el navegador, no en la base de datos: es por
 * dispositivo y nadie más lo ve. La pantalla lo DICE en vez de fingir que es
 * un sistema compartido. En la Fase 2 esto pasa a ser una Server Action que
 * llama a `assertTransition` y escribe dentro de una transacción; la regla
 * —`canTransition`— ya es la misma hoy.
 */

interface AdvanceContext {
  readonly orderId: string;
  readonly status: OrderStatus;
  readonly advance: OrderAdvance;
  readonly facts: OrderFacts;
  readonly bench: BenchState | null;
  readonly orderPhotos: number;
  readonly options: readonly ActionOption[];
  readonly run: ReturnType<typeof useOrderAdvance>['run'];
  readonly undo: () => void;
  readonly hydrated: boolean;
}

const Ctx = createContext<AdvanceContext | null>(null);

function useAdvance(): AdvanceContext {
  const value = useContext(Ctx);
  if (value === null) {
    throw new Error('Falta <OrderAdvanceProvider> por encima en el árbol.');
  }
  return value;
}

export function OrderAdvanceProvider({
  orderId,
  orderCode,
  baseStatus,
  baseFacts,
  actor,
  actorName,
  children,
}: {
  readonly orderId: string;
  readonly orderCode: string;
  readonly baseStatus: OrderStatus;
  readonly baseFacts: OrderFacts;
  readonly actor: Actor;
  readonly actorName: string;
  readonly children: ReactNode;
}) {
  const { advance, facts, bench, orderPhotos, run, undo } = useOrderAdvance({
    orderId,
    orderCode,
    baseStatus,
    baseFacts,
    actor,
    actorName,
  });
  const hydrated = useHydrated();

  const options = useMemo(
    () =>
      [...availableActions(facts, actor)].sort(
        (a, b) => advanceRank(a.action) - advanceRank(b.action),
      ),
    [facts, actor],
  );

  const value = useMemo<AdvanceContext>(
    () => ({
      orderId,
      status: advance.status,
      advance,
      facts,
      bench,
      orderPhotos,
      options,
      run,
      undo,
      hydrated,
    }),
    [orderId, advance, facts, bench, orderPhotos, options, run, undo, hydrated],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/**
 * El estado al que ha llegado la orden, para quien vive dentro del proveedor.
 *
 * Lo necesita el expediente: el paso que hay que rellenar sale del ESTADO, y
 * pasarlo por propiedad desde la página significaría pasar el estado sembrado
 * —el de antes de avanzar— y quedarse siempre un paso por detrás.
 */
export function useLiveStatus(): OrderStatus {
  return useAdvance().status;
}

/**
 * Aplicar una acción desde fuera de la barra.
 *
 * Lo necesita el expediente para las tres transiciones que la barra NO pinta
 * nunca: las que tienen `permission: null`. No es un descuido de
 * `availableActions` —las omite a propósito, porque no son de un puesto del
 * taller—, sino que las da el sistema o el portal del cliente:
 *
 *   · `cliente_abrio_enlace`     la dispara el portal al abrirse.
 *   · `registrar_decision`       la escribe el cliente en el portal, o el
 *                                asesor cuando la autoriza por teléfono.
 *   · `liberar_para_reparacion`  la da el mostrador de repuestos al entregar.
 *
 * Para una orden abierta desde recepción no existe ninguna de esas pantallas,
 * así que el recorrido se quedaba clavado en «Cotización enviada» para
 * siempre: la barra decía, con razón, que no quedaba ningún paso que darle.
 * El expediente es quien las ofrece, en el paso donde tocan.
 */
export function useRunAction(): AdvanceContext['run'] {
  return useAdvance().run;
}

/**
 * Cuántas fotos lleva la orden.
 *
 * Lo necesita el expediente para no mandar a buscar una evidencia que ya
 * está: el paso de los trabajos dice cuántas hay y, si no hay ninguna,
 * enlaza al panel de fotos de esta misma pantalla.
 */
export function useOrderEvidenceCount(): number {
  return useAdvance().orderPhotos;
}

/** La insignia de la cabecera, que ahora sigue al estado real. */
export function LiveStatusChip() {
  const { status } = useAdvance();
  return <StatusChip status={status} />;
}

/** El recorrido de seis hitos, que ahora avanza al pulsar el botón. */
export function LiveJourney({
  timestamps,
}: {
  readonly timestamps: Readonly<Record<string, string>>;
}) {
  const { status } = useAdvance();
  return <OrderJourney status={status} timestamps={timestamps} />;
}

/* ------------------------------------------------------------------ *
 * La barra
 * ------------------------------------------------------------------ */

/**
 * `cancelar` se pide con clave.
 *
 * No porque la clave sea seguridad —no lo es, y el código lo dice donde se
 * define—, sino porque cancelar una orden es lo único de esta barra que no
 * tiene vuelta atrás declarada en el grafo: desde `CANCELADO` no sale ninguna
 * transición. Un toque accidental en una tablet no puede costar eso.
 */
const NEEDS_CODE: ReadonlySet<OrderAction> = new Set<OrderAction>(['cancelar']);

export function OrderActionBar({ orderId }: { readonly orderId: string }) {
  const { options, run, status, advance, undo, bench, orderPhotos, hydrated } = useAdvance();
  const toast = useToast();

  const [confirming, setConfirming] = useState<ActionOption | null>(null);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);

  const siguiente = options.find((o) => isAdvancing(o.action)) ?? null;
  const otras = options.filter((o) => o !== siguiente);

  const close = useCallback(() => {
    setConfirming(null);
    setCode('');
    setCodeError(null);
  }, []);

  const confirm = useCallback((): void => {
    if (confirming === null) return;
    if (NEEDS_CODE.has(confirming.action) && !checkDeleteCode(code)) {
      setCodeError('La clave no coincide.');
      return;
    }
    const result = run(confirming.action);
    if (result.ok) {
      toast(
        `${ACTION_LABELS[result.applied.action]} · la orden pasa a ${statusLabel(result.applied.to)}`,
        'ok',
      );
      close();
      return;
    }
    // No debería pasar —el botón solo se habilita si la acción está libre—,
    // pero si alguien cambia algo en otra pestaña entre abrir y confirmar,
    // gana la máquina de estados y se dice por qué.
    toast(result.message, 'crit');
    close();
  }, [confirming, code, run, toast, close]);

  const ultimo = advance.history.at(-1) ?? null;

  return (
    <>
      <section className="sticky bottom-0 -mx-4 border-t border-border bg-surface/95 px-4 py-3 backdrop-blur lg:-mx-6 lg:px-6">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
          {/*
            `basis-64`: en un teléfono los dos botones ocupan casi todo el
            ancho y esta columna se encogía hasta caber una palabra por línea
            —«Enviar / a / diagnóstico»—. Con una base mínima, cuando no queda
            sitio los botones bajan a la línea siguiente en vez de estrujar el
            texto que explica el paso.
          */}
          <div className="min-w-0 flex-1 basis-64 space-y-2">
            {siguiente === null ? (
              /*
                «No hay ningún paso disponible con tu rol» era un callejón sin
                salida: cierto, y aun así el asesor se quedaba sin saber por
                qué el vehículo sigue dentro. Falta la otra mitad —de quién es
                el turno—, que es lo que se necesita para ir a buscarlo.
              */
              <ElseWho orderId={orderId} status={status} />
            ) : (
              <>
                <p className="text-xs font-medium uppercase tracking-[0.06em] text-fg-subtle">
                  Siguiente paso
                </p>
                <p className="text-sm text-fg">
                  {ACTION_LABELS[siguiente.action]}{' '}
                  <span className="text-fg-muted">
                    · lleva la orden a {statusLabel(siguiente.to)}
                  </span>
                </p>

                {/*
                  Los requisitos se LEEN. Estaban en un `title`, que en una
                  tablet no existe: el asesor veía un botón apagado y ningún
                  motivo.
                */}
                {!siguiente.available && (
                  <Blockers
                    action={siguiente.action}
                    unmet={siguiente.unmet}
                    orderId={orderId}
                    bench={bench}
                    orderPhotos={orderPhotos}
                  />
                )}
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {otras.map((option) => (
              <Button
                key={option.action}
                type="button"
                variant={option.action === 'cancelar' ? 'danger' : 'secondary'}
                disabled={!option.available}
                onClick={() => setConfirming(option)}
                title={option.available ? undefined : option.unmet.join(' · ')}
              >
                {option.label}
              </Button>
            ))}

            {siguiente !== null && (
              <Button
                type="button"
                variant="primary"
                disabled={!siguiente.available}
                onClick={() => setConfirming(siguiente)}
              >
                {siguiente.label}
                <ArrowRight aria-hidden className="size-4" />
              </Button>
            )}
          </div>
        </div>

        {/*
          Deshacer vive aquí y no en el historial porque el momento en que se
          necesita es el segundo siguiente al toque equivocado, sin mover la
          vista.
        */}
        {hydrated && ultimo !== null && (
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-subtle">
            <CircleCheckBig aria-hidden className="size-3.5 text-ok-600" />
            <span>
              {ACTION_LABELS[ultimo.action]} · {statusLabel(ultimo.from)} →{' '}
              {statusLabel(ultimo.to)}
            </span>
            <button
              type="button"
              onClick={() => {
                undo();
                toast(`Deshecho: la orden vuelve a ${statusLabel(ultimo.from)}`, 'info');
              }}
              className="inline-flex items-center gap-1 font-medium text-brand-600 underline-offset-2 hover:underline"
            >
              <Undo2 aria-hidden className="size-3.5" />
              Deshacer
            </button>
          </p>
        )}
      </section>

      <Modal
        open={confirming !== null}
        onClose={close}
        width="sm"
        title={confirming === null ? '' : confirming.label}
        subtitle={
          confirming === null
            ? undefined
            : `La orden pasa de «${statusLabel(status)}» a «${statusLabel(confirming.to)}».`
        }
        onSubmit={confirm}
        footer={
          <ModalActions
            onCancel={close}
            confirmLabel={confirming === null ? 'Confirmar' : confirming.label}
            disabled={confirming !== null && NEEDS_CODE.has(confirming.action) && code === ''}
            hint="Queda registrado con tu nombre y la hora."
          />
        }
      >
        {confirming !== null && NEEDS_CODE.has(confirming.action) && (
          <>
            <p className="text-sm text-fg-muted">
              Desde «{statusLabel(confirming.to)}» no hay vuelta atrás: ninguna
              transición sale de ese estado. Escribe la clave para confirmar.
            </p>
            <Field label="Clave de confirmación" error={codeError ?? undefined}>
              <Input
                value={code}
                onChange={(e) => {
                  setCode(e.target.value);
                  setCodeError(null);
                }}
                inputMode="numeric"
                autoComplete="off"
                placeholder="••••"
              />
            </Field>
          </>
        )}

        {confirming !== null && !NEEDS_CODE.has(confirming.action) && (
          <p className="text-sm text-fg-muted">
            Se registra a tu nombre y con la hora. Si te equivocas, puedes
            deshacer el último paso desde la barra de la orden.
          </p>
        )}

        <p className="rounded-control bg-surface-sunken px-3.5 py-2.5 text-xs text-fg-subtle">
          Demostración: el estado se guarda en este navegador. Cuando haya base
          de datos, la transición la aplicará el servidor y la verá todo el
          taller.
        </p>
      </Modal>
    </>
  );
}

/** A quién le toca cuando no le toca a quien mira. */
function ElseWho({
  orderId,
  status,
}: {
  readonly orderId: string;
  readonly status: OrderStatus;
}) {
  const owner = useMemo(
    () => nextStepOwner(status, allTransitions(), ROLE_PERMISSIONS),
    [status],
  );

  if (owner === null) {
    return (
      <p className="text-sm text-fg-muted">
        La orden está en «{statusLabel(status)}»: no queda ningún paso que
        darle.
      </p>
    );
  }

  const screen = screenFor(owner.action, orderId);

  return (
    <>
      <p className="text-xs font-medium uppercase tracking-[0.06em] text-fg-subtle">
        Siguiente paso
      </p>
      <p className="text-sm text-fg">
        {ACTION_LABELS[owner.action]}{' '}
        <span className="text-fg-muted">· lleva la orden a {statusLabel(owner.to)}</span>
      </p>
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-muted">
        <span>{ownerPhrase(owner, (r) => ROLE_LABELS[r])} Tu rol no tiene ese permiso.</span>
        {screen !== null && (
          <Link
            href={screen.href}
            className="inline-flex items-center gap-1 font-semibold text-brand-700 underline-offset-2 hover:underline"
          >
            Se hace en {screen.label}
            <ArrowRight aria-hidden className="size-3" />
          </Link>
        )}
      </p>
    </>
  );
}

/** Qué falta y dónde se arregla. */
function Blockers({
  action,
  unmet,
  orderId,
  bench,
  orderPhotos,
}: {
  readonly action: OrderAction;
  readonly unmet: readonly string[];
  readonly orderId: string;
  readonly bench: BenchState | null;
  readonly orderPhotos: number;
}) {
  const screen = screenFor(action, orderId);
  const resumen = benchPhrase(bench, orderPhotos);

  return (
    <div className="rounded-control border border-warn-500/40 bg-warn-100 px-3.5 py-2.5">
      <p className="flex items-center gap-2 text-xs font-semibold text-warn-700">
        <CircleAlert aria-hidden className="size-3.5" />
        Para avanzar falta:
      </p>
      <ul className="mt-1.5 space-y-1">
        {unmet.map((item) => (
          <li key={item} className="text-xs leading-relaxed text-warn-700">
            · {item}
          </li>
        ))}
      </ul>
      {screen !== null && (
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link
            href={screen.href}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 underline-offset-2 hover:underline"
          >
            <Wrench aria-hidden className="size-3.5" />
            Se resuelve en {screen.label}
            <ArrowRight aria-hidden className="size-3" />
          </Link>
          {resumen !== null && (
            <span data-numeric className="text-xs text-warn-700">
              ({resumen})
            </span>
          )}
        </p>
      )}

      {/*
        La evidencia se puede adjuntar sin salir de aquí, y decirlo evita el
        viaje a la bahía cuando la foto ya está en el teléfono.
      */}
      {action === 'terminar_reparacion' && orderPhotos === 0 && (
        <p className="mt-1 text-xs text-warn-700">
          La foto también vale desde «Fotos del servicio», en esta misma orden.
        </p>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Historial
 * ------------------------------------------------------------------ */

/**
 * Los pasos aplicados en esta orden.
 *
 * Es el embrión de `audit_logs`: quién, qué, cuándo y de dónde a dónde. Vale
 * la pena enseñarlo ya, porque una orden que cambia de estado sin decir quién
 * la movió es exactamente la discusión que este sistema existe para evitar.
 */
export function OrderAdvanceHistory() {
  const { advance, hydrated } = useAdvance();
  if (!hydrated || advance.history.length === 0) return null;

  return (
    <section className="rounded-panel border border-border bg-surface-raised">
      <header className="flex items-center gap-2 px-5 py-4">
        <History aria-hidden className="size-4 text-fg-subtle" />
        <h2 className="font-display text-base font-semibold tracking-tight text-fg">
          Avance registrado
        </h2>
        <span data-numeric className="ml-auto text-xs text-fg-subtle">
          {advance.history.length}
        </span>
      </header>
      <ol className="px-5 pb-5">
        {[...advance.history].reverse().map((step, index) => (
          <HistoryRow key={`${step.at}-${step.action}`} step={step} first={index === 0} />
        ))}
      </ol>
      <p className="px-5 pb-4 text-xs text-fg-subtle">
        Guardado en este navegador. En producción cada línea es una fila de
        <code className="mx-1 font-mono">audit_logs</code>, con el usuario real.
      </p>
    </section>
  );
}

function HistoryRow({
  step,
  first,
}: {
  readonly step: AppliedTransition;
  readonly first: boolean;
}) {
  return (
    <li className={cn('flex gap-3 py-2.5', !first && 'border-t border-border')}>
      <span
        aria-hidden
        className="mt-1 size-2 shrink-0 rounded-full bg-brand-600"
      />
      <div className="min-w-0">
        <p className="text-sm font-medium text-fg">{ACTION_LABELS[step.action]}</p>
        <p className="text-xs text-fg-muted">
          {statusLabel(step.from)} → {statusLabel(step.to)}
        </p>
        <p data-numeric className="text-xs text-fg-subtle">
          {new Date(step.at).toLocaleString('es-PE', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          })}{' '}
          · {step.byName}
        </p>
      </div>
    </li>
  );
}
