import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CustomerAuthorization } from '@/components/quotation/customer-authorization';
import { DEMO_AUTH_TOKEN, DEMO_QUOTE } from '@/features/quotations/demo';

export const metadata: Metadata = {
  title: { absolute: 'Autoriza los trabajos de tu vehículo · Romero Motors' },
  description: 'Revisa y autoriza los trabajos recomendados para tu vehículo.',
  robots: { index: false, follow: false },
};

/**
 * Autorización del cliente, FUERA de la aplicación.
 *
 * No vive en `(app)` a propósito: no debe heredar la barra lateral, el
 * buscador ni la sesión del taller. El cliente llega por un enlace, decide y
 * se va.
 *
 * ⚠️ FASE 9: el token se valida contra `authorization_links` —comparando el
 * HASH, nunca el valor— y caduca. Aquí solo se compara con el de ejemplo, y
 * cualquier otro devuelve 404: un enlace inventado no debe revelar si la
 * orden existe.
 */
export default async function AutorizacionPage({
  params,
}: {
  readonly params: Promise<{ readonly token: string }>;
}) {
  const { token } = await params;
  if (token !== DEMO_AUTH_TOKEN) notFound();

  return (
    <CustomerAuthorization
      lines={DEMO_QUOTE}
      customerFirstName="Juan"
      vehicle="Toyota Hilux SRV"
      plate="ABC-123"
    />
  );
}
