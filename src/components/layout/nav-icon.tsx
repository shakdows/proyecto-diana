import {
  Bell,
  Car,
  ChartColumn,
  ClipboardCheck,
  Droplets,
  FileText,
  Gauge,
  LayoutDashboard,
  MessageSquare,
  ScrollText,
  Search,
  Settings,
  ShieldCheck,
  ShoppingCart,
  Users,
  Wrench,
} from 'lucide-react';
import type { NavIcon as NavIconName } from '@/lib/auth/navigation';

const ICONS = {
  tablero: LayoutDashboard,
  recepcion: ClipboardCheck,
  ordenes: FileText,
  buscar: Search,
  taller: Wrench,
  calidad: ShieldCheck,
  lavado: Droplets,
  alineamiento: Gauge,
  compras: ShoppingCart,
  vehiculos: Car,
  clientes: Users,
  encuestas: MessageSquare,
  panel: ChartColumn,
  seguimiento: Bell,
  informes: FileText,
  admin: Settings,
  auditoria: ScrollText,
} as const satisfies Record<NavIconName, unknown>;

export function NavIcon({ name, className }: { readonly name: NavIconName; readonly className?: string }) {
  const Icon = ICONS[name];
  return <Icon aria-hidden className={className} />;
}
