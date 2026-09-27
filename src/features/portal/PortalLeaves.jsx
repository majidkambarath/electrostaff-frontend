import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { CalendarOff, Plus } from 'lucide-react';
import { portalApi } from '@/features/portal/api';
import { useApi } from '@/shared/hooks/useApi';
import { formatDate, formatDateShort, todayISO } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Input, Textarea } from '@/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/shared/ui/sheet';
import { PageHeader } from '@/shared/components/PageHeader';
import { PageLoader } from '@/shared/components/PageLoader';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { Field } from '@/shared/components/Field';
import { EmptyState, ErrorState } from '@/shared/components/States';
import { useConfirm } from '@/shared/components/ConfirmDialog';

const TYPES = { casual: 'Casual', sick: 'Sick', paid: 'Paid', unpaid: 'Unpaid', other: 'Other' };

function ApplySheet({ open, onOpenChange, onDone }) {
  const [form, setForm] = useState({ startDate: todayISO(), endDate: todayISO(), type: 'casual', reason: '' });
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open) setForm({ startDate: todayISO(), endDate: todayISO(), type: 'casual', reason: '' });
  }, [open]);

  const submit = async (e) => {
    e.preventDefault();
    if (form.endDate < form.startDate) {
      toast.error('End date must be on or after the start date');
      return;
    }
    setSaving(true);
    try {
      await portalApi.applyLeave(form);
      toast.success('Leave application sent to the office');
      onOpenChange(false);
      onDone();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-w-2xl">
        <SheetHeader>
          <SheetTitle>Apply for leave</SheetTitle>
          <SheetDescription>The office is notified and will approve or reject it.</SheetDescription>
        </SheetHeader>
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col gap-4">
          <SheetBody className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="From" htmlFor="pl-from">
                <Input id="pl-from" type="date" min={todayISO()} value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} required />
              </Field>
              <Field label="To" htmlFor="pl-to">
                <Input id="pl-to" type="date" min={form.startDate} value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} required />
              </Field>
            </div>
            <Field label="Type">
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(TYPES).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Reason" htmlFor="pl-reason">
              <Textarea id="pl-reason" rows={3} value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} placeholder="e.g. Family function" />
            </Field>
          </SheetBody>
          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Sending…' : 'Send application'}</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export default function PortalLeaves() {
  const confirm = useConfirm();
  const [params, setParams] = useSearchParams();
  const { data, error, loading, reload } = useApi(() => portalApi.leaves(), [], { cacheKey: 'me:leaves' });
  const [open, setOpen] = useState(params.get('new') === '1');

  const setSheet = (value) => {
    setOpen(value);
    if (!value && params.get('new')) setParams({}, { replace: true });
  };

  const cancel = async (l) => {
    if (!(await confirm({ title: 'Cancel this leave application?', confirmLabel: 'Cancel leave', cancelLabel: 'Keep', destructive: true }))) return;
    try {
      await portalApi.cancelLeave(l._id);
      toast.success('Leave application cancelled');
      reload();
    } catch (e) {
      toast.error(e.message);
    }
  };

  if (loading) return <PageLoader title="My leave" />;
  if (error && !data) return <ErrorState error={error} onRetry={reload} />;

  return (
    <div className="space-y-4">
      <PageHeader title="My leave" description="Apply for leave and see the office’s decision" actions={<Button size="sm" onClick={() => setSheet(true)}><Plus /> Apply</Button>} />
      {data.length === 0 ? (
        <EmptyState icon={CalendarOff} title="No leave yet" action={<Button size="sm" onClick={() => setSheet(true)}><Plus /> Apply for leave</Button>} />
      ) : (
        <Card className="divide-y divide-border overflow-hidden">
          {data.map((l) => (
            <div key={l._id} className="flex items-start gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">
                  {TYPES[l.type]} leave · {l.days} {l.days === 1 ? 'day' : 'days'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {l.days === 1 ? formatDate(l.startDate) : `${formatDateShort(l.startDate)} – ${formatDate(l.endDate)}`}
                  {l.reason && ` · “${l.reason}”`}
                </p>
                {l.responseNote && <p className="mt-1 text-xs">Office: {l.responseNote}</p>}
              </div>
              <div className="flex flex-col items-end gap-1">
                <StatusBadge status={l.status} />
                {l.status === 'pending' && (
                  <button type="button" onClick={() => cancel(l)} className="tap text-xs font-medium text-red-600">Cancel</button>
                )}
              </div>
            </div>
          ))}
        </Card>
      )}
      <ApplySheet open={open} onOpenChange={setSheet} onDone={reload} />
    </div>
  );
}
