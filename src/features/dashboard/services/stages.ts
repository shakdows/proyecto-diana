/**
 * Las seis etapas del taller.
 *
 * Una orden pasa por 38 situaciones distintas. Nadie dirige un taller con 38
 * números: se dirige con seis, que son las paradas reales por las que pasa un
 * vehículo desde que entra hasta que sale.
 *
 * Este mapeo es LA definición de esas seis. Existe una sola vez y está probado
 * para que sea exhaustivo: si mañana se añade una situación nueva al dominio y
 * nadie decide en qué etapa cae, la prueba falla. Sin eso, el vehículo
 * desaparecería del recuento sin que nada avisara —ni un error, ni un hueco:
 * simplemente un número más bajo del que debería—.
 */

import { ORDER_STATUSES, type OrderStatus } from '@/features/orders/services/order-status';

export type Stage = 'recepcion' | 'diagnostico' | 'repuestos' | 'reparacion' | 'calidad' | 'listos';

export const STAGES: readonly Stage[] = [
  'recepcion',
  'diagnostico',
  'repuestos',
  'reparacion',
  'calidad',
  'listos',
];

export const STAGE_LABELS: Readonly<Record<Stage, string>> = {
  recepcion: 'Recepción',
  diagnostico: 'Diagnóstico',
  repuestos: 'Repuestos',
  reparacion: 'Reparación',
  calidad: 'Calidad',
  listos: 'Listos',
};

/** Adónde lleva cada etapa al pulsarla. */
export const STAGE_HREFS: Readonly<Record<Stage, string>> = {
  recepcion: '/recepcion',
  diagnostico: '/taller/diagnostico',
  repuestos: '/compras',
  reparacion: '/taller/reparacion',
  calidad: '/calidad',
  listos: '/ordenes',
};

/**
 * En qué etapa está una orden; `null` si ya no está en el taller.
 *
 * Lo comercial —cotización, espera del cliente, autorización— cuenta como
 * «repuestos» y no como etapa propia: desde la nave, un vehículo parado
 * esperando que el cliente apruebe y uno parado esperando que llegue la pieza
 * están en la misma situación, que es que no se puede trabajar en él.
 */
export function stageOf(status: OrderStatus): Stage | null {
  switch (status) {
    case 'DRAFT':
    case 'RECEPCIONADO':
    case 'CHECKLIST_COMPLETADO':
      return 'recepcion';

    case 'PENDIENTE_DIAGNOSTICO':
    case 'EN_DIAGNOSTICO':
    case 'DIAGNOSTICO_COMPLETADO':
      return 'diagnostico';

    case 'COTIZACION_EN_PREPARACION':
    case 'COTIZACION_ENVIADA':
    case 'ESPERANDO_CLIENTE':
    case 'APROBACION_PARCIAL':
    case 'APROBADO':
    case 'SOLICITUD_REPUESTOS':
    case 'REPUESTOS_EN_COTIZACION':
    case 'COMPRA_PENDIENTE_AUTORIZACION':
    case 'COMPRA_AUTORIZADA':
    case 'ORDEN_COMPRA_GENERADA':
    case 'ESPERANDO_REPUESTOS':
    case 'REPUESTOS_PARCIALES':
    case 'REPUESTOS_COMPLETOS':
      return 'repuestos';

    case 'LISTO_PARA_REPARACION':
    case 'EN_REPARACION':
    case 'REPARACION_PAUSADA':
    case 'REPARACION_TERMINADA':
      return 'reparacion';

    case 'CONTROL_CALIDAD':
    case 'OBSERVADO_CONTROL_CALIDAD':
    case 'CONTROL_CALIDAD_APROBADO':
      return 'calidad';

    // Lavado y alineamiento van con «listos»: el trabajo de taller ya terminó
    // y lo que queda es preparar el vehículo para que salga.
    case 'PENDIENTE_LAVADO':
    case 'EN_LAVADO':
    case 'PENDIENTE_ALINEAMIENTO':
    case 'EN_ALINEAMIENTO':
    case 'LISTO_PARA_ENTREGA':
      return 'listos';

    // Fuera del taller: no se cuentan en ninguna etapa.
    case 'ENTREGADO':
    case 'CERRADO':
    case 'CANCELADO':
      return null;
  }
}

export function countByStage(
  statuses: readonly OrderStatus[],
): Readonly<Record<Stage, number>> {
  const counts: Record<Stage, number> = {
    recepcion: 0,
    diagnostico: 0,
    repuestos: 0,
    reparacion: 0,
    calidad: 0,
    listos: 0,
  };

  for (const status of statuses) {
    const stage = stageOf(status);
    if (stage !== null) counts[stage] += 1;
  }

  return counts;
}

/** Todas las situaciones del dominio, para la prueba de exhaustividad. */
export const ALL_STATUSES: readonly OrderStatus[] = ORDER_STATUSES;
