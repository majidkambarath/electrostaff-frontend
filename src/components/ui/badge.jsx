import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium capitalize',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground',
        secondary: 'border-transparent bg-muted text-muted-foreground',
        outline: 'text-foreground',
        success: 'border-transparent bg-emerald-50 text-emerald-700',
        warning: 'border-transparent bg-amber-50 text-amber-700',
        danger: 'border-transparent bg-red-50 text-red-700',
        muted: 'border-transparent bg-slate-100 text-slate-600',
        info: 'border-transparent bg-blue-50 text-blue-700',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export function Badge({ className, variant, ...props }) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export function statusBadgeVariant(status) {
  const map = {
    present: 'success',
    active: 'success',
    approved: 'success',
    paid: 'success',
    absent: 'danger',
    inactive: 'danger',
    rejected: 'danger',
    half: 'warning',
    'half-day': 'warning',
    pending: 'warning',
    onhold: 'warning',
    leave: 'muted',
    'on-leave': 'muted',
    completed: 'info',
    cancelled: 'muted',
  };
  return map[status] || 'secondary';
}
