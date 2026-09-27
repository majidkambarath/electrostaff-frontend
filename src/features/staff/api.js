import { request, json, qs } from '@/shared/api/http';

export const staffApi = {
  getAll: (params) => request(`/staff${qs(params)}`),
  get: (id) => request(`/staff/${id}`),
  create: (payload) => request('/staff', json('POST', payload)),
  update: (id, payload) => request(`/staff/${id}`, json('PUT', payload)),
  delete: (id) => request(`/staff/${id}`, { method: 'DELETE' }),
  // Staff app login: { password } or { generate: true }; returns the plain password once.
  grantAccess: (id, payload) => request(`/staff/${id}/access`, json('POST', payload)),
  revokeAccess: (id) => request(`/staff/${id}/access`, { method: 'DELETE' }),
};
