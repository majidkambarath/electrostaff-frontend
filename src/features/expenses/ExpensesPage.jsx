import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Pencil, Plus, Receipt, Trash2 } from 'lucide-react';
import { sitesApi } from '@/features/sites/api';
import { expensesApi } from '@/features/expenses/api';
import { useApi } from '@/shared/hooks/useApi';
import { cn } from '@/shared/lib/utils';
import { downloadCsv } from '@/shared/lib/csv';
import {
  EXPENSE_CATEGORY_LABELS,
  PAYMENT_MODE_LABELS,
  formatCurrency,
  formatDate,
  monthStartISO,
  shiftISODate,
  toISODate,
  todayISO,
} from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/shared/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { PageHeader } from '@/shared/components/PageHeader';
import { PageLoader } from '@/shared/components/PageLoader';
import { EmptyState, ErrorState } from '@/shared/components/States';
import { RowActions, Toolbar } from '@/shared/components/Toolbar';
import { useConfirm } from '@/shared/components/ConfirmDialog';
import { ExpenseFormSheet } from '@/features/expenses/components/MoneyFormSheets';

const RANGES = () => {
  const d = new Date();
  const today = todayISO();
  return {
    'this-month': { label: 'This month', from: monthStartISO(), to: today },
    'last-month': {
      label: 'Last month',
      from: toISODate(new Date(d.getFullYear(), d.getMonth() - 1, 1)),
      to: toISODate(new Date(d.getFullYear(), d.getMonth(), 0)),
    },
    '90d': { label: 'Last 90 days', from: shiftISODate(today, -89), to: today },
    year: { label: 'This year', from: `${d.getFullYear()}-01-01`, to: today },
    all: { label: 'All time' },
  };
};

const CATEGORIES = Object.entries(EXPENSE_CATEGORY_LABELS).filter(([k]) => k !== 'labour');

export default function Expenses() {
  const confirm = useConfirm();
  const ranges = useMemo(RANGES, []);
  const [rangeKey, setRangeKey] = useState('this-month');
  const [siteId, setSiteId] = useState('all');
  const [category, setCategory] = useState('all');
  const [sheet, setSheet] = useState({ open: false, expense: null });

  const range = ranges[rangeKey];
  const { data: sites } = useApi(() => sitesApi.getAll(), [], { cacheKey: 'sites' });
  const { data, error, loading, refreshing, reload } = useApi(
    () =>
      expensesApi.getAll({
        from: range.from,
        to: range.to,
        siteId: siteId === 'all' ? undefined : siteId,
        category: category === 'all' ? undefined : category,
      }),
    [rangeKey, siteId, category],
    { cacheKey: `expenses:${rangeKey}:${siteId}:${category}` }
  );

  const expenses = useMemo(() => data || [], [data]);
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const byCategory = useMemo(() => {
    const m = new Map();
    expenses.forEach((e) => m.set(e.category, (m.get(e.category) || 0) + e.amount));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [expenses]);

  const remove = async (e) => {
    const ok = await confirm({
      title: 'Delete this expense?',
      description: `${formatCurrency(e.amount)} · ${EXPENSE_CATEGORY_LABELS[e.category]} on ${formatDate(e.date)}`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      await expensesApi.delete(e._id);
      toast.success('Expense deleted');
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const exportCsv = () =>
    downloadCsv(`expenses_${range.from || 'all'}_${range.to || 'time'}.csv`, [
      { label: 'Date', value: (e) => toISODate(e.date) },
      { label: 'Site', value: (e) => e.siteId?.name || 'General' },
      { label: 'Category', value: (e) => EXPENSE_CATEGORY_LABELS[e.category] },
      { label: 'Vendor', value: (e) => e.vendor || '' },
      { label: 'Description', value: (e) => e.description || '' },
      { label: 'Paid by', value: (e) => PAYMENT_MODE_LABELS[e.paymentMode] },
      { label: 'Amount', value: (e) => e.amount },
    ], expenses);

  if (loading && !data) return <PageLoader title="Expenses" description="Materials, transport and other costs" />;
  if (error && !data) return <ErrorState error={error} onRetry={reload} />;

  const actions = (e) => (
    <RowActions>
      <DropdownMenuItem onSelect={() => setSheet({ open: true, expense: e })}><Pencil /> Edit</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem destructive onSelect={() => remove(e)}><Trash2 /> Delete</DropdownMenuItem>
    </RowActions>
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Expenses"
        description="Materials, transport, tools and other costs — per site or general"
        actions={
          <>
            {expenses.length > 0 && <Button variant="outline" size="sm" onClick={exportCsv}>Export CSV</Button>}
            <Button size="sm" onClick={() => setSheet({ open: true, expense: null })}><Plus /> Add expense</Button>
          </>
        }
      />

      <Toolbar>
        <Select value={rangeKey} onValueChange={setRangeKey}>
          <SelectTrigger className="sm:w-40" aria-label="Period"><SelectValue /></SelectTrigger>
          <SelectContent>
            {Object.entries(ranges).map(([k, r]) => <SelectItem key={k} value={k}>{r.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={siteId} onValueChange={setSiteId}>
          <SelectTrigger className="sm:w-56" aria-label="Site"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sites</SelectItem>
            <SelectItem value="general">General (no site)</SelectItem>
            {(sites || []).map((s) => <SelectItem key={s._id} value={s._id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="sm:w-44" aria-label="Category"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {CATEGORIES.map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
      </Toolbar>

      <div className={cn('space-y-4', refreshing && 'opacity-60')}>
        <Card className="p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total · {range.label}</p>
              <p className="text-2xl font-semibold">{formatCurrency(total)}</p>
              <p className="text-xs text-muted-foreground">{expenses.length} entries</p>
            </div>
            {byCategory.length > 0 && (
              <div className="w-full space-y-1.5 sm:w-80">
                {byCategory.map(([cat, amount]) => (
                  <div key={cat} className="flex items-center gap-2 text-xs">
                    <span className="w-28 shrink-0 text-muted-foreground">{EXPENSE_CATEGORY_LABELS[cat]}</span>
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-blue-100">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${(amount / total) * 100}%` }} />
                    </div>
                    <span className="w-20 text-right font-medium tabular-nums">{formatCurrency(amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {expenses.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No expenses in this view"
            description="Record material purchases, transport and other costs to see true site profit."
            action={<Button size="sm" onClick={() => setSheet({ open: true, expense: null })}><Plus /> Add expense</Button>}
          />
        ) : (
          <>
            <Card className="hidden overflow-hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Site</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>Paid by</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((e) => (
                    <TableRow key={e._id}>
                      <TableCell className="whitespace-nowrap">{formatDate(e.date)}</TableCell>
                      <TableCell>
                        {e.siteId ? (
                          <Link to={`/sites/${e.siteId._id}?tab=finance`} className="hover:underline">{e.siteId.name}</Link>
                        ) : (
                          <span className="text-muted-foreground">General</span>
                        )}
                      </TableCell>
                      <TableCell>{EXPENSE_CATEGORY_LABELS[e.category]}</TableCell>
                      <TableCell className="max-w-xs">
                        <p className="truncate">{e.description || '—'}</p>
                        {e.vendor && <p className="truncate text-xs text-muted-foreground">{e.vendor}</p>}
                      </TableCell>
                      <TableCell>{PAYMENT_MODE_LABELS[e.paymentMode]}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(e.amount)}</TableCell>
                      <TableCell>{actions(e)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
            <div className="grid gap-3 sm:grid-cols-2 md:hidden">
              {expenses.map((e) => (
                <Card key={e._id} className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium">{EXPENSE_CATEGORY_LABELS[e.category]} · {formatCurrency(e.amount)}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatDate(e.date)} · {e.siteId?.name || 'General'}
                      </p>
                      {(e.description || e.vendor) && (
                        <p className="mt-1 truncate text-xs text-muted-foreground">{[e.description, e.vendor].filter(Boolean).join(' · ')}</p>
                      )}
                    </div>
                    {actions(e)}
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      <ExpenseFormSheet
        open={sheet.open}
        onOpenChange={(open) => setSheet((s) => ({ ...s, open }))}
        expense={sheet.expense}
        sites={(sites || []).filter((s) => s.status !== 'completed' || s._id === sheet.expense?.siteId?._id)}
        onSaved={reload}
      />
    </div>
  );
}
