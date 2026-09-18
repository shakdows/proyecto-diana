'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  ClipboardCheck,
  FileText,
  KeyRound,
  Lightbulb,
  Receipt,
  ShieldCheck,
  ShoppingCart,
  Stethoscope,
  UserRound,
  Wrench,
  X,
} from 'lucide-react';
import type { ReactNode } from 'react';
import {
  ROUTE_STEPS,
  STATE_LABELS,
  TERMINADO,
  progressOf,
  rolesOf,
  stateOf,
  stepForStatus,
  stepNumber,
  type RoutePosition,
  type RouteStep,
  type RouteStepId,
} from '@/features/dashboard/services/route-board';
import {
  advanceRank,
  isAdvancing,
  nextStepOwner,
  ownerPhrase,
  screenFor,
} from '@/features/orders/services/advance';
import { ORDER_STATUSES, statusLabel } from '@/features/orders/services/order-status';
import {
  allTransitions,
  availableActions,
  ACTION_LABELS,
  type Actor,
  type OrderFacts,
} from '@/features/orders/services/state-machine';
import { useOrderAdvance } from '@/features/orders/use-order-advance';
import { useReceptionOrders } from '@/features/orders/use-reception-orders';
import { ROLE_LABELS, ROLE_PERMISSIONS, type Permission, type RoleCode } from '@/lib/auth/permissions';
import { useHydrated } from '@/lib/demo/store';
import { cn } from '@/lib/utils/cn';

/**
 * La ruta del trabajo, en el tablero.
 *
 * ── Lo que resuelve ────────────────────────────────────────────────────────
 *
 * El tablero abría siete módulos y no decía en qué orden se usan. Quien
 * registraba un cliente y recibía el vehículo se quedaba sin saber a dónde ir
 * —lo preguntó tal cual—, porque el recorrido existía en la máquina de
 * estados y en ninguna pantalla.
 *
 * Ahora está: nueve cuadros de izquierda a derecha y de arriba abajo, el
 * cuadro donde está el vehículo marcado, y un botón que APAGA todo lo demás y
 * dice exactamente qué falta para pasar al siguiente.
 *
 * ── De dónde sale lo que falta ─────────────────────────────────────────────
 *
 * De la misma máquina de estados que gobierna la orden, no de una lista
 * escrita aquí. Si mañana una guarda cambia, este cuadro lo dice solo. Es la
 * razón de que el texto sea idéntico al de la barra de la orden: es el mismo
 * requisito, leído en el mismo sitio.
 *
 * ⚠️ Sigue la ÚLTIMA orden abierta desde recepción, que es la que se acaba de
 * crear y por la que se pregunta. Las demás siguen en Órdenes.
 */

/** Hechos de relleno mientras no hay ninguna orden que seguir. */
const SIN_ORDEN: OrderFacts = {
  status: 'DRAFT',
  hasCustomer: false,
  hasVehicle: false,
  hasServiceType: false,
  requiredChecklistItems: 0,
  resolvedChecklistItems: 0,
  hasCustomerSignature: false,
  hasAdvisorSignature: false,
  assignedTechnicianId: null,
  diagnosticItemCount: 0,
  quotationLineCount: 0,
  quotationLinesPriced: 0,
  authorizationLinkIssued: false,
  decidedItemCount: 0,
  approvedItemCount: 0,
  requiredPartsCount: 0,
  partsCoverageComplete: false,
  partsRequestPending: false,
  supplierLinesAllSelected: false,
  purchaseWithinAuthorizerLimit: false,
  purchaseOrderIssued: false,
  estimatedMinutes: null,
  repairJobsTotal: 0,
  repairJobsDone: 0,
  hasOpenTimeSession: false,
  hasFinalEvidence: false,
  qualityChecklistComplete: false,
  qualityFindingCount: 0,
  pendingFinalStages: [],
  deliveryActSigned: false,
  hasOpenTasks: false,
};

/**
 * Qué puesto trabaja cada cuadro.
 *
 * Se calcula UNA vez, al cargar el módulo: sale de la tabla de transiciones y
 * de los permisos, que no cambian en ejecución. Y sale de ahí —y no de una
 * lista escrita a mano— para que el día que un rol gane o pierda un permiso,
 * el tablero lo diga solo.
 */
const PUESTOS: Readonly<Record<RouteStepId, readonly RoleCode[]>> = Object.fromEntries(
  ROUTE_STEPS.map((s) => [
    s.id,
    rolesOf(s.id, allTransitions(), ROLE_PERMISSIONS, ORDER_STATUSES),
  ]),
) as Record<RouteStepId, readonly RoleCode[]>;

const ICONOS: Readonly<Record<RouteStepId, ReactNode>> = {
  cliente: <UserRound className="size-5" />,
  recepcion: <ClipboardCheck className="size-5" />,
  orden: <FileText className="size-5" />,
  diagnostico: <Stethoscope className="size-5" />,
  cotizacion: <Receipt className="size-5" />,
  repuestos: <ShoppingCart className="size-5" />,
  reparacion: <Wrench className="size-5" />,
  calidad: <ShieldCheck className="size-5" />,
  entrega: <KeyRound className="size-5" />,
};

export function RouteBoard({
  profileId,
  permissions,
  actorName,
}: {
  readonly profileId: string;
  readonly permissions: readonly Permission[];
  readonly actorName: string;
}) {
  const hydrated = useHydrated();
  const ordenes = useReceptionOrders();
  const [marcando, setMarcando] = useState(false);

  /* La más reciente: la que se acaba de recibir y por la que se pregunta. */
  const objetivo = ordenes[0] ?? null;

  const actor = useMemo<Actor>(() => ({ profileId, permissions }), [profileId, permissions]);

  /*
   * El hook se llama SIEMPRE, con o sin orden: llamarlo solo cuando hay una
   * rompería la regla de los hooks en cuanto se cierre la primera recepción.
   * Sin orden lee ranuras vacías, que es justo lo que hay.
   */
  const { facts } = useOrderAdvance({
    orderId: objetivo?.row.order.id ?? 'sin-orden',
    orderCode: objetivo?.row.order.code ?? 'sin-orden',
    baseStatus: objetivo?.row.order.status ?? 'DRAFT',
    baseFacts: objetivo?.facts ?? SIN_ORDEN,
    actor,
    actorName,
  });

  const position: RoutePosition | null =
    objetivo === null || !hydrated ? null : stepForStatus(facts.status);

  const avance = progressOf(position);

  /* Lo que falta, preguntado a la misma máquina que gobierna la orden. */
  const pendiente = useMemo(() => {
    if (objetivo === null) {
      return {
        titulo: 'Empieza por registrar al cliente',
        faltan: [
          'Registra al cliente y su vehículo en Clientes.',
          'Después recíbelo en Recepción: checklist, fotos y firma.',
        ],
        href: '/clientes',
        etiqueta: 'Ir a Clientes',
      };
    }

    const orderId = objetivo.row.order.id;
    const opciones = [...availableActions(facts, actor)].sort(
      (a, b) => advanceRank(a.action) - advanceRank(b.action),
    );
    const siguiente = opciones.find((o) => isAdvancing(o.action)) ?? null;

    if (siguiente === null) {
      /* Nadie con este rol puede darle el siguiente paso: se dice de quién es. */
      const owner = nextStepOwner(facts.status, allTransitions(), ROLE_PERMISSIONS);
      return {
        titulo:
          owner === null
            ? `La orden está en «${statusLabel(facts.status)}»: no queda paso que darle.`
            : `Siguiente paso: ${ACTION_LABELS[owner.action]}`,
        faltan:
          owner === null
            ? []
            : [`${ownerPhrase(owner, (r) => ROLE_LABELS[r])} Tu rol no tiene ese permiso.`],
        href: `/ordenes/${orderId}`,
        etiqueta: 'Abrir la orden',
      };
    }

    /*
     * El destino sale de la ACCIÓN, no del texto del requisito. Un ancla
     —«#expediente»— cuelga de la orden; una ruta propia va tal cual.
     */
    const pantalla = screenFor(siguiente.action, orderId);
    const destino =
      pantalla === null
        ? `/ordenes/${orderId}`
        : pantalla.href.startsWith('#')
          ? `/ordenes/${orderId}${pantalla.href}`
          : pantalla.href;

    return {
      titulo: siguiente.available
        ? `Todo listo: pulsa «${siguiente.label}» en la orden`
        : 'Para pasar al siguiente cuadro falta:',
      faltan: siguiente.available ? [] : [...siguiente.unmet],
      href: destino,
      etiqueta: pantalla === null ? 'Abrir la orden' : `Resolverlo en ${pantalla.label}`,
    };
  }, [objetivo, facts, actor]);

  return (
    <section className="mt-8">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-semibold tracking-tight text-fg">
            Paso a paso
          </h2>
          <p className="mt-1 text-sm text-fg-muted">
            {objetivo === null
              ? 'El recorrido completo, del cliente a la entrega. Empieza por el uno.'
              : `Siguiendo ${objetivo.row.order.code} · ${objetivo.acta.vehicle} · ${objetivo.acta.plate}`}
          </p>
          {/* El administrador ve el proceso ENTERO; cada cuadro dice de quién
              es, que es la otra mitad de la pregunta. */}
          <p className="mt-0.5 text-xs text-fg-subtle">
            Cada cuadro lleva el puesto que lo trabaja.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span data-numeric className="text-sm text-fg-muted">
            {avance.done} de {avance.total}
          </span>
          {/*
            El botón no navega: apaga los demás cuadros y señala el que toca.
            Es lo que se pidió con estas palabras —«que me señale y me sombree
            qué me falta»— y es también lo que hace falta cuando nueve
            fotografías compiten por la mirada.
          */}
          <button
            type="button"
            onClick={() => {
              const encendiendo = !marcando;
              setMarcando(encendiendo);
              /*
               * Señalar no basta si el cuadro señalado está fuera de la
               * pantalla. En el teléfono los nueve van en una columna: el
               * tercero queda dos pantallazos más abajo, y un botón que
               * «señala» algo que no se ve es un botón que no hace nada.
               */
              if (encendiendo && position !== null && position !== TERMINADO) {
                document
                  .getElementById(`paso-${position}`)
                  ?.scrollIntoView({ block: 'center', behavior: 'smooth' });
              }
            }}
            aria-pressed={marcando}
            className={cn(
              'inline-flex min-h-11 items-center gap-2 rounded-control px-4 text-sm font-semibold',
              'transition-colors duration-150 ease-snap',
              marcando
                ? 'bg-graphite-950 text-white hover:bg-graphite-800'
                : 'bg-romero-500 text-white hover:bg-romero-600',
            )}
          >
            {marcando ? <X aria-hidden className="size-4" /> : <Lightbulb aria-hidden className="size-4" />}
            {marcando ? 'Ver todo' : '¿Qué me falta?'}
          </button>
        </div>
      </header>

      {marcando && (
        <div className="mt-4 rounded-panel border border-warn-500/40 bg-warn-100 px-5 py-4">
          <p className="text-sm font-semibold text-warn-700">
            {position === null || position === TERMINADO
              ? pendiente.titulo
              : `Estás en el cuadro ${stepNumber(position)} · ${routeTitle(position)}. ${pendiente.titulo}`}
          </p>
          {pendiente.faltan.length > 0 && (
            <ul className="mt-2 space-y-1">
              {pendiente.faltan.map((f) => (
                <li key={f} className="text-sm leading-relaxed text-warn-700">
                  · {f}
                </li>
              ))}
            </ul>
          )}
          <Link
            href={pendiente.href}
            className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-control bg-graphite-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-graphite-800"
          >
            {pendiente.etiqueta}
            <ArrowRight aria-hidden className="size-4" />
          </Link>
        </div>
      )}

      <ol className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {ROUTE_STEPS.map((step, index) => (
          <li key={step.id} id={`paso-${step.id}`}>
            <RouteCard
              step={step}
              estado={stateOf(step.id, position)}
              href={hrefFor(step, objetivo?.row.order.id ?? null)}
              puestos={PUESTOS[step.id]}
              priority={index < 3}
              apagado={marcando && stateOf(step.id, position) !== 'actual'}
              senalado={marcando && stateOf(step.id, position) === 'actual'}
            />
          </li>
        ))}
      </ol>
    </section>
  );
}

function routeTitle(id: RouteStepId): string {
  return ROUTE_STEPS.find((s) => s.id === id)?.title ?? id;
}

/**
 * A dónde lleva cada cuadro.
 *
 * Con una orden en marcha, los cuadros del trabajo llevan A ESA ORDEN y a su
 * expediente, que es donde se hace: las pantallas de diagnóstico y reparación
 * están cableadas a la orden de ejemplo y enseñarían otro vehículo. Sin orden
 * abierta, cada cuadro lleva a su módulo, para poder mirar.
 */
function hrefFor(step: RouteStep, orderId: string | null): string {
  if (orderId === null) return step.fallbackHref;
  if (step.id === 'cliente' || step.id === 'recepcion') return step.fallbackHref;
  return `/ordenes/${orderId}#expediente`;
}

function RouteCard({
  step,
  estado,
  href,
  puestos,
  priority,
  apagado,
  senalado,
}: {
  readonly step: RouteStep;
  readonly estado: 'hecho' | 'actual' | 'pendiente';
  readonly href: string;
  readonly puestos: readonly RoleCode[];
  readonly priority: boolean;
  readonly apagado: boolean;
  readonly senalado: boolean;
}) {
  /* Dos nombres y un «+N»: la lista entera no cabe en una tarjeta, y el
     título la lleva completa para quien la necesite. */
  const visibles = puestos.slice(0, 2).map((r) => ROLE_LABELS[r]);
  const resto = puestos.length - visibles.length;
  return (
    <Link
      href={href}
      aria-label={`Paso ${stepNumber(step.id)}: ${step.title}. ${STATE_LABELS[estado]}. Lo trabaja: ${puestos.map((r) => ROLE_LABELS[r]).join(', ') || 'administración'}`}
      className={cn(
        'group relative block overflow-hidden rounded-[1rem] bg-graphite-950',
        'shadow-[0_4px_18px_rgb(20_20_20/0.08)]',
        'transition-[transform,box-shadow,opacity,filter] duration-[180ms] ease-snap',
        'hover:-translate-y-[3px] hover:shadow-[0_12px_28px_rgb(20_20_20/0.14)]',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-romero-500',
        /* Apagar los demás es lo que hace que el señalado se vea. */
        apagado && 'opacity-35 grayscale',
        senalado && 'ring-4 ring-romero-500 ring-offset-2 ring-offset-surface-sunken',
        estado === 'actual' && !apagado && 'ring-2 ring-romero-500',
      )}
    >
      <span className="relative block aspect-[900/656]">
        <Image
          src={step.photo}
          alt=""
          fill
          priority={priority}
          sizes="(min-width: 1280px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-[220ms] ease-snap group-hover:scale-[1.015]"
        />

        {/*
          El rótulo solo cuando la fotografía NO lo trae dentro. Las siete del
          tablero llevan icono, nombre y flecha pintados; dibujar otro encima
          daría dos nombres en la misma tarjeta.
        */}
        {!step.labelInPhoto && (
          <span className="absolute inset-x-3 bottom-3 flex items-center gap-3 rounded-[0.75rem] bg-graphite-950/85 px-4 py-3 backdrop-blur-[2px]">
            <span aria-hidden className="shrink-0 text-white">
              {ICONOS[step.id]}
            </span>
            <span className="min-w-0 flex-1 truncate font-display text-lg font-semibold text-white">
              {step.title}
            </span>
            <span
              aria-hidden
              className="grid size-9 shrink-0 place-items-center rounded-full border border-white/40 text-white"
            >
              <ArrowRight className="size-4" />
            </span>
          </span>
        )}
      </span>

      {/* Quién lo trabaja, arriba a la derecha. */}
      {visibles.length > 0 && (
        <span
          title={puestos.map((r) => ROLE_LABELS[r]).join(' · ')}
          className="absolute right-3 top-3 max-w-[60%] truncate rounded-chip bg-white/85 px-2 py-0.5 text-[0.6875rem] font-medium text-graphite-800"
        >
          {visibles.join(' · ')}
          {resto > 0 && ` +${resto}`}
        </span>
      )}

      {/* El número y el estado, siempre arriba: es lo que convierte nueve
          fotografías en un recorrido. */}
      <span className="absolute left-3 top-3 flex items-center gap-2">
        <span
          aria-hidden
          data-numeric
          className={cn(
            'grid size-8 place-items-center rounded-full text-sm font-bold shadow-sm',
            estado === 'hecho' && 'bg-ok-600 text-white',
            estado === 'actual' && 'bg-romero-500 text-white',
            estado === 'pendiente' && 'bg-white/90 text-graphite-950',
          )}
        >
          {estado === 'hecho' ? <Check className="size-4" strokeWidth={3} /> : stepNumber(step.id)}
        </span>
        <span
          className={cn(
            'rounded-chip px-2 py-0.5 text-[0.6875rem] font-semibold',
            estado === 'hecho' && 'bg-ok-600/90 text-white',
            estado === 'actual' && 'bg-romero-500 text-white',
            estado === 'pendiente' && 'bg-white/85 text-graphite-800',
          )}
        >
          {STATE_LABELS[estado]}
        </span>
      </span>
    </Link>
  );
}
