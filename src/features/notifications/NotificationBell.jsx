import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Bell, BellRing, CalendarOff, CheckCheck, ClipboardCheck, HandCoins, Inbox, MessageSquare, Wallet } from 'lucide-react';
import { notificationsApi } from '@/features/notifications/api';
import { enablePush, pushStatus } from '@/features/notifications/push';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';

const ICONS = { attendance: ClipboardCheck, leave: CalendarOff, request: MessageSquare, payment: Wallet, advance: HandCoins, system: Bell };
const POLL_MS = 30000;

const timeAgo = (date) => {
  const s = Math.max(1, Math.round((Date.now() - new Date(date)) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

// Unread count, polled while the app is visible; a new item also shows a toast.
function useUnread() {
  const [unread, setUnread] = useState(0);
  const last = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const { unread: count } = await notificationsApi.unreadCount();
      if (last.current !== null && count > last.current) {
        const { items } = await notificationsApi.list();
        if (items[0]) toast(items[0].title, { description: items[0].body, icon: <BellRing className="h-4 w-4" /> });
      }
      last.current = count;
      setUnread(count);
    } catch {
      // offline or signed out — try again on the next tick
    }
  }, []);

  useEffect(() => {
    refresh();
    const timer = setInterval(() => document.visibilityState === 'visible' && refresh(), POLL_MS);
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [refresh]);

  return { unread, setUnread, refresh };
}

export function NotificationBell() {
  const navigate = useNavigate();
  const { unread, setUnread } = useUnread();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState(null);
  const [push, setPush] = useState('unsupported');

  useEffect(() => {
    if (!open) return;
    notificationsApi.list().then(({ items: list, unread: count }) => {
      setItems(list);
      setUnread(count);
    }).catch(() => setItems([]));
    pushStatus().then(setPush).catch(() => {});
  }, [open, setUnread]);

  const openItem = async (n) => {
    setOpen(false);
    if (!n.readAt) {
      notificationsApi.markRead([n._id]).catch(() => {});
      setUnread((u) => Math.max(0, u - 1));
    }
    if (n.link) navigate(n.link);
  };

  const markAll = async () => {
    await notificationsApi.markRead().catch(() => {});
    setUnread(0);
    setItems((list) => list?.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() })));
  };

  const turnOnPush = async () => {
    try {
      await enablePush();
      setPush('on');
      toast.success('Phone notifications are on');
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" aria-label={unread ? `${unread} unread notifications` : 'Notifications'} className="relative">
          <Bell />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[11px] font-semibold text-white">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(22rem,calc(100vw-1rem))] p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <p className="text-sm font-semibold">Notifications</p>
          {unread > 0 && (
            <button type="button" onClick={markAll} className="tap inline-flex items-center gap-1 text-xs font-medium text-primary">
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </button>
          )}
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {items === null ? (
            <div className="space-y-2 p-3">{[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded bg-muted" />)}</div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-4 py-8 text-center text-sm text-muted-foreground">
              <Inbox className="h-6 w-6" /> Nothing new yet
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((n) => {
                const Icon = ICONS[n.type] || Bell;
                return (
                  <li key={n._id}>
                    <button type="button" onClick={() => openItem(n)} className={cn('flex w-full gap-3 px-3 py-3 text-left hover:bg-muted', !n.readAt && 'bg-blue-50/60')}>
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium">{n.title}</span>
                        {n.body && <span className="block text-xs text-muted-foreground">{n.body}</span>}
                        <span className="mt-0.5 block text-[11px] text-muted-foreground">{timeAgo(n.createdAt)}</span>
                      </span>
                      {!n.readAt && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        {push === 'off' && (
          <div className="border-t border-border p-3">
            <Button size="sm" variant="outline" className="w-full" onClick={turnOnPush}>
              <BellRing /> Get notifications on this phone
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
