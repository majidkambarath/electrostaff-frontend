import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Copy, KeyRound, MessageCircle, ShieldOff } from 'lucide-react';
import { staffApi } from '@/features/staff/api';
import { useOrg } from '@/features/auth/AuthContext';
import { whatsappUrl } from '@/shared/lib/format';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';
import { Field } from '@/shared/components/Field';
import { useConfirm } from '@/shared/components/ConfirmDialog';

const loginMessage = ({ name, phone, password }, business) =>
  [
    `Hello ${name.split(' ')[0]}, here is your ${business || 'ElectroStaff'} staff app login:`,
    '',
    `App: ${window.location.origin}`,
    `Mobile: ${phone}`,
    `Password: ${password}`,
    '',
    'Open the link, sign in, then set your own password. You can mark attendance, see payslips and apply for leave.',
  ].join('\n');

// Gives a worker a staff-app login (or resets it) and shares it once. `credentials` opens
// the dialog directly on the "share" step (e.g. right after registering with a login).
export function StaffAccessDialog({ staff, open, onOpenChange, credentials, onChanged }) {
  const confirm = useConfirm();
  const { org } = useOrg();
  const [mode, setMode] = useState('generate');
  const [password, setPassword] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMode('generate');
    setPassword('');
    setResult(credentials || null);
  }, [open, credentials]);

  if (!staff) return null;
  const business = org?.name && org.name !== 'Default Organization' ? org.name : 'ElectroStaff';

  const grant = async () => {
    setBusy(true);
    try {
      const creds = await staffApi.grantAccess(staff._id, mode === 'generate' ? { generate: true } : { password });
      setResult(creds);
      onChanged?.();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const revoke = async () => {
    const ok = await confirm({
      title: `Turn off app access for ${staff.name}?`,
      description: 'They will be signed out on every device and cannot sign in until you give access again.',
      confirmLabel: 'Turn off',
      destructive: true,
    });
    if (!ok) return;
    try {
      const res = await staffApi.revokeAccess(staff._id);
      toast.success(res.message);
      onOpenChange(false);
      onChanged?.();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(loginMessage(result, business));
      toast.success('Login details copied');
    } catch {
      toast.error('Copy failed — select and copy the details instead');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{result ? 'Send the login' : staff.portalEnabled ? 'Reset app password' : 'Give staff app login'}</DialogTitle>
          <DialogDescription>
            {result
              ? 'This password is shown only once. They will be asked to set their own password when they sign in.'
              : `${staff.name} signs in with their mobile number ${staff.phone}.`}
          </DialogDescription>
        </DialogHeader>

        {result ? (
          <div className="space-y-3">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-md border border-border bg-muted/40 p-3 text-sm">
              <dt className="text-muted-foreground">Mobile</dt>
              <dd className="font-medium">{result.phone}</dd>
              <dt className="text-muted-foreground">Password</dt>
              <dd className="font-mono text-base font-semibold tracking-wider">{result.password}</dd>
            </dl>
            <div className="grid gap-2 sm:grid-cols-2">
              <a
                href={whatsappUrl(result.phone, loginMessage(result, business))}
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-emerald-600 px-4 text-sm font-medium text-white hover:bg-emerald-600/90 sm:h-9"
              >
                <MessageCircle className="h-4 w-4" /> Send on WhatsApp
              </a>
              <Button variant="outline" onClick={copy}><Copy /> Copy details</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1" role="radiogroup" aria-label="Password">
              {[
                { value: 'generate', label: 'Generate' },
                { value: 'type', label: 'Type one' },
              ].map((o) => (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={mode === o.value}
                  onClick={() => setMode(o.value)}
                  className={cn('h-9 rounded-sm text-sm font-medium text-muted-foreground sm:h-8', mode === o.value && 'bg-background text-foreground')}
                >
                  {o.label}
                </button>
              ))}
            </div>
            {mode === 'type' && (
              <Field label="Password" htmlFor="access-password" hint="At least 6 characters">
                <Input id="access-password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" />
              </Field>
            )}
          </div>
        )}

        <DialogFooter>
          {result ? (
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          ) : (
            <>
              {staff.portalEnabled && (
                <Button variant="destructive-outline" onClick={revoke} className="sm:mr-auto"><ShieldOff /> Turn off access</Button>
              )}
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button onClick={grant} disabled={busy || (mode === 'type' && password.length < 6)}>
                <KeyRound /> {busy ? 'Saving…' : staff.portalEnabled ? 'Reset password' : 'Give access'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
