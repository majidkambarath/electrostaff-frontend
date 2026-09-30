import { request, json } from '@/shared/api/http';

// Platform portal (SaaS operators only).
export const platformApi = {
  overview: () => request('/platform/overview'),
  list: () => request('/platform/organizations'),
  get: (id) => request(`/platform/organizations/${id}`),
  create: (payload) => request('/platform/organizations', json('POST', payload)),
  setStatus: (id, status) => request(`/platform/organizations/${id}/status`, json('PUT', { status })),
};
