import type { Metadata } from 'next';
import { ReceptionSignature } from '@/components/reception/reception-signature';

export const metadata: Metadata = { title: 'Firma del cliente' };

export default function FirmaPage() {
  return <ReceptionSignature vehicle="Toyota Hilux SRV" plate="ABC-123" customer="Juan Pérez" />;
}
