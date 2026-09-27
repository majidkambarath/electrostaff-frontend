import { request, json } from '@/shared/api/http';

export const orgApi = {
  get: () => request('/org'),
  update: (payload) => request('/org', json('PUT', payload)),
};
