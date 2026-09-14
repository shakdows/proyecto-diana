import type { Metadata } from 'next';
import { ReceptionConfirmation } from '@/components/reception/reception-confirmation';
import { getSessionUser } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'Confirmar la recepción' };

export const dynamic = 'force-dynamic';

export default async function ConfirmacionPage() {
  // Quien confirma queda en el acta: es la mitad del taller de la firma.
  const user = await getSessionUser();
  return (
    <ReceptionConfirmation
      vehicle="Toyota Hilux SRV"
      plate="ABC-123"
      customer="Juan Pérez"
      advisorName={user.fullName}
    />
  );
}
