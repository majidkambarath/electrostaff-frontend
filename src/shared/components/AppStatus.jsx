import { useSyncExternalStore } from 'react';
import { Download, Share, WifiOff } from 'lucide-react';
import { canInstall, isIOS, isOnline, isStandalone, promptInstall, subscribe } from '@/shared/lib/pwa';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';

export function OfflineBanner() {
  const online = useSyncExternalStore(subscribe, isOnline);
  if (online) return null;
  return (
    <div role="status" className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 print:hidden">
      <WifiOff className="h-4 w-4 shrink-0" />
      You’re offline. You can keep reading this page, but changes won’t save until you reconnect.
    </div>
  );
}

// "Install app" on Android/desktop Chrome & Edge; Add-to-Home-Screen instructions on iPhone.
export function InstallApp({ className, compact }) {
  const installable = useSyncExternalStore(subscribe, canInstall);
  if (isStandalone()) return null;

  if (installable) {
    return (
      <div className={cn('rounded-md border border-border bg-muted/50 p-3', className)}>
        {!compact && <p className="mb-2 text-sm text-muted-foreground">Install ElectroStaff on this device for one-tap access, full-screen and faster loading.</p>}
        <Button size="sm" className="w-full" onClick={promptInstall}>
          <Download /> Install app
        </Button>
      </div>
    );
  }

  if (isIOS()) {
    return (
      <div className={cn('rounded-md border border-border bg-muted/50 p-3 text-sm text-muted-foreground', className)}>
        <p className="font-medium text-foreground">Add to Home Screen</p>
        <p className="mt-0.5">
          Tap <Share className="inline h-4 w-4 align-text-bottom" /> Share in Safari, then “Add to Home Screen”.
        </p>
      </div>
    );
  }

  return null;
}
