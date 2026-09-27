import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Zap } from 'lucide-react';
import { initOrg } from '@/api/api';
import { Button } from '@/components/ui/button';

const OrgContext = createContext(null);

// Resolves the organization before rendering the app so no request goes out with a stale org id.
export function OrgProvider({ children }) {
  const [org, setOrg] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(() => {
    setError(null);
    initOrg()
      .then((data) => {
        // Older API builds return only { organizationId }; every screen would break against them.
        if (data.name === undefined) {
          throw new Error('The backend is running an older version. Restart it (cd backend && npm run dev), then try again.');
        }
        setOrg(data);
      })
      .catch(setError);
  }, []);

  useEffect(load, [load]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background p-4">
        <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 text-center">
          <p className="font-semibold">Can’t connect to ElectroStaff</p>
          <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
          <Button className="mt-4 w-full" onClick={load}>Try again</Button>
        </div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="flex h-8 w-8 animate-pulse items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Zap className="h-4 w-4" />
          </span>
          Loading ElectroStaff…
        </div>
      </div>
    );
  }

  return <OrgContext.Provider value={{ org, setOrg }}>{children}</OrgContext.Provider>;
}

// eslint-disable-next-line react/only-export-components
export const useOrg = () => useContext(OrgContext);
