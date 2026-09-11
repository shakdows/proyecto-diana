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
}: {
  readonly title: string;
  readonly description: string;
  readonly phase: number;
  readonly delivers: readonly string[];
}) {
  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={<Badge tone="brand">Fase {phase}</Badge>}
      />
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
