import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Check, HandCoins, MessageSquare, X } from 'lucide-react';
import { requestsApi } from '@/features/requests/api';
import { useApi } from '@/shared/hooks/useApi';
import { PAYMENT_MODE_LABELS, formatCurrency, formatDate } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Checkbox } from '@/shared/ui/checkbox';
import { AmountInput } from '@/shared/ui/number-inputs';
import { Textarea } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { PageHeader } from '@/shared/components/PageHeader';
import { PageLoader } from '@/shared/components/PageLoader';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { Avatar } from '@/shared/components/Avatar';
import { Field } from '@/shared/components/Field';
import { EmptyState, ErrorState } from '@/shared/components/States';
import { FilterTabs } from '@/shared/components/Toolbar';

function DecideDialog({ request, decision, onOpenChange, onDone }) {
  const [note, setNote] = useState('');
  const [amount, setAmount] = useState('');
  const [record, setRecord] = useState(true);
  const [mode, setMode] = useState('cash');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!request) return;
    setNote('');
    setAmount(String(request.amount || ''));
    setRecord(true);
    setMode('cash');
  }, [request]);

  if (!request) return null;
  const approving = decision === 'approved';
  const isAdvance = request.type === 'advance';

  const submit = async () => {
    setSaving(true);
    try {
      await requestsApi.decide(request._id, {
        status: decision,
        responseNote: note.trim() || undefined,
        recordAdvance: approving && isAdvance && record,
        amount: approving && isAdvance ? Number(amount) : undefined,
        paymentMode: mode,
      });
      toast.success(`Request ${decision}. ${request.staffId.name} has been notified.`);
      onOpenChange(false);
      onDone();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{approving ? 'Approve' : 'Reject'} request</DialogTitle>
          <DialogDescription>
            {request.staffId.name} · {isAdvance ? `Advance of ${formatCurrency(request.amount)}` : 'Request'}
            {request.note && ` · “${request.note}”`}
          </DialogDescription>
        </DialogHeader>
        {approving && isAdvance && (
          <div className="space-y-3 rounded-md border border-border p-3">
            <div className="flex items-start gap-3">
              <Checkbox id="rq-record" checked={record} onCheckedChange={(v) => setRecord(Boolean(v))} className="mt-0.5" />
              <Label htmlFor="rq-record" className="text-sm font-normal">
                <span className="block font-medium">Record the advance now</span>
                <span className="text-muted-foreground">It will be recovered from their upcoming wages.</span>
              </Label>
            </div>
            {record && (
              <div className="grid grid-cols-2 gap-3">
                <Field label="Amount (₹)" htmlFor="rq-amount">
                  <AmountInput id="rq-amount" value={amount} onChange={setAmount} />
                </Field>
                <Field label="Given by">
                  <div className="grid grid-cols-3 gap-1" role="radiogroup" aria-label="Given by">
                    {Object.entries(PAYMENT_MODE_LABELS).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        role="radio"
                        aria-checked={mode === value}
                        onClick={() => setMode(value)}
                        className={cn('h-10 rounded-md border border-border text-xs font-medium sm:h-9', mode === value ? 'border-primary bg-primary/10 text-primary' : 'text-muted-foreground')}
                      >
                        {value === 'bank' ? 'Bank' : label}
                      </button>
                    ))}
                  </div>
                </Field>
              </div>
            )}
          </div>
        )}
        <Field label={approving ? 'Note to staff (optional)' : 'Reason (optional)'} htmlFor="rq-note">
          <Textarea id="rq-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button variant={approving ? 'default' : 'destructive'} onClick={submit} disabled={saving || (approving && isAdvance && record && !(Number(amount) > 0))}>
            {saving ? 'Saving…' : approving ? 'Approve' : 'Reject'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function RequestsPage() {
  const { data, error, loading, reload } = useApi(() => requestsApi.list(), [], { cacheKey: 'requests' });
  const [status, setStatus] = useState('pending');
  const [deciding, setDeciding] = useState(null);

  const requests = useMemo(() => data || [], [data]);
  const counts = useMemo(() => {
    const c = { all: requests.length, pending: 0, approved: 0, rejected: 0, cancelled: 0 };
    requests.forEach((r) => {
      c[r.status] += 1;
    });
    return c;
  }, [requests]);
  const shown = requests.filter((r) => status === 'all' || r.status === status);

  if (loading) return <PageLoader title="Staff requests" description="Advance and other requests from the staff app" />;
  if (error && !data) return <ErrorState error={error} onRetry={reload} />;

  return (
    <div className="space-y-4">
      <PageHeader title="Staff requests" description="Advances and other requests sent from the staff app" />
      <FilterTabs
        value={status}
        onChange={setStatus}
        options={[
          { value: 'pending', label: 'Pending', count: counts.pending },
          { value: 'approved', label: 'Approved', count: counts.approved },
          { value: 'rejected', label: 'Rejected', count: counts.rejected },
          { value: 'all', label: 'All', count: counts.all },
        ]}
      />
      {shown.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title={status === 'pending' ? 'No pending requests' : 'Nothing here'}
          description="When staff ask for an advance or anything else from their app, it appears here and you get a notification."
        />
      ) : (
        <Card className="divide-y divide-border overflow-hidden">
          {shown.map((r) => (
            <div key={r._id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-start gap-3">
                <Avatar name={r.staffId.name} />
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {r.staffId.name}
                    <span className="ml-2 inline-flex items-center gap-1 text-xs font-normal text-muted-foreground">
                      {r.type === 'advance' ? <><HandCoins className="h-3.5 w-3.5" /> Advance {formatCurrency(r.amount)}</> : 'Other request'}
                    </span>
                  </p>
                  {r.note && <p className="text-sm text-muted-foreground">“{r.note}”</p>}
                  <p className="text-xs text-muted-foreground">
                    {formatDate(r.createdAt)}
                    {r.responseNote && ` · Reply: ${r.responseNote}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:justify-end">
                <StatusBadge status={r.status} />
                {r.status === 'pending' && (
                  <>
                    <Button size="sm" variant="outline" onClick={() => setDeciding({ request: r, decision: 'rejected' })}><X /> Reject</Button>
                    <Button size="sm" onClick={() => setDeciding({ request: r, decision: 'approved' })}><Check /> Approve</Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </Card>
      )}
      {deciding && (
        <DecideDialog request={deciding.request} decision={deciding.decision} onOpenChange={(o) => !o && setDeciding(null)} onDone={reload} />
      )}
    </div>
  );
}
