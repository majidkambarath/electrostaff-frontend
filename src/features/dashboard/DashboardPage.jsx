import { Link } from 'react-router-dom';
import { LabelList } from 'recharts';
import {
  AlertCircle,
  Banknote,
  Building2,
  CalendarOff,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  CreditCard,
  MessageSquare,
  HandCoins,
  Hourglass,
  IndianRupee,
  Star,
  Receipt,
  Wallet,
} from 'lucide-react';
import { dashboardApi } from '@/features/dashboard/api';
import { useApi } from '@/shared/hooks/useApi';
import { useOrg } from '@/features/auth/AuthContext';
import { cn } from '@/shared/lib/utils';
import {
  formatCompactCurrency,
  formatCurrency,
  formatDateLong,
  formatDateShort,
  formatRange,
  paymentNet,
  toISODate,
} from '@/shared/lib/format';
import { buttonVariants } from '@/shared/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
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
} from '@/shared/ui/chart';
import { CHART_INK, SERIES, axisProps } from '@/shared/lib/chartTheme';
import { PageHeader } from '@/shared/components/PageHeader';
import { PageLoader } from '@/shared/components/PageLoader';
import { StatTile } from '@/shared/components/StatTile';
import { EmptyState, ErrorState } from '@/shared/components/States';
import { Avatar } from '@/shared/components/Avatar';

const ATTENDANCE_SERIES = [
  { key: 'present', name: 'Present', color: SERIES[0] },
  { key: 'absent', name: 'Absent', color: SERIES[1] },
  { key: 'half', name: 'Half day', color: SERIES[2] },
  { key: 'leave', name: 'Leave', color: SERIES[3] },
];

function GettingStarted({ stats, hasAttendance }) {
  const steps = [
    { done: stats.totalStaff > 0, label: 'Register your staff with their daily wage', to: '/staff', cta: 'Add staff' },
    { done: stats.totalSites > 0, label: 'Create a job site for each project', to: '/sites', cta: 'New site' },
    { done: stats.assignedToday > 0, label: 'Assign staff to active sites', to: '/sites', cta: 'Assign' },
    { done: hasAttendance, label: 'Mark daily attendance per site', to: '/attendance', cta: 'Mark' },
    { done: stats.monthPaid > 0, label: 'Pay wages from attendance', to: '/payments', cta: 'Pay' },
  ];
  if (steps.every((s) => s.done)) return null;
  const doneCount = steps.filter((s) => s.done).length;

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Getting started</CardTitle>
        <span className="text-xs text-muted-foreground">
          {doneCount} of {steps.length} done
        </span>
      </CardHeader>
      <CardContent className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {steps.map((step, i) => (
          <div
            key={step.label}
            className={cn(
              'flex items-start gap-2 rounded-md border border-border p-3',
              step.done && 'bg-muted/50'
            )}
          >
            {step.done ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <Circle className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            )}
            <div className="min-w-0 text-sm">
              <p className={cn(step.done && 'text-muted-foreground line-through')}>
                {i + 1}. {step.label}
              </p>
              {!step.done && (
                <Link to={step.to} className="tap text-xs font-medium text-primary hover:underline">
                  {step.cta} →
                </Link>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function SitesToday({ sites }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Sites today</CardTitle>
        <Link to="/sites" className="tap text-xs font-medium text-primary hover:underline">All sites</Link>
      </CardHeader>
      <CardContent className="p-0">
        {sites.length === 0 ? (
          <div className="p-4">
            <EmptyState compact icon={Building2} title="No active sites" action={<Link to="/sites" className={buttonVariants({ size: 'sm' })}>Create site</Link>} />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {sites.slice(0, 6).map((s) => {
              const pct = s.assigned ? Math.round((s.marked / s.assigned) * 100) : 0;
              const complete = s.assigned > 0 && s.marked >= s.assigned;
              return (
                <li key={s._id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <Link to={`/sites/${s._id}`} className="tap truncate text-sm font-medium hover:underline">
                        {s.name}
                      </Link>
                      <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                        {s.marked}/{s.assigned} marked
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-blue-100" aria-hidden>
                      <div
                        className={cn('h-full rounded-full', complete ? 'bg-emerald-600' : 'bg-primary')}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                  {s.assigned === 0 ? (
                    <Link to={`/sites/${s._id}`} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
                      Assign
                    </Link>
                  ) : complete ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-label="All marked" />
                  ) : (
                    <Link
                      to={`/attendance?site=${s._id}`}
                      className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
                    >
                      Mark
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function NeedsAttention({ outstanding, pendingPayments, pendingLeaves, pendingRequests = [] }) {
  const empty = outstanding.length === 0 && pendingPayments.length === 0 && pendingLeaves.length === 0 && pendingRequests.length === 0;
  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>Needs attention</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {empty ? (
          <div className="p-4">
            <EmptyState compact icon={CheckCircle2} title="All caught up" description="No unpaid wages, pending payments or leave requests." />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {outstanding.map((o) => (
              <li key={`o-${o.staff._id}`} className="flex items-center gap-3 px-4 py-2.5">
                <Avatar name={o.staff.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{o.staff.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Unpaid · {o.payableDays} days · {formatRange(o.from, o.to)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums">{formatCurrency(o.amount)}</p>
                  <Link
                    to={`/payments?staff=${o.staff._id}&from=${toISODate(o.suggestedPeriod.start)}&to=${toISODate(o.suggestedPeriod.end)}`}
                    className="tap text-xs font-medium text-primary hover:underline"
                  >
                    Pay now
                  </Link>
                </div>
              </li>
            ))}
            {pendingPayments.map((p) => (
              <li key={`p-${p._id}`} className="flex items-center gap-3 px-4 py-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-700">
                  <Hourglass className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.staffId?.name}</p>
                  <p className="text-xs text-muted-foreground">Pending payment · {formatRange(p.periodStart, p.periodEnd)}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums">{formatCurrency(paymentNet(p))}</p>
                  <Link to="/payments?tab=history&status=pending" className="tap text-xs font-medium text-primary hover:underline">
                    Settle
                  </Link>
                </div>
              </li>
            ))}
            {pendingRequests.map((r) => (
              <li key={`r-${r._id}`} className="flex items-center gap-3 px-4 py-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                  <MessageSquare className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.staffId?.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {r.type === 'advance' ? `Asks for an advance of ${formatCurrency(r.amount)}` : r.note || 'Request'}
                  </p>
                </div>
                <Link to="/requests" className="tap text-xs font-medium text-primary hover:underline">Review</Link>
              </li>
            ))}
            {pendingLeaves.map((l) => (
              <li key={`l-${l._id}`} className="flex items-center gap-3 px-4 py-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                  <CalendarOff className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{l.staff?.name}</p>
                  <p className="text-xs capitalize text-muted-foreground">
                    {l.type} leave · {formatDateShort(l.startDate)}
                    {l.days > 1 && ` – ${formatDateShort(l.endDate)}`}
                  </p>
                </div>
                <Link to="/leaves" className="tap text-xs font-medium text-primary hover:underline">
                  Review
                </Link>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function AttendanceTrend({ data }) {
  const empty = data.every((d) => d.present + d.absent + d.half + d.leave === 0);
  return (
    <ChartCard
      title="Attendance — last 14 days"
      description="Records marked per day across all sites"
      empty={empty && <EmptyState compact icon={ClipboardCheck} title="No attendance marked in the last 14 days" />}
      chart={
        <ChartContainer className="h-72">
          <BarChart data={data} margin={{ top: 8, right: 4, left: -24, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={CHART_INK.grid} />
            <XAxis dataKey="label" {...axisProps} interval="preserveStartEnd" minTickGap={12} />
            <YAxis allowDecimals={false} {...axisProps} />
            <ChartTooltip order={ATTENDANCE_SERIES.map((s) => s.key)} />
            <ChartLegend order={ATTENDANCE_SERIES.map((s) => s.key)} />
            {ATTENDANCE_SERIES.map((s, i) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.name}
                stackId="a"
                fill={s.color}
                stroke={CHART_INK.surface}
                strokeWidth={1}
                maxBarSize={24}
                radius={i === ATTENDANCE_SERIES.length - 1 ? [4, 4, 0, 0] : 0}
              />
            ))}
          </BarChart>
        </ChartContainer>
      }
      table={
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Day</TableHead>
              {ATTENDANCE_SERIES.map((s) => <TableHead key={s.key} className="text-right">{s.name}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((d) => (
              <TableRow key={d.date}>
                <TableCell>{d.label}</TableCell>
                {ATTENDANCE_SERIES.map((s) => <TableCell key={s.key} className="text-right">{d[s.key]}</TableCell>)}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      }
    />
  );
}

function WagesTrend({ data }) {
  const empty = data.every((d) => d.earned === 0 && d.paid === 0);
  return (
    <ChartCard
      title="Wages earned vs paid"
      description="Earned from attendance · paid by payment date · last 6 months"
      empty={empty && <EmptyState compact icon={IndianRupee} title="No wage activity yet" />}
      chart={
        <ChartContainer className="h-72">
          <BarChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }} barGap={2}>
            <CartesianGrid vertical={false} stroke={CHART_INK.grid} />
            <XAxis dataKey="label" {...axisProps} />
            <YAxis {...axisProps} width={56} tickFormatter={formatCompactCurrency} />
            <ChartTooltip formatter={formatCurrency} order={['earned', 'paid']} />
            <ChartLegend order={['earned', 'paid']} />
            <Bar dataKey="earned" name="Earned" fill={SERIES[0]} maxBarSize={24} radius={[4, 4, 0, 0]} />
            <Bar dataKey="paid" name="Paid" fill={SERIES[1]} maxBarSize={24} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      }
      table={
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Month</TableHead>
              <TableHead className="text-right">Earned</TableHead>
              <TableHead className="text-right">Paid</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((d) => (
              <TableRow key={d.month}>
                <TableCell>{d.label}</TableCell>
                <TableCell className="text-right">{formatCurrency(d.earned)}</TableCell>
                <TableCell className="text-right">{formatCurrency(d.paid)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      }
    />
  );
}

// Single-line, truncated site names (recharts would otherwise word-wrap long names).
function SiteTick({ x, y, payload }) {
  const v = payload.value;
  return (
    <text x={x} y={y} dy={4} textAnchor="end" fontSize={12} fill="#52514e">
      <title>{v}</title>
      {v.length > 20 ? `${v.slice(0, 19)}…` : v}
    </text>
  );
}

function SiteCost({ data }) {
  return (
    <ChartCard
      title="Cost by site"
      description="This month · labour from attendance + expenses"
      empty={data.length === 0 && <EmptyState compact icon={Building2} title="No site work this month" />}
      chart={
        <ChartContainer style={{ height: Math.max(170, data.length * 40 + 56) }}>
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 56, left: 0, bottom: 0 }}>
            <CartesianGrid horizontal={false} stroke={CHART_INK.grid} />
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" {...axisProps} width={140} tick={SiteTick} />
            <ChartTooltip formatter={formatCurrency} order={['labour', 'expenses']} />
            <ChartLegend order={['labour', 'expenses']} />
            <Bar dataKey="labour" name="Labour" stackId="c" fill={SERIES[0]} stroke={CHART_INK.surface} strokeWidth={1} maxBarSize={20} />
            <Bar dataKey="expenses" name="Expenses" stackId="c" fill={SERIES[1]} stroke={CHART_INK.surface} strokeWidth={1} maxBarSize={20} radius={[0, 4, 4, 0]}>
              <LabelList dataKey="total" position="right" formatter={formatCompactCurrency} fontSize={11} fill="#52514e" />
            </Bar>
          </BarChart>
        </ChartContainer>
      }
      table={
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Site</TableHead>
              <TableHead className="text-right">Labour</TableHead>
              <TableHead className="text-right">Expenses</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((d) => (
              <TableRow key={d.name}>
                <TableCell>{d.name}</TableCell>
                <TableCell className="text-right">{formatCurrency(d.labour)}</TableCell>
                <TableCell className="text-right">{formatCurrency(d.expenses)}</TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(d.total)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      }
    />
  );
}

function TopPerformers({ items }) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Top rated this month</CardTitle>
        <Link to="/performance" className="tap text-xs font-medium text-primary hover:underline">Ratings</Link>
      </CardHeader>
      <CardContent className="p-0">
        {items.length === 0 ? (
          <div className="p-4">
            <EmptyState compact icon={Star} title="No ratings yet this month" />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((p) => (
              <li key={p._id} className="flex items-center gap-3 px-4 py-2.5">
                <Avatar name={p.staff.name} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.staff.name}</p>
                  <p className="text-xs text-muted-foreground">{p.tasksCompleted} tasks completed</p>
                </div>
                <span className="inline-flex items-center gap-1 text-sm font-semibold tabular-nums">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  {p.rating}/5
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const { org } = useOrg();
  const { data, error, loading, reload } = useApi(() => dashboardApi.get(), [], { cacheKey: 'dashboard' });

  if (loading) return <PageLoader title="Dashboard" description={formatDateLong(new Date())} tiles={8} />;
  if (error && !data) return <ErrorState error={error} onRetry={reload} />;

  const { stats, charts, sitesToday, outstanding, pendingPayments, pendingLeaves, pendingRequests, topPerformers } = data;
  const hasAttendance = (charts.attendanceTrend || []).some((d) => d.present + d.absent + d.half + d.leave > 0);
  const unmarked = Math.max(0, stats.assignedToday - stats.markedToday);

  return (
    <div className="space-y-4">
      <PageHeader
        title={org?.name && org.name !== 'Default Organization' ? org.name : 'Dashboard'}
        description={
          <>
            <span className="lg:hidden">{formatDateLong(new Date())}</span>
            <span className="hidden lg:inline">Today’s attendance, wages owed and site progress</span>
          </>
        }
        actions={
          <>
            <Link to="/payments" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
              <CreditCard /> Pay wages
            </Link>
            <Link to="/attendance" className={cn(buttonVariants({ size: 'sm' }), 'lg:hidden')}>
              <ClipboardCheck /> Mark attendance
            </Link>
          </>
        }
      />

      {error && <ErrorState error={error} onRetry={reload} />}

      <GettingStarted stats={stats} hasAttendance={hasAttendance} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Attendance today"
          value={`${stats.markedToday}/${stats.assignedToday}`}
          hint={unmarked ? `${unmarked} still to mark` : `${stats.presentToday} present · ${stats.absentToday} absent`}
          icon={ClipboardCheck}
          tone={unmarked ? 'warning' : 'success'}
          to="/attendance"
        />
        <StatTile
          label="Earned this month"
          value={formatCurrency(stats.monthEarned)}
          hint={`${stats.attendanceRate}% attendance rate`}
          icon={IndianRupee}
          tone="primary"
          to="/reports"
        />
        <StatTile
          label="Unpaid wages"
          value={formatCurrency(stats.outstandingAmount)}
          hint={`${stats.outstandingStaff} staff waiting`}
          icon={AlertCircle}
          tone={stats.outstandingAmount ? 'warning' : 'default'}
          to="/payments"
        />
        <StatTile
          label="Paid this month"
          value={formatCurrency(stats.monthPaid)}
          hint={
            stats.pendingPaymentsCount
              ? `${stats.pendingPaymentsCount} pending · ${formatCurrency(stats.pendingPaymentsAmount)}`
              : 'No pending payments'
          }
          icon={Wallet}
          to="/payments?tab=history"
        />
        <StatTile
          label="Client dues"
          value={formatCurrency(stats.clientDues)}
          hint={`${formatCurrency(stats.monthReceived)} received this month`}
          icon={Banknote}
          tone={stats.clientDues ? 'warning' : 'default'}
          to="/sites"
        />
        <StatTile
          label="Expenses this month"
          value={formatCurrency(stats.monthExpenses)}
          hint={`${stats.activeSites} active sites · ${stats.activeStaff} staff`}
          icon={Receipt}
          to="/expenses"
        />
        <StatTile
          label="Advances outstanding"
          value={formatCurrency(stats.advanceOutstanding)}
          hint="To recover from wages"
          icon={HandCoins}
          to="/advances"
        />
        <StatTile
          label="Leave requests"
          value={stats.pendingLeaves}
          hint={stats.leaveToday ? `${stats.leaveToday} on leave today` : 'Awaiting review'}
          icon={CalendarOff}
          tone={stats.pendingLeaves ? 'warning' : 'default'}
          to="/leaves"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="order-2 space-y-4 xl:order-none xl:col-span-2">
          <AttendanceTrend data={charts.attendanceTrend} />
          <WagesTrend data={charts.wagesTrend} />
        </div>
        {/* Phones: today's actions come before the charts. */}
        <div className="order-1 space-y-4 xl:order-none">
          <SitesToday sites={sitesToday} />
          <NeedsAttention outstanding={outstanding} pendingPayments={pendingPayments} pendingLeaves={pendingLeaves} pendingRequests={pendingRequests} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SiteCost data={charts.siteCost} />
        <TopPerformers items={topPerformers} />
      </div>
    </div>
  );
}
