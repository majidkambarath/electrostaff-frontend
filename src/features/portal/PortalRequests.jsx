import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { HandCoins, MessageSquare, Plus } from 'lucide-react';
import { portalApi } from '@/features/portal/api';
import { useApi } from '@/shared/hooks/useApi';
import { cn } from '@/shared/lib/utils';
import { formatCurrency, formatDate } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { AmountInput } from '@/shared/ui/number-inputs';
import { Textarea } from '@/shared/ui/input';
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/shared/ui/sheet';
import { PageHeader } from '@/shared/components/PageHeader';
import { PageLoader } from '@/shared/components/PageLoader';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { Field } from '@/shared/components/Field';
import { EmptyState, ErrorState } from '@/shared/components/States';
import { useConfirm } from '@/shared/components/ConfirmDialog';

function RequestSheet({ open, initialType, onOpenChange, onDone }) {
  const [type, setType] = useState('advance');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (!open) return;
    setType(initialType || 'advance');
    setAmount('');
    setNote('');
  }, [open, initialType]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await portalApi.createRequest({ type, amount: type === 'advance' ? Number(amount) : undefined, note });
      toast.success('Request sent to the office');
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
          <SheetTitle>New request</SheetTitle>
          <SheetDescription>The office gets a notification and replies here.</SheetDescription>
        </SheetHeader>
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col gap-4">
          <SheetBody className="space-y-4">
            <div className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1" role="radiogroup" aria-label="Request type">
              {[
                { value: 'advance', label: 'Advance money' },
                { value: 'other', label: 'Something else' },
              ].map((o) => (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={type === o.value}
                  onClick={() => setType(o.value)}
                  className={cn('h-10 rounded-sm text-sm font-medium text-muted-foreground', type === o.value && 'bg-background text-foreground')}
                >
                  {o.label}
                </button>
              ))}
            </div>
            {type === 'advance' && (
              <Field label="Amount (₹)" htmlFor="rq-amount">
                <AmountInput id="rq-amount" value={amount} onChange={setAmount} required />
              </Field>
            )}
            <Field label={type === 'advance' ? 'Reason (optional)' : 'What do you need?'} htmlFor="rq-note">
              <Textarea id="rq-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} required={type === 'other'} />
            </Field>
          </SheetBody>
          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving || (type === 'advance' && !(Number(amount) > 0))}>{saving ? 'Sending…' : 'Send request'}</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export default function PortalRequests() {
  const confirm = useConfirm();
  const [params, setParams] = useSearchParams();
  const { data, error, loading, reload } = useApi(() => portalApi.requests(), [], { cacheKey: 'me:requests' });
  const [open, setOpen] = useState(Boolean(params.get('new')));

  const setSheet = (value) => {
    setOpen(value);
    if (!value && params.get('new')) setParams({}, { replace: true });
  };

  const cancel = async (r) => {
    if (!(await confirm({ title: 'Withdraw this request?', confirmLabel: 'Withdraw', cancelLabel: 'Keep', destructive: true }))) return;
    try {
      await portalApi.cancelRequest(r._id);
      toast.success('Request withdrawn');
      reload();
    } catch (e) {
      toast.error(e.message);
    }
  };

  if (loading) return <PageLoader title="My requests" />;
  if (error && !data) return <ErrorState error={error} onRetry={reload} />;

  return (
    <div className="space-y-4">
      <PageHeader title="My requests" description="Ask the office for an advance or anything else" actions={<Button size="sm" onClick={() => setSheet(true)}><Plus /> New</Button>} />
      {data.length === 0 ? (
        <EmptyState icon={MessageSquare} title="No requests yet" action={<Button size="sm" onClick={() => setSheet(true)}><Plus /> New request</Button>} />
      ) : (
        <Card className="divide-y divide-border overflow-hidden">
          {data.map((r) => (
            <div key={r._id} className="flex items-start gap-3 px-4 py-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                {r.type === 'advance' ? <HandCoins className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{r.type === 'advance' ? `Advance of ${formatCurrency(r.amount)}` : 'Request'}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(r.createdAt)}
                  {r.note && ` · “${r.note}”`}
                </p>
                {r.responseNote && <p className="mt-1 text-xs">Office: {r.responseNote}</p>}
              </div>
              <div className="flex flex-col items-end gap-1">
                <StatusBadge status={r.status} />
                {r.status === 'pending' && (
                  <button type="button" onClick={() => cancel(r)} className="tap text-xs font-medium text-red-600">Withdraw</button>
                )}
              </div>
            </div>
          ))}
        </Card>
      )}
      <RequestSheet open={open} initialType={params.get('new') === 'advance' ? 'advance' : undefined} onOpenChange={setSheet} onDone={reload} />
    </div>
  );
}
