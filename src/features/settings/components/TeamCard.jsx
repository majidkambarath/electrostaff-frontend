import { useState } from 'react';
import { toast } from 'sonner';
import { KeyRound, MessageCircle, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { teamApi } from '@/features/settings/api';
import { sitesApi } from '@/features/sites/api';
import { useAuth, useOrg } from '@/features/auth/AuthContext';
import { useApi } from '@/shared/hooks/useApi';
import { formatDate, whatsappUrl } from '@/shared/lib/format';
import { Button, buttonVariants } from '@/shared/ui/button';
import { Badge } from '@/shared/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Checkbox } from '@/shared/ui/checkbox';
import { Input } from '@/shared/ui/input';
import { PhoneInput } from '@/shared/ui/number-inputs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { DropdownMenuItem, DropdownMenuSeparator } from '@/shared/ui/dropdown-menu';
import { Field } from '@/shared/components/Field';
import { RowActions } from '@/shared/components/Toolbar';
import { ErrorState } from '@/shared/components/States';
import { useConfirm } from '@/shared/components/ConfirmDialog';

const ROLE_INFO = {
  owner: { label: 'Owner', variant: 'default' },
  admin: { label: 'Admin', variant: 'info', hint: 'Everything except managing the team' },
  supervisor: { label: 'Supervisor', variant: 'secondary', hint: 'Marks attendance for their sites only' },
};

const loginMessage = ({ name, phone, password, role }, business) =>
  [
    `Hello ${name.split(' ')[0]} 👋`,
    `You're added to *${business}* on ElectroStaff as ${ROLE_INFO[role]?.label.toLowerCase() || role}.`,
    '',
    `🔗 App: ${window.location.origin}`,
    `📱 Mobile: *${phone}*`,
    `🔑 Password: *${password}*`,
    '',
    'Sign in, then set your own password.',
  ].join('\n');

function MemberDialog({ open, onOpenChange, member, sites, onSaved }) {
  const editing = Boolean(member);
  const [form, setForm] = useState(() => ({
    name: member?.name || '',
    phone: member?.phone || '',
    role: member?.role || 'supervisor',
    siteIds: member?.siteIds || [],
  }));
  const [busy, setBusy] = useState(false);
  const toggleSite = (id) =>
    setForm((f) => ({ ...f, siteIds: f.siteIds.includes(id) ? f.siteIds.filter((x) => x !== id) : [...f.siteIds, id] }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = { name: form.name, role: form.role, siteIds: form.role === 'supervisor' ? form.siteIds : [] };
      const result = editing ? await teamApi.update(member._id, payload) : await teamApi.create({ ...payload, phone: form.phone });
      toast.success(editing ? 'Access updated' : `${form.name} added`);
      onSaved(result);
      onOpenChange(false);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit ${member.name}` : 'Add to office team'}</DialogTitle>
            <DialogDescription>They sign in with their own mobile number. Changes sign them out so new access applies.</DialogDescription>
          </DialogHeader>
          <Field label="Name" htmlFor="tm-name" required>
            <Input id="tm-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
          </Field>
          {!editing && (
            <Field label="Mobile number" htmlFor="tm-phone" required hint="Their sign-in number">
              <PhoneInput id="tm-phone" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} required />
            </Field>
          )}
          <Field label="Access">
            <div className="grid gap-2">
              {['supervisor', 'admin'].map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, role }))}
                  className={`tap rounded-md border p-3 text-left ${form.role === role ? 'border-primary bg-primary/5' : 'border-border'}`}
                >
                  <span className="block text-sm font-medium">{ROLE_INFO[role].label}</span>
                  <span className="block text-xs text-muted-foreground">{ROLE_INFO[role].hint}</span>
                </button>
              ))}
            </div>
          </Field>
          {form.role === 'supervisor' && (
            <Field label="Sites they manage" required>
              {sites.length === 0 ? (
                <p className="text-sm text-muted-foreground">Add a site first.</p>
              ) : (
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-md border border-border p-2">
                  {sites.map((s) => (
                    <label key={s._id} className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1.5 text-sm hover:bg-muted">
                      <Checkbox checked={form.siteIds.includes(s._id)} onCheckedChange={() => toggleSite(s._id)} />
                      <span className="min-w-0 truncate">{s.name}</span>
                      {s.status !== 'active' && <span className="text-xs text-muted-foreground">({s.status})</span>}
                    </label>
                  ))}
                </div>
              )}
            </Field>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save' : 'Add & create login'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function PasswordDialog({ shared, onOpenChange, business }) {
  if (!shared) return null;
  const message = loginMessage({ ...shared.member, password: shared.password }, business);
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Login for {shared.member.name}</DialogTitle>
          <DialogDescription>Shown only once. They must set their own password when they sign in.</DialogDescription>
        </DialogHeader>
        <dl className="space-y-2 rounded-lg border border-border bg-muted/40 p-3 text-sm">
          <div className="flex justify-between"><dt className="text-muted-foreground">Mobile</dt><dd className="font-medium tabular-nums">{shared.member.phone}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Password</dt><dd className="font-mono font-semibold">{shared.password}</dd></div>
        </dl>
        <DialogFooter>
          <a className={buttonVariants()} href={whatsappUrl(shared.member.phone, message)} target="_blank" rel="noreferrer">
            <MessageCircle /> Send on WhatsApp
          </a>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Settings card: the owner manages who else can sign in to the office side.
export function TeamCard() {
  const { principal } = useAuth();
  const { org } = useOrg();
  const isOwner = principal.role === 'owner';
  const confirm = useConfirm();
  const { data, error, loading, reload } = useApi(() => Promise.all([teamApi.list(), sitesApi.getAll()]), [], { cacheKey: 'team' });
  const [editing, setEditing] = useState(undefined); // undefined = closed, null = new, member = edit
  const [shared, setShared] = useState(null);
  const [members, sites] = data || [[], []];
  const siteName = (id) => sites.find((s) => s._id === id)?.name || 'Removed site';

  const reset = async (m) => {
    if (!(await confirm({ title: `New password for ${m.name}?`, description: 'Their current password stops working and they are signed out.', confirmLabel: 'Reset password' }))) return;
    try {
      setShared(await teamApi.resetPassword(m._id));
    } catch (err) {
      toast.error(err.message);
    }
  };
  const remove = async (m) => {
    if (!(await confirm({ title: `Remove ${m.name}?`, description: 'They can no longer sign in. Nothing else is deleted.', confirmLabel: 'Remove', destructive: true }))) return;
    try {
      await teamApi.remove(m._id);
      toast.success(`${m.name} removed`);
      reload();
    } catch (err) {
      toast.error(err.message);
    }
  };

  return (
    <Card className="max-w-2xl">
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2"><Users className="h-4 w-4" /> Office team</CardTitle>
          <CardDescription>Admins run the office with you. Supervisors mark attendance for their sites only.</CardDescription>
        </div>
        {isOwner && <Button size="sm" onClick={() => setEditing(null)}><Plus /> Add</Button>}
      </CardHeader>
      <CardContent>
        {error && !data && <ErrorState error={error} onRetry={reload} />}
        {loading && !data && <p className="text-sm text-muted-foreground">Loading…</p>}
        {data && (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {members.map((m) => (
              <li key={m._id} className="flex items-start justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0 text-sm">
                  <p className="flex flex-wrap items-center gap-2 font-medium">
                    {m.name}
                    <Badge variant={ROLE_INFO[m.role]?.variant}>{ROLE_INFO[m.role]?.label || m.role}</Badge>
                    {m.invited && <Badge variant="warning">Not signed in yet</Badge>}
                  </p>
                  <p className="text-xs text-muted-foreground tabular-nums">
                    {m.phone} · {m.lastLoginAt ? `last in ${formatDate(m.lastLoginAt)}` : 'never signed in'}
                  </p>
                  {m.role === 'supervisor' && <p className="mt-0.5 text-xs text-muted-foreground">Sites: {m.siteIds.map(siteName).join(', ')}</p>}
                </div>
                {isOwner && m.role !== 'owner' && (
                  <RowActions label={`Actions for ${m.name}`}>
                    <DropdownMenuItem onSelect={() => setEditing(m)}><Pencil /> Change access</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => reset(m)}><KeyRound /> Reset password</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => remove(m)} className="text-red-600"><Trash2 /> Remove</DropdownMenuItem>
                  </RowActions>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      {editing !== undefined && (
        <MemberDialog
          key={editing?._id || 'new'}
          open
          onOpenChange={(o) => !o && setEditing(undefined)}
          member={editing}
          sites={sites}
          onSaved={(result) => {
            reload();
            if (result.password) setShared(result);
          }}
        />
      )}
      <PasswordDialog shared={shared} onOpenChange={(o) => !o && setShared(null)} business={org?.name || 'ElectroStaff'} />
    </Card>
  );
}
