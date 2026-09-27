import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { CheckCheck, UserPlus, Users } from 'lucide-react';
import { attendanceApi } from '@/features/attendance/api';
import { useApi } from '@/shared/hooks/useApi';
import { cn } from '@/shared/lib/utils';
import { Button, buttonVariants } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Skeleton } from '@/shared/ui/skeleton';
import { AttendanceRow } from '@/features/attendance/components/AttendanceRow';
import { EmptyState, ErrorState } from '@/shared/components/States';
import { SearchInput } from '@/shared/components/Toolbar';

const SUMMARY = [
  { key: 'present', label: 'Present', dot: 'bg-emerald-600' },
  { key: 'half', label: 'Half', dot: 'bg-amber-500' },
  { key: 'absent', label: 'Absent', dot: 'bg-red-600' },
  { key: 'leave', label: 'Leave', dot: 'bg-slate-500' },
  { key: '', label: 'Not marked', dot: 'bg-border' },
];

// Marks attendance for one site on one day. Only changed rows are sent on save.
export function AttendanceBoard({ siteId, date, onDirtyChange, onSaved }) {
  const { data, error, loading, reload } = useApi(
    () => attendanceApi.getBySite({ siteId, date }),
    [siteId, date]
  );
  const [marks, setMarks] = useState({});
  const [ots, setOts] = useState({});
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);

  const rows = useMemo(() => data?.records || [], [data]);
  const saved = useMemo(
    () => Object.fromEntries(rows.map((r) => [r.staff._id, r.attendance?.status || ''])),
    [rows]
  );
  const savedOt = useMemo(
    () => Object.fromEntries(rows.map((r) => [r.staff._id, r.attendance?.otHours || 0])),
    [rows]
  );
  // Overtime only counts on worked days, so it reads as 0 otherwise.
  const otOf = (id) => (['present', 'half'].includes(marks[id]) ? ots[id] || 0 : 0);

  // Fresh data: start from what is saved, pre-filling approved leave for unmarked staff.
  useEffect(() => {
    const next = {};
    rows.forEach((r) => {
      next[r.staff._id] = r.attendance?.status || (r.leaveType && !r.lockedBy ? 'leave' : '');
    });
    setMarks(next);
    setOts(Object.fromEntries(rows.map((r) => [r.staff._id, r.attendance?.otHours || 0])));
  }, [rows]);

  const isDirty = (r) =>
    !r.lockedBy && ((marks[r.staff._id] ?? '') !== saved[r.staff._id] || otOf(r.staff._id) !== savedOt[r.staff._id]);
  const changed = rows.filter(isDirty);
  const totalOt = rows.reduce((sum, r) => sum + otOf(r.staff._id), 0);
  const dirty = changed.length > 0;

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  useEffect(() => {
    if (!dirty) return undefined;
    const handler = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const counts = useMemo(() => {
    const c = { present: 0, half: 0, absent: 0, leave: 0, '': 0 };
    rows.forEach((r) => {
      c[marks[r.staff._id] || ''] += 1;
    });
    return c;
  }, [rows, marks]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? rows.filter((r) => r.staff.name.toLowerCase().includes(q)) : rows;
  }, [rows, query]);

  const setAll = (status, onlyUnmarked = false) => {
    setMarks((prev) => {
      const next = { ...prev };
      rows.forEach((r) => {
        if (r.lockedBy) return;
        if (onlyUnmarked && next[r.staff._id]) return;
        // Bulk actions keep approved leave; a single row can still be changed by hand.
        next[r.staff._id] = r.leaveType ? 'leave' : status;
      });
      return next;
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const records = changed.map((r) => ({
        staffId: r.staff._id,
        status: marks[r.staff._id] || '',
        otHours: otOf(r.staff._id),
      }));
      const res = await attendanceApi.bulk({ siteId, date, records });
      if (res.saved) toast.success(`Attendance saved for ${res.saved} ${res.saved === 1 ? 'person' : 'people'}`);
      if (res.skipped?.length) {
        const names = Object.fromEntries(rows.map((r) => [r.staff._id, r.staff.name]));
        toast.warning(`${res.skipped.length} not saved`, {
          description: res.skipped.map((s) => `${names[s.staffId] || 'Staff'}: ${s.reason}`).join('\n'),
          duration: 8000,
        });
      }
      await reload();
      onSaved?.();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-9 w-full max-w-lg" />
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
      </div>
    );
  }
  if (error && !data) return <ErrorState error={error} onRetry={reload} />;

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No staff assigned to this site"
        description="Assign your team to the site before marking attendance."
        action={
          <Link to={`/sites/${siteId}?tab=team`} className={buttonVariants({ size: 'sm' })}>
            <UserPlus /> Assign staff
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground" aria-live="polite">
          {SUMMARY.map((s) => (
            <span key={s.key || 'none'} className="inline-flex items-center gap-1.5">
              <span className={cn('h-2 w-2 rounded-full', s.dot)} />
              {s.label} <span className="font-semibold tabular-nums text-foreground">{counts[s.key]}</span>
            </span>
          ))}
          {totalOt > 0 && (
            <span>
              Overtime <span className="font-semibold tabular-nums text-foreground">{totalOt} h</span>
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {rows.length > 8 && <SearchInput value={query} onChange={setQuery} placeholder="Find staff…" className="sm:w-48" />}
          <Button variant="outline" size="sm" onClick={() => setAll('present', true)} disabled={counts[''] === 0}>
            <CheckCheck /> Rest present
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAll('present')}>All present</Button>
          <Button variant="outline" size="sm" onClick={() => setAll('absent', true)} disabled={counts[''] === 0}>
            Rest absent
          </Button>
        </div>
      </div>

      <Card className="divide-y divide-border overflow-hidden">
        {visible.map((r) => (
          <AttendanceRow
            key={r.staff._id}
            staff={r.staff}
            status={marks[r.staff._id]}
            leaveType={r.leaveType}
            lockedBy={r.lockedBy}
            elsewhere={r.elsewhere}
            selfCheckIn={r.attendance?.source === 'staff' ? r.attendance.checkIn || {} : null}
            ot={otOf(r.staff._id)}
            dirty={isDirty(r)}
            onChange={(status) => setMarks((prev) => ({ ...prev, [r.staff._id]: status }))}
            onOtChange={(value) => setOts((prev) => ({ ...prev, [r.staff._id]: value }))}
          />
        ))}
        {visible.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No staff match “{query}”.</p>}
      </Card>

      <div
        className={cn(
          'sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3 lg:bottom-4',
          !dirty && 'hidden'
        )}
      >
        <p className="text-sm">
          <span className="font-semibold">{changed.length}</span> unsaved {changed.length === 1 ? 'change' : 'changes'}
          {counts[''] > 0 && <span className="text-muted-foreground"> · {counts['']} not marked</span>}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => {
              setMarks({ ...saved });
              setOts({ ...savedOt });
            }} disabled={saving}>
            Discard
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save attendance'}
          </Button>
        </div>
      </div>
    </div>
  );
}
