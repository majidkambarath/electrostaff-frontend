import { useMemo, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { portalApi } from '@/features/portal/api';
import { useApi } from '@/shared/hooks/useApi';
import { MONTHS } from '@/shared/lib/format';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { PageHeader } from '@/shared/components/PageHeader';
import { EmptyState, ErrorState } from '@/shared/components/States';
import { Skeleton } from '@/shared/ui/skeleton';
import { MonthCalendar } from '@/shared/components/MonthCalendar';

export default function PortalAttendance() {
  const now = new Date();
  const [period, setPeriod] = useState(`${now.getFullYear()}-${now.getMonth() + 1}`);
  const [year, month] = period.split('-').map(Number);
  const { data, error, loading, reload } = useApi(() => portalApi.attendance({ month, year }), [period], { cacheKey: `me:att:${period}` });

  const periods = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        return { value: `${d.getFullYear()}-${d.getMonth() + 1}`, label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}` };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const s = data?.summary || {};
  return (
    <div className="space-y-4">
      <PageHeader title="My attendance" description="Days you worked, by site" />
      <Select value={period} onValueChange={setPeriod}>
        <SelectTrigger aria-label="Month"><SelectValue /></SelectTrigger>
        <SelectContent>
          {periods.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
        </SelectContent>
      </Select>
      <div className="grid grid-cols-4 gap-2 text-center text-xs">
        {[
          ['Present', s.present],
          ['Half day', s.half],
          ['Absent', s.absent],
          ['Leave', s.leave],
        ].map(([label, value]) => (
          <div key={label} className="rounded-md border border-border bg-card px-2 py-2">
            <p className="text-lg font-semibold">{value ?? '–'}</p>
            <p className="text-muted-foreground">{label}</p>
          </div>
        ))}
      </div>
      <p className="text-sm text-muted-foreground">
        Payable days <b className="text-foreground">{s.payableDays ?? 0}</b>
        {s.otHours > 0 && <> · Overtime <b className="text-foreground">{s.otHours} h</b></>}
      </p>
      {error && !data ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading ? (
        <Skeleton className="h-80 w-full" />
      ) : data.records.length === 0 ? (
        <EmptyState compact icon={CalendarDays} title="No attendance this month" />
      ) : (
        <MonthCalendar year={year} month={month} records={data.records} />
      )}
    </div>
  );
}
