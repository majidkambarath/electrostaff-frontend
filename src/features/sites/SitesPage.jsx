import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Archive, Building2, ClipboardCheck, Eye, Pencil, Plus, Users } from 'lucide-react';
import { sitesApi } from '@/features/sites/api';
import { useApi } from '@/shared/hooks/useApi';
import { cn } from '@/shared/lib/utils';
import { formatCurrency } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/shared/ui/dropdown-menu';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { PageHeader } from '@/shared/components/PageHeader';
import { PageLoader } from '@/shared/components/PageLoader';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { EmptyState, ErrorState } from '@/shared/components/States';
import { FilterTabs, RowActions, SearchInput, Toolbar } from '@/shared/components/Toolbar';
import { useConfirm } from '@/shared/components/ConfirmDialog';
import { SiteFormSheet } from '@/features/sites/components/SiteFormSheet';

function TodayProgress({ site }) {
  if (site.status !== 'active' || site.staffCount === 0) return <span className="text-muted-foreground">—</span>;
  const done = site.markedToday >= site.staffCount;
  return (
    <span className={cn('text-sm tabular-nums', done ? 'text-emerald-700' : 'text-amber-700')}>
      {site.markedToday}/{site.staffCount} marked
    </span>
  );
}

export default function Sites() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { data: sites, error, loading, reload } = useApi(() => sitesApi.getAll(), [], { cacheKey: 'sites' });
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('active');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const counts = useMemo(() => {
    const c = { all: 0, active: 0, onhold: 0, completed: 0 };
    (sites || []).forEach((s) => {
      c.all += 1;
      c[s.status] += 1;
    });
    return c;
  }, [sites]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (sites || []).filter(
      (s) =>
        (status === 'all' || s.status === status) &&
        (!q || [s.name, s.clientName, s.address].some((v) => v?.toLowerCase().includes(q)))
    );
  }, [sites, query, status]);

  const openForm = (site = null) => {
    setEditing(site);
    setFormOpen(true);
  };

  const handleArchive = async (site) => {
    const ok = await confirm({
      title: `Remove ${site.name}?`,
      description:
        'If attendance has been recorded here the site is kept as Completed for your records; otherwise it is deleted.',
      confirmLabel: 'Remove site',
      destructive: true,
    });
    if (!ok) return;
    try {
      const res = await sitesApi.delete(site._id);
      toast.success(res.message);
      reload();
    } catch (e) {
      toast.error(e.message);
    }
  };

  if (loading) return <PageLoader title="Sites" description="Job sites and projects" />;
  if (error && !sites) return <ErrorState error={error} onRetry={reload} />;

  const actions = (site) => (
    <RowActions>
      <DropdownMenuItem onSelect={() => navigate(`/sites/${site._id}`)}><Eye /> Open</DropdownMenuItem>
      {site.status === 'active' && (
        <DropdownMenuItem onSelect={() => navigate(`/attendance?site=${site._id}`)}>
          <ClipboardCheck /> Mark attendance
        </DropdownMenuItem>
      )}
      <DropdownMenuItem onSelect={() => openForm(site)}><Pencil /> Edit</DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem destructive onSelect={() => handleArchive(site)}><Archive /> Remove</DropdownMenuItem>
    </RowActions>
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Sites"
        description="Job sites, their teams and today’s attendance"
        actions={
          <Button size="sm" onClick={() => openForm()}>
            <Plus /> New site
          </Button>
        }
      />

      <Toolbar>
        <SearchInput value={query} onChange={setQuery} placeholder="Search site, client, address…" />
        <FilterTabs
          value={status}
          onChange={setStatus}
          options={[
            { value: 'active', label: 'Active', count: counts.active },
            { value: 'onhold', label: 'On hold', count: counts.onhold },
            { value: 'completed', label: 'Completed', count: counts.completed },
            { value: 'all', label: 'All', count: counts.all },
          ]}
        />
      </Toolbar>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={sites.length === 0 ? 'No sites yet' : 'No sites match'}
          description={
            sites.length === 0
              ? 'Create a site for each job or project, then assign staff to it.'
              : 'Try a different search or status filter.'
          }
          action={sites.length === 0 && <Button size="sm" onClick={() => openForm()}><Plus /> New site</Button>}
        />
      ) : (
        <>
          <Card className="hidden overflow-hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Site</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Team</TableHead>
                  <TableHead>Today</TableHead>
                  <TableHead className="text-right">Cost so far</TableHead>
                  <TableHead className="text-right">Profit</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((site) => (
                  <TableRow key={site._id} className="cursor-pointer" onClick={() => navigate(`/sites/${site._id}`)}>
                    <TableCell>
                      <p className="font-medium">{site.name}</p>
                      <p className="text-xs text-muted-foreground">{[site.clientName, site.address].filter(Boolean).join(' · ') || '—'}</p>
                    </TableCell>
                    <TableCell><StatusBadge status={site.status} /></TableCell>
                    <TableCell className="text-right">{site.staffCount}</TableCell>
                    <TableCell><TodayProgress site={site} /></TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(site.finance.totalCost)}
                      {site.finance.due > 0 && <p className="text-xs text-amber-700">{formatCurrency(site.finance.due)} due</p>}
                    </TableCell>
                    <TableCell className={cn('text-right font-medium', site.finance.profit < 0 ? 'text-red-600' : 'text-emerald-700')}>
                      {site.finance.contractValue || site.finance.received ? formatCurrency(site.finance.profit) : <span className="font-normal text-muted-foreground">—</span>}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>{actions(site)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2 md:hidden">
            {filtered.map((site) => (
              <Card key={site._id} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <Link to={`/sites/${site._id}`} className="min-w-0">
                    <p className="truncate font-medium">{site.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{site.clientName || 'No client'}</p>
                  </Link>
                  <div className="flex items-center gap-1">
                    <StatusBadge status={site.status} />
                    {actions(site)}
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Users className="h-3.5 w-3.5" /> {site.staffCount} staff
                  </span>
                  <TodayProgress site={site} />
                </div>
                <div className="mt-2 flex items-center justify-between border-t border-border pt-2 text-xs">
                  <span className="text-muted-foreground">Cost {formatCurrency(site.finance.totalCost)}</span>
                  {(site.finance.contractValue > 0 || site.finance.received > 0) && (
                    <span className={cn('font-medium', site.finance.profit < 0 ? 'text-red-600' : 'text-emerald-700')}>
                      Profit {formatCurrency(site.finance.profit)}
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <SiteFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        site={editing}
        onSaved={(saved) => (editing ? reload() : navigate(`/sites/${saved._id}`))}
      />
    </div>
  );
}
