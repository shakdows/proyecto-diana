import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SatisfactionSurvey } from '@/components/delivery/satisfaction-survey';
import { DEMO_SURVEY_TOKEN } from '@/features/delivery/demo';
import { findDemoOrder } from '@/features/demo/board';

export const metadata: Metadata = {
  title: 'Tu opinión · Romero Motors',
  // La encuesta no se indexa: es un enlace personal, no una página del sitio.
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

export default async function EncuestaPage({
  params,
}: {
  readonly params: Promise<{ readonly token: string }>;
}) {
  const { token } = await params;

  /*
   * Un token inventado devuelve 404 sin distinguir «no existe» de «no es
   * tuyo»: lo contrario permitiría averiguar qué órdenes existen probando
   * identificadores. En la Fase 15 se compara el HASH del token contra
   * `survey_links`, nunca el token en claro.
   */
  if (token !== DEMO_SURVEY_TOKEN) notFound();

  const row = findDemoOrder('os-154', new Date());
  if (row === undefined) notFound();

  const { order } = row;

  return (
    <SatisfactionSurvey
      customerFirstName={order.customer.split(' ')[0] ?? order.customer}
      vehicle={order.vehicle}
      plate={order.plate.replace(/^(.{3})(.*)$/u, '$1-$2')}
      orderCode={order.code}
    />
  );
}
