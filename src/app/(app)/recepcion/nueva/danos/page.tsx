import type { Metadata } from 'next';
import { ReceptionInspection } from '@/components/reception/reception-inspection';
import { getSessionUser } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'Estado de ingreso del vehículo' };
export const dynamic = 'force-dynamic';

/*
 * «Daños» ya era uno de los siete pasos de la recepción; era el ÚNICO sin
 * pantalla propia —vivía dentro de la hoja del checklist—, y por eso esa hoja
 * pedía 42 puntos y un diagrama en la misma página. Darle su sitio no añade un
 * paso: le da el que ya tenía declarado.
 *
 * FASE 5: el vehículo y el cliente saldrán del borrador guardado en la base de
 * datos. La pantalla ya los recibe por propiedad, así que cambiar la fuente no
 * la toca.
 */
export default async function DanosPage() {
  const user = await getSessionUser();

  return (
    <ReceptionInspection
      vehicle="Toyota Hilux SRV"
      plate="ABC-123"
      customer="Juan Pérez"
      orderCode="OS-2026-000154"
      advisor={user.fullName}
    />
  );
}
