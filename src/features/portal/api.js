import { request, requestBlobUrl, json, qs } from '@/shared/api/http';

// Staff app ("/me") — everything here is scoped to the signed-in worker by the server.
export const portalApi = {
  home: () => request('/me/home'),
  checkIn: (payload) => request('/me/check-in', json('POST', payload)),
  undoCheckIn: (siteId) => request('/me/check-in/undo', json('POST', { siteId })),
  attendance: (params) => request(`/me/attendance${qs(params)}`),
  payslips: () => request('/me/payslips'),
  payslip: (id) => request(`/me/payslips/${id}`),
  payslipProofUrl: (id) => requestBlobUrl(`/me/payslips/${id}/proof`),
  advances: () => request('/me/advances'),
  leaves: () => request('/me/leaves'),
  applyLeave: (payload) => request('/me/leaves', json('POST', payload)),
  cancelLeave: (id) => request(`/me/leaves/${id}`, { method: 'DELETE' }),
  requests: () => request('/me/requests'),
  createRequest: (payload) => request('/me/requests', json('POST', payload)),
  cancelRequest: (id) => request(`/me/requests/${id}/cancel`, json('POST')),
};
