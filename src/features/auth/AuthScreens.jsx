import { useState } from 'react';
import { toast } from 'sonner';
import { Eye, EyeOff, KeyRound, Zap } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Field } from '@/shared/components/Field';
import { InstallApp } from '@/shared/components/AppStatus';

function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Zap className="h-6 w-6" />
          </span>
          <h1 className="mt-3 text-xl font-semibold">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <div className="rounded-xl border border-border bg-card p-5 sm:p-6">{children}</div>
        {footer && <div className="mt-4">{footer}</div>}
      </div>
    </div>
  );
}

function PasswordInput({ id, value, onChange, autoComplete, placeholder }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="pr-11"
        required
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? 'Hide password' : 'Show password'}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground hover:text-foreground"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

const useSubmit = (fn) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, submit };
};

export function LoginScreen() {
  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const { busy, error, submit } = useSubmit(async () => {
    const principal = await login({ phone, password });
    toast.success(`Welcome, ${principal.name.split(' ')[0]}`);
  });

  return (
    <AuthShell title="Sign in to ElectroStaff" subtitle="Owners and staff use the same sign-in" footer={<InstallApp />}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Mobile number" htmlFor="login-phone">
          <Input id="login-phone" type="tel" inputMode="tel" autoComplete="username" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="98450 12345" required />
        </Field>
        <Field label="Password" htmlFor="login-password">
          <PasswordInput id="login-password" value={password} onChange={setPassword} autoComplete="current-password" />
        </Field>
        {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</Button>
        <p className="text-center text-xs text-muted-foreground">Staff: use the mobile number and password the office sent you.</p>
      </form>
    </AuthShell>
  );
}

export function SetupScreen() {
  const { setup } = useAuth();
  const [form, setForm] = useState({ businessName: '', name: '', phone: '', password: '', confirm: '' });
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const { busy, error, submit } = useSubmit(async () => {
    if (form.password !== form.confirm) throw new Error('Passwords do not match');
    await setup({ businessName: form.businessName, name: form.name, phone: form.phone, password: form.password });
    toast.success('Your business is ready');
  });

  return (
    <AuthShell title="Set up your business" subtitle="Create the owner account. You can add staff logins later.">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Business name" htmlFor="setup-business">
          <Input id="setup-business" value={form.businessName} onChange={set('businessName')} placeholder="e.g. Sri Murugan Electricals" required />
        </Field>
        <Field label="Your name" htmlFor="setup-name">
          <Input id="setup-name" autoComplete="name" value={form.name} onChange={set('name')} required />
        </Field>
        <Field label="Mobile number" htmlFor="setup-phone" hint="You will sign in with this number">
          <Input id="setup-phone" type="tel" inputMode="tel" autoComplete="username" value={form.phone} onChange={set('phone')} required />
        </Field>
        <Field label="Password" htmlFor="setup-password" hint="At least 6 characters">
          <PasswordInput id="setup-password" value={form.password} onChange={(v) => setForm((f) => ({ ...f, password: v }))} autoComplete="new-password" />
        </Field>
        <Field label="Confirm password" htmlFor="setup-confirm">
          <PasswordInput id="setup-confirm" value={form.confirm} onChange={(v) => setForm((f) => ({ ...f, confirm: v }))} autoComplete="new-password" />
        </Field>
        {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Creating…' : 'Create owner account'}</Button>
      </form>
    </AuthShell>
  );
}

// Used as a full screen on first staff sign-in (forced) and as a card in Settings / profile.
export function ChangePasswordForm({ forced, onDone }) {
  const { changePassword, logout } = useAuth();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const { busy, error, submit } = useSubmit(async () => {
    if (next !== confirm) throw new Error('New passwords do not match');
    await changePassword({ currentPassword: current, newPassword: next });
    toast.success('Password changed. Other devices were signed out.');
    setCurrent('');
    setNext('');
    setConfirm('');
    onDone?.();
  });

  const form = (
    <form onSubmit={submit} className="space-y-4">
      <Field label={forced ? 'Password from the office' : 'Current password'} htmlFor="cp-current">
        <PasswordInput id="cp-current" value={current} onChange={setCurrent} autoComplete="current-password" />
      </Field>
      <Field label="New password" htmlFor="cp-new" hint="At least 6 characters">
        <PasswordInput id="cp-new" value={next} onChange={setNext} autoComplete="new-password" />
      </Field>
      <Field label="Confirm new password" htmlFor="cp-confirm">
        <PasswordInput id="cp-confirm" value={confirm} onChange={setConfirm} autoComplete="new-password" />
      </Field>
      {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <Button type="submit" className="w-full sm:w-auto" disabled={busy}>
        <KeyRound /> {busy ? 'Saving…' : 'Change password'}
      </Button>
    </form>
  );

  if (!forced) return form;
  return (
    <AuthShell
      title="Set your own password"
      subtitle="For your safety, replace the password the office sent you."
      footer={
        <button type="button" onClick={logout} className="w-full text-center text-sm text-muted-foreground underline">
          Sign out
        </button>
      }
    >
      {form}
    </AuthShell>
  );
}
