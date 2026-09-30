import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { CalendarDays, Download, HandCoins, IndianRupee, MapPin, Printer, Smartphone, UserRound, Wallet } from 'lucide-react';
import { reportsApi } from '@/features/reports/api';
import { staffApi } from '@/features/staff/api';
import { useApi } from '@/shared/hooks/useApi';
import { cn } from '@/shared/lib/utils';
import { downloadCsv } from '@/shared/lib/csv';
import { buildRangePresets, presetKeyFor } from '@/shared/lib/dateRanges';
import { PAYMENT_MODE_LABELS, ROLE_LABELS, formatCurrency, formatDate, formatNumber, formatRange } from '@/shared/lib/format';
import { CHART_INK, SERIES, axisProps } from '@/shared/lib/chartTheme';
import { Button, buttonVariants } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { Bar, BarChart, CartesianGrid, ChartCard, ChartContainer, ChartLegend, ChartTooltip, XAxis, YAxis } from '@/shared/ui/chart';
import { PageHeader } from '@/shared/components/PageHeader';
import { PageLoader } from '@/shared/components/PageLoader';
import { StatTile } from '@/shared/components/StatTile';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { EmptyState, ErrorState } from '@/shared/components/States';
import { StaffPicker } from '@/shared/components/SitePicker';
import { DateRangeBar } from '@/shared/components/DateRangeBar';

const DAY_COLUMNS = [
  { label: 'Date', value: (d) => formatDate(d.date) },
  { label: 'Site', value: (d) => d.site?.name || '' },
  { label: 'Status', value: (d) => d.status },
  { label: 'OT hours', value: (d) => d.otHours },
  { label: 'Amount', value: (d) => d.amount },
  { label: 'Marked by', value: (d) => (d.source === 'staff' ? 'Staff app' : 'Office') },
];

const weekday = (d) => new Date(d).toLocaleDateString('en-IN', { weekday: 'short' });

function SitesChart({ bySite }) {
  const rows = bySite.map((s) => ({ name: s.siteName, wage: s.amount - s.otAmount, ot: s.otAmount, ...s }));
  const series = [
    { key: 'wage', name: 'Day wage', color: SERIES[0] },
    { key: 'ot', name: 'Overtime', color: SERIES[1] },
  ];
  return (
    <ChartCard
      title="Earned by site"
      description="Day wage and overtime for the selected period"
      empty={!rows.length && <EmptyState compact icon={MapPin} title="No payable days in this period" />}
      chart={
        <ChartContainer className="h-64">
          <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
            <CartesianGrid horizontal={false} stroke={CHART_INK.grid} />
            <XAxis type="number" {...axisProps} tickFormatter={(v) => `₹${formatNumber(v)}`} />
            <YAxis type="category" dataKey="name" width={130} {...axisProps} />
            <ChartTooltip order={series.map((s) => s.key)} formatter={(v) => formatCurrency(v)} />
            <ChartLegend order={series.map((s) => s.key)} />
            {series.map((s, i) => (
              <Bar key={s.key} dataKey={s.key} name={s.name} stackId="a" fill={s.color} stroke={CHART_INK.surface} strokeWidth={1} maxBarSize={22} radius={i === series.length - 1 ? [0, 4, 4, 0] : 0} />
            ))}
          </BarChart>
        </ChartContainer>
      }
      table={
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Site</TableHead>
              <TableHead className="text-right">Full days</TableHead>
              <TableHead className="text-right">Half days</TableHead>
              <TableHead className="text-right">OT hours</TableHead>
              <TableHead className="text-right">OT pay</TableHead>
              <TableHead className="text-right">Earned</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((s) => (
              <TableRow key={s.siteId}>
                <TableCell className="font-medium">{s.siteName}</TableCell>
                <TableCell className="text-right tabular-nums">{s.presentDays}</TableCell>
                <TableCell className="text-right tabular-nums">{s.halfDays}</TableCell>
                <TableCell className="text-right tabular-nums">{s.otHours}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(s.otAmount)}</TableCell>
                <TableCell className="text-right font-medium tabular-nums">{formatCurrency(s.amount)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      }
    />
  );
}

function DayList({ days }) {
  if (!days.length) return <EmptyState compact icon={CalendarDays} title="No attendance marked in this period" />;
  return (
    <>
      <Card className="hidden overflow-hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Site</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">OT</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {days.map((d, i) => (
              <TableRow key={`${d.date}-${d.site?._id}-${i}`}>
                <TableCell className="whitespace-nowrap">
                  <span className="text-muted-foreground">{weekday(d.date)}</span> {formatDate(d.date)}
                </TableCell>
                <TableCell>
                  {d.site ? <Link to={`/sites/${d.site._id}`} className="hover:underline">{d.site.name}</Link> : '—'}
                  {d.source === 'staff' && <Smartphone className="ml-1.5 inline h-3.5 w-3.5 text-muted-foreground" aria-label="Checked in from the staff app" />}
                </TableCell>
                <TableCell><StatusBadge status={d.status} /></TableCell>
                <TableCell className="text-right tabular-nums">{d.otHours ? `${d.otHours}h` : '—'}</TableCell>
                <TableCell className="text-right tabular-nums">{d.amount ? formatCurrency(d.amount) : '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <ul className="divide-y divide-border rounded-lg border border-border bg-card md:hidden">
        {days.map((d, i) => (
          <li key={`${d.date}-${d.site?._id}-${i}`} className="flex items-center justify-between gap-3 px-3 py-2.5">
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {weekday(d.date)}, {formatDate(d.date)}
                {d.source === 'staff' && <Smartphone className="ml-1 inline h-3.5 w-3.5 text-muted-foreground" />}
              </p>
              <p className="truncate text-xs text-muted-foreground">{d.site?.name || '—'}{d.otHours ? ` · ${d.otHours}h OT` : ''}</p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <StatusBadge status={d.status} />
              <span className="text-xs tabular-nums text-muted-foreground">{d.amount ? formatCurrency(d.amount) : ''}</span>
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

export default function StaffReport() {
  const presets = useMemo(buildRangePresets, []);
  const [params, setParams] = useSearchParams();
  const staffId = params.get('staff') || '';
  const from = params.get('from') || presets[0].from;
  const to = params.get('to') || presets[0].to;
  const range = { key: presetKeyFor(presets, from, to), from, to };
  const valid = Boolean(staffId && from && to && from <= to);

  const setQuery = (next) => setParams((p) => {
    const q = new URLSearchParams(p);
    Object.entries(next).forEach(([k, v]) => (v ? q.set(k, v) : q.delete(k)));
    return q;
  }, { replace: true });

  const { data: staffList } = useApi(() => staffApi.getAll(), [], { cacheKey: 'staff:all' });
  const { data, error, loading, refreshing, reload } = useApi(
    () => reportsApi.staff({ staffId, from, to }),
    [staffId, from, to],
    { enabled: valid, cacheKey: `report:staff:${staffId}:${from}:${to}` }
  );

  const s = data?.summary;
  const header = (
    <PageHeader
      title="Staff report"
      description={data ? `${data.staff.name} · ${formatRange(from, to)}` : 'Days worked, sites and wages for one person'}
      actions={
        data && (
          <div className="flex flex-wrap gap-2 print:hidden">
            <Link to={`/staff/${staffId}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}><UserRound /> Profile</Link>
            <Button variant="outline" size="sm" onClick={() => window.print()}><Printer /> Print</Button>
            <Button variant="outline" size="sm" onClick={() => downloadCsv(`${data.staff.name}_${from}_to_${to}.csv`, DAY_COLUMNS, data.days)}><Download /> CSV</Button>
            {s.outstanding > 0 && (
              <Link to={`/payments?staff=${staffId}`} className={buttonVariants({ size: 'sm' })}><Wallet /> Pay {formatCurrency(s.outstanding)}</Link>
            )}
          </div>
        )
      }
    />
  );

  const filters = (
    <div className="space-y-2 print:hidden">
      <StaffPicker staff={staffList || []} value={staffId} onChange={(id) => setQuery({ staff: id })} placeholder="Choose a staff member" className="sm:max-w-sm" />
      <DateRangeBar presets={presets} range={range} onChange={(r) => setQuery({ from: r.from, to: r.to })} />
    </div>
  );

  if (!staffId) {
    return (
      <div className="space-y-4">
        {header}
        {filters}
        <EmptyState icon={UserRound} title="Choose a staff member" description="See where they worked, how many days, what they earned and what is still to pay." />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {header}
      {filters}
      {!valid && <ErrorState error="Choose a valid date range" />}
      {loading && !data && <PageLoader tiles={4} />}
      {error && !data && <ErrorState error={error} onRetry={reload} />}

      {data && (
        <div className={cn('space-y-4 transition-opacity', refreshing && 'opacity-60')}>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{data.staff.name}</span>
            <span>{ROLE_LABELS[data.staff.role] || data.staff.role}</span>
            <span>{formatCurrency(data.staff.dailyWage)}/day · OT {formatCurrency(data.staff.otRate)}/h</span>
            {data.sites.length > 0 && <span>Sites: {data.sites.map((x) => x.name).join(', ')}</span>}
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatTile
              label="Days worked"
              value={formatNumber(s.payableDays)}
              hint={`${s.present} full · ${s.half} half · ${s.absent} absent · ${s.leave} leave`}
              icon={CalendarDays}
            />
            <StatTile label="Earned" value={formatCurrency(s.earned)} hint={`${s.sitesWorked} site${s.sitesWorked === 1 ? '' : 's'}${s.otHours ? ` · ${s.otHours}h OT (${formatCurrency(s.otAmount)})` : ''}`} icon={IndianRupee} tone="primary" />
            <StatTile label="Paid in period" value={formatCurrency(s.paidInRange)} hint={s.pendingAmount ? `${formatCurrency(s.pendingAmount)} pending approval` : 'Net after advances'} icon={Wallet} tone="success" />
            <StatTile
              label="Unpaid now"
              value={formatCurrency(s.outstanding)}
              hint={s.outstanding ? `${formatNumber(s.outstandingDays)} days not yet paid` : 'All paid up'}
              icon={HandCoins}
              tone={s.outstanding ? 'warning' : 'default'}
              to={s.outstanding ? `/payments?staff=${staffId}` : undefined}
            />
            <StatTile
              label="Advance balance"
              value={formatCurrency(s.advanceBalance)}
              hint={s.advancesGiven ? `${formatCurrency(s.advancesGiven)} given in period` : 'To recover from wages'}
              icon={HandCoins}
              tone={s.advanceBalance ? 'danger' : 'default'}
              className="col-span-2 lg:col-span-1"
            />
          </div>

          <SitesChart bySite={data.bySite} />

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Day by day <span className="font-normal text-muted-foreground">({data.days.length})</span></h3>
            <DayList days={data.days} />
          </section>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Wage payments</h3>
              {data.payments.length === 0 ? (
                <EmptyState compact icon={Wallet} title="No payments for this period" />
              ) : (
                <ul className="divide-y divide-border rounded-lg border border-border bg-card">
                  {data.payments.map((p) => (
                    <li key={p._id}>
                      <Link to={`/payments/${p._id}`} className="flex items-center justify-between gap-3 px-3 py-2.5 hover:bg-muted/40">
                        <span className="min-w-0 text-sm">
                          <span className="block font-medium">{formatRange(p.periodStart, p.periodEnd)}</span>
                          <span className="text-xs text-muted-foreground">
                            {p.status === 'paid' ? `Paid ${formatDate(p.paidDate)} · ${PAYMENT_MODE_LABELS[p.paymentMode] || p.paymentMode}` : 'Pending'}
                            {p.advanceDeducted ? ` · ${formatCurrency(p.advanceDeducted)} advance recovered` : ''}
                          </span>
                        </span>
                        <span className="flex shrink-0 flex-col items-end gap-1">
                          <span className="font-medium tabular-nums">{formatCurrency(p.net)}</span>
                          <StatusBadge status={p.status} />
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="space-y-2">
              <h3 className="text-sm font-semibold">Advances given</h3>
              {data.advances.length === 0 ? (
                <EmptyState compact icon={HandCoins} title="No advances in this period" />
              ) : (
                <ul className="divide-y divide-border rounded-lg border border-border bg-card">
                  {data.advances.map((a) => (
                    <li key={a._id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
                      <span className="min-w-0">
                        <span className="block font-medium">{formatDate(a.date)}</span>
                        <span className="text-xs text-muted-foreground">{[a.note, PAYMENT_MODE_LABELS[a.paymentMode]].filter(Boolean).join(' · ') || '—'}</span>
                      </span>
                      <span className="font-medium tabular-nums">{formatCurrency(a.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
