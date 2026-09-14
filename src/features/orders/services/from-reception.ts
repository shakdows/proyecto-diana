/**
 * La orden que abre una recepción cerrada.
 *
 * ── El agujero que tapa ────────────────────────────────────────────────────
 *
 * Cerrar una recepción emite dos códigos: el del acta (`REC-2026-0001`) y el
 * de la orden que abre (`OT-2026-0001`). El acta se podía abrir y corregir…
 * y la orden no existía en ninguna parte: la lista de Órdenes lee los datos
 * sembrados, así que quien recibía un vehículo y confirmaba el ingreso no
 * volvía a ver ese vehículo nunca más. El recorrido se cortaba justo en el
 * punto donde empieza el trabajo.
 *
 * Aquí se convierte el acta en una orden con la misma forma que las demás,
 * para que pase por las MISMAS funciones puras —avance, ETA, semáforo— y no
 * haya dos clases de orden en el sistema.
 *
 * ── Lo que el acta NO sabe ─────────────────────────────────────────────────
 *
 * En recepción no se sabe qué trabajo hay que hacer: eso lo dice el
 * diagnóstico. Así que la orden nace sin tipo de servicio, sin cotización y
 * sin repuestos, y eso se declara en los hechos en vez de rellenarse con
 * ceros que la máquina de estados leería como «no hay nada pendiente,
 * adelante».
 *
 * Dominio PURO: sin React, sin almacenamiento, sin `Date.now()` escondido.
 */

import type { DemoCustomer, DemoVehicle } from '@/features/customers/demo';
import type { DemoOrder } from '@/features/demo/board';
import type { CompletedReception } from '@/features/reception/services/acta';
import type { EquipmentKind } from '@/features/equipment/services/equipment-kind';
import type { OrderFacts } from './state-machine';

/**
 * Lo que aún no se ha decidido.
 *
 * Es un valor y no una cadena vacía porque la pantalla tiene que ESCRIBIR
 * algo, y «» se lee como un fallo de carga. Y es una constante, no el texto
 * suelto, porque los hechos preguntan por ella: si alguien cambia la
 * redacción, `hasServiceType` sigue siendo correcto.
 */
export const SIN_DEFINIR = 'Por definir';

export const RECEPTION_ORDER_PREFIX = 'rec-';

/** `REC-2026-0001` → `rec-2026-0001`. Estable: es el mismo enlace siempre. */
export function orderIdForReception(receptionCode: string): string {
  return receptionCode.toLowerCase().replace(/^rec-/u, RECEPTION_ORDER_PREFIX);
}

export function isReceptionOrderId(id: string): boolean {
  return /^rec-\d{4}-\d{4}$/u.test(id);
}

/** El camino de vuelta: `rec-2026-0001` → `REC-2026-0001`. */
export function receptionCodeFromOrderId(id: string): string | null {
  return isReceptionOrderId(id) ? id.toUpperCase() : null;
}

/** Cuántos minutos hace que se cerró la recepción. Nunca negativo. */
export function minutesSince(iso: string, now: Date): number {
  const cerrada = Date.parse(iso);
  if (!Number.isFinite(cerrada)) return 0;
  return Math.max(0, Math.round((now.getTime() - cerrada) / 60_000));
}

/** Busca el vehículo por placa en la cartera, sin distinguir guiones ni mayúsculas. */
export function findVehicle(
  customers: readonly DemoCustomer[],
  plate: string,
): { readonly customer: DemoCustomer; readonly vehicle: DemoVehicle } | null {
  const buscado = normalizePlate(plate);
  for (const customer of customers) {
    for (const vehicle of customer.vehicles) {
      if (normalizePlate(vehicle.plate) === buscado) return { customer, vehicle };
    }
  }
  return null;
}

export function normalizePlate(plate: string): string {
  return plate.replace(/[^a-z0-9]/giu, '').toUpperCase();
}

/** El nombre de un cliente, sea persona o empresa. */
export function customerName(customer: DemoCustomer): string {
  if (customer.kind === 'empresa') return customer.businessName ?? 'Empresa sin nombre';
  return [customer.firstName, customer.lastName].filter(Boolean).join(' ').trim();
}

export interface ReceptionOrderInput {
  readonly acta: CompletedReception;
  /** El cliente y el vehículo de la cartera, si la placa está registrada. */
  readonly match: { readonly customer: DemoCustomer; readonly vehicle: DemoVehicle } | null;
  /** Lo que se haya decidido después en la propia orden. */
  readonly serviceType?: string;
}

/**
 * El acta, con la forma de una orden.
 *
 * Nace en `CHECKLIST_COMPLETADO` y no en `RECEPCIONADO` porque el acta solo se
 * puede cerrar con el checklist terminado y la firma del cliente, y confirmar
 * el ingreso ES el acto del asesor. Dejarla en `RECEPCIONADO` obligaría a
 * repetir en la orden un paso que ya se dio en la recepción.
 */
export function orderFromReception(input: ReceptionOrderInput, now: Date): DemoOrder {
  const { acta, match } = input;
  const vehicle = match?.vehicle ?? null;
  const equipmentKind: EquipmentKind = vehicle?.equipmentKind ?? 'vehiculo';

  return {
    id: orderIdForReception(acta.code),
    code: acta.orderCode,
    plate: normalizePlate(acta.plate),
    vehicle: acta.vehicle,
    modelYear: vehicle?.modelYear ?? 0,
    equipmentKind,
    usage: vehicle?.mileage ?? 0,
    customer: acta.customer,
    corporateClient: match?.customer.corporateClient ?? null,
    advisor: acta.advisorName,
    technician: null,
    serviceType: input.serviceType ?? SIN_DEFINIR,
    status: 'CHECKLIST_COMPLETADO',
    openedMinutesAgo: minutesSince(acta.closedAt, now),
    /*
     * Sin tipo de servicio no hay trabajo que estimar, y sin estimación no se
     * puede prometer una hora. Inventar «para hoy a las seis» es la clase de
     * promesa que hace que el cliente llame a las seis y cinco.
     */
    promisedInMinutes: null,
    estimatedMinutes: 0,
    startedMinutesAgo: null,
    sessions: [],
    parts: [],
    finalStages: [],
    finalStagesDone: 0,
    checklistRequired: acta.checklistTotal,
    checklistResolved: acta.checklistResolved,
    quotationLineCount: 0,
    decidedItemCount: 0,
    approvedItemCount: 0,
    diagnosticItemCount: 0,
    repairJobsTotal: 0,
    repairJobsDone: 0,
    isDemo: true,
    color: vehicle?.color ?? '',
    vin: '',
    customerPhone: match?.customer.phone ?? '',
    customerEmail: match?.customer.email ?? '',
    customerAddress: match?.customer.address ?? '',
    customerDocLast3: match?.customer.documentLast ?? '',
    items: [],
    notes: [],
    photos: [],
    qualityChecks: [],
  };
}

/**
 * Los hechos de una orden recién recibida.
 *
 * NO se usa `factsFor` de la demostración: aquella declara `hasServiceType:
 * true` y una firma de asesor siempre presente porque describe órdenes
 * sembradas que ya están en marcha. Aplicada a una recepción recién cerrada
 * dejaría pasar «Enviar a diagnóstico» sin saber a qué se envía el vehículo.
 */
export function factsFromReception(
  order: DemoOrder,
  acta: CompletedReception,
): OrderFacts {
  return {
    status: order.status,
    hasCustomer: acta.customer.trim() !== '',
    hasVehicle: order.plate !== '',
    hasServiceType: order.serviceType !== SIN_DEFINIR && order.serviceType.trim() !== '',
    requiredChecklistItems: acta.checklistTotal,
    resolvedChecklistItems: acta.checklistResolved,
    hasCustomerSignature: acta.customerSignature !== null,
    /* Confirmar el ingreso ES el acto del asesor: sin él no hay acta. */
    hasAdvisorSignature: true,
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
}

/** Dónde guarda la orden su tipo de servicio, decidido después de recibir. */
export function serviceTypeSlot(orderId: string): string {
  return `orden.${orderId}.servicio`;
}

/**
 * Los tipos de servicio que se ofrecen al elegir.
 *
 * Una lista corta y un campo libre: sin lista, cada asesor escribe el mismo
 * trabajo de tres maneras y el informe de «qué se hace más» deja de servir;
 * sin campo libre, el trabajo raro no se puede registrar y alguien lo mete
 * en el más parecido, que es peor.
 */
export const SERVICE_TYPES: readonly string[] = [
  'MANTENIMIENTO PREVENTIVO',
  'CAMBIO DE ACEITE Y FILTROS',
  'CAMBIO DE PASTILLAS',
  'REVISIÓN DE FRENOS',
  'SUSPENSIÓN Y DIRECCIÓN',
  'DIAGNÓSTICO ELECTRÓNICO',
  'AIRE ACONDICIONADO',
  'PLANCHADO Y PINTURA',
  'REVISIÓN POR GARANTÍA',
];

export function checkServiceType(value: string): { readonly valid: boolean; readonly error: string | null } {
  const limpio = value.trim();
  if (limpio === '') return { valid: false, error: null };
  if (limpio.length < 4) return { valid: false, error: 'Escribe al menos 4 caracteres.' };
  if (limpio.length > 80) return { valid: false, error: 'Máximo 80 caracteres.' };
  return { valid: true, error: null };
}

/* ------------------------------------------------------------------ *
 * Búsqueda universal
 * ------------------------------------------------------------------ */

export interface ReceptionOrderTarget {
  readonly id: string;
  readonly href: string;
  readonly kind: 'orden';
  readonly title: string;
  readonly subtitle: string;
  readonly plate: string;
  readonly haystack: string;
}

/**
 * Las órdenes recibidas, para el buscador de Ctrl+K.
 *
 * Es el mismo agujero que tuvo la cartera de clientes: el buscador prometía
 * «orden» y solo encontraba las nueve sembradas, así que quien acababa de
 * recibir un vehículo tecleaba su placa y no salía nada. Un buscador que no
 * encuentra lo que acabas de crear se deja de usar en dos días.
 *
 * El acta lleva el código de la orden y el nombre del cliente; nada de eso
 * es dato reservado. El documento NO entra, igual que en `customerTargets`.
 */
export function receptionOrderTargets(
  actas: readonly CompletedReception[],
  serviceTypeOf: (orderId: string) => string,
): readonly ReceptionOrderTarget[] {
  return actas.map((acta) => {
    const id = orderIdForReception(acta.code);
    const servicio = serviceTypeOf(id).trim();
    const titulo = servicio === '' ? SIN_DEFINIR : servicio;
    return {
      id,
      href: `/ordenes/${id}`,
      kind: 'orden',
      title: `${titulo} · ${acta.vehicle}`,
      subtitle: `${acta.orderCode} · ${acta.customer}`,
      plate: normalizePlate(acta.plate),
      haystack: [
        normalizePlate(acta.plate),
        acta.plate,
        acta.orderCode,
        acta.code,
        acta.vehicle,
        acta.customer,
        titulo,
      ].join(' '),
    };
  });
}
