import { request, json, qs } from '@/shared/api/http';

export const attendanceApi = {
  getBySite: (params) => request(`/attendance${qs(params)}`),
  bulk: (payload) => request('/attendance/bulk', json('POST', payload)),
  getByStaff: (staffId, params) => request(`/attendance/staff/${staffId}${qs(params)}`),
};
