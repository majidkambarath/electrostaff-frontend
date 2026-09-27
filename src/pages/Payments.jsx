import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertCircle, CheckCircle2, CreditCard, FileText, Hourglass, MessageCircle, Plus, Users, Wallet, XCircle } from 'lucide-react';
import { api } from '@/api/api';
import { useApi } from '@/hooks/useApi';
import { useOrg } from '@/context/OrgContext';
import { shareSlipOnWhatsApp } from '@/lib/share';
import { cn } from '@/lib/utils';
import {
  PAYMENT_MODE_LABELS,
  ROLE_LABELS,
  formatCurrency,
  formatDate,
  formatRange,
  paymentNet,
  slipNumber,
  toISODate,
  todayISO,
} from '@/lib/format';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageLoader } from '@/components/shared/PageLoader';
import { StatTile } from '@/components/shared/StatTile';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Avatar } from '@/components/shared/Avatar';
import { Field } from '@/components/shared/Field';
import { EmptyState, ErrorState } from '@/components/shared/States';
import { FilterTabs, RowActions, SearchInput, Toolbar } from '@/components/shared/Toolbar';
import { useConfirm } from '@/components/shared/ConfirmDialog';
import { PaymentSheet } from '@/components/forms/PaymentSheet';

function MarkPaidDialog({ payment, onOpenChange, onDone }) {
  const [mode, setMode] = useState('cash');
  const [paidDate, setPaidDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (payment) {
      setMode('cash');
      setPaidDate(todayISO());
      setNote(payment.note || '');
    }
  }, [payment]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.payments.markPaid(payment._id, { paymentMode: mode, paidDate, note: note.trim() || undefined });
      toast.success(`Marked ${formatCurrency(paymentNet(payment))} as paid to ${payment.staffId?.name}`);
      onOpenChange(false);
      onDone();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={Boolean(payment)} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark as paid</DialogTitle>
          <DialogDescription>
            {payment && `${payment.staffId?.name} · ${formatRange(payment.periodStart, payment.periodEnd)} · ${formatCurrency(paymentNet(payment))}`}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Paid by">
              <div className="grid grid-cols-3 gap-1" role="radiogroup" aria-label="Payment mode">
                {Object.entries(PAYMENT_MODE_LABELS).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    role="radio"
                    aria-checked={mode === value}
                    onClick={() => setMode(value)}
                    className={cn(
                      'h-10 rounded-md border border-border text-sm font-medium sm:h-9 sm:text-xs',
                      mode === value ? 'border-primary bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
                    )}
                  >
                    {value === 'bank' ? 'Bank' : label}
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Paid on" htmlFor="mp-date">
              <Input id="mp-date" type="date" value={paidDate} max={todayISO()} onChange={(e) => setPaidDate(e.target.value)} />
            </Field>
          </div>
          <Field label="Note" htmlFor="mp-note">
            <Textarea id="mp-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Confirm paid'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function UnpaidTab({ outstanding, onPay }) {
  if (outstanding.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle2}
        title="Everyone is paid up"
        description="Attendance that isn’t covered by a payment will show up here."
      />
    );
  }
  return (
    <>
      <Card className="hidden overflow-hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Staff</TableHead>
              <TableHead>Unpaid period</TableHead>
              <TableHead className="text-right">Days</TableHead>
              <TableHead className="text-right">Advance</TableHead>
              <TableHead className="text-right">Wages due</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {outstanding.map((o) => (
              <TableRow key={o.staff._id}>
                <TableCell>
                  <Link to={`/staff/${o.staff._id}`} className="flex items-center gap-3">
                    <Avatar name={o.staff.name} />
                    <span>
                      <span className="block font-medium hover:underline">{o.staff.name}</span>
                      <span className="block text-xs text-muted-foreground">{ROLE_LABELS[o.staff.role]} · {formatCurrency(o.staff.dailyWage)}/day</span>
                    </span>
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatRange(o.from, o.to)}
                  {toISODate(o.suggestedPeriod.end) !== toISODate(o.to) && (
                    <p className="text-xs text-amber-700">An existing payment splits this period — pay it in parts</p>
                  )}
                </TableCell>
                <TableCell className="text-right">{o.payableDays}</TableCell>
                <TableCell className="text-right text-muted-foreground">{o.advanceBalance ? formatCurrency(o.advanceBalance) : '—'}</TableCell>
                <TableCell className="text-right font-semibold">{formatCurrency(o.amount)}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" onClick={() => onPay(o)}>Pay</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2 md:hidden">
        {outstanding.map((o) => (
          <Card key={o.staff._id} className="p-3">
            <div className="flex items-start gap-3">
              <Avatar name={o.staff.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{o.staff.name}</p>
                <p className="text-xs text-muted-foreground">{o.payableDays} days · {formatRange(o.from, o.to)}</p>
                {o.advanceBalance > 0 && <p className="text-xs text-amber-700">Advance {formatCurrency(o.advanceBalance)}</p>}
              </div>
              <p className="font-semibold">{formatCurrency(o.amount)}</p>
            </div>
            <Button size="sm" className="mt-3 w-full" onClick={() => onPay(o)}>Pay wages</Button>
          </Card>
        ))}
      </div>
    </>
  );
}

function PayrollRunsTab({ runs }) {
  if (runs.length === 0) {
    return (
      <EmptyState
        icon={Users}
        title="No payroll runs yet"
        description="Run payroll to pay everyone for a week or month in one go and print a payroll sheet."
        action={<Link to="/payroll/new" className={buttonVariants({ size: 'sm' })}>Run payroll</Link>}
      />
    );
  }
  return (
    <Card className="divide-y divide-border overflow-hidden">
      {runs.map((r) => (
        <Link key={r._id} to={`/payroll/${r._id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <Users className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">{formatRange(r.periodStart, r.periodEnd)}</span>
            <span className="block text-xs text-muted-foreground">
              {r.count} staff · created {formatDate(r.createdAt)}
            </span>
          </span>
          <span className="text-right">
            <span className="block text-sm font-semibold">{formatCurrency(r.totalNet)}</span>
            <StatusBadge status={r.pending ? 'pending' : 'paid'} />
          </span>
        </Link>
      ))}
    </Card>
  );
}

function HistoryTab({ payments, status, setStatus, onMarkPaid, onCancel }) {
  const navigate = useNavigate();
  const { org } = useOrg();
  const [query, setQuery] = useState('');
  const counts = useMemo(
    () => ({
      all: payments.length,
      pending: payments.filter((p) => p.status === 'pending').length,
      paid: payments.filter((p) => p.status === 'paid').length,
    }),
    [payments]
  );
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return payments.filter(
      (p) => (status === 'all' || p.status === status) && (!q || p.staffId?.name?.toLowerCase().includes(q))
    );
  }, [payments, status, query]);

  const actions = (p) => (
    <RowActions>
      <DropdownMenuItem onSelect={() => navigate(`/payments/${p._id}`)}><FileText /> View slip</DropdownMenuItem>
      <DropdownMenuItem onSelect={() => shareSlipOnWhatsApp(p, org)}><MessageCircle /> Share on WhatsApp</DropdownMenuItem>
      {p.status === 'pending' && (
        <>
          <DropdownMenuItem onSelect={() => onMarkPaid(p)}><CheckCircle2 /> Mark paid</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem destructive onSelect={() => onCancel(p)}><XCircle /> Cancel payment</DropdownMenuItem>
        </>
      )}
    </RowActions>
  );

  return (
    <div className="space-y-3">
      <Toolbar>
        <SearchInput value={query} onChange={setQuery} placeholder="Search staff…" />
        <FilterTabs
          value={status}
          onChange={setStatus}
          options={[
            { value: 'all', label: 'All', count: counts.all },
            { value: 'pending', label: 'Pending', count: counts.pending },
            { value: 'paid', label: 'Paid', count: counts.paid },
          ]}
        />
      </Toolbar>
      {filtered.length === 0 ? (
        <EmptyState icon={CreditCard} title="No payments found" compact />
      ) : (
        <>
          <Card className="hidden overflow-hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Days</TableHead>
                  <TableHead className="text-right">Wages</TableHead>
                  <TableHead className="text-right">Paid out</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p._id} className="cursor-pointer" onClick={() => navigate(`/payments/${p._id}`)}>
                    <TableCell>
                      <p className="font-medium">{p.staffId?.name || 'Removed staff'}</p>
                      <p className="text-xs text-muted-foreground">{slipNumber(p)}</p>
                    </TableCell>
                    <TableCell>{formatRange(p.periodStart, p.periodEnd)}</TableCell>
                    <TableCell className="text-right">{p.totalDays}</TableCell>
                    <TableCell className="text-right text-muted-foreground">{formatCurrency(p.totalAmount)}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(paymentNet(p))}</TableCell>
                    <TableCell>
                      <StatusBadge status={p.status} />
                      {p.paidDate && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          {formatDate(p.paidDate)} · {PAYMENT_MODE_LABELS[p.paymentMode]}
                        </p>
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>{actions(p)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
          <div className="grid gap-3 sm:grid-cols-2 md:hidden">
            {filtered.map((p) => (
              <Card key={p._id} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <Link to={`/payments/${p._id}`} className="min-w-0">
                    <p className="truncate font-medium">{p.staffId?.name || 'Removed staff'}</p>
                    <p className="text-xs text-muted-foreground">{formatRange(p.periodStart, p.periodEnd)}</p>
                  </Link>
                  <div className="flex items-center gap-1">
                    <StatusBadge status={p.status} />
                    {actions(p)}
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{p.totalDays} days</span>
                  <span className="font-semibold">{formatCurrency(paymentNet(p))}</span>
                </div>
                {p.status === 'pending' && (
                  <Button size="sm" variant="outline" className="mt-2 w-full" onClick={() => onMarkPaid(p)}>Mark paid</Button>
                )}
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function Payments() {
  const confirm = useConfirm();
  const [params, setParams] = useSearchParams();
  const { data, error, loading, reload } = useApi(
    () =>
      Promise.all([api.payments.outstanding(), api.payments.getAll(), api.staff.getAll(), api.payroll.list()]).then(
        ([outstanding, payments, staff, runs]) => ({ outstanding, payments, staff, runs })
      ),
    [],
    { cacheKey: 'payments' }
  );
  const [sheetOpen, setSheetOpen] = useState(false);
  const [initial, setInitial] = useState(null);
  const [markPaid, setMarkPaid] = useState(null);

  const tab = params.get('tab') || 'unpaid';
  const status = params.get('status') || 'all';
  const updateParams = (patch) => {
    const next = new URLSearchParams(params);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    setParams(next, { replace: true });
  };

  // Deep link: /payments?staff=<id>&from=YYYY-MM-DD&to=YYYY-MM-DD opens the payment sheet prefilled.
  const deepStaff = params.get('staff');
  useEffect(() => {
    if (!deepStaff || !data) return;
    setInitial({ staffId: deepStaff, from: params.get('from') || '', to: params.get('to') || '' });
    setSheetOpen(true);
    updateParams({ staff: null, from: null, to: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deepStaff, data]);

  if (loading) return <PageLoader title="Payments" description="Pay wages from attendance" tiles={3} />;
  if (error && !data) return <ErrorState error={error} onRetry={reload} />;

  const { outstanding, payments, staff, runs } = data;
  const payable = staff.filter((s) => s.status !== 'inactive' || outstanding.some((o) => o.staff._id === s._id));
  const pending = payments.filter((p) => p.status === 'pending');
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const paidThisMonth = payments
    .filter((p) => p.status === 'paid' && new Date(p.paidDate) >= monthStart)
    .reduce((s, p) => s + paymentNet(p), 0);

  const openPay = (o) => {
    setInitial(
      o ? { staffId: o.staff._id, from: toISODate(o.suggestedPeriod.start), to: toISODate(o.suggestedPeriod.end) } : null
    );
    setSheetOpen(true);
  };

  const handleCancel = async (p) => {
    const ok = await confirm({
      title: 'Cancel this pending payment?',
      description: `${p.staffId?.name} · ${formatRange(p.periodStart, p.periodEnd)}. Its days go back to unpaid wages and any advance recovery is released.`,
      confirmLabel: 'Cancel payment',
      cancelLabel: 'Keep',
      destructive: true,
    });
    if (!ok) return;
    try {
      await api.payments.cancel(p._id);
      toast.success('Pending payment cancelled');
      reload();
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Payments"
        description="Pay wages from site attendance, with advances and adjustments"
        actions={
          <>
            <Link to="/payroll/new" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              <Users /> Run payroll
            </Link>
            <Button size="sm" onClick={() => openPay(null)}>
              <Plus /> New payment
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatTile
          label="Unpaid wages"
          value={formatCurrency(outstanding.reduce((s, o) => s + o.amount, 0))}
          hint={`${outstanding.length} staff`}
          icon={AlertCircle}
          tone={outstanding.length ? 'warning' : 'success'}
        />
        <StatTile
          label="Pending payments"
          value={formatCurrency(pending.reduce((s, p) => s + paymentNet(p), 0))}
          hint={`${pending.length} to settle`}
          icon={Hourglass}
        />
        <StatTile label="Paid this month" value={formatCurrency(paidThisMonth)} icon={Wallet} tone="primary" className="col-span-2 lg:col-span-1" />
      </div>

      <Tabs value={tab} onValueChange={(t) => updateParams({ tab: t === 'unpaid' ? null : t })}>
        <TabsList>
          <TabsTrigger value="unpaid">Unpaid wages ({outstanding.length})</TabsTrigger>
          <TabsTrigger value="history">History ({payments.length})</TabsTrigger>
          <TabsTrigger value="payroll">Payroll runs ({runs.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="unpaid">
          <UnpaidTab outstanding={outstanding} onPay={openPay} />
        </TabsContent>
        <TabsContent value="payroll">
          <PayrollRunsTab runs={runs} />
        </TabsContent>
        <TabsContent value="history">
          <HistoryTab
            payments={payments}
            status={status}
            setStatus={(s) => updateParams({ status: s === 'all' ? null : s })}
            onMarkPaid={setMarkPaid}
            onCancel={handleCancel}
          />
        </TabsContent>
      </Tabs>

      <PaymentSheet open={sheetOpen} onOpenChange={setSheetOpen} staffList={payable} initial={initial} onDone={reload} />
      <MarkPaidDialog payment={markPaid} onOpenChange={(o) => !o && setMarkPaid(null)} onDone={reload} />
    </div>
  );
}
