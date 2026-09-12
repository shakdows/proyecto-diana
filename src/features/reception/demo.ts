/**
 * ⚠️ DATOS DE DEMOSTRACIÓN.
 *
 * Los ingresos de hoy se DERIVAN de `demoOrders()`. Escribirlos a mano haría
 * que esta pantalla dijera que el Hilux entró a las 08:42 mientras el tablero
 * dice otra cosa del mismo vehículo, que es un error del que ya se ha salido
 * una vez en este proyecto.
 */

import { demoOrders } from '@/features/demo/board';
import { arrivedToday, type IntakeStage, type TodayIntake } from './services/intake';

/**
 * En qué punto de la recepción está cada ingreso.
 *
 * Se deduce de la situación de la orden, no de un campo aparte: una orden que
 * ya pasó de «checklist completado» tiene su recepción cerrada, se mire por
 * donde se mire.
 */
function stageOf(status: string, checklistDone: number, checklistTotal: number): IntakeStage {
  if (status === 'DRAFT') return 'en_recepcion';
  if (status === 'RECEPCIONADO') {
    return checklistDone >= checklistTotal && checklistTotal > 0 ? 'checklist' : 'en_recepcion';
  }
  return 'orden_generada';
}

export function demoTodayIntakes(now: Date): readonly TodayIntake[] {
  return demoOrders(now)
    .filter((o) => arrivedToday(now, o.openedMinutesAgo))
    .map((o): TodayIntake => ({
      orderId: o.id,
      orderCode: o.code,
      plate: o.plate,
      vehicle: o.vehicle,
      customer: o.customer,
      corporateClient: o.corporateClient,
      equipmentKind: o.equipmentKind,
      arrivedMinutesAgo: o.openedMinutesAgo,
      stage: stageOf(o.status, o.checklistResolved, o.checklistRequired),
      checklistDone: o.checklistResolved,
      checklistTotal: o.checklistRequired,
    }))
    // El más reciente arriba: es el que probablemente sigue en el mostrador.
    .sort((a, b) => a.arrivedMinutesAgo - b.arrivedMinutesAgo);
}
