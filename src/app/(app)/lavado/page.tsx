import type { Metadata } from 'next';
import { ServiceStation } from '@/components/final-services/service-station';
import { DEMO_QUEUES } from '@/features/final-services/demo';

export const metadata: Metadata = { title: 'Lavado' };
export const dynamic = 'force-dynamic';

export default function LavadoPage() {
  return <ServiceStation kind="lavado" initialQueue={DEMO_QUEUES.lavado} />;
}
