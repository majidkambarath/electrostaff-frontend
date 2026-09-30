import { cn } from '@/shared/lib/utils';
import { todayISO } from '@/shared/lib/format';
import { Input } from '@/shared/ui/input';

// Preset pills + from/to date inputs. `range` is { key, from, to }; presets from buildRangePresets().
export function DateRangeBar({ presets, range, onChange, className }) {
  return (
    <div className={cn('flex flex-col gap-2 print:hidden lg:flex-row lg:items-center lg:justify-between', className)}>
      <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {presets.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => onChange({ key: p.key, from: p.from, to: p.to })}
            className={cn(
              'h-10 shrink-0 rounded-full border border-border px-3.5 text-sm font-medium sm:h-8 sm:px-3 sm:text-xs text-muted-foreground hover:bg-muted hover:text-foreground',
              range.key === p.key && 'border-primary bg-primary/10 text-primary'
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="date"
          aria-label="From"
          value={range.from}
          max={range.to}
          onChange={(e) => onChange({ ...range, key: 'custom', from: e.target.value })}
          className="sm:w-40"
        />
        <span className="text-sm text-muted-foreground">to</span>
        <Input
          type="date"
          aria-label="To"
          value={range.to}
          min={range.from}
          max={todayISO()}
          onChange={(e) => onChange({ ...range, key: 'custom', to: e.target.value })}
          className="sm:w-40"
        />
      </div>
    </div>
  );
}
