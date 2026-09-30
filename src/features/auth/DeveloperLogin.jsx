import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Code2 } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Field } from '@/shared/components/Field';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/dialog';

const TAPS_NEEDED = 7;
const TAP_WINDOW_MS = 3000;

// Hidden entry to developer mode: Ctrl+Shift+D (⌘+Shift+D on Mac) on a laptop, or tapping the
// logo 7 times on a phone. Returns [open, setOpen, onLogoTap].
export function useDeveloperEntry() {
  const [open, setOpen] = useState(false);
  const taps = useRef([]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key?.toLowerCase() === 'd') {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const onLogoTap = () => {
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < TAP_WINDOW_MS), now];
    if (taps.current.length >= TAPS_NEEDED) {
      taps.current = [];
      setOpen(true);
    }
  };

  return [open, setOpen, onLogoTap];
}

export function DeveloperLoginDialog({ open, onOpenChange }) {
  const { developerLogin } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await developerLogin({ username, password });
      toast.success('Developer mode');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-sm">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Code2 className="h-5 w-5" /> Developer mode</DialogTitle>
            <DialogDescription>Manage every business: create owners and allow or block access.</DialogDescription>
          </DialogHeader>
          <Field label="Username" htmlFor="dev-user">
            <Input id="dev-user" autoComplete="username" autoCapitalize="none" value={username} onChange={(e) => setUsername(e.target.value)} required autoFocus />
          </Field>
          <Field label="Password" htmlFor="dev-pass">
            <Input id="dev-pass" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>
          {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <DialogFooter>
            <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Signing in…' : 'Open developer mode'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
