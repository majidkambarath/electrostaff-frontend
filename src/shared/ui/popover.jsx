import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import { cn } from '@/shared/lib/utils';

export function Popover({ ...props }) {
  return <PopoverPrimitive.Root {...props} />;
}

export function PopoverTrigger({ ...props }) {
  return <PopoverPrimitive.Trigger {...props} />;
}

export function PopoverContent({ className, align = 'start', ...props }) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        align={align}
        className={cn(
          'z-50 w-auto rounded-md border border-border bg-background p-3 outline-none',
          className
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}
