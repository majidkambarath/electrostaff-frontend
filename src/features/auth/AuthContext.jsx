import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Zap } from 'lucide-react';
import { authApi } from '@/features/auth/api';
import { getToken, onUnauthorized, setToken } from '@/shared/api/http';
import { clearApiCache } from '@/shared/hooks/useApi';
import { Button } from '@/shared/ui/button';

const AuthContext = createContext(null);
const SESSION_KEY = 'electrostaff.session';

// Last known session, so an installed app can open offline on a phone.
const cache = {
  read: () => {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    } catch {
      return null;
    }
  },
  write: (value) => {
    try {
      if (value) localStorage.setItem(SESSION_KEY, JSON.stringify(value));
      else localStorage.removeItem(SESSION_KEY);
    } catch {
      // storage unavailable
    }
  },
};

function Splash({ error, onRetry }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      {error ? (
        <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 text-center">
          <p className="font-semibold">Can’t connect to ElectroStaff</p>
          <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
          <Button className="mt-4 w-full" onClick={onRetry}>Try again</Button>
        </div>
      ) : (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="flex h-8 w-8 animate-pulse items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Zap className="h-4 w-4" />
          </span>
          Loading ElectroStaff…
        </div>
      )}
    </div>
  );
}

// Session state machine: loading -> signed-out (sign in / create business) | signed-in.
export function AuthProvider({ children, screens }) {
  const [state, setState] = useState({ status: 'loading' });

  const signIn = useCallback(({ token, principal, organization }) => {
    if (token) setToken(token);
    setState({ status: 'signed-in', principal, organization });
    cache.write({ principal, organization });
  }, []);

  const signOut = useCallback((message) => {
    setToken('');
    cache.write(null);
    clearApiCache();
    setState((s) => ({ status: 'signed-out', signupEnabled: s.signupEnabled ?? true }));
    if (message) toast.info(message);
  }, []);

  const bootstrap = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      if (getToken()) {
        const { principal, organization } = await authApi.me();
        signIn({ principal, organization });
        return;
      }
      const { signupEnabled } = await authApi.status();
      setState({ status: 'signed-out', signupEnabled });
    } catch (error) {
      if (error.network && getToken() && cache.read()) {
        setState({ status: 'signed-in', offline: true, ...cache.read() });
      } else if (error.status === 401 || error.status === 403) {
        signOut();
      } else {
        setState({ status: 'error', error });
      }
    }
  }, [signIn, signOut]);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  useEffect(
    () => onUnauthorized(() => signOut('Your session ended. Please sign in again.')),
    [signOut]
  );

  const value = useMemo(
    () => ({
      ...state,
      org: state.organization,
      setOrg: (organization) =>
        setState((s) => {
          const next = { ...s, organization };
          cache.write({ principal: s.principal, organization });
          return next;
        }),
      login: async (credentials) => {
        const { token, principal } = await authApi.login(credentials);
        setToken(token);
        const { organization } = await authApi.me();
        signIn({ principal, organization });
        return principal;
      },
      developerLogin: async (credentials) => {
        const { token, principal } = await authApi.developerLogin(credentials);
        setToken(token);
        signIn({ principal, organization: null });
        return principal;
      },
      signup: async (details) => {
        const { token, principal } = await authApi.signup(details);
        setToken(token);
        const { organization } = await authApi.me();
        signIn({ principal, organization });
      },
      changePassword: async (payload) => {
        const { token } = await authApi.changePassword(payload);
        setToken(token);
        setState((s) => ({ ...s, principal: { ...s.principal, mustChangePassword: false } }));
      },
      logout: () => signOut(),
    }),
    [state, signIn, signOut]
  );

  if (state.status === 'loading') return <Splash />;
  if (state.status === 'error') return <Splash error={state.error} onRetry={bootstrap} />;

  const { SignedOut, ChangePassword } = screens;
  return (
    <AuthContext.Provider value={value}>
      {state.status === 'signed-out' && <SignedOut signupEnabled={state.signupEnabled !== false} />}
      {state.status === 'signed-in' && (state.principal?.mustChangePassword ? <ChangePassword forced /> : children)}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react/only-export-components
export const useAuth = () => useContext(AuthContext);
// Business profile of the signed-in user's organization.
// eslint-disable-next-line react/only-export-components
export const useOrg = () => {
  const auth = useContext(AuthContext);
  return { org: auth?.org, setOrg: auth?.setOrg };
};
