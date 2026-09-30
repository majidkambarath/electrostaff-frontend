import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { CreditCard, Eye, FileUp, KeyRound, Pencil, Phone, Plus, Trash2, UserCheck, Users } from 'lucide-react';
import { staffApi } from '@/features/staff/api';
import { useApi } from '@/shared/hooks/useApi';
import { formatCurrency, formatDate, ROLE_LABELS } from '@/shared/lib/format';
import { Button } from '@/shared/ui/button';
import { Card } from '@/shared/ui/card';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/shared/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { PageHeader } from '@/shared/components/PageHeader';
import { PageLoader } from '@/shared/components/PageLoader';
import { StatusBadge } from '@/shared/components/StatusBadge';
import { Avatar } from '@/shared/components/Avatar';
import { EmptyState, ErrorState } from '@/shared/components/States';
import { FilterTabs, RowActions, SearchInput, Toolbar } from '@/shared/components/Toolbar';
import { useConfirm } from '@/shared/components/ConfirmDialog';
import { StaffFormSheet } from '@/features/staff/components/StaffFormSheet';
import { StaffAccessDialog } from '@/features/staff/components/StaffAccessDialog';
import { StaffImportDialog } from '@/features/staff/components/StaffImportDialog';
import { businessLabel, sendLoginOnWhatsApp } from '@/features/staff/loginShare';
import { useOrg } from '@/features/auth/AuthContext';

export default function Staff() {
  const navigate = useNavigate();
  const confirm = useConfirm();
  const { org } = useOrg();
  const { data: staff, error, loading, reload } = useApi(() => staffApi.getAll(), [], { cacheKey: 'staff' });
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('active');
  const [role, setRole] = useState('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [access, setAccess] = useState({ staff: null, credentials: null });
  const [importOpen, setImportOpen] = useState(false);

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
      await staffApi.update(s._id, { status: 'active' });
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
      const res = await staffApi.delete(s._id);
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
      {s.status !== 'inactive' && (
        <DropdownMenuItem onSelect={() => setAccess({ staff: s, credentials: null })}>
          <KeyRound /> {s.portalEnabled ? 'App login: reset / turn off' : 'Give app login'}
        </DropdownMenuItem>
      )}
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
          <>
            <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
              <FileUp /> Import
            </Button>
            <Button size="sm" onClick={() => openForm()}>
              <Plus /> Register staff
            </Button>
          </>
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
                    <TableCell>
                      <StatusBadge status={s.status} />
                    {s.portalEnabled && (
                        <span className="ml-1.5 inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-[11px] font-medium text-blue-700" title="Has staff app login">App</span>
                      )}
                      {s.portalEnabled && (
                        <span className="ml-1.5 inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-[11px] font-medium text-blue-700" title="Has staff app login">App</span>
                      )}
                    </TableCell>
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
                    {s.portalEnabled && (
                        <span className="ml-1.5 inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-[11px] font-medium text-blue-700" title="Has staff app login">App</span>
                      )}
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
        onSaved={(saved, credentials) => {
          reload();
          if (!credentials) return;
          setAccess({ staff: { ...saved, portalEnabled: true }, credentials });
          // Registration ends in the worker's WhatsApp chat with the login typed in.
          sendLoginOnWhatsApp({ ...credentials, name: credentials.name || saved.name }, businessLabel(org), { navigate: true });
        }}
      />
      <StaffImportDialog open={importOpen} onOpenChange={setImportOpen} onImported={reload} />
      <StaffAccessDialog
        staff={access.staff}
        open={Boolean(access.staff)}
        credentials={access.credentials}
        onOpenChange={(open) => !open && setAccess({ staff: null, credentials: null })}
        onChanged={reload}
      />
    </div>
  );
}
