import type { Metadata } from 'next';
import { VehicleChecklist } from '@/components/reception/vehicle-checklist';

export const metadata: Metadata = { title: 'Checklist del vehículo' };

/*
 * FASE 5: el vehículo saldrá del borrador de recepción guardado en la base de
 * datos, no de un valor fijo. La pantalla ya recibe los dos datos por
 * propiedad, así que cambiar la fuente no la toca.
 */
export default function ChecklistPage() {
  return <VehicleChecklist vehicle="Toyota Hilux SRV" plate="ABC-123" />;
}
