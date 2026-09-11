import {
  STATUS_LABELS,
  STATUS_STAGE,
  WAITING_ON_THIRD_PARTY,
  type OrderStatus,
} from '@/features/orders/services/order-status';
import { Badge } from './badge';

/** Estados que merecen destacarse por sí mismos, al margen de su etapa. */
const EXPLICIT_TONE: Partial<Record<OrderStatus, 'ok' | 'warn' | 'crit' | 'brand' | 'neutral'>> = {
  CANCELADO: 'crit',
  OBSERVADO_CONTROL_CALIDAD: 'crit',
  REPARACION_PAUSADA: 'warn',
  LISTO_PARA_ENTREGA: 'ok',
  ENTREGADO: 'ok',
  CERRADO: 'neutral',
  CONTROL_CALIDAD_APROBADO: 'ok',
  EN_REPARACION: 'brand',
};

function toneFor(status: OrderStatus): 'neutral' | 'brand' | 'ok' | 'warn' | 'crit' | 'wait' {
  const explicit = EXPLICIT_TONE[status];
  if (explicit !== undefined) return explicit;
  // El resto hereda el gris de espera o el neutro de su etapa.
  if (WAITING_ON_THIRD_PARTY.has(status)) return 'wait';
  return STATUS_STAGE[status] === 'taller' ? 'brand' : 'neutral';
}

export function StatusChip({ status }: { readonly status: OrderStatus }) {
  return <Badge tone={toneFor(status)}>{STATUS_LABELS[status]}</Badge>;
}
