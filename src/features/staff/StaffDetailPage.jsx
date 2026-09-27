import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AlertCircle, CalendarDays, CreditCard, HandCoins, Pencil, Wallet } from 'lucide-react';
import { attendanceApi } from '@/features/attendance/api';
import { staffApi } from '@/features/staff/api';
import { paymentsApi } from '@/features/payments/api';
import { advancesApi } from '@/features/advances/api';
import { useApi } from '@/shared/hooks/useApi';
import { cn } from '@/shared/lib/utils';
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
} from '@/shared/lib/format';
import { Button, buttonVariants } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { PageHeader } from '@/shared/components/PageHeader';
import { PageLoader } from '@/shared/components/PageLoader';
import { StatTile } from '@/shared/components/StatTile';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { EmptyState, ErrorState } from '@/shared/components/States';
import { MonthCalendar } from '@/shared/components/MonthCalendar';
import { StaffFormSheet } from '@/features/staff/components/StaffFormSheet';
import { AdvanceFormSheet } from '@/features/advances/components/AdvanceFormSheet';
import { StaffAccessDialog } from '@/features/staff/components/StaffAccessDialog';

const now = new Date();

function AttendanceTab({ staffId }) {
  const [period, setPeriod] = useState(`${now.getFullYear()}-${now.getMonth() + 1}`);
  const [year, month] = period.split('-').map(Number);
  const { data, error, loading, reload } = useApi(
    () => attendanceApi.getByStaff(staffId, { month, year }),
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
        <MonthCalendar year={year} month={month} records={data.records} siteLink={(id) => `/sites/${id}`} />
      )}
    </div>
  );
}


export default function StaffDetail() {
  const { id } = useParams();
  const [editOpen, setEditOpen] = useState(false);
  const [advanceOpen, setAdvanceOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);

  const { data, error, loading, reload } = useApi(
    () =>
      Promise.all([
        staffApi.get(id),
        paymentsApi.getAll({ staffId: id }),
        paymentsApi.outstanding({ staffId: id }),
        advancesApi.getAll({ staffId: id }),
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
                ['UPI ID', staff.upiId],
                [
                  'Staff app',
                  <button key="app" type="button" onClick={() => setAccessOpen(true)} className="text-primary underline">
                    {staff.portalEnabled ? `Has login${staff.lastLoginAt ? ` · last seen ${formatDate(staff.lastLoginAt)}` : ' · not signed in yet'}` : 'No login — give access'}
                  </button>,
                ],
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
                          className="inline-flex min-h-10 items-center gap-1.5 rounded-md border border-border px-3 py-1 text-sm hover:bg-muted sm:min-h-0 sm:px-2 sm:text-xs"
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
      <StaffAccessDialog staff={staff} open={accessOpen} onOpenChange={setAccessOpen} onChanged={reload} />
    </div>
  );
}
