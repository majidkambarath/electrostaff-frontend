import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, FileUp } from 'lucide-react';
import { staffApi } from '@/features/staff/api';
import { parseStaffSheet } from '@/features/staff/importParse';
import { ROLE_LABELS, formatCurrency } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Textarea } from '@/shared/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';

const EXAMPLE = 'Name\tMobile\tRole\tDaily wage\nSuresh Kumar\t98470 12345\tElectrician\t1,100\nRahul Das\t+91 94470 55555\tHelper\t700';

// Paste rows from Excel / Google Sheets (or pick a CSV), check them, then add all good rows.
export function StaffImportDialog({ open, onOpenChange, onImported }) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const parsed = useMemo(() => parseStaffSheet(text), [text]);
  const good = parsed.rows.filter((r) => !r.problems.length);
  const bad = parsed.rows.length - good.length;

  const close = (next) => {
    if (!next) {
      setText('');
      setResult(null);
    }
    onOpenChange(next);
  };

  const readFile = async (file) => {
    if (!file) return;
    if (file.size > 1024 * 1024) return toast.error('File is larger than 1 MB');
    setText(await file.text());
  };

  const submit = async () => {
    setBusy(true);
    try {
      const res = await staffApi.importMany(good.map((r) => r.row));
      setResult(res);
      if (res.created) onImported?.();
      toast.success(`${res.created} staff added`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import staff</DialogTitle>
          <DialogDescription>
            Copy the rows from Excel or Google Sheets (with the heading row) and paste here, or choose a CSV file.
            Columns: Name, Mobile, Role, Daily wage — optional OT rate, UPI ID, Join date.
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-3 text-sm">
            <p className="flex items-center gap-2 font-medium text-emerald-700"><CheckCircle2 className="h-4 w-4" /> {result.created} staff added</p>
            {result.skipped.length > 0 && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
                <p className="mb-1 font-medium text-amber-800">{result.skipped.length} not added</p>
                <ul className="space-y-0.5 text-amber-800">
                  {result.skipped.map((s) => <li key={s.row}>{s.name || `Row ${s.row}`}: {s.reason}</li>)}
                </ul>
              </div>
            )}
            <DialogFooter><Button onClick={() => close(false)}>Done</Button></DialogFooter>
          </div>
        ) : (
          <div className="space-y-3">
            <Textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} placeholder={EXAMPLE} className="font-mono text-sm" aria-label="Pasted staff rows" />
            <label className="tap inline-flex cursor-pointer items-center gap-2 text-sm text-primary">
              <FileUp className="h-4 w-4" /> Choose a CSV file
              <input type="file" accept=".csv,.tsv,.txt,text/csv" className="sr-only" onChange={(e) => readFile(e.target.files?.[0])} />
            </label>

            {parsed.rows.length > 0 && (
              <>
                <p className="text-sm">
                  <span className="font-medium">{good.length} ready</span>
                  {bad > 0 && <span className="text-amber-700"> · {bad} with problems (skipped)</span>}
                  {!parsed.hasHeader && <span className="text-muted-foreground"> · no heading row: read as Name, Mobile, Role, Daily wage</span>}
                </p>
                <div className="max-h-64 overflow-auto rounded-md border border-border">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted text-left text-xs text-muted-foreground">
                      <tr><th className="px-2 py-1.5">Name</th><th className="px-2 py-1.5">Mobile</th><th className="px-2 py-1.5">Role</th><th className="px-2 py-1.5 text-right">Wage</th><th className="px-2 py-1.5" /></tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {parsed.rows.slice(0, 200).map((r) => (
                        <tr key={r.line} className={r.problems.length ? 'bg-amber-50/60' : undefined}>
                          <td className="px-2 py-1.5">{r.row.name || '—'}</td>
                          <td className="px-2 py-1.5 tabular-nums">{r.row.phone || '—'}</td>
                          <td className="px-2 py-1.5">{ROLE_LABELS[r.row.role] || r.row.role}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums">{r.row.dailyWage ? formatCurrency(r.row.dailyWage) : '—'}</td>
                          <td className="px-2 py-1.5 text-xs text-amber-800">
                            {r.problems.length > 0 && <span className="inline-flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> {r.problems.join(', ')}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => close(false)}>Cancel</Button>
              <Button onClick={submit} disabled={busy || good.length === 0}>{busy ? 'Adding…' : `Add ${good.length} staff`}</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
