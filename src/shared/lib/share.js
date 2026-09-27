import { PAYMENT_MODE_LABELS, formatCurrency, formatDate, paymentNet, slipNumber, whatsappUrl } from '@/shared/lib/format';

const businessName = (org) => (org?.name && org.name !== 'Default Organization' ? org.name : 'ElectroStaff');

// Plain-text wage slip summary for WhatsApp (*bold* is WhatsApp markup).
export const slipMessage = (p, org) =>
  [
    `*Wage slip ${slipNumber(p)}*`,
    businessName(org),
    '',
    `Name: ${p.staffId?.name}`,
    `Period: ${formatDate(p.periodStart)} – ${formatDate(p.periodEnd)}`,
    `Days worked: ${p.totalDays}${p.otHours ? ` + ${p.otHours} h overtime` : ''}`,
    `Gross wages: ${formatCurrency(p.totalAmount)}`,
    p.bonus ? `Bonus: + ${formatCurrency(p.bonus)}` : null,
    p.deductions ? `Deductions: − ${formatCurrency(p.deductions)}` : null,
    p.advanceDeducted ? `Advance recovered: − ${formatCurrency(p.advanceDeducted)}` : null,
    `*Net ${p.status === 'paid' ? 'paid' : 'payable'}: ${formatCurrency(paymentNet(p))}*`,
    p.status === 'paid'
      ? `Paid by ${PAYMENT_MODE_LABELS[p.paymentMode] || '—'} on ${formatDate(p.paidDate)}`
      : 'Payment pending',
  ]
    .filter((line) => line !== null)
    .join('\n');

export const shareSlipOnWhatsApp = (payment, org) => {
  window.open(whatsappUrl(payment.staffId?.phone, slipMessage(payment, org)), '_blank', 'noopener');
};
