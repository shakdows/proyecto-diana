import { cn } from '@/lib/utils/cn';

export function Skeleton({ className }: { readonly className?: string }) {
  return (
    <div
      aria-hidden
      className={cn('animate-pulse rounded-chip bg-graphite-100', className)}
    />
  );
}
