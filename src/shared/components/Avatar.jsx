import { cn } from '@/shared/lib/utils';
import { initials } from '@/shared/lib/format';

export function Avatar({ name, className }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground',
        className
      )}
    >
      {initials(name) || '?'}
    </span>
  );
}
