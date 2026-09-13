import type { Metadata } from 'next';
import { ReceptionEvidence } from '@/components/reception/reception-evidence';

export const metadata: Metadata = { title: 'Evidencia de la recepción' };

/*
 * FASE 5: el vehículo saldrá del borrador guardado en la base, no de un valor
 * fijo. La pantalla ya recibe los dos datos por propiedad, así que cambiar la
 * fuente no la toca.
 */
export default function EvidenciaPage() {
  return <ReceptionEvidence vehicle="Toyota Hilux SRV" plate="ABC-123" />;
}
