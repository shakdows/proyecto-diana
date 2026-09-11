import { redirect } from 'next/navigation';
import { homeRouteFor } from '@/lib/auth/navigation';
import { getSessionUser } from '@/lib/auth/session';

/** Cada rol entra por la pantalla que le sirve (§16.4). */
export default async function Home() {
  redirect(homeRouteFor((await getSessionUser()).permissions));
}
