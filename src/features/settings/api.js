import { request, json } from '@/shared/api/http';

export const orgApi = {
  get: () => request('/org'),
  update: (payload) => request('/org', json('PUT', payload)),
};

// Office team (owner manages admins and site supervisors).
export const teamApi = {
  list: () => request('/team'),
  create: (payload) => request('/team', json('POST', payload)),
  update: (id, payload) => request(`/team/${id}`, json('PUT', payload)),
  resetPassword: (id) => request(`/team/${id}/reset-password`, json('POST', {})),
  remove: (id) => request(`/team/${id}`, { method: 'DELETE' }),
};
