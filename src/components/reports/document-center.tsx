'use client';

import { useMemo, useState } from 'react';
import {
  BarChart3,
  Box,
  ClipboardList,
  Download,
  FileText,
  Handshake,
  Receipt,
  Search,
  ShoppingCart,
  Stethoscope,
  Wrench,
  X,
} from 'lucide-react';
import type { ReactNode } from 'react';
import { EmptyState } from '@/components/feedback/states';
import { Field } from '@/components/ui/field';
import { Input, Select } from '@/components/ui/input';
import { useToast } from '@/components/feedback/toast';
import {
  GROUP_HINTS,
  GROUP_LABELS,
  documentHref,
  groupsOf,
  searchDocuments,
  type DocumentKind,
} from '@/features/reports/services/catalog';
import { cn } from '@/lib/utils/cn';

const ICONS: Readonly<Record<string, ReactNode>> = {
  clipboard: <ClipboardList />,
  file: <FileText />,
  stethoscope: <Stethoscope />,
  receipt: <Receipt />,
  wrench: <Wrench />,
  handshake: <Handshake />,
  cart: <ShoppingCart />,
  box: <Box />,
  chart: <BarChart3 />,
};

export interface OrderChoice {
  readonly id: string;
  readonly code: string;
  readonly plate: string;
  readonly vehicle: string;
  readonly customer: string;
}

/**
 * Centro de documentos.
 *
 * No es un tablero. Quien entra aquí ya sabe que quiere un papel; lo que no
 * sabe es cuál de los nueve ni cómo pedirlo. Así que la pantalla enseña qué
 * hay, agrupado por para qué sirve, y el contexto —de qué orden, de qué
 * empresa— se pregunta DESPUÉS, cuando ya eligió.
 *
 * Preguntarlo antes obliga a elegir una orden para poder ver qué documentos
 * existen, que es el orden inverso al que tiene la cabeza de quien busca.
 */
export function DocumentCenter({
  documents,
  orders,
  corporateClients,
}: {
  readonly documents: readonly DocumentKind[];
  readonly orders: readonly OrderChoice[];
  readonly corporateClients: readonly string[];
}) {
  const [query, setQuery] = useState('');
  const [chosen, setChosen] = useState<DocumentKind | null>(null);

  const results = useMemo(() => searchDocuments(documents, query), [documents, query]);
  const groups = groupsOf(results);

  return (
    <>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-semibold tracking-tight text-fg lg:text-[1.75rem]">
            Informes
          </h1>
          <p className="mt-1 text-sm text-fg-muted">
            Genera documentos operativos e informes ejecutivos.
          </p>
        </div>
      </header>

      <div className="max-w-xl">
        <label htmlFor="buscar-doc" className="sr-only">
          Buscar documento
        </label>
        <Input
          id="buscar-doc"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          leading={<Search aria-hidden className="size-[1.125rem]" />}
          placeholder="Buscar documento: checklist, cotización, proveedor…"
        />
      </div>

      {documents.length === 0 ? (
        <EmptyState
          title="Tu puesto no genera documentos"
          hint="Habla con un administrador si necesitas emitir alguno."
        />
      ) : results.length === 0 ? (
        <EmptyState
          title="Ningún documento coincide"
          hint="Prueba con lo que hace el documento, no solo con su nombre."
        />
      ) : (
        groups.map((group) => (
          <section key={group}>
            <h2 className="font-display text-lg font-semibold tracking-tight text-fg">
              {GROUP_LABELS[group]}
            </h2>
            <p className="mt-0.5 text-sm text-fg-muted">{GROUP_HINTS[group]}</p>

            <ul
              className={cn(
                'mt-3 grid gap-3 sm:grid-cols-2',
                group === 'ejecutivos' ? 'lg:grid-cols-2' : 'lg:grid-cols-3',
              )}
            >
              {results
                .filter((d) => d.group === group)
                .map((doc) => (
                  <li key={doc.id}>
                    <DocumentCard doc={doc} onPick={() => setChosen(doc)} />
                  </li>
                ))}
            </ul>
          </section>
        ))
      )}

      <GenerateDrawer
        doc={chosen}
        orders={orders}
        corporateClients={corporateClients}
        onClose={() => setChosen(null)}
      />
    </>
  );
}

function DocumentCard({
  doc,
  onPick,
}: {
  readonly doc: DocumentKind;
  readonly onPick: () => void;
}) {
  const destacado = doc.group === 'ejecutivos';

  return (
    <button
      type="button"
      onClick={onPick}
      className={cn(
        'flex h-full w-full flex-col rounded-panel border p-5 text-left',
        'transition-shadow duration-150 ease-snap hover:shadow-panel',
        destacado
          ? 'border-romero-500/30 bg-romero-500/[0.04]'
          : 'border-border bg-surface-raised',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'grid size-11 place-items-center rounded-[0.875rem] [&>svg]:size-5',
          destacado ? 'bg-romero-500/10 text-romero-600' : 'bg-surface-sunken text-fg-muted',
        )}
      >
        {ICONS[doc.icon] ?? <FileText />}
      </span>

      <span className="mt-4 block font-display text-base font-semibold tracking-tight text-fg">
        {doc.label}
      </span>
      <span className="mt-1 block flex-1 text-sm leading-relaxed text-fg-muted">
        {doc.description}
      </span>

      <span
        className={cn(
          'mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-control px-4 text-sm font-semibold',
          destacado ? 'bg-romero-500 text-white' : 'bg-surface-sunken text-fg',
        )}
      >
        <Download aria-hidden className="size-4" />
        Generar
      </span>
    </button>
  );
}

/**
 * Elegir el contexto y generar.
 *
 * El PDF se abre en una pestaña nueva en vez de descargarse a la fuerza: quien
 * genera un documento casi siempre quiere MIRARLO antes de mandarlo, y una
 * descarga directa deja el archivo en una carpeta que hay que ir a buscar.
 * Desde el visor del navegador se descarga en un clic si hace falta.
 */
function GenerateDrawer({
  doc,
  orders,
  corporateClients,
  onClose,
}: {
  readonly doc: DocumentKind | null;
  readonly orders: readonly OrderChoice[];
  readonly corporateClients: readonly string[];
  readonly onClose: () => void;
}) {
  const [target, setTarget] = useState('');
  const toast = useToast();

  if (doc === null) return null;

  const opciones =
    doc.context === 'empresa'
      ? corporateClients.map((c) => ({ value: c, label: c }))
      : orders.map((o) => ({
          value: o.id,
          label: `${o.code} · ${o.plate.replace(/^(.{3})(.*)$/u, '$1-$2')} · ${o.vehicle}`,
        }));

  const elegido = target !== '' ? target : (opciones[0]?.value ?? '');
  const href = elegido === '' ? null : documentHref(doc, elegido);

  return (
    <div className="fixed inset-0 z-50 flex">
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute inset-0 bg-graphite-950/40 backdrop-blur-[2px]"
      />

      <div className="relative ml-auto flex h-dvh w-[calc(100vw-2rem)] max-w-[25rem] animate-slide-left flex-col rounded-l-modal bg-surface-raised shadow-overlay">
        <header className="flex items-center gap-3 border-b border-border px-5 py-4">
          <span
            aria-hidden
            className="grid size-9 shrink-0 place-items-center rounded-control bg-surface-sunken text-fg-muted [&>svg]:size-4"
          >
            {ICONS[doc.icon] ?? <FileText />}
          </span>
          <h2 className="min-w-0 flex-1 truncate font-display text-base font-semibold tracking-tight">
            {doc.label}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="grid size-9 shrink-0 place-items-center rounded-control text-fg-muted transition-colors duration-150 hover:bg-surface-sunken hover:text-fg"
          >
            <X aria-hidden className="size-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-5">
          <p className="text-sm leading-relaxed text-fg-muted">{doc.description}</p>

          {opciones.length === 0 ? (
            <EmptyState
              title={
                doc.context === 'empresa'
                  ? 'No hay empresas corporativas'
                  : 'No hay órdenes disponibles'
              }
              hint="Sin contexto no se puede generar el documento."
            />
          ) : (
            <Field
              label={doc.context === 'empresa' ? 'Empresa' : 'Orden de servicio'}
              hint={
                doc.context === 'empresa'
                  ? 'El informe cubre los últimos 30 días.'
                  : 'Busca por código, placa o vehículo.'
              }
            >
              <Select value={elegido} onChange={(e) => setTarget(e.target.value)}>
                {opciones.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </div>

        <footer className="shrink-0 space-y-2 border-t border-border px-5 py-4">
          {href === null ? (
            <p className="text-center text-sm text-fg-subtle">Elige un destino para generar.</p>
          ) : (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                toast('Documento generado. Se abre en una pestaña nueva.', 'ok');
                onClose();
              }}
              className="flex h-12 items-center justify-center gap-2 rounded-control bg-romero-500 text-sm font-semibold text-white transition-colors duration-150 hover:bg-romero-600"
            >
              <Download aria-hidden className="size-4" />
              Generar PDF
            </a>
          )}
          <p className="text-center text-xs text-fg-subtle">
            Se abre para revisarlo antes de enviarlo.
          </p>
        </footer>
      </div>
    </div>
  );
}
