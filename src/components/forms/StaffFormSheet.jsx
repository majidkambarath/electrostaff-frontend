import { useEffect } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { api } from '@/api/api';
import { ROLE_LABELS, toISODate, todayISO } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Field } from '@/components/shared/Field';

const schema = z.object({
  name: z.string().trim().min(2, 'Enter the full name'),
  phone: z
    .string()
    .trim()
    .regex(/^[+\d][\d\s-]{6,15}$/, 'Enter a valid phone number'),
  email: z.union([z.literal(''), z.string().trim().email('Enter a valid email')]),
  role: z.enum(['electrician', 'helper', 'supervisor', 'apprentice', 'other']),
  dailyWage: z.coerce.number({ error: 'Enter the daily wage' }).positive('Daily wage must be more than 0'),
  otRate: z
    .string()
    .trim()
    .refine((v) => v === '' || (Number.isFinite(Number(v)) && Number(v) >= 0), 'Enter a valid hourly rate'),
  joinDate: z.string().min(1, 'Pick a join date'),
  status: z.enum(['active', 'inactive', 'on-leave']),
  address: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

const toForm = (s) => ({
  name: s?.name || '',
  phone: s?.phone || '',
  email: s?.email || '',
  role: s?.role || 'helper',
  dailyWage: s?.dailyWage ?? '',
  otRate: s?.otRate !== undefined && s?.otRate !== null ? String(s.otRate) : '',
  joinDate: s?.joinDate ? toISODate(s.joinDate) : todayISO(),
  status: s?.status || 'active',
  address: s?.address || '',
  notes: s?.notes || '',
});

export function StaffFormSheet({ open, onOpenChange, staff, onSaved }) {
  const editing = Boolean(staff?._id);
  const { register, handleSubmit, control, reset, formState } = useForm({
    resolver: zodResolver(schema),
    defaultValues: toForm(staff),
  });
  const { errors, isSubmitting } = formState;
  const wage = Number(useWatch({ control, name: 'dailyWage' })) || 0;

  useEffect(() => {
    if (open) reset(toForm(staff));
  }, [open, staff, reset]);

  const onSubmit = async (form) => {
    // Blank OT rate = use the default (daily wage / 8); the API clears a stored rate on ''.
    const values = { ...form, otRate: form.otRate === '' ? (editing ? '' : undefined) : Number(form.otRate) };
    try {
      const saved = editing ? await api.staff.update(staff._id, values) : await api.staff.create(values);
      toast.success(editing ? 'Staff details updated' : `${saved.name} registered`);
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
          <SheetTitle>{editing ? 'Edit staff' : 'Register staff'}</SheetTitle>
          <SheetDescription>Wages are calculated from this daily rate and site attendance.</SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col gap-4" noValidate>
          <SheetBody className="space-y-4">
            <Field label="Full name" htmlFor="staff-name" required error={errors.name?.message}>
              <Input id="staff-name" autoComplete="off" {...register('name')} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Phone" htmlFor="staff-phone" required error={errors.phone?.message}>
                <Input id="staff-phone" type="tel" inputMode="tel" {...register('phone')} />
              </Field>
              <Field label="Email" htmlFor="staff-email" error={errors.email?.message}>
                <Input id="staff-email" type="email" {...register('email')} />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Role">
                <Controller
                  control={control}
                  name="role"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(ROLE_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
              <Field label="Daily wage (₹)" htmlFor="staff-wage" required error={errors.dailyWage?.message}>
                <Input id="staff-wage" type="number" inputMode="numeric" min="0" step="1" {...register('dailyWage')} />
              </Field>
            </div>
            <Field
              label="Overtime rate (₹ per hour)"
              htmlFor="staff-ot"
              error={errors.otRate?.message}
              hint={`Leave blank to use daily wage ÷ 8${wage ? ` (₹${Math.round(wage / 8)}/hour)` : ''}`}
            >
              <Input id="staff-ot" type="number" inputMode="numeric" min="0" step="1" placeholder={wage ? String(Math.round(wage / 8)) : ''} {...register('otRate')} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Join date" htmlFor="staff-join" required error={errors.joinDate?.message}>
                <Input id="staff-join" type="date" {...register('joinDate')} />
              </Field>
              <Field label="Status">
                <Controller
                  control={control}
                  name="status"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="on-leave">On leave</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </Field>
            </div>
            <Field label="Address" htmlFor="staff-address">
              <Input id="staff-address" {...register('address')} />
            </Field>
            <Field label="Notes" htmlFor="staff-notes">
              <Textarea id="staff-notes" rows={3} {...register('notes')} />
            </Field>
          </SheetBody>
          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : editing ? 'Save changes' : 'Register staff'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
