import { cva, type VariantProps } from 'class-variance-authority';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils/cn';

const badge = cva(
  'inline-flex items-center gap-1.5 rounded-chip px-2 py-0.5 text-xs font-medium',
  {
    variants: {
      tone: {
        neutral: 'bg-graphite-100 text-graphite-700',
        brand: 'bg-brand-100 text-brand-800',
        ok: 'bg-ok-100 text-ok-700',
        warn: 'bg-warn-100 text-warn-700',
        crit: 'bg-crit-100 text-crit-700',
        wait: 'bg-wait-100 text-wait-700',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export interface BadgeProps extends VariantProps<typeof badge> {
  readonly children: ReactNode;
  readonly className?: string;
}

export function Badge({ tone, className, children }: BadgeProps) {
  return <span className={cn(badge({ tone }), className)}>{children}</span>;
}
