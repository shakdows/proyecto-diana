import type { Metadata } from 'next';
import { ReceptionDesk } from '@/components/reception/reception-desk';
import { demoCorporateClients, demoCustomers } from '@/features/customers/demo';
import { demoTodayIntakes } from '@/features/reception/demo';

export const metadata: Metadata = { title: 'Recepción' };

/* La hora de llegada y «lo que entró hoy» se calculan contra `now`:
   prerrenderizar dejaría la lista congelada en la hora de compilación. */
export const dynamic = 'force-dynamic';

export default function RecepcionPage() {
  const now = new Date();

  return (
    <ReceptionDesk
      customers={demoCustomers(now)}
      intakes={demoTodayIntakes(now)}
      corporateClients={demoCorporateClients()}
      now={now}
    />
  );
}
