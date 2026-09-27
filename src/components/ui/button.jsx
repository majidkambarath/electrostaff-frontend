import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors active:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        outline: 'border border-border bg-background hover:bg-muted',
        ghost: 'hover:bg-muted',
        secondary: 'bg-muted text-foreground hover:bg-muted/80',
        destructive: 'bg-red-600 text-white hover:bg-red-600/90',
        'destructive-outline': 'border border-red-200 bg-background text-red-600 hover:bg-red-50',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2 sm:h-9',
        sm: 'h-10 rounded-md px-3 text-sm sm:h-8 sm:text-xs',
        icon: 'h-10 w-10 sm:h-9 sm:w-9',
        'icon-sm': 'h-10 w-10 sm:h-8 sm:w-8',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export function Button({ className, variant, size, ...props }) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
