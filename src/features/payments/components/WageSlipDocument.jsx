import { useEffect, useState } from 'react';
import { ImageIcon } from 'lucide-react';
import {
  PAYMENT_MODE_LABELS,
  ROLE_LABELS,
  amountInWords,
  formatCurrency,
  formatDate,
  paymentNet,
  slipNumber,
} from '@/shared/lib/format';
import {
  DocFooter,
  DocTable,
  KVTable,
  Letterhead,
  PrintPage,
  SectionTitle,
  Signatures,
  Td,
  Th,
  businessName,
} from '@/shared/components/print/Document';

function MoneyRow({ label, value, strong, negative }) {
  const shade = strong ? 'bg-slate-50' : '';
  return (
    <tr className={strong ? 'font-bold' : undefined}>
      <Td className={shade}>{label}</Td>
      <Td className={`text-right ${shade}`}>
        {negative && value ? '− ' : ''}
        {formatCurrency(value)}
      </Td>
    </tr>
  );
}

// Loads the proof screenshot (needs the auth header, so it is fetched as a blob).
export function PaymentProof({ load }) {
  const [url, setUrl] = useState(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let objectUrl;
    let cancelled = false;
    load()
      .then((u) => {
        objectUrl = u;
        if (!cancelled) setUrl(u);
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [load]);

  return (
    <div className="mx-auto max-w-[210mm] rounded-md border border-border bg-card p-4 print:hidden">
      <p className="mb-2 flex items-center gap-2 text-sm font-medium"><ImageIcon className="h-4 w-4" /> Payment proof</p>
      {failed ? (
        <p className="text-sm text-muted-foreground">The proof image could not be loaded.</p>
      ) : url ? (
        <a href={url} target="_blank" rel="noreferrer">
          <img src={url} alt="Payment proof screenshot" className="max-h-96 rounded-md border border-border" />
        </a>
      ) : (
        <div className="h-40 animate-pulse rounded-md bg-muted" />
      )}
    </div>
  );
}

// The formal, printable wage slip for one payment (used by the office and the staff app).
export function WageSlipDocument({ payment: p }) {
  const org = p.organization || {};
  const staff = p.staffId || {};
  const paid = p.status === 'paid';
  const dailyWage = p.dailyWage ?? staff.dailyWage;
  const otAmount = p.otAmount || 0;
  const bonus = p.bonus || 0;
  const deductions = p.deductions || 0;
  const advance = p.advanceDeducted || 0;
  const net = paymentNet(p);
  const att = p.attendance || {};
  const hasOt = (p.otHours || 0) > 0;

  return (
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

      <p className="mt-4 border border-slate-300 bg-slate-50 px-3 py-2 text-center text-sm font-semibold">
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
            {['Present', 'Half days', 'Absent', 'Leave', 'OT hours', 'Payable days'].map((h) => (
              <Th key={h} className="text-center">{h}</Th>
            ))}
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
              <MoneyRow label={`Basic wages (${p.totalDays} days × ${formatCurrency(dailyWage)})`} value={p.totalAmount - otAmount} />
              <MoneyRow label={`Overtime${hasOt ? ` (${p.otHours} h)` : ''}`} value={otAmount} />
              <MoneyRow label="Bonus / incentive" value={bonus} />
              <MoneyRow label="Gross earnings" value={p.totalAmount + bonus} strong />
            </tbody>
          </DocTable>
        </div>
        <div>
          <SectionTitle className="mt-0">Deductions</SectionTitle>
          <DocTable>
            <tbody>
              <MoneyRow label="Advance recovered" value={advance} negative />
              <MoneyRow label="Other deductions" value={deductions} negative />
              <MoneyRow label="Total deductions" value={deductions + advance} negative strong />
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
          {paid ? `Paid by ${PAYMENT_MODE_LABELS[p.paymentMode] || '—'} on ${formatDate(p.paidDate)}.` : 'Payment pending.'}
          {p.transactionRef && ` Reference: ${p.transactionRef}.`}
          {p.note && ` Remarks: ${p.note}`}
        </p>
      </div>

      <Signatures
        items={[
          { label: 'Received by (employee signature)', name: staff.name },
          { label: 'Authorised signatory', name: `For ${businessName(org)}` },
        ]}
      />
      <DocFooter>This is a computer-generated wage slip · {businessName(org)} · {slipNumber(p)}</DocFooter>
    </PrintPage>
  );
}
