import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { CreditCard, Eye, Pencil, Phone, Plus, Trash2, UserCheck, Users } from 'lucide-react';
import { api } from '@/api/api';
import { useApi } from '@/hooks/useApi';
import { formatCurrency, formatDate, ROLE_LABELS } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PageHeader } from '@/components/shared/PageHeader';
import { PageLoader } from '@/components/shared/PageLoader';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Avatar } from '@/components/shared/Avatar';
import { EmptyState, ErrorState } from '@/components/shared/States';
import { FilterTabs, RowActions, SearchInput, Toolbar } from '@/components/shared/Toolbar';
import { useConfirm } from '@/components/shared/ConfirmDialog';
import { StaffFormSheet } from '@/components/forms/StaffFormSheet';

export default function Staff() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { data: staff, error, loading, reload } = useApi(() => api.staff.getAll(), [], { cacheKey: 'staff' });
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('active');
  const [role, setRole] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const counts = useMemo(() => {
    const c = { all: 0, active: 0, 'on-leave': 0, inactive: 0 };
    (staff || []).forEach((s) => {
      c.all += 1;
      c[s.status] = (c[s.status] || 0) + 1;
    });
    return c;
  }, [staff]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (staff || []).filter(
      (s) =>
        (status === 'all' || s.status === status) &&
        (role === 'all' || s.role === role) &&
        (!q || s.name.toLowerCase().includes(q) || s.phone?.includes(q))
    );
  }, [staff, query, status, role]);

  const openForm = (s = null) => {
    setEditing(s);
    setFormOpen(true);
  };

  const setActive = async (s) => {
    try {
      await api.staff.update(s._id, { status: 'active' });
      toast.success(`${s.name} is active again`);
      reload();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const handleRemove = async (s) => {
    const ok = await confirm({
      title: `Remove ${s.name}?`,
      description:
        'Staff with attendance, payments or advances are kept as Inactive so their wage history stays correct. Staff with no history are deleted.',
      confirmLabel: 'Remove',
      destructive: true,
    });
    if (!ok) return;
    try {
      const res = await api.staff.delete(s._id);
      toast.success(res.message);
      reload();
    } catch (e) {
      toast.error(e.message);
    }
  };

  if (loading) return <PageLoader title="Staff" description="Your team and their daily wages" />;
  if (error && !staff) return <ErrorState error={error} onRetry={reload} />;

  const actions = (s) => (
    <RowActions>
      <DropdownMenuItem onSelect={() => navigate(`/staff/${s._id}`)}><Eye /> View profile</DropdownMenuItem>
      <DropdownMenuItem onSelect={() => openForm(s)}><Pencil /> Edit</DropdownMenuItem>
      <DropdownMenuItem onSelect={() => navigate(`/payments?staff=${s._id}`)}><CreditCard /> Pay wages</DropdownMenuItem>
      {s.phone && (
        <DropdownMenuItem onSelect={() => { window.location.href = `tel:${s.phone}`; }}>
          <Phone /> Call
        </DropdownMenuItem>
      )}
      <DropdownMenuSeparator />
      {s.status === 'inactive' ? (
        <DropdownMenuItem onSelect={() => setActive(s)}><UserCheck /> Reactivate</DropdownMenuItem>
      ) : (
        <DropdownMenuItem destructive onSelect={() => handleRemove(s)}><Trash2 /> Remove</DropdownMenuItem>
      )}
    </RowActions>
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="Staff"
        description="Your team, their roles and daily wages"
        actions={
          <Button size="sm" onClick={() => openForm()}>
            <Plus /> Register staff
          </Button>
        }
      />

      <Toolbar>
        <SearchInput value={query} onChange={setQuery} placeholder="Search name or phone…" />
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="sm:w-40" aria-label="Filter by role"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {Object.entries(ROLE_LABELS).map(([v, l]) => <SelectItem key={v} value={v}>{l}</SelectItem>)}
          </SelectContent>
        </Select>
        <FilterTabs
          value={status}
          onChange={setStatus}
          options={[
            { value: 'active', label: 'Active', count: counts.active },
            { value: 'on-leave', label: 'On leave', count: counts['on-leave'] },
            { value: 'inactive', label: 'Inactive', count: counts.inactive },
            { value: 'all', label: 'All', count: counts.all },
          ]}
        />
      </Toolbar>

      {filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title={staff.length === 0 ? 'No staff registered yet' : 'No staff match'}
          description={
            staff.length === 0
              ? 'Register your electricians and helpers with their daily wage to start tracking attendance and pay.'
              : 'Try a different search or filter.'
          }
          action={staff.length === 0 && <Button size="sm" onClick={() => openForm()}><Plus /> Register staff</Button>}
        />
      ) : (
        <>
          <Card className="hidden overflow-hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Daily wage</TableHead>
                  <TableHead className="text-right">Sites</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s._id} className="cursor-pointer" onClick={() => navigate(`/staff/${s._id}`)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar name={s.name} />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{s.name}</p>
                          <p className="text-xs text-muted-foreground">{s.phone}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{ROLE_LABELS[s.role] || s.role}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(s.dailyWage)}</TableCell>
                    <TableCell className="text-right">{s.siteCount}</TableCell>
                    <TableCell className="text-muted-foreground">{formatDate(s.joinDate)}</TableCell>
                    <TableCell><StatusBadge status={s.status} /></TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>{actions(s)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          <div className="grid gap-3 sm:grid-cols-2 md:hidden">
            {filtered.map((s) => (
              <Card key={s._id} className="p-3">
                <div className="flex items-start gap-3">
                  <Avatar name={s.name} />
                  <Link to={`/staff/${s._id}`} className="min-w-0 flex-1">
                    <p className="truncate font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {ROLE_LABELS[s.role]} · {s.phone}
                    </p>
                  </Link>
                  {actions(s)}
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="font-semibold">{formatCurrency(s.dailyWage)}<span className="font-normal text-muted-foreground">/day</span></span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{s.siteCount} sites</span>
                    <StatusBadge status={s.status} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}

      <StaffFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        staff={editing}
        onSaved={() => reload()}
      />
    </div>
  );
}
