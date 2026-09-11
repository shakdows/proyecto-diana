import type { Metadata } from 'next';
import { ReadyQueue } from '@/components/delivery/ready-queue';
import { demoReady } from '@/features/delivery/demo';

export const metadata: Metadata = { title: 'Vehículos listos' };
export const dynamic = 'force-dynamic';

export default function VehiculosListosPage() {
  return <ReadyQueue initial={demoReady(new Date())} />;
}
