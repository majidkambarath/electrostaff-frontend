import { useCallback, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  CalendarDays,
  ClipboardCheck,
  IndianRupee,
  Pencil,
  Phone,
  UserMinus,
  UserPlus,
  Users,
} from 'lucide-react';
import { api } from '@/api/api';
import { useApi } from '@/hooks/useApi';
import { formatCurrency, formatDate, formatNumber, ROLE_LABELS, todayISO } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ChartCard,
  ChartContainer,
  ChartLegend,
  ChartTooltip,
  XAxis,
  YAxis,
} from '@/components/ui/chart';
import { CHART_INK, SERIES, axisProps } from '@/lib/chartTheme';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageLoader } from '@/components/shared/PageLoader';
import { StatTile } from '@/components/shared/StatTile';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState, ErrorState } from '@/components/shared/States';
import { Avatar } from '@/components/shared/Avatar';
import { DateStepper } from '@/components/shared/DateStepper';
import { SearchInput } from '@/components/shared/Toolbar';
import { useConfirm } from '@/components/shared/ConfirmDialog';
import { SiteFormSheet } from '@/components/forms/SiteFormSheet';
import { AttendanceBoard } from '@/components/attendance/AttendanceBoard';
import { SiteFinance } from '@/components/sites/SiteFinance';

function AssignSheet({ open, onOpenChange, siteId, assignedIds, onAssigned }) {
  const { data: staff, loading } = useApi(() => api.staff.getAll({ status: 'active' }), [], { enabled: open });
  const [selected, setSelected] = useState(new Set());
  const [query, setQuery] = useState('');
  const [saving, setSaving] = useState(false);

  const available = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (staff || []).filter((s) => !assignedIds.has(s._id) && (!q || s.name.toLowerCase().includes(q)));
  }, [staff, assignedIds, query]);

  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const handleAssign = async () => {
    setSaving(true);
    try {
      await api.sites.assign(siteId, [...selected]);
      toast.success(`${selected.size} staff assigned`);
      setSelected(new Set());
      onOpenChange(false);
      onAssigned();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Assign staff</SheetTitle>
          <SheetDescription>Select active staff to add to this site’s team.</SheetDescription>
        </SheetHeader>
        <SearchInput value={query} onChange={setQuery} placeholder="Search staff…" className="sm:w-full" />
        <SheetBody>
          {loading ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Loading staff…</p>
          ) : available.length === 0 ? (
            <EmptyState
              compact
              icon={Users}
              title="No one left to assign"
              description={query ? 'No staff match your search.' : 'All active staff are already on this site.'}
              action={<Link to="/staff" className="text-sm font-medium text-primary hover:underline">Register staff</Link>}
            />
          ) : (
            <div className="divide-y divide-border rounded-md border border-border">
              {available.map((s) => (
                <label key={s._id} className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-muted/50">
                  <Checkbox checked={selected.has(s._id)} onCheckedChange={() => toggle(s._id)} />
                  <Avatar name={s.name} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{s.name}</span>
                    <span className="block text-xs text-muted-foreground">
                      {ROLE_LABELS[s.role]} · {formatCurrency(s.dailyWage)}/day
                      {s.siteCount > 0 && ` · on ${s.siteCount} other site${s.siteCount > 1 ? 's' : ''}`}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          )}
        </SheetBody>
        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleAssign} disabled={selected.size === 0 || saving}>
            {saving ? 'Assigning…' : `Assign ${selected.size || ''}`.trim()}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function TrendChart({ data }) {
  const series = [
    { key: 'present', name: 'Present', color: SERIES[0] },
    { key: 'absent', name: 'Absent', color: SERIES[1] },
    { key: 'half', name: 'Half day', color: SERIES[2] },
    { key: 'leave', name: 'Leave', color: SERIES[3] },
  ];
  const rows = data.map((d) => ({ ...d, label: formatDate(d.date).slice(0, 6) }));
  const empty = rows.every((d) => d.present + d.absent + d.half + d.leave === 0);
  return (
    <ChartCard
      title="Last 14 days"
      description="Attendance marked at this site"
      empty={empty && <EmptyState compact icon={ClipboardCheck} title="No attendance in the last 14 days" />}
      chart={
        <ChartContainer className="h-64">
          <BarChart data={rows} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={CHART_INK.grid} />
            <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={12} />
            <YAxis allowDecimals={false} {...axisProps} />
            <ChartTooltip order={series.map((s) => s.key)} />
            <ChartLegend order={series.map((s) => s.key)} />
            {series.map((s, i) => (
              <Bar key={s.key} dataKey={s.key} name={s.name} stackId="a" fill={s.color} stroke={CHART_INK.surface} strokeWidth={1} maxBarSize={24} radius={i === series.length - 1 ? [4, 4, 0, 0] : 0} />
            ))}
          </BarChart>
        </ChartContainer>
      }
      table={
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Day</TableHead>
              {series.map((s) => <TableHead key={s.key} className="text-right">{s.name}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((d) => (
              <TableRow key={d.date}>
                <TableCell>{formatDate(d.date)}</TableCell>
                {series.map((s) => <TableCell key={s.key} className="text-right">{d[s.key]}</TableCell>)}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      }
    />
  );
}

export default function SiteDetail() {
  const { id } = useParams();
  const confirm = useConfirm();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') || 'attendance';
  const { data, error, loading, reload } = useApi(() => api.sites.progress(id), [id], { cacheKey: `site:${id}` });
  const [date, setDate] = useState(todayISO());
  const [editOpen, setEditOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const dirtyRef = useRef(false);
  const onDirtyChange = useCallback((d) => {
    dirtyRef.current = d;
  }, []);

  const assignedIds = useMemo(() => new Set((data?.staffProgress || []).map((r) => r.staff._id)), [data]);

  if (loading) return <PageLoader tiles={4} />;
  if (error && !data) {
    return (
      <div className="space-y-4">
        <PageHeader title="Site" backTo="/sites" />
        <ErrorState error={error} onRetry={error.status === 404 ? undefined : reload} />
      </div>
    );
  }

  const { site, summary, staffProgress, trend } = data;
  const isActive = site.status === 'active';

  const changeDate = async (d) => {
    if (
      dirtyRef.current &&
      !(await confirm({ title: 'Discard unsaved attendance?', confirmLabel: 'Discard', destructive: true }))
    ) {
      return;
    }
    setDate(d);
  };

  const handleUnassign = async (staff) => {
    const ok = await confirm({
      title: `Remove ${staff.name} from ${site.name}?`,
      description: 'Their attendance history at this site is kept. You can assign them again later.',
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (!ok) return;
    try {
      await api.sites.unassign(site._id, staff._id);
      toast.success(`${staff.name} removed from site`);
      reload();
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        backTo="/sites"
        title={site.name}
        meta={<StatusBadge status={site.status} />}
        description={[site.clientName, site.address].filter(Boolean).join(' · ') || 'Job site'}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil /> Edit
            </Button>
            {isActive && (
              <Button size="sm" onClick={() => setAssignOpen(true)}>
                <UserPlus /> Assign staff
              </Button>
            )}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Team" value={summary.totalStaff} hint="Assigned staff" icon={Users} />
        <StatTile
          label="Marked today"
          value={`${summary.markedToday}/${summary.totalStaff}`}
          hint={`${summary.attendanceTodayRate}% complete`}
          icon={ClipboardCheck}
          tone={summary.totalStaff && summary.markedToday >= summary.totalStaff ? 'success' : 'warning'}
        />
        <StatTile
          label="Person-days"
          value={formatNumber(summary.personDays)}
          hint={`Over ${summary.daysElapsed} days${summary.otHours ? ` · ${summary.otHours}h OT` : ''}`}
          icon={CalendarDays}
        />
        <StatTile label="Labour cost" value={formatCurrency(summary.labourCost)} hint="From attendance to date" icon={IndianRupee} tone="primary" />
      </div>

      <Tabs value={tab} onValueChange={(t) => setParams({ tab: t }, { replace: true })}>
        <TabsList>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="team">Team ({summary.totalStaff})</TabsTrigger>
          <TabsTrigger value="progress">Progress</TabsTrigger>
          <TabsTrigger value="finance">Finance</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        <TabsContent value="attendance" className="space-y-3">
          {!isActive && (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              This site is {site.status === 'onhold' ? 'on hold' : 'completed'}. You can still correct past attendance.
            </p>
          )}
          <DateStepper value={date} onChange={changeDate} />
          <AttendanceBoard key={`${date}-${summary.totalStaff}`} siteId={site._id} date={date} onDirtyChange={onDirtyChange} onSaved={reload} />
        </TabsContent>

        <TabsContent value="team">
          {staffProgress.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No staff on this site yet"
              description="Assign staff to start marking their attendance here."
              action={isActive && <Button size="sm" onClick={() => setAssignOpen(true)}><UserPlus /> Assign staff</Button>}
            />
          ) : (
            <Card className="divide-y divide-border overflow-hidden">
              {staffProgress.map((row) => (
                <div key={row.staff._id} className="flex items-center gap-3 px-4 py-3">
                  <Avatar name={row.staff.name} />
                  <Link to={`/staff/${row.staff._id}`} className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium hover:underline">{row.staff.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {ROLE_LABELS[row.staff.role]} · {formatCurrency(row.staff.dailyWage)}/day · {row.payableDays} days here
                    </p>
                  </Link>
                  {row.staff.phone && (
                    <a href={`tel:${row.staff.phone}`} className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline">
                      {row.staff.phone}
                    </a>
                  )}
                  <Button variant="ghost" size="sm" onClick={() => handleUnassign(row.staff)} aria-label={`Remove ${row.staff.name}`}>
                    <UserMinus /> <span className="hidden sm:inline">Remove</span>
                  </Button>
                </div>
              ))}
            </Card>
          )}
        </TabsContent>

        <TabsContent value="progress" className="space-y-4">
          <TrendChart data={trend} />
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Work by staff</CardTitle>
            </CardHeader>
            {staffProgress.length === 0 ? (
              <CardContent>
                <EmptyState compact title="No team members yet" />
              </CardContent>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff</TableHead>
                    <TableHead className="text-right">Present</TableHead>
                    <TableHead className="text-right">Half</TableHead>
                    <TableHead className="text-right">Absent</TableHead>
                    <TableHead className="text-right">Leave</TableHead>
                    <TableHead className="text-right">OT h</TableHead>
                    <TableHead className="text-right">Payable days</TableHead>
                    <TableHead className="text-right">Earned</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffProgress.map((row) => (
                    <TableRow key={row.staff._id}>
                      <TableCell className="font-medium">{row.staff.name}</TableCell>
                      <TableCell className="text-right">{row.present}</TableCell>
                      <TableCell className="text-right">{row.half}</TableCell>
                      <TableCell className="text-right">{row.absent}</TableCell>
                      <TableCell className="text-right">{row.leave}</TableCell>
                      <TableCell className="text-right">{row.otHours || 0}</TableCell>
                      <TableCell className="text-right">{row.payableDays}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(row.earned)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="finance">
          {tab === 'finance' && <SiteFinance site={site} onEditSite={() => setEditOpen(true)} />}
        </TabsContent>

        <TabsContent value="details">
          <Card>
            <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
              {[
                ['Client', site.clientName],
                [
                  'Client phone',
                  site.clientPhone && (
                    <a key="phone" href={`tel:${site.clientPhone}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                      <Phone className="h-3.5 w-3.5" /> {site.clientPhone}
                    </a>
                  ),
                ],
                ['Contract value', site.contractValue ? formatCurrency(site.contractValue) : null],
                ['Address', site.address],
                ['Started', formatDate(site.startDate)],
                ['Expected end', site.endDate && formatDate(site.endDate)],
                ['Status', <StatusBadge key="s" status={site.status} />],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <div className="mt-0.5">{value || '—'}</div>
                </div>
              ))}
              <div className="sm:col-span-2">
                <p className="text-xs text-muted-foreground">Notes</p>
                <p className="mt-0.5 whitespace-pre-wrap">{site.notes || '—'}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <SiteFormSheet open={editOpen} onOpenChange={setEditOpen} site={site} onSaved={reload} />
      <AssignSheet
        open={assignOpen}
        onOpenChange={setAssignOpen}
        siteId={site._id}
        assignedIds={assignedIds}
        onAssigned={reload}
      />
    </div>
  );
}
