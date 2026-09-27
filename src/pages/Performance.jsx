import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { api } from '@/api/api';
import { useApi } from '@/hooks/useApi';
import { cn } from '@/lib/utils';
import { MONTHS, ROLE_LABELS } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input, Textarea } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageLoader } from '@/components/shared/PageLoader';
import { Avatar } from '@/components/shared/Avatar';
import { Field } from '@/components/shared/Field';
import { EmptyState, ErrorState } from '@/components/shared/States';
import { StaffPicker } from '@/components/shared/SitePicker';
import { useConfirm } from '@/components/shared/ConfirmDialog';

const now = new Date();

function StarInput({ value, onChange, label }) {
  return (
    <div className="flex gap-1" role="radiogroup" aria-label={label}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={value === n}
          aria-label={`${n} of 5`}
          onClick={() => onChange(n)}
          className="rounded-sm p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Star className={cn('h-6 w-6', n <= value ? 'fill-amber-400 text-amber-400' : 'text-border')} />
        </button>
      ))}
    </div>
  );
}

function Stars({ value }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cn('h-3.5 w-3.5', n <= value ? 'fill-amber-400 text-amber-400' : 'text-border')} />
      ))}
    </span>
  );
}

const emptyForm = { staff: '', rating: 3, punctuality: 3, quality: 3, tasksCompleted: 0, notes: '' };

function RatingSheet({ open, onOpenChange, staff, record, month, year, onSaved }) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm(
      record
        ? {
            staff: record.staff._id,
            rating: record.rating,
            punctuality: record.punctuality,
            quality: record.quality,
            tasksCompleted: record.tasksCompleted,
            notes: record.notes || '',
          }
        : emptyForm
    );
  }, [open, record]);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.staff) {
      toast.error('Choose a staff member');
      return;
    }
    setSaving(true);
    try {
      await api.performance.save({ ...form, tasksCompleted: Number(form.tasksCompleted) || 0, month, year });
      toast.success('Rating saved');
      onOpenChange(false);
      onSaved();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{record ? `Update rating · ${record.staff.name}` : 'Rate staff'}</SheetTitle>
          <SheetDescription>{MONTHS[month - 1]} {year}. Saving again for the same person updates their rating.</SheetDescription>
        </SheetHeader>
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col gap-4">
          <SheetBody className="space-y-4">
            {!record && (
              <Field label="Staff" required>
                <StaffPicker staff={staff} value={form.staff} onChange={set('staff')} />
              </Field>
            )}
            <Field label="Overall rating"><StarInput label="Overall rating" value={form.rating} onChange={set('rating')} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Punctuality"><StarInput label="Punctuality" value={form.punctuality} onChange={set('punctuality')} /></Field>
              <Field label="Work quality"><StarInput label="Work quality" value={form.quality} onChange={set('quality')} /></Field>
            </div>
            <Field label="Tasks completed" htmlFor="perf-tasks">
              <Input id="perf-tasks" type="number" min="0" inputMode="numeric" value={form.tasksCompleted} onChange={(e) => set('tasksCompleted')(e.target.value)} className="w-32" />
            </Field>
            <Field label="Notes" htmlFor="perf-notes">
              <Textarea id="perf-notes" rows={3} value={form.notes} onChange={(e) => set('notes')(e.target.value)} />
            </Field>
          </SheetBody>
          <SheetFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save rating'}</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

export default function Performance() {
  const confirm = useConfirm();
  const [period, setPeriod] = useState(`${now.getFullYear()}-${now.getMonth() + 1}`);
  const [year, month] = period.split('-').map(Number);
  const { data, error, loading, refreshing, reload } = useApi(
    () => Promise.all([api.performance.get({ month, year }), api.staff.getAll({ status: 'active' })]).then(([records, staff]) => ({ records, staff })),
    [period],
    { cacheKey: `performance:${period}` }
  );
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const periods = useMemo(
    () =>
      Array.from({ length: 12 }, (_, i) => {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        return { value: `${d.getFullYear()}-${d.getMonth() + 1}`, label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}` };
      }),
    []
  );

  if (loading) return <PageLoader title="Performance" description="Monthly staff ratings" />;
  if (error && !data) return <ErrorState error={error} onRetry={reload} />;

  const { records, staff } = data;
  const ratedIds = new Set(records.map((r) => r.staff._id));
  const unrated = staff.filter((s) => !ratedIds.has(s._id));
  const avg = records.length ? (records.reduce((s, r) => s + r.rating, 0) / records.length).toFixed(1) : '—';

  const openSheet = (record = null) => {
    setEditing(record);
    setOpen(true);
  };

  const remove = async (r) => {
    const ok = await confirm({ title: `Delete ${r.staff.name}’s rating?`, confirmLabel: 'Delete', destructive: true });
    if (!ok) return;
    try {
      await api.performance.delete(r._id);
      toast.success('Rating deleted');
      reload();
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Performance"
        description={`Average rating ${avg} · ${records.length} of ${staff.length} active staff rated`}
        actions={<Button size="sm" onClick={() => openSheet()} disabled={unrated.length === 0}><Plus /> Rate staff</Button>}
      />

      <Select value={period} onValueChange={setPeriod}>
        <SelectTrigger className="sm:w-52" aria-label="Month"><SelectValue /></SelectTrigger>
        <SelectContent>
          {periods.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
        </SelectContent>
      </Select>

      <div className={cn('space-y-4', refreshing && 'opacity-60')}>
        {records.length === 0 ? (
          <EmptyState
            icon={Star}
            title={`No ratings for ${MONTHS[month - 1]} ${year}`}
            description="Rate your team monthly on overall work, punctuality and quality."
            action={staff.length > 0 && <Button size="sm" onClick={() => openSheet()}><Plus /> Rate staff</Button>}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {records.map((r) => (
              <Card key={r._id} className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar name={r.staff.name} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{r.staff.name}</p>
                    <p className="text-xs text-muted-foreground">{ROLE_LABELS[r.staff.role]}</p>
                  </div>
                  <div className="flex">
                    <Button variant="ghost" size="icon-sm" aria-label="Edit rating" onClick={() => openSheet(r)}><Pencil /></Button>
                    <Button variant="ghost" size="icon-sm" aria-label="Delete rating" onClick={() => remove(r)}><Trash2 /></Button>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <Stars value={r.rating} />
                  <span className="text-sm font-semibold">{r.rating}/5</span>
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-md bg-muted px-2 py-1.5">
                    <dt className="text-muted-foreground">Punctual</dt>
                    <dd className="font-semibold">{r.punctuality}/5</dd>
                  </div>
                  <div className="rounded-md bg-muted px-2 py-1.5">
                    <dt className="text-muted-foreground">Quality</dt>
                    <dd className="font-semibold">{r.quality}/5</dd>
                  </div>
                  <div className="rounded-md bg-muted px-2 py-1.5">
                    <dt className="text-muted-foreground">Tasks</dt>
                    <dd className="font-semibold">{r.tasksCompleted}</dd>
                  </div>
                </dl>
                <p className="mt-3 text-xs text-muted-foreground">
                  {r.attendance
                    ? `Attendance: ${r.attendance.payableDays} payable days of ${r.attendance.marked} marked (${r.attendance.rate}%)`
                    : 'No attendance marked this month'}
                </p>
                {r.notes && <p className="mt-2 border-t border-border pt-2 text-sm">{r.notes}</p>}
              </Card>
            ))}
          </div>
        )}

        {records.length > 0 && unrated.length > 0 && (
          <p className="text-sm text-muted-foreground">
            Not yet rated: {unrated.slice(0, 6).map((s) => s.name).join(', ')}
            {unrated.length > 6 && ` and ${unrated.length - 6} more`}
          </p>
        )}
      </div>

      <RatingSheet
        open={open}
        onOpenChange={setOpen}
        staff={unrated}
        record={editing}
        month={month}
        year={year}
        onSaved={reload}
      />
    </div>
  );
}
