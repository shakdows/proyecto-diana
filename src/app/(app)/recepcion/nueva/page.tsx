import type { Metadata } from 'next';
import { NewReception, type KnownVehicle } from '@/components/reception/new-reception';
import { demoBoard } from '@/features/demo/board';
import { vocabularyFor } from '@/features/equipment/services/equipment-kind';

export const metadata: Metadata = { title: 'Nueva recepción' };

/**
 * Las fichas conocidas se arman EN EL SERVIDOR y bajan como datos.
 *
 * La alternativa —que el navegador consulte al escribir— es lo que hará la
 * Fase 4 contra la base de datos con RLS. Mientras tanto, mandar el catálogo
 * de demostración entero es honesto y evita fingir una búsqueda remota que
 * todavía no existe.
 */
export default async function NuevaRecepcionPage({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const placa = typeof params['placa'] === 'string' ? params['placa'] : undefined;
  const rows = demoBoard(new Date());

  const known: readonly KnownVehicle[] = rows.map((row) => {
    const { order } = row;
    const [brand = order.vehicle, ...rest] = order.vehicle.split(' ');

    return {
      plate: order.plate,
      vehicle: order.vehicle,
      brand,
      model: rest.join(' ') || order.vehicle,
      modelYear: order.modelYear,
      usage: order.usage,
      usageUnit: vocabularyFor(order.equipmentKind).usageUnit,
      color: order.color,
      customer: order.customer,
      corporateClient: order.corporateClient,
      phone: order.customerPhone,
      email: order.customerEmail,
      docLast3: order.customerDocLast3,
    };
  });

  return <NewReception known={known} initialPlate={placa} />;
}
