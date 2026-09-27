import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, CalendarDays, ClipboardList, Download, IndianRupee, Printer, Receipt, Wallet } from 'lucide-react';
import { reportsApi } from '@/features/reports/api';
import { useApi } from '@/shared/hooks/useApi';
import { cn } from '@/shared/lib/utils';
import { downloadCsv } from '@/shared/lib/csv';
import {
  ROLE_LABELS,
  formatCurrency,
  formatDate,
  formatNumber,
  monthStartISO,
  shiftISODate,
  toISODate,
  todayISO,
} from '@/shared/lib/format';
import { Button, buttonVariants } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Input } from '@/shared/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { PageHeader } from '@/shared/components/PageHeader';
import { PageLoader } from '@/shared/components/PageLoader';
import { StatTile } from '@/shared/components/StatTile';
import { EmptyState, ErrorState } from '@/shared/components/States';

const buildPresets = () => {
  const d = new Date();
  const today = todayISO();
  return [
    { key: 'this-month', label: 'This month', from: monthStartISO(), to: today },
    {
      key: 'last-month',
      label: 'Last month',
      from: toISODate(new Date(d.getFullYear(), d.getMonth() - 1, 1)),
      to: toISODate(new Date(d.getFullYear(), d.getMonth(), 0)),
    },
    { key: '30d', label: 'Last 30 days', from: shiftISODate(today, -29), to: today },
    { key: '90d', label: 'Last 90 days', from: shiftISODate(today, -89), to: today },
    { key: 'year', label: 'This year', from: `${d.getFullYear()}-01-01`, to: today },
  ];
};

const STAFF_COLUMNS = [
  { label: 'Staff', value: (r) => r.staff.name },
  { label: 'Role', value: (r) => ROLE_LABELS[r.staff.role] || r.staff.role },
  { label: 'Daily wage', value: (r) => r.staff.dailyWage },
  { label: 'Present', value: (r) => r.present },
  { label: 'Half days', value: (r) => r.half },
  { label: 'Absent', value: (r) => r.absent },
  { label: 'Leave', value: (r) => r.leave },
  { label: 'Payable days', value: (r) => r.payableDays },
  { label: 'OT hours', value: (r) => r.otHours },
  { label: 'OT pay', value: (r) => r.otAmount },
  { label: 'Earned', value: (r) => r.earned },
  { label: 'Paid', value: (r) => r.paid },
  { label: 'Advances given', value: (r) => r.advances },
];

const SITE_COLUMNS = [
  { label: 'Site', value: (r) => r.site.name },
  { label: 'Client', value: (r) => r.site.clientName || '' },
  { label: 'Staff', value: (r) => r.staffCount },
  { label: 'Person-days', value: (r) => r.personDays },
  { label: 'OT hours', value: (r) => r.otHours },
  { label: 'Labour cost', value: (r) => r.labourCost },
  { label: 'Expenses', value: (r) => r.expenses },
  { label: 'Total cost', value: (r) => r.totalCost },
  { label: 'Received from client', value: (r) => r.received },
];

export default function Reports() {
  const presets = useMemo(buildPresets, []);
  const [range, setRange] = useState({ key: 'this-month', from: presets[0].from, to: presets[0].to });
  const [tab, setTab] = useState('staff');
  const valid = range.from && range.to && range.from <= range.to;

  const { data, error, loading, refreshing, reload } = useApi(
    () => reportsApi.summary({ from: range.from, to: range.to }),
    [range.from, range.to],
    { enabled: Boolean(valid), cacheKey: `report:${range.from}:${range.to}` }
  );

  const exportCsv = () => {
    const suffix = `${range.from}_to_${range.to}`;
    if (tab === 'staff') downloadCsv(`wages-by-staff_${suffix}.csv`, STAFF_COLUMNS, data.byStaff);
    else downloadCsv(`labour-by-site_${suffix}.csv`, SITE_COLUMNS, data.bySite);
  };

  const filters = (
    <div className="flex flex-col gap-2 print:hidden lg:flex-row lg:items-center lg:justify-between">
      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
        {presets.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => setRange({ key: p.key, from: p.from, to: p.to })}
            className={cn(
              'h-10 shrink-0 rounded-full border border-border px-3.5 text-sm font-medium sm:h-8 sm:px-3 sm:text-xs text-muted-foreground hover:bg-muted hover:text-foreground',
              range.key === p.key && 'border-primary bg-primary/10 text-primary'
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="date"
          aria-label="From"
          value={range.from}
          max={range.to}
          onChange={(e) => setRange((r) => ({ ...r, key: 'custom', from: e.target.value }))}
          className="sm:w-40"
        />
        <span className="text-sm text-muted-foreground">to</span>
        <Input
          type="date"
          aria-label="To"
          value={range.to}
          min={range.from}
          max={todayISO()}
          onChange={(e) => setRange((r) => ({ ...r, key: 'custom', to: e.target.value }))}
          className="sm:w-40"
        />
      </div>
    </div>
  );

  const header = (
    <PageHeader
      title="Reports"
      description={valid ? `${formatDate(range.from)} – ${formatDate(range.to)}` : 'Choose a valid date range'}
      actions={
        data && (
          <div className="flex flex-wrap gap-2 print:hidden">
            <Link to="/reports/muster" className={buttonVariants({ variant: 'outline', size: 'sm' })}><ClipboardList /> Muster roll</Link>
            <Button variant="outline" size="sm" onClick={() => window.print()}><Printer /> Print</Button>
            <Button size="sm" onClick={exportCsv}><Download /> Export CSV</Button>
          </div>
        )
      }
    />
  );

  if (loading && !data) {
    return (
      <div className="space-y-4">
        {header}
        {filters}
        <PageLoader tiles={4} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {header}
      {filters}
      {error && <ErrorState error={error} onRetry={reload} />}

      {data && (
        <div className={cn('space-y-4 transition-opacity', refreshing && 'opacity-60')}>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatTile label="Payable person-days" value={formatNumber(data.totals.payableDays)} hint={`${data.totals.staffCount} staff${data.totals.otHours ? ` · ${data.totals.otHours}h OT` : ''}`} icon={CalendarDays} />
            <StatTile label="Wages earned" value={formatCurrency(data.totals.earned)} hint="Attendance × wage + OT" icon={IndianRupee} tone="primary" />
            <StatTile label="Wages paid" value={formatCurrency(data.totals.paid)} hint={`Advances given ${formatCurrency(data.totals.advances)}`} icon={Wallet} />
            <StatTile label="Expenses" value={formatCurrency(data.totals.expenses)} hint={`General ${formatCurrency(data.totals.generalExpenses)}`} icon={Receipt} to="/expenses" />
            <StatTile label="Received from clients" value={formatCurrency(data.totals.received)} hint={`${data.totals.siteCount} sites`} icon={Wallet} tone="success" className="col-span-2 lg:col-span-1" />
          </div>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="print:hidden">
              <TabsTrigger value="staff">By staff ({data.byStaff.length})</TabsTrigger>
              <TabsTrigger value="site">By site ({data.bySite.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="staff">
              {data.byStaff.length === 0 ? (
                <EmptyState icon={BarChart3} title="No activity in this period" />
              ) : (
                <Card className="overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Staff</TableHead>
                        <TableHead className="text-right">Present</TableHead>
                        <TableHead className="text-right">Half</TableHead>
                        <TableHead className="hidden text-right sm:table-cell">Absent</TableHead>
                        <TableHead className="hidden text-right sm:table-cell">Leave</TableHead>
                        <TableHead className="text-right">Days</TableHead>
                        <TableHead className="hidden text-right sm:table-cell">OT h</TableHead>
                        <TableHead className="text-right">Earned</TableHead>
                        <TableHead className="hidden text-right md:table-cell">Paid</TableHead>
                        <TableHead className="hidden text-right md:table-cell">Advances</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.byStaff.map((r) => (
                        <TableRow key={r.staff._id}>
                          <TableCell>
                            <Link to={`/staff/${r.staff._id}`} className="tap font-medium hover:underline">{r.staff.name}</Link>
                            <p className="text-xs text-muted-foreground">{formatCurrency(r.staff.dailyWage)}/day</p>
                          </TableCell>
                          <TableCell className="text-right">{r.present}</TableCell>
                          <TableCell className="text-right">{r.half}</TableCell>
                          <TableCell className="hidden text-right sm:table-cell">{r.absent}</TableCell>
                          <TableCell className="hidden text-right sm:table-cell">{r.leave}</TableCell>
                          <TableCell className="text-right">{r.payableDays}</TableCell>
                          <TableCell className="hidden text-right sm:table-cell">{r.otHours || '—'}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(r.earned)}</TableCell>
                          <TableCell className="hidden text-right md:table-cell">{r.paid ? formatCurrency(r.paid) : '—'}</TableCell>
                          <TableCell className="hidden text-right md:table-cell">{r.advances ? formatCurrency(r.advances) : '—'}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-semibold">
                        <TableCell>Total</TableCell>
                        <TableCell className="text-right">{data.byStaff.reduce((s, r) => s + r.present, 0)}</TableCell>
                        <TableCell className="text-right">{data.byStaff.reduce((s, r) => s + r.half, 0)}</TableCell>
                        <TableCell className="hidden text-right sm:table-cell">{data.byStaff.reduce((s, r) => s + r.absent, 0)}</TableCell>
                        <TableCell className="hidden text-right sm:table-cell">{data.byStaff.reduce((s, r) => s + r.leave, 0)}</TableCell>
                        <TableCell className="text-right">{data.totals.payableDays}</TableCell>
                        <TableCell className="hidden text-right sm:table-cell">{data.totals.otHours}</TableCell>
                        <TableCell className="text-right">{formatCurrency(data.totals.earned)}</TableCell>
                        <TableCell className="hidden text-right md:table-cell">{formatCurrency(data.totals.paid)}</TableCell>
                        <TableCell className="hidden text-right md:table-cell">{formatCurrency(data.totals.advances)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="site">
              {data.bySite.length === 0 ? (
                <EmptyState icon={BarChart3} title="No site activity in this period" />
              ) : (
                <Card className="overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Site</TableHead>
                        <TableHead className="hidden text-right sm:table-cell">Person-days</TableHead>
                        <TableHead className="text-right">Labour</TableHead>
                        <TableHead className="hidden text-right sm:table-cell">Expenses</TableHead>
                        <TableHead className="text-right">Total cost</TableHead>
                        <TableHead className="hidden text-right md:table-cell">Received</TableHead>
                        <TableHead className="hidden text-right md:table-cell">Net cash</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.bySite.map((r) => (
                        <TableRow key={r.site._id}>
                          <TableCell>
                            <Link to={`/sites/${r.site._id}?tab=finance`} className="tap font-medium hover:underline">{r.site.name}</Link>
                            <p className="text-xs text-muted-foreground">
                              {[r.site.clientName, r.staffCount && `${r.staffCount} staff`].filter(Boolean).join(' · ') || '—'}
                            </p>
                          </TableCell>
                          <TableCell className="hidden text-right sm:table-cell">
                            {r.personDays}
                            {r.otHours > 0 && <span className="block text-xs text-muted-foreground">+{r.otHours}h OT</span>}
                          </TableCell>
                          <TableCell className="text-right">{formatCurrency(r.labourCost)}</TableCell>
                          <TableCell className="hidden text-right sm:table-cell">{r.expenses ? formatCurrency(r.expenses) : '—'}</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(r.totalCost)}</TableCell>
                          <TableCell className="hidden text-right md:table-cell">{r.received ? formatCurrency(r.received) : '—'}</TableCell>
                          <TableCell className={cn('hidden text-right md:table-cell', r.net < 0 ? 'text-red-600' : 'text-emerald-700')}>
                            {formatCurrency(r.net)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-muted/50 font-semibold">
                        <TableCell>Total{data.totals.generalExpenses > 0 && <span className="block text-xs font-normal text-muted-foreground">+ {formatCurrency(data.totals.generalExpenses)} general expenses not tied to a site</span>}</TableCell>
                        <TableCell className="hidden text-right sm:table-cell">{data.totals.payableDays}</TableCell>
                        <TableCell className="text-right">{formatCurrency(data.bySite.reduce((s2, r) => s2 + r.labourCost, 0))}</TableCell>
                        <TableCell className="hidden text-right sm:table-cell">{formatCurrency(data.totals.siteExpenses)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(data.bySite.reduce((s2, r) => s2 + r.totalCost, 0))}</TableCell>
                        <TableCell className="hidden text-right md:table-cell">{formatCurrency(data.totals.received)}</TableCell>
                        <TableCell className="hidden text-right md:table-cell">{formatCurrency(data.bySite.reduce((s2, r) => s2 + r.net, 0))}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                  <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
                    Net cash = received from the client in this period − labour − expenses. See each site’s Finance tab for contract value and expected profit.
                  </p>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
