import { request, json, qs } from '@/shared/api/http';

export const expensesApi = {
  getAll: (params) => request(`/expenses${qs(params)}`),
  create: (payload) => request('/expenses', json('POST', payload)),
  update: (id, payload) => request(`/expenses/${id}`, json('PUT', payload)),
  delete: (id) => request(`/expenses/${id}`, { method: 'DELETE' }),
};
