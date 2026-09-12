import Link from 'next/link';
import { CarFront, ChevronRight, Crosshair } from 'lucide-react';
import type { Priority } from '@/features/dashboard/services/priorities';
import { Plate } from '@/components/ui/plate';
import { cn } from '@/lib/utils/cn';

/**
 * Prioridades de hoy.
 *
 * Una lista operativa, no una tabla: cuatro filas que se leen de un vistazo y
 * se abren de un toque. Lo que ordena la lista lo decidió `attentionItems`
 * —gravedad primero—, así que cortar por abajo siempre deja fuera lo menos
 * grave y nunca al revés.
 *
 * El color del icono repite la gravedad que ya trae el dato. No es decoración
 * redundante: es lo que permite contar los rojos sin leer una palabra.
 */

const SEVERITY: Readonly<Record<Priority['severity'], string>> = {
  crit: 'bg-crit-600/15 text-crit-600',
  warn: 'bg-warn-600/15 text-warn-600',
  wait: 'bg-wait-600/20 text-wait-700',
};

export function PrioritiesPanel({ priorities }: { readonly priorities: readonly Priority[] }) {
  return (
    <section className="flex flex-col rounded-panel border border-border bg-surface">
      <header className="flex items-start gap-3 border-b border-border px-5 py-4">
        <span
          aria-hidden
          className="grid size-9 shrink-0 place-items-center rounded-[0.75rem] bg-brand-600/15 text-brand-600 [&>svg]:size-4.5"
        >
          <Crosshair />
        </span>

        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-fg">Prioridades de hoy</h2>
          <p className="mt-0.5 text-xs text-fg-muted">
            Tareas que requieren tu atención inmediata.
          </p>
        </div>

        <Link
          href="/tablero/operacion"
          className="shrink-0 text-xs font-medium text-fg-muted transition-colors duration-150 hover:text-brand-600"
        >
          Ver todas →
        </Link>
      </header>

      {priorities.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-fg-muted">
          Nada pide tu atención ahora mismo.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {priorities.map((p) => (
            <li key={p.id}>
              <Link
                href={p.href}
                className="flex items-center gap-3 px-5 py-3 transition-colors duration-150 hover:bg-surface-raised"
              >
                <span
                  aria-hidden
                  className={cn(
                    'grid size-8 shrink-0 place-items-center rounded-[0.625rem] [&>svg]:size-4',
                    SEVERITY[p.severity],
                  )}
                >
                  <CarFront />
                </span>

                {/* Dos columnas en pantalla ancha, apiladas en estrecho: el
                    vehículo y lo que le pasa son dos datos, no una frase. */}
                <span className="grid min-w-0 flex-1 gap-x-4 gap-y-1 sm:grid-cols-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="truncate text-sm font-medium text-fg">{p.vehicle}</span>
                    <Plate value={p.plate} size="sm" />
                  </span>

                  <span className="min-w-0">
                    <span className="block truncate text-sm text-fg">{p.headline}</span>
                    <span className="block truncate text-xs text-fg-muted">{p.detail}</span>
                  </span>
                </span>

                <ChevronRight aria-hidden className="size-4 shrink-0 text-fg-subtle" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
