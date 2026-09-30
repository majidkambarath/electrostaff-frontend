import { useState } from 'react';
import { toast } from 'sonner';
import { Copy, MessageCircle } from 'lucide-react';
import { platformApi } from '@/features/platform/api';
import { whatsappUrl } from '@/shared/lib/format';
import { Button, buttonVariants } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { PhoneInput } from '@/shared/ui/number-inputs';
import { Field } from '@/shared/components/Field';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';

const EMPTY = { businessName: '', ownerName: '', phone: '', email: '', address: '' };

const ownerMessage = ({ organization, owner, password }) =>
  [
    `Hello ${owner.name.split(' ')[0]} 👋`,
    `Your *${organization.name}* account on ElectroStaff is ready.`,
    '',
    `🔗 App: ${window.location.origin}`,
    `📱 Mobile: *${owner.phone}*`,
    `🔑 Password: *${password}*`,
    '',
    'Sign in and change the password from Settings.',
  ].join('\n');

// Creates a business with its owner; shows the owner's one-time password to share.
export function AddBusinessDialog({ open, onOpenChange, onCreated }) {
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [created, setCreated] = useState(null);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const close = (next) => {
    if (!next) {
      setForm(EMPTY);
      setCreated(null);
    }
    onOpenChange(next);
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const result = await platformApi.create(form);
      setCreated(result);
      onCreated?.();
      toast.success(`${result.organization.name} created`);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-md">
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>{created.organization.name} is ready</DialogTitle>
              <DialogDescription>Share this login with the owner. The password is shown only once.</DialogDescription>
            </DialogHeader>
            <dl className="space-y-2 rounded-lg border border-border bg-muted/40 p-3 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Owner</dt><dd className="font-medium">{created.owner.name}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Mobile</dt><dd className="font-medium tabular-nums">{created.owner.phone}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-muted-foreground">Password</dt><dd className="font-mono font-semibold">{created.password}</dd></div>
            </dl>
            <DialogFooter className="gap-2 sm:gap-2">
              <Button
                variant="outline"
                onClick={() => navigator.clipboard?.writeText(ownerMessage(created)).then(() => toast.success('Copied'))}
              >
                <Copy /> Copy
              </Button>
              <a className={buttonVariants()} href={whatsappUrl(created.owner.phone, ownerMessage(created))} target="_blank" rel="noreferrer">
                <MessageCircle /> Send on WhatsApp
              </a>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <DialogHeader>
              <DialogTitle>Add a business</DialogTitle>
              <DialogDescription>Creates the business and its owner login. A password is generated for the owner.</DialogDescription>
            </DialogHeader>
            <Field label="Business name" htmlFor="pb-name" required>
              <Input id="pb-name" value={form.businessName} onChange={set('businessName')} required autoFocus />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Owner name" htmlFor="pb-owner" required>
                <Input id="pb-owner" value={form.ownerName} onChange={set('ownerName')} required />
              </Field>
              <Field label="Owner mobile" htmlFor="pb-phone" required hint="Their sign-in number">
                <PhoneInput id="pb-phone" value={form.phone} onChange={set('phone')} required />
              </Field>
            </div>
            <Field label="Email" htmlFor="pb-email">
              <Input id="pb-email" type="email" value={form.email} onChange={set('email')} />
            </Field>
            <Field label="Address" htmlFor="pb-address">
              <Input id="pb-address" value={form.address} onChange={set('address')} />
            </Field>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => close(false)}>Cancel</Button>
              <Button type="submit" disabled={busy}>{busy ? 'Creating…' : 'Create business'}</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
