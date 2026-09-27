import { request, json, qs } from '@/shared/api/http';

export const payrollApi = {
  list: () => request('/payroll'),
  preview: (params) => request(`/payroll/preview${qs(params)}`),
  create: (payload) => request('/payroll', json('POST', payload)),
  get: (id) => request(`/payroll/${id}`),
  markPaid: (id, payload) => request(`/payroll/${id}/mark-paid`, json('PUT', payload)),
  cancel: (id) => request(`/payroll/${id}`, { method: 'DELETE' }),
};
