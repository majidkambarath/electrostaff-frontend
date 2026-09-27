import { request, json } from '@/shared/api/http';

export const notificationsApi = {
  list: () => request('/notifications'),
  unreadCount: () => request('/notifications/unread-count'),
  markRead: (ids) => request('/notifications/read', json('POST', { ids })),
  pushKey: () => request('/notifications/push-key'),
  subscribe: (subscription) => request('/notifications/subscribe', json('POST', { subscription })),
  unsubscribe: (endpoint) => request('/notifications/unsubscribe', json('POST', { endpoint })),
};
