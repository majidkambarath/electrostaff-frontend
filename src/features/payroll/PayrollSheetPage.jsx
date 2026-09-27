import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { CheckCircle2, Printer, XCircle } from 'lucide-react';
import { payrollApi } from '@/features/payroll/api';
import { useApi } from '@/shared/hooks/useApi';
import { cn } from '@/shared/lib/utils';
import {
  PAYMENT_MODE_LABELS,
  ROLE_LABELS,
  amountInWords,
  formatCurrency,
  formatDate,
  paymentNet,
  todayISO,
} from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { PageHeader } from '@/shared/components/PageHeader';
import { PageLoader } from '@/shared/components/PageLoader';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { Field } from '@/shared/components/Field';
import { ErrorState } from '@/shared/components/States';
import { useConfirm } from '@/shared/components/ConfirmDialog';
import {
  DocFooter,
  DocTable,
  Letterhead,
  PrintPage,
  ProfileHint,
  Signatures,
  Td,
  Th,
  businessName,
} from '@/shared/components/print/Document';

function MarkRunPaid({ open, onOpenChange, runId, total, onDone }) {
  const [mode, setMode] = useState('cash');
  const [paidDate, setPaidDate] = useState(todayISO());
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      const res = await payrollApi.markPaid(runId, { paymentMode: mode, paidDate });
      toast.success(res.message);
      onOpenChange(false);
      onDone();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mark payroll as paid</DialogTitle>
          <DialogDescription>All pending payments in this payroll · {formatCurrency(total)}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Paid by">
            <div className="grid grid-cols-3 gap-1" role="radiogroup" aria-label="Payment mode">
              {['cash', 'upi', 'bank'].map((m) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={mode === m}
                  onClick={() => setMode(m)}
                  className={cn(
                    'h-10 rounded-md border border-border text-sm font-medium sm:h-9 sm:text-xs',
                    mode === m ? 'border-primary bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
                  )}
                >
                  {m === 'bank' ? 'Bank' : PAYMENT_MODE_LABELS[m]}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Paid on" htmlFor="run-paid-date">
            <Input id="run-paid-date" type="date" value={paidDate} max={todayISO()} onChange={(e) => setPaidDate(e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? 'Saving…' : 'Confirm paid'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function PayrollSheet() {
  const { id } = useParams();
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { data, error, loading, reload } = useApi(() => payrollApi.get(id), [id], { cacheKey: `payroll:${id}` });
  const [payOpen, setPayOpen] = useState(false);

  if (loading) return <PageLoader />;
  if (error && !data) {
    return (
      <div className="space-y-4">
        <PageHeader title="Payroll sheet" backTo="/payments?tab=payroll" />
        <ErrorState error={error} onRetry={error.status === 404 ? undefined : reload} />
      </div>
    );
  }

  const { run, payments, organization: org } = data;
  const pending = payments.filter((p) => p.status === 'pending');
  const anyPaid = payments.some((p) => p.status === 'paid');
  const sum = (fn) => payments.reduce((s, p) => s + fn(p), 0);
  const totals = {
    days: sum((p) => p.totalDays),
    ot: sum((p) => p.otHours || 0),
    gross: sum((p) => p.totalAmount),
    bonus: sum((p) => p.bonus || 0),
    advance: sum((p) => p.advanceDeducted || 0),
    deductions: sum((p) => p.deductions || 0),
    net: sum(paymentNet),
  };
  const hasOt = totals.ot > 0;

  const cancelRun = async () => {
    const ok = await confirm({
      title: 'Cancel this payroll?',
      description: 'All its pending payments are removed and the days go back to unpaid wages.',
      confirmLabel: 'Cancel payroll',
      cancelLabel: 'Keep',
      destructive: true,
    });
    if (!ok) return;
    try {
      await payrollApi.cancel(run._id);
      toast.success('Payroll cancelled');
      navigate('/payments?tab=payroll');
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        className="print:hidden"
        backTo="/payments?tab=payroll"
        title="Payroll sheet"
        meta={<StatusBadge status={pending.length ? 'pending' : 'paid'} />}
        description={`${formatDate(run.periodStart)} – ${formatDate(run.periodEnd)} · ${payments.length} staff · ${formatCurrency(totals.net)}`}
        actions={
          <>
            {!anyPaid && (
              <Button variant="destructive-outline" size="sm" onClick={cancelRun}><XCircle /> Cancel payroll</Button>
            )}
            {pending.length > 0 && (
              <Button variant="outline" size="sm" onClick={() => setPayOpen(true)}><CheckCircle2 /> Mark all paid</Button>
            )}
            <Button size="sm" onClick={() => window.print()}><Printer /> Print / PDF</Button>
          </>
        }
      />
      <ProfileHint org={org} />

      <PrintPage landscape>
        <Letterhead
          org={org}
          title="Payroll Sheet"
          subtitle="Wage register"
          meta={[
            ['Period', `${formatDate(run.periodStart)} – ${formatDate(run.periodEnd)}`],
            ['Prepared on', formatDate(run.createdAt)],
            ['Employees', payments.length],
          ]}
        />

        <DocTable className="mt-5">
          <thead>
            <tr>
              <Th className="w-8 text-center">#</Th>
              <Th>Employee</Th>
              <Th className="hidden md:table-cell print:table-cell">Designation</Th>
              <Th className="text-right">Days</Th>
              {hasOt && <Th className="text-right">OT h</Th>}
              <Th className="hidden text-right md:table-cell print:table-cell">Rate</Th>
              <Th className="text-right">Gross</Th>
              <Th className="hidden text-right md:table-cell print:table-cell">Bonus</Th>
              <Th className="hidden text-right md:table-cell print:table-cell">Advance</Th>
              <Th className="hidden text-right md:table-cell print:table-cell">Deduct.</Th>
              <Th className="text-right">Net pay</Th>
              <Th className="hidden md:table-cell print:table-cell">Paid</Th>
              <Th className="hidden w-32 md:table-cell print:table-cell">Signature</Th>
            </tr>
          </thead>
          <tbody>
            {payments.map((p, i) => (
              <tr key={p._id}>
                <Td className="text-center">{i + 1}</Td>
                <Td>
                  <Link to={`/payments/${p._id}`} className="font-medium hover:underline print:no-underline">{p.staffId?.name || 'Removed staff'}</Link>
                </Td>
                <Td className="hidden md:table-cell print:table-cell">{ROLE_LABELS[p.staffId?.role] || '—'}</Td>
                <Td className="text-right">{p.totalDays}</Td>
                {hasOt && <Td className="text-right">{p.otHours || 0}</Td>}
                <Td className="hidden text-right md:table-cell print:table-cell">{formatCurrency(p.dailyWage ?? p.staffId?.dailyWage)}</Td>
                <Td className="text-right">{formatCurrency(p.totalAmount)}</Td>
                <Td className="hidden text-right md:table-cell print:table-cell">{p.bonus ? formatCurrency(p.bonus) : '—'}</Td>
                <Td className="hidden text-right md:table-cell print:table-cell">{p.advanceDeducted ? formatCurrency(p.advanceDeducted) : '—'}</Td>
                <Td className="hidden text-right md:table-cell print:table-cell">{p.deductions ? formatCurrency(p.deductions) : '—'}</Td>
                <Td className="text-right font-semibold">{formatCurrency(paymentNet(p))}</Td>
                <Td className="hidden md:table-cell print:table-cell">
                  {p.status === 'paid' ? `${PAYMENT_MODE_LABELS[p.paymentMode] || ''} · ${formatDate(p.paidDate)}` : 'Pending'}
                </Td>
                <Td className="hidden md:table-cell print:table-cell" />
              </tr>
            ))}
            <tr className="font-bold">
              <Td colSpan={2} className="text-right">Total</Td>
              <Td className="hidden md:table-cell print:table-cell" />
              <Td className="text-right">{totals.days}</Td>
              {hasOt && <Td className="text-right">{totals.ot}</Td>}
              <Td className="hidden md:table-cell print:table-cell" />
              <Td className="text-right">{formatCurrency(totals.gross)}</Td>
              <Td className="hidden text-right md:table-cell print:table-cell">{formatCurrency(totals.bonus)}</Td>
              <Td className="hidden text-right md:table-cell print:table-cell">{formatCurrency(totals.advance)}</Td>
              <Td className="hidden text-right md:table-cell print:table-cell">{formatCurrency(totals.deductions)}</Td>
              <Td className="text-right">{formatCurrency(totals.net)}</Td>
              <Td className="hidden md:table-cell print:table-cell" colSpan={2} />
            </tr>
          </tbody>
        </DocTable>

        <p className="mt-3 text-sm">
          <span className="font-semibold">Total net pay: {formatCurrency(totals.net)}</span>{' '}
          <span className="italic text-slate-700">({amountInWords(totals.net)})</span>
        </p>
        {run.note && <p className="mt-1 text-sm text-slate-700">Remarks: {run.note}</p>}

        <Signatures
          items={[
            { label: 'Prepared by', name: '' },
            { label: 'Approved by', name: `For ${businessName(org)}` },
          ]}
        />
        <DocFooter>Computer-generated payroll sheet · {businessName(org)}</DocFooter>
      </PrintPage>

      <MarkRunPaid open={payOpen} onOpenChange={setPayOpen} runId={run._id} total={pending.reduce((s, p) => s + paymentNet(p), 0)} onDone={reload} />
    </div>
  );
}
