'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
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
  ChevronUp,
  CircleAlert,
  History,
  Undo2,
  UserCog,
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
import { TECHNICIANS } from '@/features/orders/use-order-workfile';
import { continueAsDemo } from '@/app/login/actions';
import {
  buildTimeline,
  durationPhrase,
  timelinePhrase,
  type TimelineEntry,
} from '@/features/orders/services/history';
import {
  advanceRank,
  isAdvancing,
  nextStepOwner,
  ownerPhrase,
  screenFor,
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
  /**
   * Pide confirmación para una acción y, si se confirma, la aplica.
   *
   * Vive en el proveedor y no en la barra porque ahora hay DOS sitios desde
   * los que se avanza —la barra de abajo y el paso abierto del expediente— y
   * con el diálogo dentro de la barra, el botón del expediente habría tenido
   * que abrir un segundo diálogo propio. Dos diálogos para la misma
   * transición terminan divergiendo: uno pide la clave y el otro no.
   */
  readonly ask: (option: ActionOption) => void;
  readonly actor: Actor;
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

  const toast = useToast();
  const [confirming, setConfirming] = useState<ActionOption | null>(null);
  const [code, setCode] = useState('');
  const [codeError, setCodeError] = useState<string | null>(null);

  const close = useCallback(() => {
    setConfirming(null);
    setCode('');
    setCodeError(null);
  }, []);

  /**
   * Aplicar la acción. Sin ventana de por medio.
   *
   * Había un diálogo de confirmación en cada paso —«la orden pasa de X a Y,
   * ¿confirmas?»— y en un taller eso es una ventana que se cierra sin leer
   * treinta veces al día. Cuesta tiempo y no protege: quien pulsa «Enviar
   * cotización» sabe perfectamente lo que hace, y si se equivoca, deshacer
   * está en la misma barra.
   *
   * La excepción es CANCELAR, y no por costumbre: desde «Cancelado» no sale
   * ninguna transición del grafo. Ahí sí se pregunta, y con clave.
   */
  const ask = useCallback(
    (option: ActionOption) => {
      if (NEEDS_CODE.has(option.action)) {
        setConfirming(option);
        return;
      }
      const result = run(option.action);
      if (result.ok) {
        toast(
          `${ACTION_LABELS[result.applied.action]} · la orden pasa a ${statusLabel(result.applied.to)}`,
          'ok',
        );
        return;
      }
      toast([result.message, ...result.unmet].join(' · '), 'crit');
    },
    [run, toast],
  );

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
      ask,
      actor,
    }),
    [orderId, advance, facts, bench, orderPhotos, options, run, undo, hydrated, ask, actor],
  );

  return (
    <Ctx.Provider value={value}>
      {children}

      <Modal
        open={confirming !== null}
        onClose={close}
        width="sm"
        title={confirming === null ? '' : confirming.label}
        subtitle={
          confirming === null
            ? undefined
            : `La orden pasa de «${statusLabel(advance.status)}» a «${statusLabel(confirming.to)}».`
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

        <p className="rounded-control bg-surface-sunken px-3.5 py-2.5 text-xs text-fg-subtle">
          Demostración: el estado se guarda en este navegador. Cuando haya base
          de datos, la transición la aplicará el servidor y la verá todo el
          taller.
        </p>
      </Modal>
    </Ctx.Provider>
  );
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
  const { options, status, advance, undo, bench, orderPhotos, hydrated, ask } = useAdvance();
  const toast = useToast();

  /*
   * El detalle de lo que falta, plegado.
   *
   * La barra es PEGAJOSA: está siempre encima del contenido, así que cada
   * línea suya es una línea que la orden pierde. Con el recuadro de requisitos
   * desplegado medía casi doscientos píxeles —un tercio de la pantalla de un
   * portátil— y al desplazarse tapaba justo lo que se iba a leer. Ahora lo que
   * falta se resume en UNA línea, que sigue leyéndose sin pasar el ratón, y el
   * detalle completo se abre al tocarla.
   */
  const [detalle, setDetalle] = useState(false);

  const siguiente = options.find((o) => isAdvancing(o.action)) ?? null;
  const otras = options.filter((o) => o !== siguiente);
  const ultimo = advance.history.at(-1) ?? null;

  return (
    <>
      <section className="sticky bottom-0 -mx-4 border-t border-border bg-surface/95 px-4 py-2.5 backdrop-blur lg:-mx-6 lg:px-6">
        {/* El detalle se abre HACIA ARRIBA: la fila de botones no se mueve de
            sitio al desplegarlo, que es lo que hace fallar el segundo toque. */}
        {detalle && siguiente !== null && !siguiente.available && (
          <Blockers
            action={siguiente.action}
            unmet={siguiente.unmet}
            orderId={orderId}
            bench={bench}
            orderPhotos={orderPhotos}
          />
        )}

        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          {/*
            `basis-64`: en un teléfono los dos botones ocupan casi todo el
            ancho y esta columna se encogía hasta caber una palabra por línea
            —«Enviar / a / diagnóstico»—. Con una base mínima, cuando no queda
            sitio los botones bajan a la línea siguiente en vez de estrujar el
            texto que explica el paso.
          */}
          <div className="min-w-0 flex-1 basis-64 space-y-1">
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
                {/* Rótulo y acción en la MISMA línea: eran dos, y dos líneas
                    en una barra pegajosa se pagan en cada pantalla. */}
                <p className="truncate text-sm text-fg">
                  <span className="mr-2 text-xs font-medium uppercase tracking-[0.06em] text-fg-subtle">
                    Siguiente paso
                  </span>
                  {ACTION_LABELS[siguiente.action]}
                  <span className="text-fg-muted"> · a {statusLabel(siguiente.to)}</span>
                </p>

                {/*
                  Los requisitos se LEEN, y siguen leyéndose: el primero va
                  aquí en claro. Estaban en un `title`, que en una tablet no
                  existe —el asesor veía un botón apagado y ningún motivo—, y
                  luego en un recuadro de tres líneas que dejaba la barra
                  ocupando media pantalla.
                */}
                {!siguiente.available && (
                  <BlockerLine
                    unmet={siguiente.unmet}
                    abierto={detalle}
                    onToggle={() => setDetalle((d) => !d)}
                  />
                )}
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/*
              Deshacer estaba en una línea propia debajo de todo. Es un enlace
              de cuatro palabras y le costaba a la barra un renglón entero en
              todas las órdenes ya avanzadas.
            */}
            {hydrated && ultimo !== null && (
              <button
                type="button"
                onClick={() => {
                  undo();
                  toast(`Deshecho: la orden vuelve a ${statusLabel(ultimo.from)}`, 'info');
                }}
                title={`${ACTION_LABELS[ultimo.action]} · ${statusLabel(ultimo.from)} → ${statusLabel(ultimo.to)}`}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-control px-2.5 text-xs font-medium text-fg-muted transition-colors hover:bg-surface-sunken hover:text-fg"
              >
                <Undo2 aria-hidden className="size-3.5" />
                Deshacer
              </button>
            )}

            {otras.map((option) => (
              <Button
                key={option.action}
                type="button"
                variant={option.action === 'cancelar' ? 'danger' : 'secondary'}
                disabled={!option.available}
                onClick={() => ask(option)}
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
                onClick={() => ask(siguiente)}
              >
                {siguiente.label}
                <ArrowRight aria-hidden className="size-4" />
              </Button>
            )}
          </div>
        </div>

      </section>

    </>
  );
}

/**
 * El botón del paso siguiente, para usarlo FUERA de la barra.
 *
 * La barra de abajo sigue estando —es donde se mira cuando ya se conoce la
 * pantalla—, pero quien abre una orden por primera vez no la relaciona con lo
 * que acaba de rellenar setecientos píxeles más arriba. Este es el mismo
 * botón, con el mismo diálogo y la misma regla, justo debajo de lo que hay
 * que hacer.
 */
export function NextActionButton() {
  const { options, ask, facts, actor } = useAdvance();
  const pathname = usePathname();
  const siguiente = options.find((o) => isAdvancing(o.action)) ?? null;

  /*
   * El relevo al técnico asignado.
   *
   * «Solo el técnico asignado puede iniciar el diagnóstico» es correcto y, en
   * una demostración de una sola persona, un callejón sin salida: se asigna
   * la orden a Carlos y el botón se apaga para siempre. La regla no se toca
   * —el paso tiene que quedar a nombre de quien lo da—; lo que se ofrece es
   * entrar como esa persona sin salir de la pantalla.
   */
  const asignado =
    facts.assignedTechnicianId === null || facts.assignedTechnicianId === actor.profileId
      ? null
      : (TECHNICIANS.find((t) => t.id === facts.assignedTechnicianId) ?? null);

  if (siguiente === null) return null;

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="primary"
        disabled={!siguiente.available}
        onClick={() => ask(siguiente)}
      >
        {siguiente.label}
        <ArrowRight aria-hidden className="size-4" />
      </Button>

      {/* Deshabilitado y sin motivo es un callejón: el motivo va debajo, en
          claro, no en un `title` que en una tablet no existe. */}
      {!siguiente.available && (
        <ul className="space-y-1">
          {siguiente.unmet.map((u) => (
            <li key={u} className="flex items-start gap-1.5 text-xs text-warn-700">
              <CircleAlert aria-hidden className="mt-0.5 size-3.5 shrink-0" />
              {u}
            </li>
          ))}
        </ul>
      )}

      {!siguiente.available && asignado !== null && (
        <form action={continueAsDemo} className="pt-1">
          <input type="hidden" name="role" value={asignado.role} />
          <input type="hidden" name="to" value={pathname} />
          <Button type="submit" variant="secondary">
            <UserCog aria-hidden className="size-4" />
            Continuar como {asignado.name}
          </Button>
          <p className="mt-1.5 text-xs text-fg-subtle">
            Este paso lo da {asignado.name}, y queda a su nombre. En el taller
            lo haría desde su propia sesión; aquí se entra como esa persona sin
            salir de la orden.
          </p>
        </form>
      )}
    </div>
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
      {/* Rótulo y acción en la misma línea, como en el caso normal: la barra
          está encima del contenido y cada renglón se paga en cada pantalla. */}
      <p className="truncate text-sm text-fg">
        <span className="mr-2 text-xs font-medium uppercase tracking-[0.06em] text-fg-subtle">
          Siguiente paso
        </span>
        {ACTION_LABELS[owner.action]}
        <span className="text-fg-muted"> · a {statusLabel(owner.to)}</span>
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

/**
 * Lo que falta, en UNA línea.
 *
 * El primero en claro —que es el que se va a resolver— y cuántos quedan
 * detrás. Toda la información sigue estando: la línea entera es el botón que
 * abre el detalle. Lo que ya no está es el recuadro de tres renglones
 * pegajoso encima del contenido.
 */
function BlockerLine({
  unmet,
  abierto,
  onToggle,
}: {
  readonly unmet: readonly string[];
  readonly abierto: boolean;
  readonly onToggle: () => void;
}) {
  const primero = unmet[0] ?? 'Faltan requisitos.';
  const resto = unmet.length - 1;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={abierto}
      className="flex w-full min-w-0 items-center gap-1.5 rounded-control text-left text-xs text-warn-700 transition-colors hover:bg-warn-100"
    >
      <CircleAlert aria-hidden className="size-3.5 shrink-0" />
      <span className="min-w-0 flex-1 truncate">
        <span className="font-semibold">Falta:</span> {primero}
        {resto > 0 && <span className="text-warn-700/80"> · y {resto} más</span>}
      </span>
      <ChevronUp
        aria-hidden
        className={cn('size-3.5 shrink-0 transition-transform', abierto && 'rotate-180')}
      />
    </button>
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
    <div className="mb-2.5 rounded-control border border-warn-500/40 bg-warn-100 px-3.5 py-2.5">
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
export function OrderAdvanceHistory({
  openedAt,
}: {
  /** Cuándo ENTRÓ el vehículo. Sin esto la primera espera no se puede medir. */
  readonly openedAt?: Date;
}) {
  const { advance, hydrated } = useAdvance();

  /*
   * El instante se fija UNA vez por montaje: `Date.now()` en el cuerpo daría
   * un valor distinto en cada pasada y el «lleva 2 h 14 min» parpadearía.
   */
  const [ahora] = useState(() => Date.now());

  const timeline = useMemo(
    () => buildTimeline(openedAt?.getTime() ?? advance.history[0]?.at ?? ahora, advance.history, ahora),
    [openedAt, advance.history, ahora],
  );

  if (!hydrated) return null;

  return (
    <section className="rounded-panel border border-border bg-surface-raised">
      <header className="px-5 py-4">
        <div className="flex items-center gap-2">
          <History aria-hidden className="size-4 text-fg-subtle" />
          <h2 className="font-display text-base font-semibold tracking-tight text-fg">
            Historia del vehículo
          </h2>
        </div>
        {/*
          Lo primero, el dato por el que se abre esto: cuánto lleva dentro.
          Nadie lo escribe —sale de las marcas de tiempo de los pasos ya
          dados—, y por eso sirve para hablar con un cliente.
        */}
        <p className="mt-1 text-sm text-fg-muted">
          {timeline.closed ? 'Estuvo en el taller' : 'Lleva en el taller'}{' '}
          <span data-numeric className="font-semibold text-fg">
            {durationPhrase(timeline.totalMs)}
          </span>
          {advance.history.length > 0 && ` · ${timelinePhrase(timeline)}`}
        </p>
        {!timeline.closed && advance.history.length > 0 && (
          <p className="mt-0.5 text-xs text-fg-subtle">
            Sin moverse desde hace{' '}
            <span data-numeric>{durationPhrase(timeline.currentMs)}</span>.
          </p>
        )}
      </header>

      {advance.history.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-fg-subtle">
          Todavía no se ha dado ningún paso. Cada uno queda aquí con su hora,
          su duración y quién lo dio.
        </p>
      ) : (
        <ol className="px-5 pb-5">
          {[...timeline.entries].reverse().map((step, index) => (
            <HistoryRow
              key={`${step.at}-${step.action}`}
              step={step}
              first={index === 0}
              lento={timeline.slowest !== null && timeline.slowest.at === step.at}
            />
          ))}
        </ol>
      )}

      <p className="border-t border-border px-5 py-3 text-xs text-fg-subtle">
        Los tiempos se MIDEN, no se escriben: salen de la hora de cada paso.
        Guardado en este navegador; en producción cada línea es una fila de
        <code className="mx-1 font-mono">audit_logs</code>, con el usuario real.
      </p>
    </section>
  );
}

function HistoryRow({
  step,
  first,
  lento,
}: {
  readonly step: TimelineEntry;
  readonly first: boolean;
  /** El tramo más largo del recorrido. */
  readonly lento: boolean;
}) {
  return (
    <li className={cn('flex gap-3 py-2.5', !first && 'border-t border-border')}>
      <span aria-hidden className="mt-1 size-2 shrink-0 rounded-full bg-brand-600" />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-baseline gap-x-2 text-sm font-medium text-fg">
          {ACTION_LABELS[step.action]}
          <span
            data-numeric
            className={cn(
              'rounded-chip px-1.5 py-0.5 text-[0.6875rem] font-semibold',
              lento ? 'bg-warn-100 text-warn-700' : 'bg-surface-sunken text-fg-muted',
            )}
            title={lento ? 'El tramo más largo de esta orden' : 'Lo que esperó antes de este paso'}
          >
            {durationPhrase(step.waitedMs)}
            {lento && ' · el más largo'}
          </span>
        </p>
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
