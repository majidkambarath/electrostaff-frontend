import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { advancesApi } from '@/features/advances/api';
import { formatCurrency, todayISO } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Input, Textarea } from '@/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/shared/ui/sheet';
import { Field } from '@/shared/components/Field';
import { StaffPicker } from '@/shared/components/SitePicker';

const schema = z.object({
  staffId: z.string().min(1, 'Choose a staff member'),
  amount: z.coerce.number({ error: 'Enter an amount' }).min(1, 'Amount must be at least ₹1'),
  date: z.string().min(1, 'Pick a date'),
  paymentMode: z.enum(['cash', 'upi', 'bank']),
  note: z.string().trim().optional(),
});

// Records money given to staff ahead of wages; it is recovered later from a payment.
export function AdvanceFormSheet({ open, onOpenChange, staffList = [], staff, onSaved }) {
  const fixedStaff = Boolean(staff);
  const { register, handleSubmit, control, reset, formState } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { staffId: staff?._id || '', amount: '', date: todayISO(), paymentMode: 'cash', note: '' },
  });
  const { errors, isSubmitting } = formState;

  useEffect(() => {
    if (open) reset({ staffId: staff?._id || '', amount: '', date: todayISO(), paymentMode: 'cash', note: '' });
  }, [open, staff, reset]);

  const onSubmit = async (values) => {
    try {
      const saved = await advancesApi.create(values);
      toast.success(`Advance of ${formatCurrency(saved.amount)} recorded for ${saved.staffId?.name}`);
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
          <SheetTitle>Give advance{fixedStaff ? ` to ${staff.name}` : ''}</SheetTitle>
          <SheetDescription>The balance can be recovered from their next wage payment.</SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col gap-4" noValidate>
          <SheetBody className="space-y-4">
            {!fixedStaff && (
              <Field label="Staff" required error={errors.staffId?.message}>
                <Controller
                  control={control}
                  name="staffId"
                  render={({ field }) => (
                    <StaffPicker staff={staffList} value={field.value} onChange={field.onChange} invalid={Boolean(errors.staffId)} />
                  )}
                />
              </Field>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Amount (₹)" htmlFor="adv-amount" required error={errors.amount?.message}>
                <Input id="adv-amount" type="number" inputMode="numeric" min="1" autoFocus={fixedStaff} {...register('amount')} />
              </Field>
              <Field label="Date" htmlFor="adv-date" required error={errors.date?.message}>
                <Input id="adv-date" type="date" max={todayISO()} {...register('date')} />
              </Field>
            </div>
            <Field label="Given by">
              <Controller
                control={control}
                name="paymentMode"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="bank">Bank transfer</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field label="Note" htmlFor="adv-note">
              <Textarea id="adv-note" rows={3} placeholder="Reason, e.g. festival advance" {...register('note')} />
            </Field>
          </SheetBody>
          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : 'Record advance'}</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
