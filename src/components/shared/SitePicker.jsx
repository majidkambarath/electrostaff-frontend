import { useMemo, useState } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ROLE_LABELS } from '@/lib/format';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function SitePicker({ sites, value, onChange, placeholder = 'Select site', className }) {
  return (
    <Select value={value || undefined} onValueChange={onChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {sites.map((site) => (
          <SelectItem key={site._id} value={site._id}>
            {site.name}
            {site.status !== 'active' && <span className="ml-1 text-muted-foreground">({site.status})</span>}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// On phones, focusing the search would pop the keyboard over the list; let people scroll first.
const coarsePointer = () => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;

// Searchable staff combobox; scales to long staff lists where a plain select doesn't.
export function StaffPicker({ staff, value, onChange, placeholder = 'Select staff', className, invalid }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = staff.find((s) => s._id === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return staff;
    return staff.filter((s) => s.name.toLowerCase().includes(q) || s.phone?.includes(q));
  }, [staff, query]);

  return (
    <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQuery(''); }}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            'flex h-10 w-full items-center justify-between gap-2 rounded-md border border-border bg-background px-3 text-left text-base sm:h-9 sm:text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            invalid && 'border-red-400',
            className
          )}
        >
          <span className={cn('truncate', !selected && 'text-muted-foreground')}>
            {selected ? selected.name : placeholder}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) min-w-64 p-0">
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            autoFocus={!coarsePointer()}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or phone…"
            className="h-11 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground sm:h-9 sm:text-sm"
          />
        </div>
        <div className="max-h-64 overflow-y-auto p-1">
          {filtered.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">No staff found</p>
          ) : (
            filtered.map((s) => (
              <button
                key={s._id}
                type="button"
                onClick={() => {
                  onChange(s._id);
                  setOpen(false);
                  setQuery('');
                }}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-2.5 text-left text-sm hover:bg-muted focus:bg-muted focus:outline-none sm:py-1.5"
              >
                <Check className={cn('h-4 w-4 shrink-0', s._id === value ? 'opacity-100' : 'opacity-0')} />
                <span className="min-w-0 flex-1 truncate">{s.name}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{ROLE_LABELS[s.role] || s.role}</span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
