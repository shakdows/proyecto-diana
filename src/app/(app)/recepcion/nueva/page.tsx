import type { Metadata } from 'next';
import { NewReception } from '@/components/reception/new-reception';
import { demoCustomers } from '@/features/customers/demo';

export const metadata: Metadata = { title: 'Nueva recepción' };

/* La cartera incluye a quien está hoy en el taller, y eso se calcula contra
   `now`: prerrenderizar dejaría la lista congelada en la hora de compilación. */
export const dynamic = 'force-dynamic';

/**
 * La cartera se arma EN EL SERVIDOR y baja como datos.
 *
 * Antes bajaba solo el TABLERO —los vehículos con orden abierta—, y eso
 * dejaba fuera a cualquier cliente que no tuviera trabajo en el taller hoy:
 * el de siempre que viene una vez al año, y el que alguien acaba de dar de
 * alta. El asesor tecleaba una placa que existe, la pantalla respondía «puede
 * ser la primera visita del vehículo», y se creaba un duplicado.
 *
 * Los creados durante la prueba viven en el navegador y los suma la pantalla;
 * ver `useAllCustomers`. La Fase 4 sustituye las dos cosas por una consulta
 * con RLS.
 */
export default async function NuevaRecepcionPage({
  searchParams,
}: {
  readonly searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const placa = typeof params['placa'] === 'string' ? params['placa'] : undefined;
  const now = new Date();

  return <NewReception customers={demoCustomers(now)} now={now} initialPlate={placa} />;
}
