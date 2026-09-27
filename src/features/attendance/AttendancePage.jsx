import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Building2, CheckCircle2, ExternalLink } from 'lucide-react';
import { sitesApi } from '@/features/sites/api';
import { useApi } from '@/shared/hooks/useApi';
import { cn } from '@/shared/lib/utils';
import { formatDateLong, todayISO } from '@/shared/lib/format';
import { buttonVariants } from '@/shared/ui/button';
import { PageHeader } from '@/shared/components/PageHeader';
import { PageLoader } from '@/shared/components/PageLoader';
import { EmptyState, ErrorState } from '@/shared/components/States';
import { DateStepper } from '@/shared/components/DateStepper';
import { SitePicker } from '@/shared/components/SitePicker';
import { useConfirm } from '@/shared/components/ConfirmDialog';
import { AttendanceBoard } from '@/features/attendance/components/AttendanceBoard';

export default function Attendance() {
  const confirm = useConfirm();
  const [params, setParams] = useSearchParams();
  const { data: sites, error, loading, reload } = useApi(() => sitesApi.getAll(), [], { cacheKey: 'sites' });
  const [date, setDate] = useState(params.get('date') || todayISO());
  const dirtyRef = useRef(false);

  const activeSites = useMemo(() => (sites || []).filter((s) => s.status === 'active'), [sites]);
  const requested = params.get('site');
  const siteId =
    (requested && sites?.some((s) => s._id === requested) && requested) ||
    activeSites.find((s) => s.markedToday < s.staffCount)?._id ||
    activeSites[0]?._id ||
    '';
  const site = sites?.find((s) => s._id === siteId);

  // Keep the selected site in the URL so the page can be bookmarked or shared.
  useEffect(() => {
    if (siteId && requested !== siteId) setParams({ site: siteId }, { replace: true });
  }, [siteId, requested, setParams]);

  const guard = async () =>
    !dirtyRef.current ||
    confirm({
      title: 'Discard unsaved attendance?',
      description: 'You have marked attendance that has not been saved yet.',
      confirmLabel: 'Discard',
      destructive: true,
    });

  const changeSite = async (id) => {
    if (id === siteId || !(await guard())) return;
    setParams({ site: id }, { replace: true });
  };

  const changeDate = async (d) => {
    if (d === date || !(await guard())) return;
    setDate(d);
  };

  const onDirtyChange = useCallback((dirty) => {
    dirtyRef.current = dirty;
  }, []);

  if (loading) return <PageLoader title="Attendance" description="Mark daily attendance per site" />;
  if (error && !sites) return <ErrorState error={error} onRetry={reload} />;

  if (activeSites.length === 0 && !site) {
    return (
      <div className="space-y-4">
        <PageHeader title="Attendance" description="Mark daily attendance per site" />
        <EmptyState
          icon={Building2}
          title="No active sites"
          description="Create a site and assign staff to start marking attendance."
          action={<Link to="/sites" className={buttonVariants({ size: 'sm' })}>Go to sites</Link>}
        />
      </div>
    );
  }

  const isToday = date === todayISO();

  return (
    <div className="space-y-4">
      <PageHeader
        title="Attendance"
        description={formatDateLong(date)}
        actions={
          site && (
            <Link to={`/sites/${site._id}`} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
              <ExternalLink /> Site details
            </Link>
          )
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <SitePicker
          sites={site && !activeSites.includes(site) ? [...activeSites, site] : activeSites}
          value={siteId}
          onChange={changeSite}
          className="sm:w-72"
        />
        <DateStepper value={date} onChange={changeDate} />
      </div>

      {isToday && activeSites.length > 1 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" aria-label="Sites today">
          {activeSites.map((s) => {
            const done = s.staffCount > 0 && s.markedToday >= s.staffCount;
            return (
              <button
                key={s._id}
                type="button"
                onClick={() => changeSite(s._id)}
                className={cn(
                  'inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border sm:h-8 px-3 text-xs font-medium transition-colors',
                  s._id === siteId
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-muted-foreground hover:text-foreground'
                )}
              >
                {done && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />}
                {s.name}
                <span className="tabular-nums opacity-70">
                  {s.markedToday}/{s.staffCount}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {siteId && (
        <AttendanceBoard
          key={`${siteId}-${date}`}
          siteId={siteId}
          date={date}
          onDirtyChange={onDirtyChange}
          onSaved={reload}
        />
      )}
    </div>
  );
}
