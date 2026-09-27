import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Download, Printer, Users } from 'lucide-react';
import { api } from '@/api/api';
import { useApi } from '@/hooks/useApi';
import { useOrg } from '@/context/OrgContext';
import { cn } from '@/lib/utils';
import { downloadCsv } from '@/lib/csv';
import { MONTHS, ROLE_LABELS } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PageHeader } from '@/components/shared/PageHeader';
import { EmptyState, ErrorState } from '@/components/shared/States';
import { Skeleton } from '@/components/ui/skeleton';
import { DocFooter, Letterhead, PrintPage, ProfileHint, Signatures, businessName } from '@/components/print/Document';

const LETTER = { present: 'P', half: 'H', absent: 'A', leave: 'L' };
const COLOR = { present: 'text-emerald-700', half: 'text-amber-700', absent: 'text-red-600', leave: 'text-slate-500' };
const WEEKDAY = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const cellText = (entries = []) =>
  entries.map((e) => `${LETTER[e.status]}${e.otHours ? `+${e.otHours}` : ''}`).join('/');

export default function Muster() {
  const { org } = useOrg();
  const [params, setParams] = useSearchParams();
  const now = new Date();
  const period = params.get('month') || `${now.getFullYear()}-${now.getMonth() + 1}`;
  const siteId = params.get('site') || 'all';
  const [year, month] = period.split('-').map(Number);

  const { data: sites } = useApi(() => api.sites.getAll(), [], { cacheKey: 'sites' });
  const { data, error, loading, refreshing, reload } = useApi(
    () => api.reports.muster({ month, year, siteId: siteId === 'all' ? undefined : siteId }),
    [period, siteId],
    { cacheKey: `muster:${period}:${siteId}` }
  );

  const periods = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        return { value: `${d.getFullYear()}-${d.getMonth() + 1}`, label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}` };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const setParam = (key, value) => {
    const next = new URLSearchParams(params);
    next.set(key, value);
    setParams(next, { replace: true });
  };

  const days = data ? Array.from({ length: data.daysInMonth }, (_, i) => i + 1) : [];
  const weekday = (d) => new Date(year, month - 1, d).getDay();
  const siteLabel = data?.site ? data.site.name : 'All sites';

  const exportCsv = () =>
    downloadCsv(`muster_${year}-${String(month).padStart(2, '0')}_${siteLabel.replace(/\W+/g, '-')}.csv`, [
      { label: 'Name', value: (r) => r.staff.name },
      { label: 'Designation', value: (r) => ROLE_LABELS[r.staff.role] || r.staff.role },
      ...days.map((d) => ({ label: String(d), value: (r) => cellText(r.days[d]) })),
      { label: 'Present', value: (r) => r.totals.present },
      { label: 'Half', value: (r) => r.totals.half },
      { label: 'Absent', value: (r) => r.totals.absent },
      { label: 'Leave', value: (r) => r.totals.leave },
      { label: 'OT hours', value: (r) => r.totals.otHours },
      { label: 'Payable days', value: (r) => r.totals.payableDays },
    ], data.rows);

  return (
    <div className="space-y-4">
      <PageHeader
        className="print:hidden"
        backTo="/reports"
        title="Muster roll"
        description="Monthly attendance register — print it for site records or labour inspections"
        actions={
          data?.rows.length > 0 && (
            <>
              <Button variant="outline" size="sm" onClick={exportCsv}><Download /> CSV</Button>
              <Button size="sm" onClick={() => window.print()}><Printer /> Print / PDF</Button>
            </>
          )
        }
      />

      <div className="flex flex-col gap-2 sm:flex-row print:hidden">
        <Select value={period} onValueChange={(v) => setParam('month', v)}>
          <SelectTrigger className="sm:w-48" aria-label="Month"><SelectValue /></SelectTrigger>
          <SelectContent>
            {periods.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={siteId} onValueChange={(v) => setParam('site', v)}>
          <SelectTrigger className="sm:w-64" aria-label="Site"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sites</SelectItem>
            {(sites || []).map((s) => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <ProfileHint org={org} />

      {error && !data ? (
        <ErrorState error={error} onRetry={reload} />
      ) : loading ? (
        <Skeleton className="h-96 w-full" />
      ) : data.rows.length === 0 ? (
        <EmptyState icon={Users} title="No staff for this register" description="Assign staff to the site or mark attendance for this month." />
      ) : (
        <PrintPage landscape className={cn(refreshing && 'opacity-60')}>
          <Letterhead
            org={org}
            title="Attendance Register"
            subtitle="Muster roll"
            meta={[
              ['Month', `${MONTHS[month - 1]} ${year}`],
              ['Site', siteLabel],
              ['Employees', data.rows.length],
            ]}
          />

          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-[11px] leading-tight">
              <thead>
                <tr>
                  <th className="border border-slate-300 bg-slate-100 px-1 py-1 text-center">#</th>
                  <th className="sticky left-0 z-10 min-w-32 border border-slate-300 bg-slate-100 px-1.5 py-1 text-left">Name</th>
                  {days.map((d) => (
                    <th
                      key={d}
                      className={cn(
                        'min-w-[1.6rem] border border-slate-300 px-0.5 py-1 text-center font-medium',
                        weekday(d) === 0 ? 'bg-slate-200' : 'bg-slate-100'
                      )}
                    >
                      <div>{d}</div>
                      <div className="text-[9px] font-normal text-slate-500">{WEEKDAY[weekday(d)]}</div>
                    </th>
                  ))}
                  {['P', 'H', 'A', 'L', 'OT', 'Days'].map((h) => (
                    <th key={h} className="border border-slate-300 bg-slate-100 px-1 py-1 text-center">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r, i) => (
                  <tr key={r.staff._id}>
                    <td className="border border-slate-300 px-1 py-1 text-center">{i + 1}</td>
                    <td className="sticky left-0 z-10 border border-slate-300 bg-white px-1.5 py-1">
                      <div className="font-medium">{r.staff.name}</div>
                      <div className="text-[10px] text-slate-500">{ROLE_LABELS[r.staff.role] || r.staff.role}</div>
                    </td>
                    {days.map((d) => {
                      const entries = r.days[d] || [];
                      return (
                        <td
                          key={d}
                          title={entries.map((e) => `${e.site}: ${e.status}${e.otHours ? ` +${e.otHours}h OT` : ''}`).join('\n') || undefined}
                          className={cn('border border-slate-300 px-0.5 py-1 text-center font-semibold', weekday(d) === 0 && 'bg-slate-50')}
                        >
                          {entries.map((e, k) => (
                            <span key={k} className={COLOR[e.status]}>
                              {k > 0 && <span className="text-slate-400">/</span>}
                              {LETTER[e.status]}
                              {e.otHours > 0 && <sup className="text-[8px] font-normal text-blue-700">{e.otHours}</sup>}
                            </span>
                          ))}
                        </td>
                      );
                    })}
                    <td className="border border-slate-300 px-1 text-center">{r.totals.present}</td>
                    <td className="border border-slate-300 px-1 text-center">{r.totals.half}</td>
                    <td className="border border-slate-300 px-1 text-center">{r.totals.absent}</td>
                    <td className="border border-slate-300 px-1 text-center">{r.totals.leave}</td>
                    <td className="border border-slate-300 px-1 text-center">{r.totals.otHours || ''}</td>
                    <td className="border border-slate-300 bg-slate-50 px-1 text-center font-bold">{r.totals.payableDays}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="mt-2 text-[11px] text-slate-600">
            P = Present · H = Half day · A = Absent · L = Leave · small number = overtime hours · shaded = Sunday
            {!data.site && ' · P/H = worked at two sites that day'}
          </p>

          <Signatures
            items={[
              { label: 'Site supervisor', name: '' },
              { label: 'Authorised signatory', name: `For ${businessName(org)}` },
            ]}
          />
          <DocFooter>Computer-generated attendance register · {businessName(org)}</DocFooter>
        </PrintPage>
      )}
    </div>
  );
}
