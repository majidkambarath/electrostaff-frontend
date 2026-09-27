import { useState } from 'react';
import { toast } from 'sonner';
import { Banknote, Pencil, Plus, Receipt, Trash2, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import { api } from '@/api/api';
import { useApi } from '@/hooks/useApi';
import { cn } from '@/lib/utils';
import { EXPENSE_CATEGORY_LABELS, PAYMENT_MODE_LABELS, RECEIPT_MODE_LABELS, formatCurrency, formatDate } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { StatTile } from '@/components/shared/StatTile';
import { EmptyState, ErrorState } from '@/components/shared/States';
import { RowActions } from '@/components/shared/Toolbar';
import { useConfirm } from '@/components/shared/ConfirmDialog';
import { ExpenseFormSheet, ReceiptFormSheet } from '@/components/forms/MoneyFormSheets';

// Contract, client receipts, expenses and labour for one site, with profit.
export function SiteFinance({ site, onEditSite }) {
  const confirm = useConfirm();
  const { data, error, loading, reload } = useApi(() => api.sites.finance(site._id), [site._id, site.contractValue], {
    cacheKey: `finance:${site._id}`,
  });
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [expenseSheet, setExpenseSheet] = useState({ open: false, expense: null });

  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-18.5" />)}
      </div>
    );
  }
  if (error && !data) return <ErrorState error={error} onRetry={reload} />;

  const { summary, costBreakdown, receipts, expenses, personDays } = data;
  const profitable = summary.profit >= 0;
  const maxCost = Math.max(1, ...costBreakdown.map((c) => c.amount));

  const removeReceipt = async (r) => {
    const ok = await confirm({ title: 'Delete this client payment?', description: `${formatCurrency(r.amount)} on ${formatDate(r.date)}`, confirmLabel: 'Delete', destructive: true });
    if (!ok) return;
    try {
      await api.receipts.delete(r._id);
      toast.success('Client payment deleted');
      reload();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const removeExpense = async (e) => {
    const ok = await confirm({ title: 'Delete this expense?', description: `${formatCurrency(e.amount)} · ${EXPENSE_CATEGORY_LABELS[e.category]}`, confirmLabel: 'Delete', destructive: true });
    if (!ok) return;
    try {
      await api.expenses.delete(e._id);
      toast.success('Expense deleted');
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <div className="space-y-4">
      {summary.contractValue === 0 && (
        <div className="flex flex-col gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800 sm:flex-row sm:items-center sm:justify-between">
          <span>Set the contract value to track what the client still owes and your expected profit.</span>
          <Button size="sm" variant="outline" className="bg-white" onClick={onEditSite}><Pencil /> Set contract value</Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          label="Contract value"
          value={formatCurrency(summary.contractValue)}
          hint={summary.contractValue ? `${formatCurrency(summary.due)} still due from client` : 'Not set'}
          icon={Banknote}
          tone={summary.due > 0 ? 'warning' : 'default'}
        />
        <StatTile label="Received from client" value={formatCurrency(summary.received)} hint={`${receipts.length} payments`} icon={Wallet} tone="primary" />
        <StatTile
          label="Total cost so far"
          value={formatCurrency(summary.totalCost)}
          hint={`Labour ${formatCurrency(summary.labourCost)} · other ${formatCurrency(summary.expenses)}`}
          icon={Receipt}
        />
        <StatTile
          label={summary.contractValue ? 'Expected profit' : 'Profit on received'}
          value={formatCurrency(summary.profit)}
          hint={summary.margin !== null ? `${summary.margin}% margin` : 'Add contract value or receipts'}
          icon={profitable ? TrendingUp : TrendingDown}
          tone={profitable ? 'success' : 'danger'}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Where the money went</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {costBreakdown.every((c) => c.amount === 0) ? (
              <p className="text-sm text-muted-foreground">No costs yet.</p>
            ) : (
              costBreakdown
                .filter((c) => c.amount > 0)
                .map((c) => (
                  <div key={c.category} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>
                        {EXPENSE_CATEGORY_LABELS[c.category] || c.category}
                        {c.category === 'labour' && <span className="text-xs text-muted-foreground"> · {personDays} person-days</span>}
                      </span>
                      <span className="font-medium tabular-nums">{formatCurrency(c.amount)}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-blue-100">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${(c.amount / maxCost) * 100}%` }} />
                    </div>
                  </div>
                ))
            )}
            {summary.contractValue > 0 && (
              <div className="border-t border-border pt-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contract used</span>
                  <span className={cn('font-medium', summary.totalCost > summary.contractValue && 'text-red-600')}>
                    {Math.round((summary.totalCost / summary.contractValue) * 100)}%
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Client payments</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setReceiptOpen(true)}><Plus /> Record</Button>
          </CardHeader>
          {receipts.length === 0 ? (
            <CardContent>
              <EmptyState compact icon={Wallet} title="No payments received yet" />
            </CardContent>
          ) : (
            <ul className="divide-y divide-border">
              {receipts.map((r) => (
                <li key={r._id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{formatCurrency(r.amount)}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatDate(r.date)} · {RECEIPT_MODE_LABELS[r.paymentMode]}
                      {r.reference && ` · ${r.reference}`}
                      {r.note && ` · ${r.note}`}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon-sm" aria-label="Delete client payment" onClick={() => removeReceipt(r)}>
                    <Trash2 />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Expenses</CardTitle>
            <Button size="sm" variant="outline" onClick={() => setExpenseSheet({ open: true, expense: null })}><Plus /> Add</Button>
          </CardHeader>
          {expenses.length === 0 ? (
            <CardContent>
              <EmptyState compact icon={Receipt} title="No expenses recorded" />
            </CardContent>
          ) : (
            <ul className="max-h-96 divide-y divide-border overflow-y-auto">
              {expenses.map((e) => (
                <li key={e._id} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {formatCurrency(e.amount)} <span className="font-normal text-muted-foreground">· {EXPENSE_CATEGORY_LABELS[e.category]}</span>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {formatDate(e.date)} · {PAYMENT_MODE_LABELS[e.paymentMode]}
                      {e.vendor && ` · ${e.vendor}`}
                      {e.description && ` · ${e.description}`}
                    </p>
                  </div>
                  <RowActions>
                    <DropdownMenuItem onSelect={() => setExpenseSheet({ open: true, expense: e })}><Pencil /> Edit</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem destructive onSelect={() => removeExpense(e)}><Trash2 /> Delete</DropdownMenuItem>
                  </RowActions>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <ReceiptFormSheet open={receiptOpen} onOpenChange={setReceiptOpen} site={site} due={summary.due} onSaved={reload} />
      <ExpenseFormSheet
        open={expenseSheet.open}
        onOpenChange={(open) => setExpenseSheet((s) => ({ ...s, open }))}
        expense={expenseSheet.expense}
        site={site}
        onSaved={reload}
      />
    </div>
  );
}
