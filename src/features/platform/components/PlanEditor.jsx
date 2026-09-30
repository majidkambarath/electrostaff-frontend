import { useState } from 'react';
import { toast } from 'sonner';
import { platformApi } from '@/features/platform/api';
import { formatDate, shiftISODate, toISODate, todayISO } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Field } from '@/shared/components/Field';

const PLANS = [
  { value: 'none', label: 'No plan (unlimited)' },
  { value: 'trial', label: 'Free trial', staffLimit: 15 },
  { value: 'starter', label: 'Starter', staffLimit: 25 },
  { value: 'pro', label: 'Pro', staffLimit: 100 },
  { value: 'custom', label: 'Custom' },
];

// Developer mode: set a business's plan, active-staff limit and paid-until date.
export function PlanEditor({ orgId, plan, onSaved }) {
  const [form, setForm] = useState({
    name: plan?.name || 'none',
    staffLimit: plan?.staffLimit ?? '',
    validUntil: plan?.validUntil ? toISODate(plan.validUntil) : '',
  });
  const [busy, setBusy] = useState(false);
  const extend = (days) => setForm((f) => ({ ...f, validUntil: shiftISODate(f.validUntil && f.validUntil > todayISO() ? f.validUntil : todayISO(), days) }));

  const save = async () => {
    setBusy(true);
    try {
      const payload = form.name === 'none' ? { name: null } : { name: form.name, staffLimit: form.staffLimit, validUntil: form.validUntil || null };
      await platformApi.setPlan(orgId, payload);
      toast.success('Plan saved');
      onSaved?.();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium">Plan</p>
        <p className="text-xs text-muted-foreground">
          {plan?.name
            ? plan.expired
              ? `Ended ${formatDate(plan.validUntil)} · read-only`
              : plan.validUntil
                ? `${plan.daysLeft} days left`
                : 'No end date'
            : 'Unlimited'}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Plan">
          <Select
            value={form.name}
            onValueChange={(name) => setForm((f) => ({ ...f, name, staffLimit: PLANS.find((p) => p.value === name)?.staffLimit ?? f.staffLimit }))}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PLANS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        {form.name !== 'none' && (
          <Field label="Active staff limit" htmlFor="plan-limit" hint="Blank = plan default">
            <Input id="plan-limit" inputMode="numeric" value={form.staffLimit} onChange={(e) => setForm((f) => ({ ...f, staffLimit: e.target.value.replace(/\D/g, '') }))} />
          </Field>
        )}
      </div>
      {form.name !== 'none' && (
        <Field label="Paid until" htmlFor="plan-until" hint="After this date the office becomes read-only">
          <div className="flex flex-wrap gap-2">
            <Input id="plan-until" type="date" value={form.validUntil} onChange={(e) => setForm((f) => ({ ...f, validUntil: e.target.value }))} className="sm:w-44" />
            <Button type="button" variant="outline" size="sm" onClick={() => extend(30)}>+1 month</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => extend(365)}>+1 year</Button>
          </div>
        </Field>
      )}
      <Button onClick={save} disabled={busy} size="sm">{busy ? 'Saving…' : 'Save plan'}</Button>
    </div>
  );
}
