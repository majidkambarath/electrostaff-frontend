import { useMemo, useState } from 'react';
import { Link, Route, Routes, Navigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Building2, Eye, PauseCircle, PlayCircle, Plus, ShieldCheck, Users, Zap, MapPin, Smartphone } from 'lucide-react';
import { platformApi } from '@/features/platform/api';
import { AddBusinessDialog } from '@/features/platform/components/AddBusinessDialog';
import { PlanEditor } from '@/features/platform/components/PlanEditor';
import { ChangePasswordForm } from '@/features/auth/AuthScreens';
import { UserMenu } from '@/features/auth/UserMenu';
import { useAuth } from '@/features/auth/AuthContext';
import { useApi } from '@/shared/hooks/useApi';
import { formatDate, formatNumber } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/shared/ui/dropdown-menu';
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/shared/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { PageHeader } from '@/shared/components/PageHeader';
import { PageLoader } from '@/shared/components/PageLoader';
import { StatTile } from '@/shared/components/StatTile';
import { MotionPage } from '@/shared/components/Motion';
import { EmptyState, ErrorState } from '@/shared/components/States';
import { FilterTabs, RowActions, SearchInput, Toolbar } from '@/shared/components/Toolbar';
import { useConfirm } from '@/shared/components/ConfirmDialog';

const STATUS_VARIANT = { active: 'success', suspended: 'danger' };
const STATUS_LABEL = { active: 'Allowed', suspended: 'Blocked' };

function PlanTag({ plan }) {
  if (!plan?.name) return null;
  const tone = plan.expired ? 'danger' : plan.daysLeft !== null && plan.daysLeft <= 7 ? 'warning' : 'secondary';
  return (
    <Badge variant={tone} className="ml-1">
      {plan.label}{plan.expired ? ' · ended' : plan.daysLeft !== null ? ` · ${plan.daysLeft}d` : ''}
    </Badge>
  );
}

function BusinessDetail({ id, onOpenChange, onChanged }) {
  const { data, loading, error, reload } = useApi(() => (id ? platformApi.get(id) : null), [id], { enabled: Boolean(id) });
  return (
    <Sheet open={Boolean(id)} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{data?.name || 'Business'}</SheetTitle>
          <SheetDescription>{data ? `Joined ${formatDate(data.createdAt)} · ${data.slug}` : ' '}</SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-4">
          {loading && <PageLoader />}
          {error && !data && <ErrorState error={error} onRetry={reload} />}
          {data && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <StatTile label="Active staff" value={formatNumber(data.counts.staff)} />
                <StatTile label="Staff app logins" value={formatNumber(data.counts.staffLogins)} />
                <StatTile label="Active sites" value={formatNumber(data.counts.activeSites)} />
                <StatTile label="Paid wage slips" value={formatNumber(data.counts.paidPayments)} />
              </div>
              <PlanEditor key={`${data.id}-${data.plan?.name}-${data.plan?.validUntil}`} orgId={data.id} plan={data.plan} onSaved={() => { reload(); onChanged?.(); }} />
              <dl className="space-y-1.5 text-sm">
                {[['Phone', data.phone], ['Email', data.email], ['Address', data.address]].map(([k, v]) => (
                  <div key={k} className="flex justify-between gap-3">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="text-right">{v || '—'}</dd>
                  </div>
                ))}
              </dl>
              <div>
                <p className="mb-2 text-sm font-medium">Office accounts</p>
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {data.users.map((u) => (
                    <li key={u._id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{u.name}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">{u.phone}</span>
                      </span>
                      <span className="text-right text-xs text-muted-foreground">
                        <Badge variant="secondary">{u.role}</Badge>
                        <span className="mt-0.5 block">{u.lastLoginAt ? `Last in ${formatDate(u.lastLoginAt)}` : 'Never signed in'}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

function Businesses() {
  const { data, loading, error, reload } = useApi(() => Promise.all([platformApi.overview(), platformApi.list()]), [], {
    cacheKey: 'platform:home',
  });
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [adding, setAdding] = useState(false);
  const [viewing, setViewing] = useState(null);
  const confirm = useConfirm();

  const [overview, orgs] = data || [null, []];
  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return orgs.filter(
      (o) =>
        (status === 'all' || o.status === status) &&
        (!needle || [o.name, o.slug, o.owner?.name, o.owner?.phone].some((v) => v?.toLowerCase().includes(needle)))
    );
  }, [orgs, q, status]);

  const toggle = async (o) => {
    const suspend = o.status === 'active';
    const ok = await confirm({
      title: suspend ? `Block access for ${o.name}?` : `Allow access for ${o.name}?`,
      description: suspend
        ? 'The owner, office and staff are signed out and cannot sign in until you allow access again. No data is deleted.'
        : 'The owner, office and staff can sign in again.',
      confirmLabel: suspend ? 'Block access' : 'Allow access',
      destructive: suspend,
    });
    if (!ok) return;
    try {
      await platformApi.setStatus(o.id, suspend ? 'suspended' : 'active');
      toast.success(suspend ? `${o.name} blocked` : `${o.name} can sign in again`);
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) return <PageLoader />;
  if (error && !data) return <ErrorState error={error} onRetry={reload} />;

  const actions = (o) => (
    <RowActions label={`Actions for ${o.name}`}>
      <DropdownMenuItem onSelect={() => setViewing(o.id)}><Eye /> View details</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={() => toggle(o)} className={o.status === 'active' ? 'text-red-600' : undefined}>
        {o.status === 'active' ? <><PauseCircle /> Block access</> : <><PlayCircle /> Allow access</>}
      </DropdownMenuItem>
    </RowActions>
  );

  return (
    <>
      <PageHeader
        title="Businesses"
        description="Create businesses with their owner, and allow or block their access"
        actions={<Button onClick={() => setAdding(true)}><Plus /> Create business</Button>}
      />
      <div className="mb-4 grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        <StatTile label="Businesses" value={formatNumber(overview.organizations)} hint={`${overview.newLast30Days} new in 30 days`} icon={Building2} tone="primary" />
        <StatTile label="Blocked" value={formatNumber(overview.suspended)} hint={`${overview.active} active`} icon={PauseCircle} tone={overview.suspended ? 'danger' : 'default'} />
        <StatTile label="Active staff" value={formatNumber(overview.staff)} hint={`${overview.staffLogins} use the staff app`} icon={Users} tone="success" />
        <StatTile label="Active sites" value={formatNumber(overview.activeSites)} icon={MapPin} tone="warning" />
      </div>
      <Toolbar className="mb-3">
        <SearchInput value={q} onChange={setQ} placeholder="Search business, owner or mobile" />
        <FilterTabs
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: 'All', count: orgs.length },
            { value: 'active', label: 'Active', count: overview.active },
            { value: 'suspended', label: 'Blocked', count: overview.suspended },
          ]}
        />
      </Toolbar>

      {rows.length === 0 ? (
        <EmptyState icon={Building2} title="No businesses found" description={orgs.length ? 'Try another search or filter.' : 'Create the first business and its owner.'} />
      ) : (
        <>
          <div className="hidden rounded-lg border border-border md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead className="text-right">Staff</TableHead>
                  <TableHead className="text-right">Sites</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>
                      <button type="button" onClick={() => setViewing(o.id)} className="text-left font-medium hover:underline">{o.name}</button>
                      <span className="block text-xs text-muted-foreground">{o.slug}</span>
                    </TableCell>
                    <TableCell>
                      {o.owner ? (
                        <>
                          {o.owner.name}
                          <span className="block text-xs text-muted-foreground tabular-nums">{o.owner.phone}</span>
                        </>
                      ) : '—'}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{o.counts.staff}</TableCell>
                    <TableCell className="text-right tabular-nums">{o.counts.activeSites}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{formatDate(o.createdAt)}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANT[o.status]}>{STATUS_LABEL[o.status]}</Badge>
                      <PlanTag plan={o.plan} />
                    </TableCell>
                    <TableCell>{actions(o)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ul className="space-y-2 md:hidden">
            {rows.map((o) => (
              <li key={o.id} className="rounded-lg border border-border bg-card p-3">
                <div className="flex items-start justify-between gap-2">
                  <button type="button" onClick={() => setViewing(o.id)} className="tap min-w-0 text-left">
                    <span className="block truncate font-medium">{o.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {o.owner ? `${o.owner.name} · ${o.owner.phone}` : 'No owner'}
                    </span>
                  </button>
                  {actions(o)}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <Badge variant={STATUS_VARIANT[o.status]}>{STATUS_LABEL[o.status]}</Badge>
                  <PlanTag plan={o.plan} />
                  <span>{o.counts.staff} staff</span>
                  <span>{o.counts.activeSites} sites</span>
                  <span>Joined {formatDate(o.createdAt)}</span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      <AddBusinessDialog open={adding} onOpenChange={setAdding} onCreated={reload} />
      <BusinessDetail id={viewing} onOpenChange={(open) => !open && setViewing(null)} onChanged={reload} />
    </>
  );
}

function Account() {
  return (
    <>
      <PageHeader title="Account" description="Your developer sign-in" backTo="/" />
      <div className="max-w-md rounded-lg border border-border bg-card p-4">
        <ChangePasswordForm />
      </div>
    </>
  );
}

// The platform portal: its own shell, separate from any business's office app.
export default function PlatformApp() {
  const { principal } = useAuth();
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground"><Zap className="h-4 w-4" /></span>
            ElectroStaff
            <Badge variant="info" className="gap-1"><ShieldCheck className="h-3 w-3" /> Developer mode</Badge>
          </Link>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex"><Smartphone className="h-3.5 w-3.5" /> {principal?.username}</span>
            <UserMenu settingsPath="/account" />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-4 sm:py-6">
        <Routes>
          <Route path="/" element={<MotionPage key="home"><Businesses /></MotionPage>} />
          <Route path="/account" element={<Account />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
