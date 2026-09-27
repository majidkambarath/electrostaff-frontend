import { Link } from 'react-router-dom';
import { cn } from '@/shared/lib/utils';

const TONES = {
  default: 'bg-muted text-muted-foreground',
  primary: 'bg-blue-50 text-blue-700',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-700',
  danger: 'bg-red-50 text-red-700',
};

export function StatTile({ label, value, hint, icon: Icon, tone = 'default', to, className }) {
  const body = (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="mt-0.5 truncate text-lg font-semibold tracking-tight text-foreground sm:mt-1 sm:text-xl">{value}</p>
        {hint && <p className="mt-0.5 truncate text-xs text-muted-foreground">{hint}</p>}
      </div>
      {Icon && (
        <div className={cn('hidden h-8 w-8 shrink-0 items-center justify-center rounded-md sm:flex', TONES[tone])}>
          <Icon className="h-4 w-4" />
        </div>
      )}
    </div>
  );

  const base = 'block rounded-lg border border-border bg-card px-3 py-2.5 sm:px-4 sm:py-3';
  if (to) {
    return (
      <Link to={to} className={cn(base, 'transition-colors hover:border-primary/40 hover:bg-muted/40', className)}>
        {body}
      </Link>
    );
  }
  return <div className={cn(base, className)}>{body}</div>;
}
