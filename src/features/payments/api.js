import { request, requestBlobUrl, json, qs } from '@/shared/api/http';

export const paymentsApi = {
  getAll: (params) => request(`/payments${qs(params)}`),
  preview: (params) => request(`/payments/preview${qs(params)}`),
  outstanding: (params) => request(`/payments/outstanding${qs(params)}`),
  create: (payload) => request('/payments', json('POST', payload)),
  markPaid: (id, payload) => request(`/payments/${id}/mark-paid`, json('PUT', payload)),
  cancel: (id) => request(`/payments/${id}`, { method: 'DELETE' }),
  get: (id) => request(`/payments/${id}`),
  proofUrl: (id) => requestBlobUrl(`/payments/${id}/proof`),
};
