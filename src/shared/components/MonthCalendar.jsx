import { Link } from 'react-router-dom';
import { cn } from '@/shared/lib/utils';
import { toISODate } from '@/shared/lib/format';
import { Card } from '@/shared/ui/card';

const DAY_STYLE = {
  present: 'bg-emerald-600 text-white',
  half: 'bg-amber-500 text-white',
  absent: 'bg-red-600 text-white',
  leave: 'bg-slate-500 text-white',
};
const DAY_SHORT = { present: 'P', half: 'H', absent: 'A', leave: 'L' };

// Month grid (Mon–Sun): one chip per attendance record, OT hours, and per-site totals below.
// siteLink(id) makes the site totals clickable (office app only).
export function MonthCalendar({ year, month, records, siteLink }) {
  const byDay = new Map();
  const bySite = new Map();
  records.forEach((r) => {
    const key = toISODate(r.date);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(r);
    const sid = r.siteId?._id || 'removed';
    const site = bySite.get(sid) || { name: r.siteId?.name || 'Removed site', id: r.siteId?._id, days: 0 };
    if (r.status === 'present') site.days += 1;
    if (r.status === 'half') site.days += 0.5;
    bySite.set(sid, site);
  });

  const first = new Date(year, month - 1, 1);
  const daysInMonth = new Date(year, month, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const today = toISODate(new Date());
  const cells = [
    ...Array.from({ length: lead }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => toISODate(new Date(year, month - 1, i + 1))),
  ];

  return (
    <div className="space-y-3">
      <Card className="p-3">
        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted-foreground">
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => <div key={d} className="py-1">{d}</div>)}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((key, i) => {
            if (!key) return <div key={`blank-${i}`} />;
            const recs = byDay.get(key) || [];
            const day = Number(key.slice(8));
            return (
              <div
                key={key}
                title={recs.map((r) => `${r.siteId?.name || 'Site'}: ${r.status}`).join('\n') || undefined}
                className={cn(
                  'flex min-h-12 flex-col items-center gap-1 rounded-md border border-border p-1 sm:min-h-14',
                  key > today && 'opacity-40',
                  key === today && 'border-primary'
                )}
              >
                <span className="text-xs tabular-nums text-muted-foreground">{day}</span>
                <div className="flex flex-wrap justify-center gap-0.5">
                  {recs.map((r) => (
                    <span key={r._id} className={cn('flex h-4 w-4 items-center justify-center rounded-sm text-[10px] font-semibold sm:h-5 sm:w-5', DAY_STYLE[r.status])}>
                      {DAY_SHORT[r.status]}
                    </span>
                  ))}
                </div>
                {recs.some((r) => r.otHours > 0) && (
                  <span className="text-[10px] font-medium leading-none text-blue-700">
                    +{recs.reduce((sum, r) => sum + (r.otHours || 0), 0)}h
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {Object.entries(DAY_SHORT).map(([status, short]) => (
            <span key={status} className="inline-flex items-center gap-1.5">
              <span className={cn('flex h-4 w-4 items-center justify-center rounded-sm text-[10px] font-semibold', DAY_STYLE[status])}>{short}</span>
              <StatusBadgeLabel status={status} />
            </span>
          ))}
        </div>
      </Card>
      <div className="flex flex-wrap gap-2">
        {[...bySite.values()].map((s) => {
          const body = (
            <>
              <span className="font-medium">{s.name}</span>
              <span className="text-muted-foreground">{s.days} payable days</span>
            </>
          );
          const chip = 'inline-flex min-h-10 items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm sm:min-h-0 sm:text-xs';
          return siteLink && s.id ? (
            <Link key={s.name} to={siteLink(s.id)} className={cn(chip, 'hover:bg-muted')}>{body}</Link>
          ) : (
            <span key={s.name} className={chip}>{body}</span>
          );
        })}
      </div>
    </div>
  );
}

const StatusBadgeLabel = ({ status }) => ({ present: 'Present', half: 'Half day', absent: 'Absent', leave: 'Leave' })[status];
