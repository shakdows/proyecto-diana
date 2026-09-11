import type { Metadata } from 'next';
import { ServiceStation } from '@/components/final-services/service-station';
import { demoQueue } from '@/features/final-services/demo';

export const metadata: Metadata = { title: 'Alineamiento' };
export const dynamic = 'force-dynamic';

export default function Page() {
  return <ServiceStation kind="alineamiento" initialQueue={demoQueue('alineamiento', new Date())} />;
}
