import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Sheet({ ...props }) {
  return <DialogPrimitive.Root {...props} />;
}

export function SheetTrigger({ ...props }) {
  return <DialogPrimitive.Trigger {...props} />;
}

export function SheetContent({ className, children, side = 'right', ...props }) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50" />
      <DialogPrimitive.Content
        className={cn(
          'fixed z-50 flex flex-col gap-4 border-border bg-background p-4 shadow-none sm:p-5',
          side === 'right' && 'inset-y-0 right-0 h-full w-full border-l sm:max-w-md',
          side === 'left' && 'inset-y-0 left-0 h-full w-72 border-r',
          side === 'bottom' && 'inset-x-0 bottom-0 max-h-[90vh] rounded-t-lg border-t',
          className
        )}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function SheetHeader({ className, ...props }) {
  return <div className={cn('flex flex-col gap-1 pr-6', className)} {...props} />;
}

export function SheetTitle({ className, ...props }) {
  return <DialogPrimitive.Title className={cn('text-base font-semibold', className)} {...props} />;
}

export function SheetDescription({ className, ...props }) {
  return <DialogPrimitive.Description className={cn('text-sm text-muted-foreground', className)} {...props} />;
}

export function SheetBody({ className, ...props }) {
  return <div className={cn('-mx-4 flex-1 overflow-y-auto px-4 sm:-mx-5 sm:px-5', className)} {...props} />;
}

export function SheetFooter({ className, ...props }) {
  return (
    <div
      className={cn('-mx-4 -mb-4 flex flex-col-reverse gap-2 border-t border-border px-4 py-3 sm:-mx-5 sm:-mb-5 sm:flex-row sm:justify-end sm:px-5', className)}
      {...props}
    />
  );
}
