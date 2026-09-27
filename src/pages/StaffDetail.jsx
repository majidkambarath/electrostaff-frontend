import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertCircle, CalendarDays, CreditCard, HandCoins, Pencil, Wallet } from 'lucide-react';
import { api } from '@/api/api';
import { useApi } from '@/hooks/useApi';
import { cn } from '@/lib/utils';
import {
  MONTHS,
  PAYMENT_MODE_LABELS,
  ROLE_LABELS,
  formatCurrency,
  formatDate,
  formatRange,
  otRateOf,
  paymentNet,
  slipNumber,
  toISODate,
} from '@/lib/format';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageLoader } from '@/components/shared/PageLoader';
import { StatTile } from '@/components/shared/StatTile';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { EmptyState, ErrorState } from '@/components/shared/States';
import { StaffFormSheet } from '@/components/forms/StaffFormSheet';
import { AdvanceFormSheet } from '@/components/forms/AdvanceFormSheet';

const now = new Date();

function AttendanceTab({ staffId }) {
  const [period, setPeriod] = useState(`${now.getFullYear()}-${now.getMonth() + 1}`);
  const [year, month] = period.split('-').map(Number);
  const { data, error, loading, reload } = useApi(
    () => api.attendance.getByStaff(staffId, { month, year }),
    [staffId, period],
    { cacheKey: `staff-att:${staffId}:${period}` }
  );

  const options = Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    return { value: `${d.getFullYear()}-${d.getMonth() + 1}`, label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}` };
  });

  const summary = data?.summary || {};
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="sm:w-48" aria-label="Month"><SelectValue /></SelectTrigger>
          <SelectContent>
            {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>Present <b className="text-foreground">{summary.present || 0}</b></span>
          <span>Half <b className="text-foreground">{summary.half || 0}</b></span>
          <span>Absent <b className="text-foreground">{summary.absent || 0}</b></span>
          <span>Leave <b className="text-foreground">{summary.leave || 0}</b></span>
          <span>Payable days <b className="text-foreground">{summary.payableDays || 0}</b></span>
          {summary.otHours > 0 && <span>Overtime <b className="text-foreground">{summary.otHours} h</b></span>}
        </div>
      </div>
      {error && !data ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
      ) : data.records.length === 0 ? (
        <EmptyState compact icon={CalendarDays} title="No attendance this month" />
      ) : (
        <MonthCalendar year={year} month={month} records={data.records} />
      )}
    </div>
  );
}

const DAY_STYLE = {
  present: 'bg-emerald-600 text-white',
  half: 'bg-amber-500 text-white',
  absent: 'bg-red-600 text-white',
  leave: 'bg-slate-500 text-white',
};
const DAY_SHORT = { present: 'P', half: 'H', absent: 'A', leave: 'L' };

// Month grid (Mon–Sun) with one chip per site record, plus per-site totals below.
function MonthCalendar({ year, month, records }) {
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
        {[...bySite.values()].map((s) => (
          <Link
            key={s.name}
            to={s.id ? `/sites/${s.id}` : '#'}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs hover:bg-muted"
          >
            <span className="font-medium">{s.name}</span>
            <span className="text-muted-foreground">{s.days} payable days</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

const StatusBadgeLabel = ({ status }) => ({ present: 'Present', half: 'Half day', absent: 'Absent', leave: 'Leave' })[status];

export default function StaffDetail() {
  const { id } = useParams();
  const [editOpen, setEditOpen] = useState(false);
  const [advanceOpen, setAdvanceOpen] = useState(false);

  const { data, error, loading, reload } = useApi(
    () =>
      Promise.all([
        api.staff.get(id),
        api.payments.getAll({ staffId: id }),
        api.payments.outstanding({ staffId: id }),
        api.advances.getAll({ staffId: id }),
      ]).then(([staff, payments, outstanding, advances]) => ({ staff, payments, outstanding: outstanding[0], advances })),
    [id],
    { cacheKey: `staff:${id}` }
  );

  if (loading) return <PageLoader tiles={4} />;
  if (error && !data) {
    return (
      <div className="space-y-4">
        <PageHeader title="Staff" backTo="/staff" />
        <ErrorState error={error} onRetry={error.status === 404 ? undefined : reload} />
      </div>
    );
  }

  const { staff, payments, outstanding, advances } = data;
  const totalPaid = payments.filter((p) => p.status === 'paid').reduce((s, p) => s + paymentNet(p), 0);
  const pending = payments.filter((p) => p.status === 'pending');
  const payLink = outstanding
    ? `/payments?staff=${id}&from=${toISODate(outstanding.suggestedPeriod.start)}&to=${toISODate(outstanding.suggestedPeriod.end)}`
    : `/payments?staff=${id}`;

  return (
    <div className="space-y-4">
      <PageHeader
        backTo="/staff"
        title={staff.name}
        meta={<StatusBadge status={staff.status} />}
        description={`${ROLE_LABELS[staff.role] || staff.role} · ${formatCurrency(staff.dailyWage)}/day · ${staff.phone}`}
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}><Pencil /> Edit</Button>
            <Button variant="outline" size="sm" onClick={() => setAdvanceOpen(true)}><HandCoins /> Give advance</Button>
            <Link to={payLink} className={cn(buttonVariants({ size: 'sm' }))}><CreditCard /> Pay wages</Link>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Unpaid wages"
          value={formatCurrency(outstanding?.amount || 0)}
          hint={outstanding ? `${outstanding.payableDays} days · ${formatRange(outstanding.from, outstanding.to)}` : 'All paid up'}
          icon={AlertCircle}
          tone={outstanding ? 'warning' : 'success'}
          to={payLink}
        />
        <StatTile
          label="Advance balance"
          value={formatCurrency(staff.advanceBalance)}
          hint="To recover from wages"
          icon={HandCoins}
          tone={staff.advanceBalance > 0 ? 'warning' : 'default'}
        />
        <StatTile
          label="Pending payments"
          value={pending.length}
          hint={pending.length ? formatCurrency(pending.reduce((s, p) => s + paymentNet(p), 0)) : 'None'}
          icon={Wallet}
        />
        <StatTile label="Total paid" value={formatCurrency(totalPaid)} hint={`Since ${formatDate(staff.joinDate)}`} icon={CreditCard} tone="primary" />
      </div>

      <Tabs defaultValue="attendance">
        <TabsList>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="payments">Payments ({payments.length})</TabsTrigger>
          <TabsTrigger value="advances">Advances ({advances.length})</TabsTrigger>
          <TabsTrigger value="profile">Profile</TabsTrigger>
        </TabsList>

        <TabsContent value="attendance">
          <AttendanceTab staffId={id} />
        </TabsContent>

        <TabsContent value="payments">
          {payments.length === 0 ? (
            <EmptyState
              compact
              icon={CreditCard}
              title="No payments yet"
              action={<Link to={payLink} className={buttonVariants({ size: 'sm' })}>Pay wages</Link>}
            />
          ) : (
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Days</TableHead>
                    <TableHead className="text-right">Paid out</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Slip</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p._id}>
                      <TableCell>
                        <Link to={`/payments/${p._id}`} className="font-medium hover:underline">
                          {formatRange(p.periodStart, p.periodEnd)}
                        </Link>
                        {p.paidDate && (
                          <p className="text-xs text-muted-foreground">
                            Paid {formatDate(p.paidDate)} · {PAYMENT_MODE_LABELS[p.paymentMode]}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-right">{p.totalDays}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(paymentNet(p))}</TableCell>
                      <TableCell><StatusBadge status={p.status} /></TableCell>
                      <TableCell className="hidden text-xs text-muted-foreground sm:table-cell">{slipNumber(p)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="advances">
          {advances.length === 0 ? (
            <EmptyState
              compact
              icon={HandCoins}
              title="No advances given"
              action={<Button size="sm" variant="outline" onClick={() => setAdvanceOpen(true)}>Give advance</Button>}
            />
          ) : (
            <Card className="divide-y divide-border overflow-hidden">
              {advances.map((a) => (
                <div key={a._id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{formatDate(a.date)}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {PAYMENT_MODE_LABELS[a.paymentMode]}
                      {a.note && ` · ${a.note}`}
                    </p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums">{formatCurrency(a.amount)}</p>
                </div>
              ))}
            </Card>
          )}
        </TabsContent>

        <TabsContent value="profile">
          <Card>
            <CardContent className="grid gap-4 text-sm sm:grid-cols-2">
              {[
                ['Phone', staff.phone && <a key="phone" href={`tel:${staff.phone}`} className="text-primary hover:underline">{staff.phone}</a>],
                ['Email', staff.email],
                ['Role', ROLE_LABELS[staff.role]],
                ['Daily wage', formatCurrency(staff.dailyWage)],
                ['Overtime rate', `${formatCurrency(otRateOf(staff))} / hour${staff.otRate === undefined || staff.otRate === null ? ' (daily wage ÷ 8)' : ''}`],
                ['Joined', formatDate(staff.joinDate)],
                ['Address', staff.address],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <div className="mt-0.5">{value || '—'}</div>
                </div>
              ))}
              <div className="sm:col-span-2">
                <p className="text-xs text-muted-foreground">Current sites</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {staff.assignments.length === 0
                    ? '—'
                    : staff.assignments.map((a) => (
                        <Link
                          key={a._id}
                          to={`/sites/${a.siteId?._id}`}
                          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
                        >
                          {a.siteId?.name}
                          <StatusBadge status={a.siteId?.status} className="px-1 py-0" />
                        </Link>
                      ))}
                </div>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs text-muted-foreground">Notes</p>
                <p className="mt-0.5 whitespace-pre-wrap">{staff.notes || '—'}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <StaffFormSheet open={editOpen} onOpenChange={setEditOpen} staff={staff} onSaved={reload} />
      <AdvanceFormSheet open={advanceOpen} onOpenChange={setAdvanceOpen} staff={staff} onSaved={reload} />
    </div>
  );
}
