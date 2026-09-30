import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Eye, EyeOff, KeyRound, Zap } from 'lucide-react';
import { useAuth } from '@/features/auth/AuthContext';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { PhoneInput } from '@/shared/ui/number-inputs';
import { Field } from '@/shared/components/Field';
import { InstallApp } from '@/shared/components/AppStatus';
import { useEntrance } from '@/shared/components/Motion';
import { DeveloperLoginDialog, useDeveloperEntry } from '@/features/auth/DeveloperLogin';

function AuthShell({ title, subtitle, children, footer, onLogoTap }) {
  const ref = useRef(null);
  useEntrance(ref);
  return (
    <div ref={ref} className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <span
            data-enter-pop
            onClick={onLogoTap}
            className="flex h-12 w-12 select-none items-center justify-center rounded-xl bg-primary text-primary-foreground"
          >
            <Zap className="h-6 w-6" />
          </span>
          <h1 data-enter className="mt-3 text-xl font-semibold">{title}</h1>
          {subtitle && <p data-enter className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
        <div data-enter className="rounded-xl border border-border bg-card p-5 sm:p-6">{children}</div>
        {footer && <div data-enter className="mt-4">{footer}</div>}
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

// Signed-out entry: sign in (plus sign-up only when the server allows it). Businesses are normally
// created by a developer: Ctrl+Shift+D or 7 taps on the logo opens developer mode.
export function SignedOutScreen({ signupEnabled }) {
  const [mode, setMode] = useState(() =>
    signupEnabled && new URLSearchParams(window.location.search).has('signup') ? 'signup' : 'login'
  );
  const [devOpen, setDevOpen, onLogoTap] = useDeveloperEntry();
  const switchTo = (next) => () => setMode(next);
  return (
    <>
      {mode === 'signup' && signupEnabled ? (
        <SignupScreen onSignIn={switchTo('login')} onLogoTap={onLogoTap} />
      ) : (
        <LoginScreen onCreate={signupEnabled ? switchTo('signup') : null} onLogoTap={onLogoTap} />
      )}
      <DeveloperLoginDialog open={devOpen} onOpenChange={setDevOpen} />
    </>
  );
}

function SwitchLink({ question, action, onClick }) {
  return (
    <p className="text-center text-sm text-muted-foreground">
      {question}{' '}
      <button type="button" onClick={onClick} className="tap font-medium text-primary underline-offset-4 hover:underline">
        {action}
      </button>
    </p>
  );
}

export function LoginScreen({ onCreate, onLogoTap }) {
  const { login } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const { busy, error, submit } = useSubmit(async () => {
    const principal = await login({ phone, password });
    toast.success(`Welcome, ${principal.name.split(' ')[0]}`);
  });

  return (
    <AuthShell
      title="Sign in to ElectroStaff"
      subtitle="Owners and staff use the same sign-in"
      onLogoTap={onLogoTap}
      footer={
        <div className="space-y-3">
          {onCreate && <SwitchLink question="New business?" action="Create your account" onClick={onCreate} />}
          <InstallApp />
        </div>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Mobile number" htmlFor="login-phone">
          <PhoneInput id="login-phone" autoComplete="username" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="9845012345" required />
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

export function SignupScreen({ onSignIn, onLogoTap }) {
  const { signup } = useAuth();
  const [form, setForm] = useState({ businessName: '', name: '', phone: '', password: '', confirm: '' });
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const { busy, error, submit } = useSubmit(async () => {
    if (form.password !== form.confirm) throw new Error('Passwords do not match');
    await signup({ businessName: form.businessName, name: form.name, phone: form.phone, password: form.password });
    toast.success('Your business is ready');
  });

  return (
    <AuthShell
      title="Create your business"
      subtitle="Set up the owner account. Add sites, staff and their app logins next."
      onLogoTap={onLogoTap}
      footer={<SwitchLink question="Already registered?" action="Sign in" onClick={onSignIn} />}
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Business name" htmlFor="setup-business">
          <Input id="setup-business" value={form.businessName} onChange={set('businessName')} placeholder="e.g. Sri Murugan Electricals" required />
        </Field>
        <Field label="Your name" htmlFor="setup-name">
          <Input id="setup-name" autoComplete="name" value={form.name} onChange={set('name')} required />
        </Field>
        <Field label="Mobile number" htmlFor="setup-phone" hint="You will sign in with this number">
          <PhoneInput id="setup-phone" autoComplete="username" value={form.phone} onChange={set('phone')} required />
        </Field>
        <Field label="Password" htmlFor="setup-password" hint="At least 6 characters">
          <PasswordInput id="setup-password" value={form.password} onChange={(v) => setForm((f) => ({ ...f, password: v }))} autoComplete="new-password" />
        </Field>
        <Field label="Confirm password" htmlFor="setup-confirm">
          <PasswordInput id="setup-confirm" value={form.confirm} onChange={(v) => setForm((f) => ({ ...f, confirm: v }))} autoComplete="new-password" />
        </Field>
        {error && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>{busy ? 'Creating…' : 'Create business'}</Button>
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
