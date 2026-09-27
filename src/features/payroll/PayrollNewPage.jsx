import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertTriangle, HandCoins, Users } from 'lucide-react';
import { payrollApi } from '@/features/payroll/api';
import { useApi } from '@/shared/hooks/useApi';
import { cn } from '@/shared/lib/utils';
import {
  ROLE_LABELS,
  formatCurrency,
  formatDate,
  monthStartISO,
  shiftISODate,
  toISODate,
  todayISO,
} from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Checkbox } from '@/shared/ui/checkbox';
import { Input } from '@/shared/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { PageHeader } from '@/shared/components/PageHeader';
import { EmptyState, ErrorState } from '@/shared/components/States';
import { Skeleton } from '@/shared/ui/skeleton';

const presets = () => {
  const today = todayISO();
  const d = new Date();
  const weekStart = shiftISODate(today, -((d.getDay() + 6) % 7));
  return [
    { key: 'this-week', label: 'This week', from: weekStart, to: today },
    { key: 'last-week', label: 'Last week', from: shiftISODate(weekStart, -7), to: shiftISODate(weekStart, -1) },
    { key: 'this-month', label: 'This month', from: monthStartISO(), to: today },
    {
      key: 'last-month',
      label: 'Last month',
      from: toISODate(new Date(d.getFullYear(), d.getMonth() - 1, 1)),
      to: toISODate(new Date(d.getFullYear(), d.getMonth(), 0)),
    },
  ];
};

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

const MODES = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'bank', label: 'Bank' },
];

function MoneyInput({ value, onChange, max, label }) {
  return (
    <Input
      type="number"
      inputMode="numeric"
      min="0"
      max={max}
      value={value}
      placeholder="0"
      aria-label={label}
      onChange={(e) => onChange(e.target.value)}
      className="h-10 w-24 text-right sm:h-8"
    />
  );
}

export default function PayrollNew() {
  const navigate = useNavigate();
  const presetList = useMemo(presets, []);
  const [range, setRange] = useState({ key: 'this-week', from: presetList[0].from, to: presetList[0].to });
  const valid = range.from && range.to && range.from <= range.to;
  const { data, error, loading, refreshing, reload } = useApi(
    () => payrollApi.preview({ from: range.from, to: range.to }),
    [range.from, range.to],
    { enabled: Boolean(valid) }
  );

  const [selected, setSelected] = useState(new Set());
  const [adj, setAdj] = useState({});
  const [payNow, setPayNow] = useState(true);
  const [mode, setMode] = useState('cash');
  const [paidDate, setPaidDate] = useState(todayISO());
  const [submitting, setSubmitting] = useState(false);

  const rows = useMemo(() => data?.rows || [], [data]);
  const payable = useMemo(() => rows.filter((r) => !r.overlap && r.totalAmount > 0), [rows]);

  // New period: select everyone who can be paid and reset adjustments.
  useEffect(() => {
    setSelected(new Set(payable.map((r) => r.staff._id)));
    setAdj({});
  }, [payable]);

  const setField = (id, field, value) => setAdj((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  const netOf = (r) => {
    const a = adj[r.staff._id] || {};
    return r.totalAmount + num(a.bonus) - num(a.deductions) - num(a.advance);
  };
  const problemOf = (r) => {
    const a = adj[r.staff._id] || {};
    if (num(a.advance) > r.advanceBalance) return 'Recovery is more than the advance balance';
    if (netOf(r) < 0) return 'Deductions are more than the wages';
    return null;
  };

  const chosen = payable.filter((r) => selected.has(r.staff._id));
  const totals = chosen.reduce(
    (t, r) => ({ gross: t.gross + r.totalAmount, net: t.net + netOf(r), days: t.days + r.totalDays }),
    { gross: 0, net: 0, days: 0 }
  );
  const blocked = chosen.some(problemOf);

  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const recoverAll = () => {
    setAdj((prev) => {
      const next = { ...prev };
      payable.forEach((r) => {
        if (!r.advanceBalance) return;
        const a = next[r.staff._id] || {};
        const room = r.totalAmount + num(a.bonus) - num(a.deductions);
        next[r.staff._id] = { ...a, advance: String(Math.max(0, Math.min(r.advanceBalance, room))) };
      });
      return next;
    });
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const res = await payrollApi.create({
        periodStart: range.from,
        periodEnd: range.to,
        markPaid: payNow,
        paymentMode: payNow ? mode : undefined,
        paidDate: payNow ? paidDate : undefined,
        entries: chosen.map((r) => {
          const a = adj[r.staff._id] || {};
          return { staffId: r.staff._id, bonus: num(a.bonus), deductions: num(a.deductions), advanceDeducted: num(a.advance) };
        }),
      });
      toast.success(`${payNow ? 'Paid' : 'Created pending payments for'} ${res.created} staff · ${formatCurrency(res.totalNet)}`);
      if (res.skipped.length) {
        toast.warning(`${res.skipped.length} skipped`, {
          description: res.skipped.map((s) => `${s.name}: ${s.reason}`).join('\n'),
          duration: 8000,
        });
      }
      navigate(`/payroll/${res.run._id}`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  const hasAdvances = payable.some((r) => r.advanceBalance > 0);

  const paymentOptions = (
    <>
      <div className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1" role="radiogroup" aria-label="When to pay">
        {[
          { value: true, label: 'Pay now' },
          { value: false, label: 'Save pending' },
        ].map((o) => (
          <button
            key={o.label}
            type="button"
            role="radio"
            aria-checked={payNow === o.value}
            onClick={() => setPayNow(o.value)}
            className={cn('h-9 rounded-sm px-3 text-sm font-medium text-muted-foreground sm:h-7 sm:text-xs', payNow === o.value && 'bg-background text-foreground')}
          >
            {o.label}
          </button>
        ))}
      </div>
      {payNow && (
        <>
          <div className="grid grid-cols-3 gap-1" role="radiogroup" aria-label="Payment mode">
            {MODES.map((m) => (
              <button
                key={m.value}
                type="button"
                role="radio"
                aria-checked={mode === m.value}
                onClick={() => setMode(m.value)}
                className={cn(
                  'h-10 rounded-md border border-border px-3 text-sm font-medium sm:h-9 sm:text-xs',
                  mode === m.value ? 'border-primary bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
          <Input type="date" aria-label="Paid on" value={paidDate} max={todayISO()} onChange={(e) => setPaidDate(e.target.value)} className="lg:w-40" />
        </>
      )}
    </>
  );

  return (
    <div className="space-y-4 pb-24 lg:pb-20">
      <PageHeader
        backTo="/payments?tab=payroll"
        title="Run payroll"
        description="Pay everyone’s wages for a period in one go, then print the payroll sheet"
      />

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
          {presetList.map((p) => (
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
          <Input type="date" aria-label="From" value={range.from} max={range.to} onChange={(e) => setRange((r) => ({ ...r, key: 'custom', from: e.target.value }))} className="sm:w-40" />
          <span className="text-sm text-muted-foreground">to</span>
          <Input type="date" aria-label="To" value={range.to} min={range.from} max={todayISO()} onChange={(e) => setRange((r) => ({ ...r, key: 'custom', to: e.target.value }))} className="sm:w-40" />
        </div>
      </div>

      {error && <ErrorState error={error} onRetry={reload} />}

      {loading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No payable attendance in this period"
          description={`Nobody has present or half days between ${formatDate(range.from)} and ${formatDate(range.to)}.`}
        />
      ) : (
        <div className={cn('space-y-3', refreshing && 'opacity-60')}>
          <Card className="grid gap-2 p-3 lg:hidden">
            <p className="text-xs font-medium text-muted-foreground">Payment</p>
            {paymentOptions}
          </Card>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-muted-foreground">
              {payable.length} staff can be paid
              {rows.length > payable.length && ` · ${rows.length - payable.length} already covered by a payment`}
            </p>
            {hasAdvances && (
              <Button variant="outline" size="sm" onClick={recoverAll}><HandCoins /> Recover all advances</Button>
            )}
          </div>

          <Card className="hidden overflow-hidden lg:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      aria-label="Select all"
                      checked={chosen.length === payable.length && payable.length > 0}
                      onCheckedChange={(v) => setSelected(v ? new Set(payable.map((r) => r.staff._id)) : new Set())}
                    />
                  </TableHead>
                  <TableHead>Staff</TableHead>
                  <TableHead className="text-right">Days</TableHead>
                  <TableHead className="text-right">Wages</TableHead>
                  <TableHead className="text-right">Advance</TableHead>
                  <TableHead className="text-right">Recover</TableHead>
                  <TableHead className="text-right">Bonus</TableHead>
                  <TableHead className="text-right">Deduct</TableHead>
                  <TableHead className="text-right">Net pay</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const id = r.staff._id;
                  const a = adj[id] || {};
                  const disabled = Boolean(r.overlap);
                  const problem = problemOf(r);
                  return (
                    <TableRow key={id} className={cn(disabled && 'opacity-50')}>
                      <TableCell>
                        <Checkbox checked={selected.has(id) && !disabled} disabled={disabled} onCheckedChange={() => toggle(id)} aria-label={`Include ${r.staff.name}`} />
                      </TableCell>
                      <TableCell>
                        <p className="font-medium">{r.staff.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {disabled
                            ? `Already in a ${r.overlap.status} payment (${formatDate(r.overlap.periodStart)} – ${formatDate(r.overlap.periodEnd)})`
                            : `${ROLE_LABELS[r.staff.role]} · ${formatCurrency(r.staff.dailyWage)}/day`}
                        </p>
                        {problem && <p className="text-xs text-red-600">{problem}</p>}
                      </TableCell>
                      <TableCell className="text-right">
                        {r.totalDays}
                        {r.otHours > 0 && <span className="block text-xs text-blue-700">+{r.otHours}h OT</span>}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(r.totalAmount)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{r.advanceBalance ? formatCurrency(r.advanceBalance) : '—'}</TableCell>
                      <TableCell className="text-right">
                        {r.advanceBalance > 0 && !disabled ? (
                          <MoneyInput label={`Advance recovery for ${r.staff.name}`} value={a.advance || ''} max={r.advanceBalance} onChange={(v) => setField(id, 'advance', v)} />
                        ) : '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        {!disabled && <MoneyInput label={`Bonus for ${r.staff.name}`} value={a.bonus || ''} onChange={(v) => setField(id, 'bonus', v)} />}
                      </TableCell>
                      <TableCell className="text-right">
                        {!disabled && <MoneyInput label={`Deductions for ${r.staff.name}`} value={a.deductions || ''} onChange={(v) => setField(id, 'deductions', v)} />}
                      </TableCell>
                      <TableCell className="text-right font-semibold">{disabled ? '—' : formatCurrency(netOf(r))}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </Card>

          <div className="space-y-3 lg:hidden">
            {rows.map((r) => {
              const id = r.staff._id;
              const a = adj[id] || {};
              const disabled = Boolean(r.overlap);
              const problem = problemOf(r);
              return (
                <Card key={id} className={cn('p-3', disabled && 'opacity-50')}>
                  <label className="flex items-start gap-3">
                    <Checkbox className="mt-1" checked={selected.has(id) && !disabled} disabled={disabled} onCheckedChange={() => toggle(id)} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{r.staff.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        {disabled ? `Already in a ${r.overlap.status} payment` : `${r.totalDays} days${r.otHours ? ` + ${r.otHours}h OT` : ''} · wages ${formatCurrency(r.totalAmount)}`}
                      </span>
                    </span>
                    {!disabled && <span className="font-semibold">{formatCurrency(netOf(r))}</span>}
                  </label>
                  {!disabled && (
                    <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                      <label className="space-y-1">
                        <span className="text-muted-foreground">Recover</span>
                        <Input type="number" inputMode="numeric" min="0" disabled={!r.advanceBalance} value={a.advance || ''} placeholder={r.advanceBalance ? `max ${r.advanceBalance}` : '—'} onChange={(e) => setField(id, 'advance', e.target.value)} />
                      </label>
                      <label className="space-y-1">
                        <span className="text-muted-foreground">Bonus</span>
                        <Input type="number" inputMode="numeric" min="0" value={a.bonus || ''} placeholder="0" onChange={(e) => setField(id, 'bonus', e.target.value)} />
                      </label>
                      <label className="space-y-1">
                        <span className="text-muted-foreground">Deduct</span>
                        <Input type="number" inputMode="numeric" min="0" value={a.deductions || ''} placeholder="0" onChange={(e) => setField(id, 'deductions', e.target.value)} />
                      </label>
                    </div>
                  )}
                  {problem && <p className="mt-2 text-xs text-red-600">{problem}</p>}
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {payable.length > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-20 border-t border-border bg-card px-4 py-2.5 lg:bottom-0 lg:left-60 lg:px-6 lg:py-3">
          <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3">
            <div className="min-w-0 text-sm">
              <p className="truncate">
                <span className="font-semibold">{chosen.length}</span> staff
                <span className="hidden sm:inline"> · {totals.days} days · wages {formatCurrency(totals.gross)}</span>
              </p>
              <p className="font-semibold">
                Net {formatCurrency(totals.net)}
                {blocked && (
                  <span className="ml-2 inline-flex items-center gap-1 text-xs font-normal text-red-600">
                    <AlertTriangle className="h-3.5 w-3.5" /> Fix highlighted rows
                  </span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden items-center gap-2 lg:flex">{paymentOptions}</div>
              <Button onClick={submit} disabled={chosen.length === 0 || blocked || submitting || refreshing}>
                {submitting ? 'Processing…' : payNow ? `Pay ${formatCurrency(totals.net)}` : `Create ${chosen.length} pending`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
