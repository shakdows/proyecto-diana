import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { PageHeader } from './page-header';
import { Panel, PanelBody } from '@/components/ui/panel';
import { Badge } from '@/components/ui/badge';

/**
 * Pantalla estructurada pero aún sin datos: declara con honestidad qué fase la
 * entrega y qué incluirá.
 *
 * Existe para que la navegación de la Fase 1 sea recorrible de verdad, sin
 * fingir funcionalidad que no está construida.
 */
export function PhasePlaceholder({
  title,
  description,
  phase,
  delivers,
  built = [],
}: {
  readonly title: string;
  readonly description: string;
  readonly phase: number;
  readonly delivers: readonly string[];
  /**
   * Pantallas de esta sección que YA existen. Sin esto quedan construidas y
   * sin puerta: una ruta que solo se alcanza escribiéndola a mano no está
   * entregada.
   */
  readonly built?: readonly { readonly href: string; readonly label: string; readonly detail: string }[];
}) {
  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={<Badge tone="brand">Fase {phase}</Badge>}
      />
      {built.length > 0 && (
        <Panel>
          <PanelBody>
            <h2 className="text-sm font-semibold text-fg">Ya disponible</h2>
            <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
              {built.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-start justify-between gap-3 rounded-control border border-border-strong bg-surface px-4 py-3 transition-colors duration-150 hover:border-brand-600 hover:bg-surface-sunken"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium text-fg">{item.label}</span>
                      <span className="mt-0.5 block text-sm text-fg-muted">{item.detail}</span>
                    </span>
                    <ArrowRight aria-hidden className="mt-0.5 size-4 shrink-0 text-brand-600" />
                  </Link>
                </li>
              ))}
            </ul>
          </PanelBody>
        </Panel>
      )}

      <Panel>
        <PanelBody>
          <p className="text-sm text-fg-muted">
            Esta pantalla se construye en la <strong className="text-fg">fase {phase}</strong>. La
            estructura, los permisos y la navegación ya están en su sitio; falta conectarla a la
            base de datos.
          </p>
          <ul className="mt-4 space-y-2">
            {delivers.map((item) => (
              <li key={item} className="flex gap-2 text-sm text-fg-muted">
                <span aria-hidden className="text-graphite-300">·</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </PanelBody>
      </Panel>
    </>
  );
}
