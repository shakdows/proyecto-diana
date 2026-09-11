import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

export function Panel({
  className,
  children,
}: {
  readonly className?: string;
  readonly children: ReactNode;
}) {
  return (
    <section
      className={cn(
        'rounded-panel border border-border bg-surface-raised shadow-raise',
        className,
      )}
    >
      {children}
    </section>
  );
}

export function PanelHeader({
  title,
  description,
  action,
}: {
  readonly title: string;
  readonly description?: string;
  readonly action?: ReactNode;
}) {
  return (
    <header className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
      <div className="min-w-0">
        <h2 className="truncate text-sm font-semibold text-fg">{title}</h2>
        {description !== undefined && (
          <p className="mt-0.5 text-sm text-fg-subtle">{description}</p>
        )}
      </div>
      {action}
    </header>
  );
}

export function PanelBody({
  className,
  children,
}: {
  readonly className?: string;
  readonly children: ReactNode;
}) {
  return <div className={cn('p-5', className)}>{children}</div>;
}
