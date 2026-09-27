import { request, json, qs } from '@/shared/api/http';

export const leavesApi = {
  get: (params) => request(`/leaves${qs(params)}`),
  create: (payload) => request('/leaves', json('POST', payload)),
  update: (id, payload) => request(`/leaves/${id}`, json('PUT', payload)),
  delete: (id) => request(`/leaves/${id}`, { method: 'DELETE' }),
};
