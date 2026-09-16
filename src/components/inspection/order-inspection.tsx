'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { usePersistentState, useHydrated, readSlot } from '@/lib/demo/store';
import { slotFor, type EvidencePhoto } from '@/features/evidence/services/photos';
import type { DamageMark } from '@/features/reception/services/damage-map';
import { buildHotspots, damagePhotoAnchor } from '@/features/inspection/services/from-damage';
import { allSpotIds } from '@/features/inspection/services/placement';
import { VehicleInspectionViewer } from './vehicle-inspection-viewer';
import {
  damageSlot,
} from '@/features/reception/services/slots';

const SIN_DANOS: readonly DamageMark[] = [];

/**
 * La inspección de una orden, alimentada con lo que anotó la recepción.
 *
 * Aquí es donde el visor deja de ser una demostración: los puntos que se
 * encienden son los daños que alguien marcó al recibir el vehículo, y las
 * fotos que cuenta son las que se tomaron en esa zona. No hay tabla nueva ni
 * copia de nada —ver `inspection/services/from-damage.ts`—.
 *
 * Mientras el almacén sea el navegador, esto lee de sus ranuras. Cuando haya
 * base de datos, cambia la fuente y el visor no se entera.
 */
export function OrderInspection({
  orderId,
  vehicle,
  plate,
  equipmentKind = 'vehiculo',
  advisor,
  /** La recepción llegó a cerrarse: entonces «sin marca» sí es «conforme». */
  reviewed,
}: {
  readonly orderId: string;
  readonly vehicle: string;
  readonly plate: string;
  readonly equipmentKind?: 'vehiculo' | 'maquinaria';
  readonly advisor?: string;
  readonly reviewed: boolean;
}) {
  const [damage] = usePersistentState<readonly DamageMark[]>(
    damageSlot(plate),
    SIN_DANOS,
  );
  const hydrated = useHydrated();

  /*
   * Las fotos se leen de una vez y no con un hook por punto: hay cuarenta y
   * tantos puntos y el número cambia con la vista, así que un hook por fila
   * rompería la regla de los hooks en cuanto se añada uno.
   */
  const photos = useMemo(() => {
    if (!hydrated) return {};
    const out: Record<string, number> = {};
    for (const id of allSpotIds()) {
      const guardadas = readSlot<readonly EvidencePhoto[]>(slotFor(damagePhotoAnchor(plate, id)));
      if (Array.isArray(guardadas) && guardadas.length > 0) out[id] = guardadas.length;
    }
    return out;
  }, [hydrated, plate]);

  const hotspots = useMemo(
    () =>
      buildHotspots({
        damage,
        reviewed,
        photos,
        ...(advisor === undefined ? {} : { by: advisor }),
      }),
    [damage, reviewed, photos, advisor],
  );

  return (
    <VehicleInspectionViewer
      vehicle={vehicle}
      plate={plate}
      equipmentKind={equipmentKind}
      hotspots={hotspots}
      footer={
        <Link
          href={`/ordenes/${orderId}/cotizacion`}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-control border border-border-strong bg-surface px-3 text-sm font-medium text-fg transition-colors hover:border-brand-600 hover:bg-surface-sunken"
        >
          Cotizar lo encontrado
          <ArrowRight aria-hidden className="size-3.5 text-brand-600" />
        </Link>
      }
    />
  );
}
