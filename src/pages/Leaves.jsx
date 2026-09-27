import { useEffect, useMemo, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { CalendarOff, Check, Plus, Trash2, X } from 'lucide-react';
import { api } from '@/api/api';
import { useApi } from '@/hooks/useApi';
import { formatDate, formatDateShort, todayISO } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input, Textarea } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageLoader } from '@/components/shared/PageLoader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Avatar } from '@/components/shared/Avatar';
import { Field } from '@/components/shared/Field';
import { EmptyState, ErrorState } from '@/components/shared/States';
import { FilterTabs, SearchInput, Toolbar } from '@/components/shared/Toolbar';
import { StaffPicker } from '@/components/shared/SitePicker';
import { useConfirm } from '@/components/shared/ConfirmDialog';

const LEAVE_TYPES = { casual: 'Casual', sick: 'Sick', paid: 'Paid', unpaid: 'Unpaid', other: 'Other' };

const schema = z
  .object({
    staff: z.string().min(1, 'Choose a staff member'),
    startDate: z.string().min(1, 'Pick a start date'),
    endDate: z.string().min(1, 'Pick an end date'),
    type: z.enum(['casual', 'sick', 'paid', 'unpaid', 'other']),
    reason: z.string().trim().optional(),
    approveNow: z.boolean(),
  })
  .refine((v) => v.endDate >= v.startDate, { path: ['endDate'], message: 'End date must be on or after the start date' });

const defaults = () => ({ staff: '', startDate: todayISO(), endDate: todayISO(), type: 'casual', reason: '', approveNow: true });

function LeaveSheet({ open, onOpenChange, staff, onSaved }) {
  const { register, handleSubmit, control, reset, formState } = useForm({ resolver: zodResolver(schema), defaultValues: defaults() });
  const { errors, isSubmitting } = formState;

  useEffect(() => {
    if (open) reset(defaults());
  }, [open, reset]);

  const onSubmit = async ({ approveNow, ...values }) => {
    try {
      await api.leaves.create({ ...values, status: approveNow ? 'approved' : 'pending' });
      toast.success(approveNow ? 'Leave recorded and approved' : 'Leave request added');
      onOpenChange(false);
      onSaved();
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Record leave</SheetTitle>
          <SheetDescription>Approved leave is pre-filled as “Leave” when marking attendance.</SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex min-h-0 flex-1 flex-col gap-4" noValidate>
          <SheetBody className="space-y-4">
            <Field label="Staff" required error={errors.staff?.message}>
              <Controller
                control={control}
                name="staff"
                render={({ field }) => <StaffPicker staff={staff} value={field.value} onChange={field.onChange} invalid={Boolean(errors.staff)} />}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="From" htmlFor="lv-start" required error={errors.startDate?.message}>
                <Input id="lv-start" type="date" {...register('startDate')} />
              </Field>
              <Field label="To" htmlFor="lv-end" required error={errors.endDate?.message}>
                <Input id="lv-end" type="date" {...register('endDate')} />
              </Field>
            </div>
            <Field label="Type">
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(LEAVE_TYPES).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field label="Reason" htmlFor="lv-reason">
              <Textarea id="lv-reason" rows={3} {...register('reason')} />
            </Field>
            <Controller
              control={control}
              name="approveNow"
              render={({ field }) => (
                <div className="flex items-center gap-2">
                  <Checkbox id="lv-approve" checked={field.value} onCheckedChange={(v) => field.onChange(Boolean(v))} />
                  <Label htmlFor="lv-approve" className="text-sm font-normal">Approve now</Label>
                </div>
              )}
            />
          </SheetBody>
          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Saving…' : 'Save leave'}</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export default function Leaves() {
  const confirm = useConfirm();
  const { data, error, loading, reload, setData } = useApi(
    () => Promise.all([api.leaves.get(), api.staff.getAll({ status: 'active' })]).then(([leaves, staff]) => ({ leaves, staff })),
    [],
    { cacheKey: 'leaves' }
  );
  const [status, setStatus] = useState('pending');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(null);

  const leaves = useMemo(() => data?.leaves || [], [data]);
  const counts = useMemo(() => {
    const c = { all: leaves.length, pending: 0, approved: 0, rejected: 0 };
    leaves.forEach((l) => {
      c[l.status] += 1;
    });
    return c;
  }, [leaves]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leaves.filter((l) => (status === 'all' || l.status === status) && (!q || l.staff?.name?.toLowerCase().includes(q)));
  }, [leaves, status, query]);

  if (loading) return <PageLoader title="Leaves" description="Leave requests and approvals" />;
  if (error && !data) return <ErrorState error={error} onRetry={reload} />;

  const decide = async (leave, next) => {
    setBusy(leave._id);
    try {
      const updated = await api.leaves.update(leave._id, { status: next });
      setData((d) => ({ ...d, leaves: d.leaves.map((l) => (l._id === updated._id ? updated : l)) }));
      toast.success(`Leave ${next} for ${leave.staff?.name}`);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  };

  const remove = async (leave) => {
    const ok = await confirm({ title: 'Delete this leave record?', confirmLabel: 'Delete', destructive: true });
    if (!ok) return;
    try {
      await api.leaves.delete(leave._id);
      toast.success('Leave deleted');
      reload();
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Leaves"
        description="Record and approve staff leave"
        actions={<Button size="sm" onClick={() => setOpen(true)}><Plus /> Record leave</Button>}
      />

      <Toolbar>
        <SearchInput value={query} onChange={setQuery} placeholder="Search staff…" />
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
      </Toolbar>

      {filtered.length === 0 ? (
        <EmptyState
          icon={CalendarOff}
          title={status === 'pending' ? 'No pending leave requests' : 'No leave records'}
          description="Record leave when staff will be away so attendance is pre-filled."
        />
      ) : (
        <Card className="divide-y divide-border overflow-hidden">
          {filtered.map((l) => (
            <div key={l._id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar name={l.staff?.name} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{l.staff?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {LEAVE_TYPES[l.type]} · {l.days} {l.days === 1 ? 'day' : 'days'} ·{' '}
                    {l.days === 1 ? formatDate(l.startDate) : `${formatDateShort(l.startDate)} – ${formatDate(l.endDate)}`}
                  </p>
                  {l.reason && <p className="mt-0.5 truncate text-xs text-muted-foreground">“{l.reason}”</p>}
                </div>
              </div>
              <div className="flex items-center gap-2 sm:justify-end">
                <StatusBadge status={l.status} />
                {l.status === 'pending' ? (
                  <>
                    <Button size="sm" variant="outline" disabled={busy === l._id} onClick={() => decide(l, 'rejected')}>
                      <X /> Reject
                    </Button>
                    <Button size="sm" disabled={busy === l._id} onClick={() => decide(l, 'approved')}>
                      <Check /> Approve
                    </Button>
                  </>
                ) : (
                  <Button variant="ghost" size="icon-sm" aria-label="Delete leave" onClick={() => remove(l)}>
                    <Trash2 />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </Card>
      )}

      <LeaveSheet open={open} onOpenChange={setOpen} staff={data.staff} onSaved={reload} />
    </div>
  );
}
