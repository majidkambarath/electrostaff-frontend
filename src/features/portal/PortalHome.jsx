import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { CalendarOff, CheckCircle2, ChevronRight, HandCoins, Loader2, MapPin, Undo2, Wallet } from 'lucide-react';
import { portalApi } from '@/features/portal/api';
import { useAuth } from '@/features/auth/AuthContext';
import { useApi } from '@/shared/hooks/useApi';
import { cn } from '@/shared/lib/utils';
import { formatCurrency, formatDate, formatDateLong, formatRange } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { StatTile } from '@/shared/components/StatTile';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { ErrorState } from '@/shared/components/States';
import { PageLoader } from '@/shared/components/PageLoader';

const greeting = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
};
const clock = (d) => new Date(d).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });

// Best-effort GPS: resolves null when unavailable, denied or slow. Sites with a check-in zone ask
// for a fresh, precise fix and wait longer (the server refuses a check-in without one).
const getLocation = (strict = false) =>
  new Promise((resolve) => {
    if (!navigator.geolocation || !window.isSecureContext) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      () => resolve(null),
      strict ? { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 } : { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  });

function CheckInCard({ home, onChanged }) {
  const openSites = home.sites.filter((s) => !home.today.some((t) => String(t.site?._id) === String(s._id)));
  const [siteId, setSiteId] = useState(openSites[0]?._id || '');
  const [status, setStatus] = useState('present');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!openSites.some((s) => s._id === siteId)) setSiteId(openSites[0]?._id || '');
  }, [openSites, siteId]);

  const checkIn = async () => {
    setBusy(true);
    try {
      const fenced = Boolean(openSites.find((s) => s._id === siteId)?.geofence);
      const location = await getLocation(fenced);
      if (fenced && !location) throw new Error('This site checks your location. Turn on location (GPS) and allow it for this app, then try again.');
      const res = await portalApi.checkIn({ siteId, status, ...(location || {}) });
      toast.success(res.message, { description: location ? 'Location shared with the office' : undefined });
      onChanged();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const undo = async (id) => {
    try {
      const res = await portalApi.undoCheckIn(id);
      toast.success(res.message);
      onChanged();
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Today · {formatDate(new Date())}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {home.today.map((t) => (
          <div key={t._id} className="flex items-center gap-3 rounded-md border border-emerald-200 bg-emerald-50 p-3">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
            <div className="min-w-0 flex-1 text-sm">
              <p className="font-medium">
                <StatusBadge status={t.status} className="mr-1.5" /> {t.site?.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {t.source === 'staff' ? `You checked in at ${clock(t.checkIn?.at)}` : 'Marked by the office'}
                {t.otHours ? ` · ${t.otHours}h overtime` : ''}
              </p>
            </div>
            {t.source === 'staff' && (
              <Button variant="ghost" size="sm" onClick={() => undo(t.site._id)}>
                <Undo2 /> Undo
              </Button>
            )}
          </div>
        ))}

        {home.sites.length === 0 ? (
          <p className="rounded-md bg-muted px-3 py-3 text-sm text-muted-foreground">
            You are not assigned to a site yet. Ask the office to add you to your site.
          </p>
        ) : openSites.length === 0 ? (
          home.today.length > 0 && <p className="text-center text-sm text-muted-foreground">You’re all set for today.</p>
        ) : (
          <div className="space-y-3">
            {openSites.length > 1 ? (
              <div className="space-y-2" role="radiogroup" aria-label="Site">
                {openSites.map((s) => (
                  <button
                    key={s._id}
                    type="button"
                    role="radio"
                    aria-checked={siteId === s._id}
                    onClick={() => setSiteId(s._id)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-md border p-3 text-left',
                      siteId === s._id ? 'border-primary bg-primary/5' : 'border-border'
                    )}
                  >
                    <span className={cn('h-4 w-4 shrink-0 rounded-full border-2', siteId === s._id ? 'border-primary bg-primary' : 'border-border')} />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{s.name}</span>
                      {(s.address || s.clientName) && <span className="block truncate text-xs text-muted-foreground">{s.address || s.clientName}</span>}
                      {s.geofence && <span className="block text-xs text-blue-700">Check in at the site · location is checked</span>}
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm">
                Site: <span className="font-medium">{openSites[0].name}</span>
                {openSites[0].geofence && <span className="block text-xs text-blue-700">Check in at the site · location is checked</span>}
              </p>
            )}
            <div className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1" role="radiogroup" aria-label="Day">
              {[
                { value: 'present', label: 'Full day' },
                { value: 'half', label: 'Half day' },
              ].map((o) => (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={status === o.value}
                  onClick={() => setStatus(o.value)}
                  className={cn('h-10 rounded-sm text-sm font-medium text-muted-foreground', status === o.value && 'bg-background text-foreground')}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <Button className="h-12 w-full text-base" onClick={checkIn} disabled={busy || !siteId}>
              {busy ? <Loader2 className="animate-spin" /> : <MapPin />} {busy ? 'Checking in…' : 'Check in now'}
            </Button>
            <p className="text-center text-xs text-muted-foreground">Your time and location (if allowed) are sent to the office.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function PortalHome() {
  const { principal } = useAuth();
  const { data: home, error, loading, reload } = useApi(() => portalApi.home(), [], { cacheKey: 'me:home' });

  if (loading) return <PageLoader />;
  if (error && !home) return <ErrorState error={error} onRetry={reload} />;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold">{greeting()}, {principal.name.split(' ')[0]}</h1>
        <p className="text-sm text-muted-foreground">{formatDateLong(new Date())}</p>
      </div>

      <CheckInCard home={home} onChanged={reload} />

      <div className="grid grid-cols-2 gap-3">
        <StatTile label="Days this month" value={home.month.payableDays} hint={home.month.otHours ? `+ ${home.month.otHours}h overtime` : `${home.month.absent} absent · ${home.month.leave} leave`} />
        <StatTile label="Earned this month" value={formatCurrency(home.month.earned)} hint={`${formatCurrency(home.staff.dailyWage)}/day`} tone="primary" />
        <StatTile
          label="Wages not paid yet"
          value={formatCurrency(home.unpaid?.amount || 0)}
          hint={home.unpaid ? formatRange(home.unpaid.from, home.unpaid.to) : 'All paid up'}
          icon={Wallet}
          tone={home.unpaid ? 'warning' : 'success'}
        />
        <StatTile label="Advance to repay" value={formatCurrency(home.advanceBalance)} hint="Recovered from wages" icon={HandCoins} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link to="/me/leaves?new=1" className="flex items-center gap-2 rounded-lg border border-border bg-card p-3 text-sm font-medium hover:bg-muted">
          <CalendarOff className="h-4 w-4 text-primary" /> Apply for leave
          {home.pendingLeaves > 0 && <span className="ml-auto text-xs text-amber-700">{home.pendingLeaves} pending</span>}
        </Link>
        <Link to="/me/requests?new=advance" className="flex items-center gap-2 rounded-lg border border-border bg-card p-3 text-sm font-medium hover:bg-muted">
          <HandCoins className="h-4 w-4 text-primary" /> Ask for advance
          {home.pendingRequests > 0 && <span className="ml-auto text-xs text-amber-700">{home.pendingRequests} pending</span>}
        </Link>
      </div>

      <Card className="overflow-hidden">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle>Recent payslips</CardTitle>
          <Link to="/me/payslips" className="tap text-xs font-medium text-primary">All payslips</Link>
        </CardHeader>
        {home.recentPayments.length === 0 ? (
          <CardContent><p className="text-sm text-muted-foreground">No payments yet.</p></CardContent>
        ) : (
          <ul className="divide-y divide-border">
            {home.recentPayments.map((p) => (
              <li key={p._id}>
                <Link to={`/me/payslips/${p._id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{formatRange(p.periodStart, p.periodEnd)}</p>
                    <p className="text-xs text-muted-foreground">{p.totalDays} days{p.paidDate ? ` · paid ${formatDate(p.paidDate)}` : ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{formatCurrency(p.netAmount)}</p>
                    <StatusBadge status={p.status} />
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
