import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { expensesApi } from '@/features/expenses/api';
import { receiptsApi } from '@/features/sites/api';
import { EXPENSE_CATEGORY_LABELS, RECEIPT_MODE_LABELS, PAYMENT_MODE_LABELS, formatCurrency, toISODate, todayISO } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { AmountInput } from '@/shared/ui/number-inputs';
import { Input, Textarea } from '@/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/shared/ui/sheet';
import { Field } from '@/shared/components/Field';

const amount = z.coerce.number({ error: 'Enter an amount' }).min(1, 'Amount must be at least ₹1');

function ModeSelect({ control, name, labels }) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <Select value={field.value} onValueChange={field.onChange}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(labels).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
      )}
    />
  );
}

const expenseSchema = z.object({
  siteId: z.string(),
  category: z.enum(['material', 'transport', 'tools', 'food', 'rent', 'other']),
  amount,
  date: z.string().min(1, 'Pick a date'),
  vendor: z.string().trim().optional(),
  description: z.string().trim().optional(),
  paymentMode: z.enum(['cash', 'upi', 'bank']),
});

const expenseDefaults = (expense, siteId) => ({
  siteId: expense ? expense.siteId?._id || expense.siteId || 'general' : siteId || 'general',
  category: expense?.category || 'material',
  amount: expense?.amount ?? '',
  date: expense?.date ? toISODate(expense.date) : todayISO(),
  vendor: expense?.vendor || '',
  description: expense?.description || '',
  paymentMode: expense?.paymentMode || 'cash',
});

// Labour is derived from attendance, never entered as an expense.
const CATEGORY_OPTIONS = Object.fromEntries(Object.entries(EXPENSE_CATEGORY_LABELS).filter(([k]) => k !== 'labour'));

// Add or edit an expense. `site` fixes the site (from a site page); otherwise a site picker
// with a "General" option is shown.
export function ExpenseFormSheet({ open, onOpenChange, expense, site, sites = [], onSaved }) {
  const editing = Boolean(expense?._id);
  const { register, handleSubmit, control, reset, formState } = useForm({
    resolver: zodResolver(expenseSchema),
    defaultValues: expenseDefaults(expense, site?._id),
  });
  const { errors, isSubmitting } = formState;

  useEffect(() => {
    if (open) reset(expenseDefaults(expense, site?._id));
  }, [open, expense, site, reset]);

  const onSubmit = async (values) => {
    const payload = { ...values, siteId: values.siteId === 'general' ? '' : values.siteId };
    try {
      const saved = editing ? await expensesApi.update(expense._id, payload) : await expensesApi.create(payload);
      toast.success(`${editing ? 'Expense updated' : 'Expense added'} · ${formatCurrency(saved.amount)}`);
      onOpenChange(false);
      onSaved?.(saved);
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{editing ? 'Edit expense' : 'Add expense'}{site ? ` · ${site.name}` : ''}</SheetTitle>
          <SheetDescription>Materials, transport, tools and other costs besides wages.</SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col gap-4" noValidate>
          <SheetBody className="space-y-4">
            {!site && (
              <Field label="Site" hint="Choose General for office or business overheads">
                <Controller
                  control={control}
                  name="siteId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General (no site)</SelectItem>
                        {sites.map((s) => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Category">
                <ModeSelect control={control} name="category" labels={CATEGORY_OPTIONS} />
              </Field>
              <Field label="Amount (₹)" htmlFor="exp-amount" required error={errors.amount?.message}>
                <Controller control={control} name="amount" render={({ field }) => <AmountInput id="exp-amount" {...field} />} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Date" htmlFor="exp-date" required error={errors.date?.message}>
                <Input id="exp-date" type="date" max={todayISO()} {...register('date')} />
              </Field>
              <Field label="Paid by">
                <ModeSelect control={control} name="paymentMode" labels={PAYMENT_MODE_LABELS} />
              </Field>
            </div>
            <Field label="Vendor / shop" htmlFor="exp-vendor">
              <Input id="exp-vendor" placeholder="e.g. Sri Balaji Electricals" {...register('vendor')} />
            </Field>
            <Field label="Description" htmlFor="exp-desc">
              <Textarea id="exp-desc" rows={3} placeholder="e.g. 10 coils 2.5 sq mm wire" {...register('description')} />
            </Field>
          </SheetBody>
          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : editing ? 'Save changes' : 'Add expense'}</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

const receiptSchema = z.object({
  amount,
  date: z.string().min(1, 'Pick a date'),
  paymentMode: z.enum(['cash', 'upi', 'bank', 'cheque']),
  reference: z.string().trim().optional(),
  note: z.string().trim().optional(),
});

const receiptDefaults = () => ({ amount: '', date: todayISO(), paymentMode: 'bank', reference: '', note: '' });

// Money received from the client for a site.
export function ReceiptFormSheet({ open, onOpenChange, site, due, onSaved }) {
  const { register, handleSubmit, control, reset, formState } = useForm({
    resolver: zodResolver(receiptSchema),
    defaultValues: receiptDefaults(),
  });
  const { errors, isSubmitting } = formState;

  useEffect(() => {
    if (open) reset(receiptDefaults());
  }, [open, reset]);

  const onSubmit = async (values) => {
    try {
      const saved = await receiptsApi.create({ ...values, siteId: site._id });
      toast.success(`Client payment of ${formatCurrency(saved.amount)} recorded`);
      onOpenChange(false);
      onSaved?.(saved);
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Client payment · {site?.name}</SheetTitle>
          <SheetDescription>
            Money received from {site?.clientName || 'the client'}
            {due > 0 ? ` · ${formatCurrency(due)} still due on the contract` : ''}.
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col gap-4" noValidate>
          <SheetBody className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Amount (₹)" htmlFor="rc-amount" required error={errors.amount?.message}>
                <Controller control={control} name="amount" render={({ field }) => <AmountInput id="rc-amount" autoFocus {...field} />} />
              </Field>
              <Field label="Date" htmlFor="rc-date" required error={errors.date?.message}>
                <Input id="rc-date" type="date" max={todayISO()} {...register('date')} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Received by">
                <ModeSelect control={control} name="paymentMode" labels={RECEIPT_MODE_LABELS} />
              </Field>
              <Field label="Reference" htmlFor="rc-ref" hint="Cheque / UTR / bill no.">
                <Input id="rc-ref" {...register('reference')} />
              </Field>
            </div>
            <Field label="Note" htmlFor="rc-note">
              <Textarea id="rc-note" rows={3} placeholder="e.g. Running bill 2" {...register('note')} />
            </Field>
          </SheetBody>
          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : 'Record payment'}</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
