import type { Metadata } from 'next';
import { ServiceStation } from '@/components/final-services/service-station';
import { DEMO_QUEUES } from '@/features/final-services/demo';

export const metadata: Metadata = { title: 'Alineamiento' };
export const dynamic = 'force-dynamic';

export default function AlineamientoPage() {
  return <ServiceStation kind="alineamiento" initialQueue={DEMO_QUEUES.alineamiento} />;
}
