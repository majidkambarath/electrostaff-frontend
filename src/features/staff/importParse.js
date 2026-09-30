import { cleanPhone, parseAmount } from '@/shared/lib/numberInput';

// Rows pasted from Excel / Google Sheets (tab-separated) or a CSV file -> staff rows for
// POST /staff/import, with problems found before sending.

const HEADERS = {
  name: /^(full\s*)?name|staff|worker|employee/i,
  phone: /phone|mobile|number|contact|whatsapp/i,
  role: /role|designation|post|job|trade/i,
  dailyWage: /wage|salary|rate\s*\/?\s*day|per\s*day|daily/i,
  otRate: /\bot\b|overtime/i,
  upiId: /upi/i,
  joinDate: /join|start|doj/i,
};
const DEFAULT_ORDER = ['name', 'phone', 'role', 'dailyWage', 'otRate', 'upiId', 'joinDate'];
const ROLES = ['electrician', 'helper', 'supervisor', 'apprentice'];

// Minimal CSV/TSV splitter with quoted fields ("Kumar, S").
const splitLine = (line, sep) => {
  const out = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else quoted = !quoted;
    } else if (ch === sep && !quoted) {
      out.push(cur);
      cur = '';
    } else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
};

const toRole = (v) => {
  const s = String(v || '').trim().toLowerCase();
  if (!s) return 'helper';
  return ROLES.find((r) => s.startsWith(r.slice(0, 3))) || 'other';
};

// dd/mm/yyyy, dd-mm-yyyy or yyyy-mm-dd -> yyyy-mm-dd (or '' when unreadable).
const toISO = (v) => {
  const s = String(v || '').trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (m) return `${m[3].length === 2 ? `20${m[3]}` : m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  return '';
};

export function parseStaffSheet(text) {
  const lines = String(text || '').replace(/\r/g, '').split('\n').filter((l) => l.trim());
  if (!lines.length) return { rows: [], columns: [] };
  const sep = lines[0].includes('\t') ? '\t' : ',';
  const first = splitLine(lines[0], sep);
  const mapped = first.map((h) => Object.keys(HEADERS).find((k) => HEADERS[k].test(h)) || null);
  const hasHeader = mapped.filter(Boolean).length >= 2;
  const columns = hasHeader ? mapped : DEFAULT_ORDER.slice(0, first.length);
  const body = hasHeader ? lines.slice(1) : lines;

  const seen = new Set();
  const rows = body.map((line, i) => {
    const cells = splitLine(line, sep);
    const get = (key) => {
      const idx = columns.indexOf(key);
      return idx >= 0 ? cells[idx] || '' : '';
    };
    const phone = cleanPhone(get('phone'));
    const row = {
      name: get('name'),
      phone,
      role: toRole(get('role')),
      dailyWage: parseAmount(get('dailyWage')),
      ...(get('otRate') && { otRate: parseAmount(get('otRate')) }),
      ...(get('upiId') && { upiId: get('upiId').toLowerCase() }),
      ...(toISO(get('joinDate')) && { joinDate: toISO(get('joinDate')) }),
    };
    const problems = [];
    if (!row.name) problems.push('No name');
    if (phone.length !== 10) problems.push('Mobile must be 10 digits');
    else if (seen.has(phone)) problems.push('Same mobile twice in the list');
    if (!Number(row.dailyWage)) problems.push('No daily wage');
    seen.add(phone);
    return { line: i + 1 + (hasHeader ? 1 : 0), row, problems };
  });
  return { rows, columns: columns.filter(Boolean), hasHeader };
}
