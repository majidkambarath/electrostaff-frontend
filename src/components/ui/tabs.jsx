import { useEffect, useRef, useState } from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '@/lib/utils';

export function Tabs({ className, ...props }) {
  return <TabsPrimitive.Root className={cn('w-full', className)} {...props} />;
}

// On narrow screens the list scrolls sideways: the active tab is kept in view and the edges
// fade where more tabs are hidden, so off-screen tabs are discoverable.
export function TabsList({ className, ...props }) {
  const ref = useRef(null);
  const [fade, setFade] = useState({ left: false, right: false });

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const update = () =>
      setFade({ left: el.scrollLeft > 4, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4 });
    const active = el.querySelector('[data-state="active"]');
    active?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    update();
    el.addEventListener('scroll', update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', update);
      ro.disconnect();
    };
  }, []);

  const mask =
    fade.left && fade.right
      ? 'linear-gradient(to right, transparent, black 24px, black calc(100% - 24px), transparent)'
      : fade.right
        ? 'linear-gradient(to right, black calc(100% - 32px), transparent)'
        : fade.left
          ? 'linear-gradient(to left, black calc(100% - 32px), transparent)'
          : undefined;

  return (
    <TabsPrimitive.List
      ref={ref}
      style={mask ? { maskImage: mask, WebkitMaskImage: mask } : undefined}
      className={cn(
        'no-scrollbar inline-flex h-11 w-full max-w-full items-center justify-start gap-1 overflow-x-auto rounded-md border border-border bg-muted p-1 sm:h-9 sm:w-auto',
        className
      )}
      {...props}
    />
  );
}

export function TabsTrigger({ className, onClick, ...props }) {
  return (
    <TabsPrimitive.Trigger
      onClick={(e) => {
        e.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
        onClick?.(e);
      }}
      className={cn(
        'inline-flex h-9 shrink-0 grow items-center justify-center whitespace-nowrap rounded-sm px-3 text-sm font-medium text-muted-foreground transition-colors data-[state=active]:bg-background data-[state=active]:text-foreground sm:h-7 sm:grow-0',
        className
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }) {
  return <TabsPrimitive.Content className={cn('mt-4 focus-visible:outline-none', className)} {...props} />;
}
