'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  Bell,
  Building2,
  ClipboardList,
  History,
  ListOrdered,
  MessageSquare,
  PauseCircle,
  Search,
  Shield,
  SlidersHorizontal,
  Users,
  Workflow,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { EmptyState } from '@/components/feedback/states';
import { Input } from '@/components/ui/input';
import {
  SECTION_LABELS,
  searchSettings,
  sectionsOf,
  type SettingsEntry,
  type SettingsLevel,
} from '@/features/settings/services/hub';
import { cn } from '@/lib/utils/cn';

const ICONS: Readonly<Record<string, ReactNode>> = {
  building: <Building2 />,
  list: <ListOrdered />,
  users: <Users />,
  shield: <Shield />,
  clipboard: <ClipboardList />,
  pause: <PauseCircle />,
  workflow: <Workflow />,
  message: <MessageSquare />,
  sliders: <SlidersHorizontal />,
  bell: <Bell />,
  history: <History />,
};

/**
 * Centro de administración.
 *
 * Una portada con categorías, no una lista de cincuenta parámetros. Quien
 * entra aquí viene a cambiar UNA cosa; enseñarle las otras cuarenta y nueve no
 * le ayuda a encontrarla.
 *
 * El interruptor simple/avanzado esconde lo que cambia el significado de los
 * informes ya emitidos —los pesos del avance, el grafo de estados—. No es
 * seguridad: es no poner el interruptor del cuadro general junto al de la luz
 * del pasillo. El permiso sigue decidiendo quién entra.
 */
export function SettingsHub({
  simple,
  advanced,
}: {
  readonly simple: readonly SettingsEntry[];
  readonly advanced: readonly SettingsEntry[];
}) {
  const [level, setLevel] = useState<SettingsLevel>('simple');
  const [query, setQuery] = useState('');

  const entries = level === 'simple' ? simple : advanced;
  const results = useMemo(() => searchSettings(entries, query), [entries, query]);
  const sections = sectionsOf(results);

  // Si lo buscado solo existe en avanzado, decirlo en vez de mentir con un
  // «no hay nada»: el ajuste existe, es el modo el que lo esconde.
  const soloAvanzado =
    level === 'simple' &&
    results.length === 0 &&
    query.trim() !== '' &&
    searchSettings(advanced, query).length > 0;

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-fg lg:text-[1.75rem]">
            Configuración
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            Administra catálogos, permisos y reglas del sistema.
          </p>
        </div>

        <div
          role="group"
          aria-label="Nivel de configuración"
          className="flex shrink-0 rounded-control border border-border p-1"
        >
          {(['simple', 'avanzado'] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => setLevel(l)}
              aria-pressed={level === l}
              className={cn(
                'h-9 rounded-[0.5rem] px-4 text-sm capitalize transition-colors duration-150',
                level === l
                  ? 'bg-surface-sunken font-semibold text-fg'
                  : 'text-fg-muted hover:text-fg',
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </header>

      <div className="max-w-xl">
        <label htmlFor="buscar-ajuste" className="sr-only">
          Buscar configuración
        </label>
        <Input
          id="buscar-ajuste"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          leading={<Search aria-hidden className="size-[1.125rem]" />}
          placeholder="Buscar configuración: usuarios, checklist, NPS, BBVA…"
        />
        {level === 'simple' && query.trim() === '' && (
          <p className="mt-1.5 text-xs text-fg-subtle">
            El modo avanzado añade el flujo de estados y los umbrales que afectan a los informes.
          </p>
        )}
      </div>

      {entries.length === 0 ? (
        <EmptyState
          title="Tu puesto no administra el sistema"
          hint="Habla con un administrador si necesitas cambiar algo."
        />
      ) : soloAvanzado ? (
        <EmptyState
          title="Eso está en el modo avanzado"
          hint="Cambia el interruptor de arriba para verlo."
        />
      ) : results.length === 0 ? (
        <EmptyState title="Ningún ajuste coincide" hint="Prueba con otra palabra." />
      ) : (
        sections.map((section) => (
          <section key={section}>
            <h2 className="font-display text-lg font-semibold tracking-tight text-fg">
              {SECTION_LABELS[section]}
            </h2>
            <ul className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {results
                .filter((e) => e.section === section)
                .map((entry) => (
                  <li key={entry.id}>
                    <SettingCard entry={entry} />
                  </li>
                ))}
            </ul>
          </section>
        ))
      )}
    </>
  );
}

function SettingCard({ entry }: { readonly entry: SettingsEntry }) {
  const inner = (
    <>
      <span
        aria-hidden
        className={cn(
          'grid size-11 place-items-center rounded-[0.875rem] [&>svg]:size-5',
          entry.available ? 'bg-surface-sunken text-fg-muted' : 'bg-surface-sunken text-fg-subtle',
        )}
      >
        {ICONS[entry.icon] ?? <SlidersHorizontal />}
      </span>

      <span className="mt-4 flex items-baseline gap-2">
        <span className="font-display text-base font-semibold tracking-tight text-fg">
          {entry.label}
        </span>
        {entry.level === 'avanzado' && (
          <span className="rounded-chip bg-warn-100 px-1.5 py-0.5 text-[0.625rem] font-medium text-warn-700">
            avanzado
          </span>
        )}
      </span>

      <span className="mt-1 block flex-1 text-sm leading-relaxed text-fg-muted">
        {entry.description}
      </span>

      <span className="mt-4 flex items-center justify-between gap-2 text-sm">
        {entry.count === null ? (
          <span className="text-fg-subtle">Sin datos todavía</span>
        ) : (
          <span className="text-fg-muted">
            <span data-numeric className="font-semibold text-fg">
              {entry.count}
            </span>{' '}
            {entry.unit}
          </span>
        )}
        <span className={cn('font-medium', entry.available ? 'text-brand-600' : 'text-fg-subtle')}>
          {entry.available ? 'Ver →' : 'Pendiente'}
        </span>
      </span>
    </>
  );

  const clase = cn(
    'flex h-full flex-col rounded-panel border border-border bg-surface-raised p-5',
    entry.available
      ? 'transition-shadow duration-150 ease-snap hover:shadow-panel'
      : 'opacity-60',
  );

  // Una tarjeta sin panel NO es un enlace. Un botón que no lleva a ninguna
  // parte enseña a desconfiar de los que sí llevan.
  return entry.available ? (
    <Link href={`/admin/${entry.id}`} className={clase}>
      {inner}
    </Link>
  ) : (
    <div className={clase}>{inner}</div>
  );
}
