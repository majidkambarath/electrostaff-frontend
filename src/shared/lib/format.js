export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});
const compactFormatter = new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 });

// 'YYYY-MM-DD' strings are local calendar days; everything else goes through Date.
const asDate = (value) => {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(value);
};

export const formatCurrency = (amount) => currencyFormatter.format(Number(amount) || 0);

// ₹1.2L / ₹45K style for axis ticks and tight spaces.
export const formatCompactCurrency = (amount) => `₹${compactFormatter.format(Number(amount) || 0)}`;

export const formatNumber = (n) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 }).format(Number(n) || 0);

export const formatDate = (date) =>
  date ? asDate(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

export const formatDateShort = (date) =>
  date ? asDate(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '—';

export const formatDateLong = (date) =>
  asDate(date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export const formatRange = (start, end) => `${formatDateShort(start)} – ${formatDate(end)}`;

// Local calendar date as 'YYYY-MM-DD' (toISOString would give the UTC date).
export const toISODate = (date) => {
  const d = asDate(date);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
};

export const todayISO = () => toISODate(new Date());

export const shiftISODate = (iso, days) => {
  const [y, m, d] = iso.split('-').map(Number);
  return toISODate(new Date(y, m - 1, d + days));
};

export const monthStartISO = (date = new Date()) => toISODate(new Date(date.getFullYear(), date.getMonth(), 1));

export const paymentNet = (p) => p?.netAmount ?? p?.totalAmount ?? 0;

export const slipNumber = (p) => {
  if (!p?._id) return '';
  const d = new Date(p.createdAt || p.periodEnd);
  return `PAY-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}-${p._id.slice(-6).toUpperCase()}`;
};

export const PAYMENT_MODE_LABELS = { cash: 'Cash', upi: 'UPI', bank: 'Bank transfer' };

export const ROLE_LABELS = {
  electrician: 'Electrician',
  helper: 'Helper',
  supervisor: 'Supervisor',
  apprentice: 'Apprentice',
  other: 'Other',
};

export const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');

export const EXPENSE_CATEGORY_LABELS = {
  material: 'Material',
  transport: 'Transport',
  tools: 'Tools & equipment',
  food: 'Food & tea',
  rent: 'Rent',
  other: 'Other',
  labour: 'Labour (wages)',
};

export const RECEIPT_MODE_LABELS = { cash: 'Cash', upi: 'UPI', bank: 'Bank transfer', cheque: 'Cheque' };

// Overtime rate per hour: the staff member's own rate, or a day's wage over 8 hours (matches the API).
export const otRateOf = (staff) =>
  staff?.otRate !== undefined && staff?.otRate !== null ? staff.otRate : Math.round((staff?.dailyWage || 0) / 8);

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const belowHundred = (n) => (n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ''}`);

const belowThousand = (n) =>
  [Math.floor(n / 100) ? `${ONES[Math.floor(n / 100)]} Hundred` : '', n % 100 ? belowHundred(n % 100) : '']
    .filter(Boolean)
    .join(' ');

// Indian numbering: crore, lakh, thousand, hundred.
const toWords = (n) => {
  const parts = [];
  const crore = Math.floor(n / 10000000);
  const lakh = Math.floor((n % 10000000) / 100000);
  const thousand = Math.floor((n % 100000) / 1000);
  const rest = n % 1000;
  if (crore) parts.push(`${toWords(crore)} Crore`);
  if (lakh) parts.push(`${belowHundred(lakh)} Lakh`);
  if (thousand) parts.push(`${belowHundred(thousand)} Thousand`);
  if (rest) parts.push(belowThousand(rest));
  return parts.join(' ');
};

// e.g. 2800 -> "Rupees Two Thousand Eight Hundred Only"
export const amountInWords = (amount) => {
  const n = Math.round(Math.abs(Number(amount) || 0));
  return `Rupees ${n === 0 ? 'Zero' : toWords(n)} Only`;
};

// wa.me link; 10-digit Indian numbers get the 91 country code. Without a usable number
// WhatsApp opens its contact picker with the message ready.
export const whatsappUrl = (phone, text) => {
  let digits = String(phone || '').replace(/\D/g, '');
  if (digits.length === 10) digits = `91${digits}`;
  if (digits.length === 11 && digits.startsWith('0')) digits = `91${digits.slice(1)}`;
  const base = digits.length >= 11 ? `https://wa.me/${digits}` : 'https://wa.me/';
  return `${base}?text=${encodeURIComponent(text)}`;
};
