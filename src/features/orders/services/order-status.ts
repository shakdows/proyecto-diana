/**
 * Los 34 estados de la orden de servicio.
 *
 * Dominio PURO: este módulo no importa Next.js, Supabase ni `server-only`.
 * Documentación: `docs/03-maquina-de-estados.md`
 */

export const ORDER_STATUSES = [
  // Recepción
  'DRAFT',
  'RECEPCIONADO',
  'CHECKLIST_COMPLETADO',
  // Diagnóstico
  'PENDIENTE_DIAGNOSTICO',
  'EN_DIAGNOSTICO',
  'DIAGNOSTICO_COMPLETADO',
  // Comercial
  'COTIZACION_EN_PREPARACION',
  'COTIZACION_ENVIADA',
  'ESPERANDO_CLIENTE',
  'APROBACION_PARCIAL',
  'APROBADO',
  // Abastecimiento
  'SOLICITUD_REPUESTOS',
  'REPUESTOS_EN_COTIZACION',
  'COMPRA_PENDIENTE_AUTORIZACION',
  'COMPRA_AUTORIZADA',
  'ORDEN_COMPRA_GENERADA',
  'ESPERANDO_REPUESTOS',
  'REPUESTOS_PARCIALES',
  'REPUESTOS_COMPLETOS',
  // Taller
  'LISTO_PARA_REPARACION',
  'EN_REPARACION',
  'REPARACION_PAUSADA',
  'REPARACION_TERMINADA',
  // Calidad
  'CONTROL_CALIDAD',
  'OBSERVADO_CONTROL_CALIDAD',
  'CONTROL_CALIDAD_APROBADO',
  // Servicios finales
  'PENDIENTE_LAVADO',
  'EN_LAVADO',
  'PENDIENTE_ALINEAMIENTO',
  'EN_ALINEAMIENTO',
  // Cierre
  'LISTO_PARA_ENTREGA',
  'ENTREGADO',
  'CERRADO',
  'CANCELADO',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STAGES = [
  'recepcion',
  'diagnostico',
  'comercial',
  'abastecimiento',
  'taller',
  'calidad',
  'finales',
  'cierre',
] as const;

export type OrderStage = (typeof ORDER_STAGES)[number];

export const STATUS_STAGE: Readonly<Record<OrderStatus, OrderStage>> = {
  DRAFT: 'recepcion',
  RECEPCIONADO: 'recepcion',
  CHECKLIST_COMPLETADO: 'recepcion',
  PENDIENTE_DIAGNOSTICO: 'diagnostico',
  EN_DIAGNOSTICO: 'diagnostico',
  DIAGNOSTICO_COMPLETADO: 'diagnostico',
  COTIZACION_EN_PREPARACION: 'comercial',
  COTIZACION_ENVIADA: 'comercial',
  ESPERANDO_CLIENTE: 'comercial',
  APROBACION_PARCIAL: 'comercial',
  APROBADO: 'comercial',
  SOLICITUD_REPUESTOS: 'abastecimiento',
  REPUESTOS_EN_COTIZACION: 'abastecimiento',
  COMPRA_PENDIENTE_AUTORIZACION: 'abastecimiento',
  COMPRA_AUTORIZADA: 'abastecimiento',
  ORDEN_COMPRA_GENERADA: 'abastecimiento',
  ESPERANDO_REPUESTOS: 'abastecimiento',
  REPUESTOS_PARCIALES: 'abastecimiento',
  REPUESTOS_COMPLETOS: 'abastecimiento',
  LISTO_PARA_REPARACION: 'taller',
  EN_REPARACION: 'taller',
  REPARACION_PAUSADA: 'taller',
  REPARACION_TERMINADA: 'taller',
  CONTROL_CALIDAD: 'calidad',
  OBSERVADO_CONTROL_CALIDAD: 'calidad',
  CONTROL_CALIDAD_APROBADO: 'calidad',
  PENDIENTE_LAVADO: 'finales',
  EN_LAVADO: 'finales',
  PENDIENTE_ALINEAMIENTO: 'finales',
  EN_ALINEAMIENTO: 'finales',
  LISTO_PARA_ENTREGA: 'cierre',
  ENTREGADO: 'cierre',
  CERRADO: 'cierre',
  CANCELADO: 'cierre',
};

export const STATUS_LABELS: Readonly<Record<OrderStatus, string>> = {
  DRAFT: 'Borrador',
  RECEPCIONADO: 'Recepcionado',
  CHECKLIST_COMPLETADO: 'Checklist completado',
  PENDIENTE_DIAGNOSTICO: 'Pendiente de diagnóstico',
  EN_DIAGNOSTICO: 'En diagnóstico',
  DIAGNOSTICO_COMPLETADO: 'Diagnóstico completado',
  COTIZACION_EN_PREPARACION: 'Cotización en preparación',
  COTIZACION_ENVIADA: 'Cotización enviada',
  ESPERANDO_CLIENTE: 'Esperando al cliente',
  APROBACION_PARCIAL: 'Aprobación parcial',
  APROBADO: 'Aprobado',
  SOLICITUD_REPUESTOS: 'Solicitud de repuestos',
  REPUESTOS_EN_COTIZACION: 'Repuestos en cotización',
  COMPRA_PENDIENTE_AUTORIZACION: 'Compra pendiente de autorización',
  COMPRA_AUTORIZADA: 'Compra autorizada',
  ORDEN_COMPRA_GENERADA: 'Orden de compra generada',
  ESPERANDO_REPUESTOS: 'Esperando repuestos',
  REPUESTOS_PARCIALES: 'Repuestos parciales',
  REPUESTOS_COMPLETOS: 'Repuestos completos',
  LISTO_PARA_REPARACION: 'Listo para reparación',
  EN_REPARACION: 'En reparación',
  REPARACION_PAUSADA: 'Reparación pausada',
  REPARACION_TERMINADA: 'Reparación terminada',
  CONTROL_CALIDAD: 'Control de calidad',
  OBSERVADO_CONTROL_CALIDAD: 'Observado en calidad',
  CONTROL_CALIDAD_APROBADO: 'Calidad aprobada',
  PENDIENTE_LAVADO: 'Pendiente de lavado',
  EN_LAVADO: 'En lavado',
  PENDIENTE_ALINEAMIENTO: 'Pendiente de alineamiento',
  EN_ALINEAMIENTO: 'En alineamiento',
  LISTO_PARA_ENTREGA: 'Listo para entrega',
  ENTREGADO: 'Entregado',
  CERRADO: 'Cerrado',
  CANCELADO: 'Cancelado',
};

/** Estados sin transiciones de salida. */
export const TERMINAL_STATUSES: ReadonlySet<OrderStatus> = new Set<OrderStatus>([
  'CERRADO',
  'CANCELADO',
]);

/**
 * Estados en los que el taller espera a un tercero — cliente, proveedor o un
 * autorizador. Alimentan el gris del semáforo (§44).
 *
 * El gris va antes que el rojo a propósito: una orden parada porque el cliente
 * no contesta no es lo mismo que una orden que el taller está gestionando mal,
 * y mezclarlas hace inútil el tablero.
 */
export const WAITING_ON_THIRD_PARTY: ReadonlySet<OrderStatus> = new Set<OrderStatus>([
  'COTIZACION_ENVIADA',
  'ESPERANDO_CLIENTE',
  'SOLICITUD_REPUESTOS',
  'REPUESTOS_EN_COTIZACION',
  'COMPRA_PENDIENTE_AUTORIZACION',
  'COMPRA_AUTORIZADA',
  'ORDEN_COMPRA_GENERADA',
  'ESPERANDO_REPUESTOS',
  'REPUESTOS_PARCIALES',
]);

/** La orden ya salió del taller: no se le calcula avance ni retraso. */
export const CLOSED_STATUSES: ReadonlySet<OrderStatus> = new Set<OrderStatus>([
  'ENTREGADO',
  'CERRADO',
  'CANCELADO',
]);

export function isOrderStatus(value: string): value is OrderStatus {
  return (ORDER_STATUSES as readonly string[]).includes(value);
}

export function statusLabel(status: OrderStatus): string {
  return STATUS_LABELS[status];
}
