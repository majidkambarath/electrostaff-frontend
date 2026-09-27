import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { HandCoins, Plus, Trash2 } from 'lucide-react';
import { advancesApi } from '@/features/advances/api';
import { staffApi } from '@/features/staff/api';
import { useApi } from '@/shared/hooks/useApi';
import { PAYMENT_MODE_LABELS, formatCurrency, formatDate } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { PageHeader } from '@/shared/components/PageHeader';
import { PageLoader } from '@/shared/components/PageLoader';
import { StatTile } from '@/shared/components/StatTile';
import { Avatar } from '@/shared/components/Avatar';
import { EmptyState, ErrorState } from '@/shared/components/States';
import { SearchInput } from '@/shared/components/Toolbar';
import { useConfirm } from '@/shared/components/ConfirmDialog';
import { AdvanceFormSheet } from '@/features/advances/components/AdvanceFormSheet';

export default function Advances() {
  const confirm = useConfirm();
  const { data, error, loading, reload } = useApi(
    () =>
      Promise.all([advancesApi.balances(), advancesApi.getAll(), staffApi.getAll({ status: 'active' })]).then(
        ([balances, advances, staff]) => ({ balances, advances, staff })
      ),
    [],
    { cacheKey: 'advances' }
  );
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filteredAdvances = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (data?.advances || []).filter((a) => !q || a.staffId?.name?.toLowerCase().includes(q));
  }, [data, query]);

  if (loading) return <PageLoader title="Advances" description="Money given ahead of wages" tiles={3} />;
  if (error && !data) return <ErrorState error={error} onRetry={reload} />;

  const { balances, staff } = data;
  const outstanding = balances.filter((b) => b.balance > 0);
  const totals = balances.reduce(
    (acc, b) => ({ given: acc.given + b.given, recovered: acc.recovered + b.recovered, balance: acc.balance + Math.max(0, b.balance) }),
    { given: 0, recovered: 0, balance: 0 }
  );

  const handleDelete = async (a) => {
    const ok = await confirm({
      title: 'Delete this advance?',
      description: `${formatCurrency(a.amount)} given to ${a.staffId?.name} on ${formatDate(a.date)}.`,
      confirmLabel: 'Delete',
      destructive: true,
    });
    if (!ok) return;
    try {
      await advancesApi.delete(a._id);
      toast.success('Advance deleted');
      reload();
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Advances"
        description="Money given to staff ahead of wages, recovered from their payments"
        actions={<Button size="sm" onClick={() => setOpen(true)}><Plus /> Give advance</Button>}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatTile label="Outstanding" value={formatCurrency(totals.balance)} hint={`${outstanding.length} staff`} icon={HandCoins} tone={totals.balance ? 'warning' : 'default'} />
        <StatTile label="Total given" value={formatCurrency(totals.given)} />
        <StatTile label="Recovered" value={formatCurrency(totals.recovered)} className="col-span-2 lg:col-span-1" />
      </div>

      <Tabs defaultValue="balances">
        <TabsList>
          <TabsTrigger value="balances">Balances ({outstanding.length})</TabsTrigger>
          <TabsTrigger value="all">All advances ({data.advances.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="balances">
          {outstanding.length === 0 ? (
            <EmptyState icon={HandCoins} title="No outstanding advances" description="Advances you give will appear here until they are recovered from wages." />
          ) : (
            <Card className="divide-y divide-border overflow-hidden">
              {outstanding.map((b) => (
                <div key={b.staff._id} className="flex items-center gap-3 px-4 py-3">
                  <Avatar name={b.staff.name} />
                  <Link to={`/staff/${b.staff._id}`} className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium hover:underline">{b.staff.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Given {formatCurrency(b.given)} · recovered {formatCurrency(b.recovered)}
                      {b.lastDate && ` · last ${formatDate(b.lastDate)}`}
                    </p>
                  </Link>
                  <div className="text-right">
                    <p className="text-sm font-semibold tabular-nums">{formatCurrency(b.balance)}</p>
                    <Link to={`/payments?staff=${b.staff._id}`} className="tap text-xs font-medium text-primary hover:underline">
                      Recover in payment
                    </Link>
                  </div>
                </div>
              ))}
            </Card>
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-3">
          <SearchInput value={query} onChange={setQuery} placeholder="Search staff…" />
          {filteredAdvances.length === 0 ? (
            <EmptyState compact icon={HandCoins} title="No advances found" />
          ) : (
            <Card className="overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Staff</TableHead>
                    <TableHead className="hidden sm:table-cell">Mode</TableHead>
                    <TableHead className="hidden md:table-cell">Note</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAdvances.map((a) => (
                    <TableRow key={a._id}>
                      <TableCell className="whitespace-nowrap">{formatDate(a.date)}</TableCell>
                      <TableCell className="font-medium">{a.staffId?.name}</TableCell>
                      <TableCell className="hidden sm:table-cell">{PAYMENT_MODE_LABELS[a.paymentMode]}</TableCell>
                      <TableCell className="hidden max-w-xs truncate text-muted-foreground md:table-cell">{a.note || '—'}</TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(a.amount)}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon-sm" aria-label="Delete advance" onClick={() => handleDelete(a)}>
                          <Trash2 />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <AdvanceFormSheet open={open} onOpenChange={setOpen} staffList={staff} onSaved={reload} />
    </div>
  );
}
