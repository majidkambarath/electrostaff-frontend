import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { sitesApi } from '@/features/sites/api';
import { toISODate, todayISO } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Input, Textarea } from '@/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/shared/ui/sheet';
import { Field } from '@/shared/components/Field';

const schema = z
  .object({
    name: z.string().trim().min(2, 'Enter a site name'),
    clientName: z.string().trim().optional(),
    clientPhone: z.string().trim().optional(),
    address: z.string().trim().optional(),
    startDate: z.string().min(1, 'Pick a start date'),
    endDate: z.string().optional(),
    status: z.enum(['active', 'onhold', 'completed']),
    contractValue: z.coerce.number({ error: 'Enter an amount' }).min(0, 'Amount can’t be negative'),
    notes: z.string().trim().optional(),
  })
  .refine((v) => !v.endDate || v.endDate >= v.startDate, {
    path: ['endDate'],
    message: 'End date must be after the start date',
  });

const toForm = (site) => ({
  name: site?.name || '',
  clientName: site?.clientName || '',
  clientPhone: site?.clientPhone || '',
  address: site?.address || '',
  startDate: site?.startDate ? toISODate(site.startDate) : todayISO(),
  endDate: site?.endDate ? toISODate(site.endDate) : '',
  status: site?.status || 'active',
  contractValue: site?.contractValue || '',
  notes: site?.notes || '',
});

export function SiteFormSheet({ open, onOpenChange, site, onSaved }) {
  const editing = Boolean(site?._id);
  const form = useForm({ resolver: zodResolver(schema), defaultValues: toForm(site) });
  const { register, handleSubmit, control, reset, formState } = form;
  const { errors, isSubmitting } = formState;

  useEffect(() => {
    if (open) reset(toForm(site));
  }, [open, site, reset]);

  const onSubmit = async (values) => {
    try {
      const saved = editing ? await sitesApi.update(site._id, values) : await sitesApi.create(values);
      toast.success(editing ? 'Site updated' : 'Site created');
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
          <SheetTitle>{editing ? 'Edit site' : 'New site'}</SheetTitle>
          <SheetDescription>A job site or project where staff work and attendance is marked.</SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col gap-4" noValidate>
          <SheetBody className="space-y-4">
            <Field label="Site name" htmlFor="site-name" required error={errors.name?.message}>
              <Input id="site-name" placeholder="e.g. Green Park Villa wiring" {...register('name')} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Client name" htmlFor="site-client">
                <Input id="site-client" {...register('clientName')} />
              </Field>
              <Field label="Client phone" htmlFor="site-client-phone">
                <Input id="site-client-phone" type="tel" inputMode="tel" {...register('clientPhone')} />
              </Field>
            </div>
            <Field
              label="Contract value (₹)"
              htmlFor="site-contract"
              error={errors.contractValue?.message}
              hint="Agreed job amount with the client — used for client dues and profit"
            >
              <Input id="site-contract" type="number" inputMode="numeric" min="0" placeholder="0" {...register('contractValue')} />
            </Field>
            <Field label="Address" htmlFor="site-address">
              <Input id="site-address" {...register('address')} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Start date" htmlFor="site-start" required error={errors.startDate?.message}>
                <Input id="site-start" type="date" {...register('startDate')} />
              </Field>
              <Field label="Expected end" htmlFor="site-end" error={errors.endDate?.message}>
                <Input id="site-end" type="date" {...register('endDate')} />
              </Field>
            </div>
            <Field label="Status">
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="onhold">On hold</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field label="Notes" htmlFor="site-notes">
              <Textarea id="site-notes" rows={3} {...register('notes')} />
            </Field>
          </SheetBody>
          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : editing ? 'Save changes' : 'Create site'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
