import { monthStartISO, shiftISODate, toISODate, todayISO } from '@/shared/lib/format';

// Report range presets ({ key, label, from, to } as local YYYY-MM-DD).
export const buildRangePresets = () => {
  const d = new Date();
  const today = todayISO();
  return [
    { key: 'this-month', label: 'This month', from: monthStartISO(), to: today },
    {
      key: 'last-month',
      label: 'Last month',
      from: toISODate(new Date(d.getFullYear(), d.getMonth() - 1, 1)),
      to: toISODate(new Date(d.getFullYear(), d.getMonth(), 0)),
    },
    { key: '30d', label: 'Last 30 days', from: shiftISODate(today, -29), to: today },
    { key: '90d', label: 'Last 90 days', from: shiftISODate(today, -89), to: today },
    { key: 'year', label: 'This year', from: `${d.getFullYear()}-01-01`, to: today },
  ];
};

// Which preset a from/to pair matches ('custom' when none).
export const presetKeyFor = (presets, from, to) => presets.find((p) => p.from === from && p.to === to)?.key || 'custom';
