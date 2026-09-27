import { MoreHorizontal, Search, X } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from '@/shared/ui/dropdown-menu';

export function Toolbar({ className, children }) {
  return (
    <div className={cn('flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center', className)}>{children}</div>
  );
}

export function SearchInput({ value, onChange, placeholder = 'Search…', className }) {
  return (
    <div className={cn('relative w-full sm:w-64', className)}>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-8 pr-8 [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange('')}
          className="tap absolute right-2 top-1/2 -translate-y-1/2 rounded-sm text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

// Segmented filter with optional counts, e.g. All 12 · Active 9 · Completed 3.
export function FilterTabs({ options, value, onChange, className }) {
  return (
    <div
      role="tablist"
      className={cn('no-scrollbar inline-flex h-11 max-w-full items-center gap-1 overflow-x-auto rounded-md border border-border bg-muted p-1 sm:h-9', className)}
    >
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={cn(
            'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-sm px-3 text-sm font-medium sm:h-7 sm:px-2.5 sm:text-xs text-muted-foreground transition-colors hover:text-foreground',
            value === opt.value && 'bg-background text-foreground'
          )}
        >
          {opt.label}
          {opt.count !== undefined && (
            <span className="rounded bg-muted px-1 text-[11px] tabular-nums text-muted-foreground">{opt.count}</span>
          )}
        </button>
      ))}
    </div>
  );
}

export function RowActions({ children, label = 'Actions' }) {
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={label}>
          <MoreHorizontal />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>{children}</DropdownMenuContent>
    </DropdownMenu>
  );
}
