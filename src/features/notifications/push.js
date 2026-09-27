import { notificationsApi } from '@/features/notifications/api';

// Web Push: lets the office / staff get phone notifications even when the app is closed.
// Needs HTTPS (or localhost), a service worker, and permission from the person.
export const pushSupported = () =>
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

const toUint8 = (base64) => {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
};

const registration = async () => {
  const reg = await navigator.serviceWorker.getRegistration();
  if (!reg) throw new Error('Reload the app once, then try again.');
  return reg;
};

// 'unsupported' | 'blocked' | 'on' | 'off'
export async function pushStatus() {
  if (!pushSupported()) return 'unsupported';
  if (Notification.permission === 'denied') return 'blocked';
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub ? 'on' : 'off';
}

export async function enablePush() {
  if (!pushSupported()) throw new Error('This browser can’t show notifications. On iPhone, add the app to your Home Screen first.');
  const { enabled, publicKey } = await notificationsApi.pushKey();
  if (!enabled) throw new Error('Phone notifications are not set up on the server.');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notifications are blocked. Allow them in your browser settings.');
  const reg = await registration();
  const sub = (await reg.pushManager.getSubscription()) || (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toUint8(publicKey) }));
  await notificationsApi.subscribe(sub.toJSON());
}

export async function disablePush() {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await notificationsApi.unsubscribe(sub.endpoint).catch(() => {});
  await sub.unsubscribe();
}
