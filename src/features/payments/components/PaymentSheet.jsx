import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { paymentsApi } from '@/features/payments/api';
import { cn } from '@/shared/lib/utils';
import { formatCurrency, formatDate, monthStartISO, shiftISODate, toISODate, todayISO } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Input, Textarea } from '@/shared/ui/input';
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/shared/ui/sheet';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { Field } from '@/shared/components/Field';
import { UpiPayPanel } from '@/features/payments/components/UpiPayPanel';
import { StaffPicker } from '@/shared/components/SitePicker';

const MODES = [
  { value: 'cash', label: 'Cash' },
  { value: 'upi', label: 'UPI' },
  { value: 'bank', label: 'Bank' },
];

const presets = () => {
  const today = todayISO();
  const d = new Date();
  const weekStart = shiftISODate(today, -((d.getDay() + 6) % 7));
  const lastMonthStart = toISODate(new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const lastMonthEnd = toISODate(new Date(d.getFullYear(), d.getMonth(), 0));
  return [
    { label: 'This week', from: weekStart, to: today },
    { label: 'Last week', from: shiftISODate(weekStart, -7), to: shiftISODate(weekStart, -1) },
    { label: 'This month', from: monthStartISO(), to: today },
    { label: 'Last month', from: lastMonthStart, to: lastMonthEnd },
  ];
};

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

export function PaymentSheet({ open, onOpenChange, staffList, initial, onDone }) {
  const navigate = useNavigate();
  const [staffId, setStaffId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState('');
  const [previewing, setPreviewing] = useState(false);
  const [bonus, setBonus] = useState('');
  const [deductions, setDeductions] = useState('');
  const [advance, setAdvance] = useState('');
  const [payNow, setPayNow] = useState(true);
  const [mode, setMode] = useState('cash');
  const [paidDate, setPaidDate] = useState(todayISO());
  const [note, setNote] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [proof, setProof] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setStaffId(initial?.staffId || '');
    setFrom(initial?.from || '');
    setTo(initial?.to || '');
    setBonus('');
    setDeductions('');
    setAdvance('');
    setPayNow(true);
    setMode('cash');
    setPaidDate(todayISO());
    setNote('');
    setTransactionRef('');
    setProof(null);
    setPreview(null);
    setPreviewError('');
  }, [open, initial]);

  // Recalculate the wage preview whenever staff or period changes.
  useEffect(() => {
    if (!open || !staffId || !from || !to) {
      setPreview(null);
      setPreviewError('');
      setPreviewing(false);
      return undefined;
    }
    if (to < from) {
      setPreview(null);
      setPreviewError('The end date must be on or after the start date.');
      setPreviewing(false);
      return undefined;
    }
    let cancelled = false;
    setPreviewing(true);
    const timer = setTimeout(() => {
      paymentsApi
        .preview({ staffId, periodStart: from, periodEnd: to })
        .then((data) => {
          if (cancelled) return;
          setPreview(data);
          setPreviewError('');
        })
        .catch((e) => {
          if (cancelled) return;
          setPreview(null);
          setPreviewError(e.message);
        })
        .finally(() => !cancelled && setPreviewing(false));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [open, staffId, from, to]);

  const gross = preview?.totalAmount || 0;
  const maxAdvance = Math.max(0, Math.min(preview?.advanceBalance || 0, gross + num(bonus) - num(deductions)));
  const net = gross + num(bonus) - num(deductions) - num(advance);

  const problem = useMemo(() => {
    if (!preview) return null;
    if (preview.totalDays === 0) return 'No present or half days in this period.';
    if (num(advance) > (preview.advanceBalance || 0)) return `Advance recovery can’t exceed the balance of ${formatCurrency(preview.advanceBalance)}.`;
    if (net < 0) return 'Deductions are more than the wages for this period.';
    return null;
  }, [preview, advance, net]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!preview || problem) return;
    setSubmitting(true);
    try {
      const payment = await paymentsApi.create({
        staffId,
        periodStart: from,
        periodEnd: to,
        bonus: num(bonus),
        deductions: num(deductions),
        advanceDeducted: num(advance),
        note: note.trim() || undefined,
        markPaid: payNow,
        paymentMode: payNow ? mode : undefined,
        paidDate: payNow ? paidDate : undefined,
        transactionRef: payNow ? transactionRef.trim() || undefined : undefined,
        proof: payNow ? proof || undefined : undefined,
      });
      toast.success(
        payNow ? `Paid ${formatCurrency(payment.netAmount)} to ${payment.staffId?.name}` : 'Payment saved as pending',
        { action: { label: 'View slip', onClick: () => navigate(`/payments/${payment._id}`) } }
      );
      onOpenChange(false);
      onDone?.(payment);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Pay wages</SheetTitle>
          <SheetDescription>Wages = daily wage × (present days + ½ × half days), per site.</SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col gap-4" noValidate>
          <SheetBody className="space-y-4">
            <Field label="Staff" required>
              <StaffPicker staff={staffList} value={staffId} onChange={setStaffId} />
            </Field>

            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <Field label="From" htmlFor="pay-from" required>
                  <Input id="pay-from" type="date" value={from} max={todayISO()} onChange={(e) => setFrom(e.target.value)} />
                </Field>
                <Field label="To" htmlFor="pay-to" required>
                  <Input id="pay-to" type="date" value={to} max={todayISO()} onChange={(e) => setTo(e.target.value)} />
                </Field>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {presets().map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      setFrom(p.from);
                      setTo(p.to);
                    }}
                    className={cn(
                      'h-9 rounded-full border border-border px-3 text-sm sm:h-7 sm:px-2.5 sm:text-xs text-muted-foreground hover:bg-muted hover:text-foreground',
                      from === p.from && to === p.to && 'border-primary bg-primary/10 text-primary'
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {previewing && !preview && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Calculating wages…
              </p>
            )}

            {previewError && (
              <p className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {previewError}
              </p>
            )}

            {preview && (
              <div className={cn('space-y-4', previewing && 'opacity-60')}>
                <div className="overflow-hidden rounded-md border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Site</TableHead>
                        <TableHead className="text-right">Days</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.breakdown.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="py-4 text-center text-muted-foreground">
                            No payable attendance between {formatDate(from)} and {formatDate(to)}
                          </TableCell>
                        </TableRow>
                      ) : (
                        preview.breakdown.map((b) => (
                          <TableRow key={b.siteId}>
                            <TableCell>{b.siteName}</TableCell>
                            <TableCell className="text-right">
                              {b.presentDays + b.halfDays * 0.5}
                              <span className="block whitespace-nowrap text-xs text-muted-foreground">
                                {b.presentDays} P{b.halfDays > 0 && ` · ${b.halfDays} H`}
                              </span>
                              {b.otHours > 0 && <span className="block text-xs text-blue-700">+{b.otHours}h OT</span>}
                            </TableCell>
                            <TableCell className="text-right">{formatCurrency(b.amount)}</TableCell>
                          </TableRow>
                        ))
                      )}
                      <TableRow className="bg-muted/50 font-medium">
                        <TableCell>
                          Wages ({formatCurrency(preview.staff.dailyWage)}/day)
                          {preview.otHours > 0 && (
                            <span className="block text-xs font-normal text-muted-foreground">
                              incl. {preview.otHours}h overtime @ {formatCurrency(preview.otRate)}/h = {formatCurrency(preview.otAmount)}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{preview.totalDays}</TableCell>
                        <TableCell className="text-right">{formatCurrency(gross)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <Field label="Bonus (₹)" htmlFor="pay-bonus">
                    <Input id="pay-bonus" type="number" inputMode="numeric" min="0" value={bonus} onChange={(e) => setBonus(e.target.value)} placeholder="0" />
                  </Field>
                  <Field label="Deductions (₹)" htmlFor="pay-deduct" hint="Damage, tools, etc.">
                    <Input id="pay-deduct" type="number" inputMode="numeric" min="0" value={deductions} onChange={(e) => setDeductions(e.target.value)} placeholder="0" />
                  </Field>
                </div>

                {preview.advanceBalance > 0 && (
                  <Field
                    label="Recover from advance (₹)"
                    htmlFor="pay-advance"
                    hint={`Outstanding advance: ${formatCurrency(preview.advanceBalance)}`}
                  >
                    <div className="flex gap-2">
                      <Input id="pay-advance" type="number" inputMode="numeric" min="0" max={maxAdvance} value={advance} onChange={(e) => setAdvance(e.target.value)} placeholder="0" />
                      <Button type="button" variant="outline" onClick={() => setAdvance(String(maxAdvance))} disabled={maxAdvance === 0}>
                        Recover {formatCurrency(maxAdvance)}
                      </Button>
                    </div>
                  </Field>
                )}

                <div className="flex items-center justify-between rounded-md border border-primary/30 bg-primary/5 px-4 py-3">
                  <span className="text-sm font-medium">Net payable</span>
                  <span className="text-xl font-semibold text-primary">{formatCurrency(Math.max(net, 0))}</span>
                </div>
                {problem && <p className="text-sm text-red-600">{problem}</p>}

                <div className="space-y-3 rounded-md border border-border p-3">
                  <div className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1" role="radiogroup" aria-label="When to pay">
                    {[
                      { value: true, label: 'Pay now' },
                      { value: false, label: 'Save as pending' },
                    ].map((o) => (
                      <button
                        key={o.label}
                        type="button"
                        role="radio"
                        aria-checked={payNow === o.value}
                        onClick={() => setPayNow(o.value)}
                        className={cn(
                          'h-8 rounded-sm text-sm font-medium text-muted-foreground',
                          payNow === o.value && 'bg-background text-foreground'
                        )}
                      >
                        {o.label}
                      </button>
                    ))}
                  </div>
                  {payNow && (
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Paid by">
                        <div className="grid grid-cols-3 gap-1" role="radiogroup" aria-label="Payment mode">
                          {MODES.map((m) => (
                            <button
                              key={m.value}
                              type="button"
                              role="radio"
                              aria-checked={mode === m.value}
                              onClick={() => setMode(m.value)}
                              className={cn(
                                'h-10 rounded-md border border-border text-sm font-medium sm:h-9 sm:text-xs',
                                mode === m.value ? 'border-primary bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
                              )}
                            >
                              {m.label}
                            </button>
                          ))}
                        </div>
                      </Field>
                      <Field label="Paid on" htmlFor="pay-date">
                        <Input id="pay-date" type="date" value={paidDate} max={todayISO()} onChange={(e) => setPaidDate(e.target.value)} />
                      </Field>
                    </div>
                  )}
                  {payNow && mode === 'upi' && (
                    <UpiPayPanel
                      staff={preview.staff}
                      amount={Math.max(net, 0)}
                      note={`Wages ${formatDate(from)} - ${formatDate(to)}`}
                      transactionRef={transactionRef}
                      onTransactionRef={setTransactionRef}
                      proof={proof}
                      onProof={setProof}
                    />
                  )}
                  <Field label="Note" htmlFor="pay-note">
                    <Textarea id="pay-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
                  </Field>
                </div>
              </div>
            )}
          </SheetBody>
          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={!preview || Boolean(problem) || submitting || previewing}>
              {submitting ? 'Saving…' : payNow ? `Pay ${formatCurrency(Math.max(net, 0))}` : 'Save as pending'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
