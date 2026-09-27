import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { shiftISODate, todayISO } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Date input with previous/next day buttons; never steps past `max` (defaults to today).
export function DateStepper({ value, onChange, max = todayISO(), className }) {
  const atMax = max && value >= max;
  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Button type="button" variant="outline" size="icon" aria-label="Previous day" onClick={() => onChange(shiftISODate(value, -1))}>
        <ChevronLeft />
      </Button>
      <Input
        type="date"
        value={value}
        max={max}
        onChange={(e) => e.target.value && onChange(e.target.value)}
        className="min-w-0 flex-1 sm:w-40 sm:flex-none"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        aria-label="Next day"
        disabled={atMax}
        onClick={() => onChange(shiftISODate(value, 1))}
      >
        <ChevronRight />
      </Button>
      {value !== todayISO() && (
        <Button type="button" variant="ghost" size="sm" onClick={() => onChange(todayISO())}>
          Today
        </Button>
      )}
    </div>
  );
}
