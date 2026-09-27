import { request, json, qs } from '@/shared/api/http';

export const performanceApi = {
  get: (params) => request(`/performance${qs(params)}`),
  save: (payload) => request('/performance', json('POST', payload)),
  delete: (id) => request(`/performance/${id}`, { method: 'DELETE' }),
};
