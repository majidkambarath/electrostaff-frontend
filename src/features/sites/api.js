import { request, json, qs } from '@/shared/api/http';

export const sitesApi = {
  getAll: () => request('/sites'),
  get: (id) => request(`/sites/${id}`),
  create: (payload) => request('/sites', json('POST', payload)),
  update: (id, payload) => request(`/sites/${id}`, json('PUT', payload)),
  delete: (id) => request(`/sites/${id}`, { method: 'DELETE' }),
  getStaff: (id) => request(`/sites/${id}/staff`),
  assign: (id, staffIds) => request(`/sites/${id}/assign`, json('POST', { staffIds })),
  unassign: (id, staffId) => request(`/sites/${id}/assign/${staffId}`, { method: 'DELETE' }),
  progress: (id) => request(`/sites/${id}/progress`),
  finance: (id) => request(`/sites/${id}/finance`),
};

export const receiptsApi = {
  getAll: (params) => request(`/receipts${qs(params)}`),
  create: (payload) => request('/receipts', json('POST', payload)),
  delete: (id) => request(`/receipts/${id}`, { method: 'DELETE' }),
};
