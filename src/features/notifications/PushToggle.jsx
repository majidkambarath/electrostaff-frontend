import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { BellRing } from 'lucide-react';
import { disablePush, enablePush, pushStatus } from '@/features/notifications/push';
import { Button } from '@/shared/ui/button';

// Phone notifications on/off for this device.
export function PushToggle() {
  const [status, setStatus] = useState('…');
  useEffect(() => {
    pushStatus().then(setStatus).catch(() => setStatus('unsupported'));
  }, []);
  const toggle = async () => {
    try {
      if (status === 'on') {
        await disablePush();
        setStatus('off');
        toast.success('Notifications turned off on this device');
      } else {
        await enablePush();
        setStatus('on');
        toast.success('Notifications turned on');
      }
    } catch (e) {
      toast.error(e.message);
    }
  };
  const text = {
    on: 'On for this device',
    off: 'Off for this device',
    blocked: 'Blocked in browser settings',
    unsupported: 'Not supported here (on iPhone, add the app to your Home Screen first)',
  }[status] || 'Checking…';
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm">
        <BellRing className="mr-1.5 inline h-4 w-4 align-text-bottom text-primary" /> Phone notifications: <span className="text-muted-foreground">{text}</span>
      </p>
      {(status === 'on' || status === 'off') && (
        <Button size="sm" variant="outline" onClick={toggle}>{status === 'on' ? 'Turn off' : 'Turn on'}</Button>
      )}
    </div>
  );
}
