import type { ReactNode } from 'react';
import { Inbox, LoaderCircle, TriangleAlert } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils/cn';

/**
 * Los cuatro estados de pantalla.
 *
 * No son una recomendación: son el contrato. Una pantalla que no los tenga los
 * cuatro no pasa revisión (docs/16-diseno-visual.md §16.3).
 */

function Frame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 px-6 py-14 text-center',
        className,
      )}
    >
      {children}
    </div>
  );
}

export function LoadingState({ label = 'Cargando…' }: { readonly label?: string }) {
  return (
    <Frame>
      <LoaderCircle aria-hidden className="size-5 animate-spin text-fg-subtle" />
      <p role="status" className="text-sm text-fg-subtle">
        {label}
      </p>
    </Frame>
  );
}

export function TableSkeleton({ rows = 5 }: { readonly rows?: number }) {
  return (
    <div className="space-y-2 p-5" aria-busy>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  readonly title: string;
  readonly hint?: string;
  readonly action?: ReactNode;
}) {
  return (
    <Frame>
      <Inbox aria-hidden className="size-6 text-graphite-300" />
      <div>
        <p className="text-sm font-medium text-fg">{title}</p>
        {hint !== undefined && <p className="mt-1 text-sm text-fg-subtle">{hint}</p>}
      </div>
      {action}
    </Frame>
  );
}

export function ErrorState({
  title = 'No se pudo cargar la información',
  detail,
  action,
}: {
  readonly title?: string;
  readonly detail?: string;
  readonly action?: ReactNode;
}) {
  return (
    <Frame>
      <TriangleAlert aria-hidden className="size-6 text-crit-500" />
      <div>
        <p className="text-sm font-medium text-fg">{title}</p>
        {detail !== undefined && <p className="mt-1 text-sm text-fg-subtle">{detail}</p>}
      </div>
      {action}
    </Frame>
  );
}

export interface DataStateProps<T> {
  readonly data: readonly T[] | undefined;
  readonly loading?: boolean;
  readonly error?: string | undefined;
  readonly empty: { readonly title: string; readonly hint?: string; readonly action?: ReactNode };
  readonly children: (rows: readonly T[]) => ReactNode;
}

/** Compone los cuatro estados y garantiza que ninguna pantalla olvide uno. */
export function DataState<T>({ data, loading, error, empty, children }: DataStateProps<T>) {
  if (loading === true) return <TableSkeleton />;
  if (error !== undefined) return <ErrorState detail={error} />;
  if (data === undefined || data.length === 0) {
    return <EmptyState title={empty.title} hint={empty.hint} action={empty.action} />;
  }
  return <>{children(data)}</>;
}
