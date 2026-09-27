import { Link, useParams } from 'react-router-dom';
import { MessageCircle, Printer } from 'lucide-react';
import { api } from '@/api/api';
import { useApi } from '@/hooks/useApi';
import {
  PAYMENT_MODE_LABELS,
  ROLE_LABELS,
  amountInWords,
  formatCurrency,
  formatDate,
  paymentNet,
  slipNumber,
} from '@/lib/format';
import { shareSlipOnWhatsApp } from '@/lib/share';
import { Button, buttonVariants } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageLoader } from '@/components/shared/PageLoader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ErrorState } from '@/components/shared/States';
import {
  DocFooter,
  DocTable,
  KVTable,
  Letterhead,
  PrintPage,
  ProfileHint,
  SectionTitle,
  Signatures,
  Td,
  Th,
  businessName,
} from '@/components/print/Document';

function MoneyRow({ label, value, strong, negative }) {
  return (
    <tr className={strong ? 'font-bold' : undefined}>
      <Td className={strong ? 'bg-slate-50 print:[print-color-adjust:exact]' : undefined}>{label}</Td>
      <Td className={`text-right ${strong ? 'bg-slate-50 print:[print-color-adjust:exact]' : ''}`}>
        {negative && value ? '− ' : ''}
        {formatCurrency(value)}
      </Td>
    </tr>
  );
}

export default function PaymentSlip() {
  const { id } = useParams();
  const { data: p, error, loading, reload } = useApi(() => api.payments.get(id), [id], { cacheKey: `payment:${id}` });

  if (loading) return <PageLoader />;
  if (error && !p) {
    return (
      <div className="space-y-4">
        <PageHeader title="Wage slip" backTo="/payments?tab=history" />
        <ErrorState error={error} onRetry={error.status === 404 ? undefined : reload} />
      </div>
    );
  }

  const org = p.organization || {};
  const staff = p.staffId || {};
  const paid = p.status === 'paid';
  const dailyWage = p.dailyWage ?? staff.dailyWage;
  const otAmount = p.otAmount || 0;
  const basicWages = p.totalAmount - otAmount;
  const bonus = p.bonus || 0;
  const deductions = p.deductions || 0;
  const advance = p.advanceDeducted || 0;
  const grossEarnings = p.totalAmount + bonus;
  const totalDeductions = deductions + advance;
  const net = paymentNet(p);
  const att = p.attendance || {};
  const hasOt = (p.otHours || 0) > 0;

  return (
    <div className="space-y-4">
      <PageHeader
        className="print:hidden"
        backTo="/payments?tab=history"
        title={`Wage slip ${slipNumber(p)}`}
        meta={<StatusBadge status={p.status} />}
        description={`${staff.name} · ${formatDate(p.periodStart)} – ${formatDate(p.periodEnd)}`}
        actions={
          <>
            <Link to={`/staff/${staff._id}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>Staff profile</Link>
            <Button variant="outline" size="sm" onClick={() => shareSlipOnWhatsApp(p, org)}>
              <MessageCircle /> WhatsApp
            </Button>
            <Button size="sm" onClick={() => window.print()}><Printer /> Print / PDF</Button>
          </>
        }
      />

      {!paid && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 print:hidden">
          This payment is still pending. Mark it paid from{' '}
          <Link to="/payments?tab=history&status=pending" className="font-medium underline">Payments → History</Link>.
        </p>
      )}
      <ProfileHint org={org} />

      <PrintPage>
        <Letterhead
          org={org}
          title="Wage Slip"
          subtitle={paid ? 'Payment voucher' : 'Payment pending'}
          meta={[
            ['Slip No.', slipNumber(p)],
            ['Issue date', formatDate(p.createdAt)],
            ['Status', paid ? 'PAID' : 'PENDING'],
          ]}
        />

        <p className="mt-4 border border-slate-300 bg-slate-50 px-3 py-2 text-center text-sm font-semibold print:[print-color-adjust:exact]">
          Wages for the period {formatDate(p.periodStart)} to {formatDate(p.periodEnd)}
        </p>

        <SectionTitle>Employee details</SectionTitle>
        <div className="grid gap-0 sm:grid-cols-2 sm:[&>*+*]:-ml-px">
          <KVTable
            rows={[
              ['Employee name', staff.name],
              ['Designation', ROLE_LABELS[staff.role] || staff.role],
              ['Mobile', staff.phone],
              ['Date of joining', staff.joinDate ? formatDate(staff.joinDate) : '—'],
            ]}
          />
          <KVTable
            rows={[
              ['Daily wage', formatCurrency(dailyWage)],
              ['Overtime rate', p.otRate !== undefined ? `${formatCurrency(p.otRate)} / hour` : '—'],
              ['Payable days', p.totalDays],
              ['Overtime hours', p.otHours || 0],
            ]}
          />
        </div>

        <SectionTitle>Attendance summary</SectionTitle>
        <DocTable>
          <thead>
            <tr>
              <Th className="text-center">Present</Th>
              <Th className="text-center">Half days</Th>
              <Th className="text-center">Absent</Th>
              <Th className="text-center">Leave</Th>
              <Th className="text-center">OT hours</Th>
              <Th className="text-center">Payable days</Th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <Td className="text-center">{att.present ?? '—'}</Td>
              <Td className="text-center">{att.half ?? '—'}</Td>
              <Td className="text-center">{att.absent ?? '—'}</Td>
              <Td className="text-center">{att.leave ?? '—'}</Td>
              <Td className="text-center">{p.otHours || 0}</Td>
              <Td className="text-center font-semibold">{p.totalDays}</Td>
            </tr>
          </tbody>
        </DocTable>

        <SectionTitle>Site-wise wage details</SectionTitle>
        <DocTable>
          <thead>
            <tr>
              <Th className="w-10 text-center">#</Th>
              <Th>Site</Th>
              <Th className="text-right">Present</Th>
              <Th className="text-right">Half</Th>
              {hasOt && <Th className="text-right">OT hrs</Th>}
              {hasOt && <Th className="hidden text-right sm:table-cell">OT pay</Th>}
              <Th className="text-right">Amount</Th>
            </tr>
          </thead>
          <tbody>
            {p.breakdown.map((b, i) => (
              <tr key={b.siteId?._id || i}>
                <Td className="text-center">{i + 1}</Td>
                <Td>{b.siteId?.name || 'Removed site'}</Td>
                <Td className="text-right">{b.presentDays}</Td>
                <Td className="text-right">{b.halfDays}</Td>
                {hasOt && <Td className="text-right">{b.otHours || 0}</Td>}
                {hasOt && <Td className="hidden text-right sm:table-cell">{formatCurrency(b.otAmount || 0)}</Td>}
                <Td className="text-right">{formatCurrency(b.amount)}</Td>
              </tr>
            ))}
            <tr className="font-semibold">
              <Td colSpan={2} className="text-right">Total</Td>
              <Td className="text-right">{p.breakdown.reduce((s, b) => s + b.presentDays, 0)}</Td>
              <Td className="text-right">{p.breakdown.reduce((s, b) => s + b.halfDays, 0)}</Td>
              {hasOt && <Td className="text-right">{p.otHours}</Td>}
              {hasOt && <Td className="hidden text-right sm:table-cell">{formatCurrency(otAmount)}</Td>}
              <Td className="text-right">{formatCurrency(p.totalAmount)}</Td>
            </tr>
          </tbody>
        </DocTable>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <SectionTitle className="mt-0">Earnings</SectionTitle>
            <DocTable>
              <tbody>
                <MoneyRow label={`Basic wages (${p.totalDays} days × ${formatCurrency(dailyWage)})`} value={basicWages} />
                <MoneyRow label={`Overtime${hasOt ? ` (${p.otHours} h)` : ''}`} value={otAmount} />
                <MoneyRow label="Bonus / incentive" value={bonus} />
                <MoneyRow label="Gross earnings" value={grossEarnings} strong />
              </tbody>
            </DocTable>
          </div>
          <div>
            <SectionTitle className="mt-0">Deductions</SectionTitle>
            <DocTable>
              <tbody>
                <MoneyRow label="Advance recovered" value={advance} negative />
                <MoneyRow label="Other deductions" value={deductions} negative />
                <MoneyRow label="Total deductions" value={totalDeductions} negative strong />
              </tbody>
            </DocTable>
          </div>
        </div>

        <div className="mt-5 border-2 border-slate-900 px-4 py-3" style={{ breakInside: 'avoid' }}>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm font-bold uppercase tracking-[0.15em]">Net pay</span>
            <span className="text-2xl font-bold">{formatCurrency(net)}</span>
          </div>
          <p className="mt-1 text-xs italic text-slate-700">({amountInWords(net)})</p>
          <p className="mt-2 border-t border-slate-300 pt-2 text-xs text-slate-700">
            {paid
              ? `Paid by ${PAYMENT_MODE_LABELS[p.paymentMode] || '—'} on ${formatDate(p.paidDate)}.`
              : 'Payment pending.'}
            {p.note && ` Remarks: ${p.note}`}
          </p>
        </div>

        <Signatures
          items={[
            { label: 'Received by (employee signature)', name: staff.name },
            { label: 'Authorised signatory', name: `For ${businessName(org)}` },
          ]}
        />

        <DocFooter>
          This is a computer-generated wage slip · {businessName(org)} · {slipNumber(p)}
        </DocFooter>
      </PrintPage>
    </div>
  );
}
