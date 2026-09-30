// Parsing helpers for typed amounts and mobile numbers.

// Indian digit grouping without Intl rounding: "1234567.5" -> "12,34,567.5".
export function groupIndian(raw) {
  if (raw === '' || raw === null || raw === undefined) return '';
  const [int, dec] = String(raw).split('.');
  const digits = int.replace(/\D/g, '');
  const last3 = digits.slice(-3);
  const rest = digits.slice(0, -3).replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  const grouped = rest ? `${rest},${last3}` : last3;
  return dec !== undefined ? `${grouped}.${dec}` : grouped;
}

// What the user typed (with commas, spaces, ₹ …) -> plain number string: "₹ 10,000.50" -> "10000.50".
export function parseAmount(text, { decimals = 2 } = {}) {
  let s = String(text ?? '').replace(/[^\d.]/g, '');
  const dot = s.indexOf('.');
  if (dot >= 0) s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, '').slice(0, decimals);
  if (!decimals) s = s.replace('.', '');
  return s.replace(/^0+(?=\d)/, '').slice(0, 15);
}

// Pasted or typed mobile -> 10 digits: "+91 813882 3410" / "08138823410" / "91-81388-23410" -> "8138823410".
export function cleanPhone(text) {
  let d = String(text ?? '').replace(/\D/g, '');
  if (d.length > 10 && d.startsWith('91')) d = d.slice(2);
  else if (d.length > 10 && d.startsWith('0')) d = d.slice(1);
  return d.slice(0, 10);
}
