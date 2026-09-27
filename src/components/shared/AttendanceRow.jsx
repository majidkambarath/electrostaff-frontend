import { Lock, MapPin, Minus, Plane, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ROLE_LABELS } from '@/lib/format';
import { Avatar } from '@/components/shared/Avatar';

const ATTENDANCE_OPTIONS = [
  { value: 'present', label: 'Present', active: 'border-emerald-600 bg-emerald-600 text-white' },
  { value: 'half', label: 'Half', active: 'border-amber-500 bg-amber-500 text-white' },
  { value: 'absent', label: 'Absent', active: 'border-red-600 bg-red-600 text-white' },
  { value: 'leave', label: 'Leave', active: 'border-slate-500 bg-slate-500 text-white' },
];

const MAX_OT = 16;

// Overtime hours stepper; only offered on days actually worked.
function OtStepper({ value, onChange, disabled, name }) {
  const set = (v) => onChange(Math.min(MAX_OT, Math.max(0, v)));
  return (
    <div
      className={cn(
        'inline-flex h-10 items-center rounded-md border border-border bg-background sm:h-8',
        value > 0 && 'border-blue-300 bg-blue-50'
      )}
      aria-label={`Overtime hours for ${name}`}
      role="group"
    >
      <button
        type="button"
        disabled={disabled || value <= 0}
        onClick={() => set(value - 1)}
        className="flex h-full w-11 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40 sm:w-7"
        aria-label="Less overtime"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="min-w-[3.25rem] text-center text-xs font-medium tabular-nums">
        {value > 0 ? `OT ${value}h` : 'OT'}
      </span>
      <button
        type="button"
        disabled={disabled || value >= MAX_OT}
        onClick={() => set(value + 1)}
        className="flex h-full w-11 items-center justify-center text-muted-foreground hover:text-foreground disabled:opacity-40 sm:w-7"
        aria-label="More overtime"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

// One staff member's attendance for a day: identity, context hints, a segmented status control
// and overtime hours.
export function AttendanceRow({ staff, status, ot = 0, onChange, onOtChange, leaveType, lockedBy, elsewhere = [], dirty }) {
  const locked = Boolean(lockedBy);
  const worked = status === 'present' || status === 'half';
  return (
    <div
      className={cn(
        'flex flex-col gap-3 px-3 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-4',
        dirty && 'bg-blue-50/50'
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Avatar name={staff.name} />
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{staff.name}</p>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            <span>{ROLE_LABELS[staff.role] || staff.role}</span>
            {leaveType && (
              <span className="inline-flex items-center gap-1 text-slate-700">
                <Plane className="h-3 w-3" /> On approved {leaveType} leave
              </span>
            )}
            {elsewhere.map((e) => (
              <span key={e.siteName} className="inline-flex items-center gap-1 text-amber-700">
                <MapPin className="h-3 w-3" /> {e.status === 'half' ? 'Half day' : 'Worked'} at {e.siteName}
              </span>
            ))}
            {locked && (
              <span className="inline-flex items-center gap-1">
                <Lock className="h-3 w-3" /> In a {lockedBy} payment
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center lg:shrink-0">
        <div role="radiogroup" aria-label={`Attendance for ${staff.name}`} className="grid w-full grid-cols-4 gap-1 sm:w-auto">
          {ATTENDANCE_OPTIONS.map((opt) => {
            const selected = status === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={locked}
                onClick={() => onChange(selected ? '' : opt.value)}
                className={cn(
                  'h-10 min-w-0 rounded-md border px-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60 sm:h-8 sm:w-[4.5rem] sm:text-xs',
                  selected ? opt.active : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
        {/* Phones: only shown on worked days. Wider screens keep the slot so rows stay aligned. */}
        <div className={cn('sm:w-[7.5rem]', !worked && 'hidden sm:invisible sm:block')} aria-hidden={!worked}>
          <OtStepper value={ot} onChange={onOtChange} disabled={locked || !worked} name={staff.name} />
        </div>
      </div>
    </div>
  );
}
