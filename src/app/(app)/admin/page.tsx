import type { Metadata } from 'next';
import { SettingsHub } from '@/components/settings/settings-hub';
import { visibleSettings } from '@/features/settings/services/hub';
import { getSessionUser } from '@/lib/auth/session';

export const metadata: Metadata = { title: 'Configuración' };
export const dynamic = 'force-dynamic';

export default async function ConfiguracionPage() {
  const user = await getSessionUser();

  return (
    /* Las dos listas se filtran EN EL SERVIDOR. El interruptor
       simple/avanzado solo alterna entre lo que ya se le permite ver: no
       puede destapar un bloque cuyo permiso no tiene. */
    <SettingsHub
      simple={visibleSettings(user.permissions, 'simple')}
      advanced={visibleSettings(user.permissions, 'avanzado')}
    />
  );
}
