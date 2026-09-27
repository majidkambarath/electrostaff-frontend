import { request, json, qs } from '@/shared/api/http';

export const advancesApi = {
  getAll: (params) => request(`/advances${qs(params)}`),
  balances: () => request('/advances/balances'),
  create: (payload) => request('/advances', json('POST', payload)),
  delete: (id) => request(`/advances/${id}`, { method: 'DELETE' }),
};
