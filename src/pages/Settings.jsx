import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { api } from '@/api/api';
import { useOrg } from '@/context/OrgContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { PageHeader } from '@/components/shared/PageHeader';
import { Field } from '@/components/shared/Field';
import { InstallApp } from '@/components/shared/AppStatus';

const schema = z.object({
  name: z.string().trim().min(2, 'Enter your business name'),
  ownerName: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z.union([z.literal(''), z.string().trim().email('Enter a valid email')]),
  address: z.string().trim().optional(),
});

const toForm = (org) => ({
  name: org?.name === 'Default Organization' ? '' : org?.name || '',
  ownerName: org?.ownerName || '',
  phone: org?.phone || '',
  email: org?.email || '',
  address: org?.address || '',
});

export default function Settings() {
  const { org, setOrg } = useOrg();
  const { register, handleSubmit, reset, formState } = useForm({ resolver: zodResolver(schema), defaultValues: toForm(org) });
  const { errors, isSubmitting, isDirty } = formState;

  useEffect(() => reset(toForm(org)), [org, reset]);

  const onSubmit = async (values) => {
    try {
      const saved = await api.org.update(values);
      setOrg(saved);
      toast.success('Business details saved');
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Settings" description="Business details shown on wage slips and across the app" />
      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <Card className="max-w-2xl">
          <CardHeader>
            <CardTitle>Business profile</CardTitle>
            <CardDescription>Printed at the top of every wage slip.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Field label="Business name" htmlFor="org-name" required error={errors.name?.message}>
              <Input id="org-name" placeholder="e.g. Sri Murugan Electricals" {...register('name')} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Owner name" htmlFor="org-owner">
                <Input id="org-owner" {...register('ownerName')} />
              </Field>
              <Field label="Phone" htmlFor="org-phone">
                <Input id="org-phone" type="tel" inputMode="tel" {...register('phone')} />
              </Field>
            </div>
            <Field label="Email" htmlFor="org-email" error={errors.email?.message}>
              <Input id="org-email" type="email" {...register('email')} />
            </Field>
            <Field label="Address" htmlFor="org-address">
              <Textarea id="org-address" rows={3} {...register('address')} />
            </Field>
          </CardContent>
          <CardFooter className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={!isDirty || isSubmitting} onClick={() => reset(toForm(org))}>
              Reset
            </Button>
            <Button type="submit" disabled={!isDirty || isSubmitting}>{isSubmitting ? 'Saving…' : 'Save changes'}</Button>
          </CardFooter>
        </Card>
      </form>
      <InstallApp className="max-w-2xl bg-card" />
    </div>
  );
}
