import { request, qs } from '@/shared/api/http';

export const reportsApi = {
  summary: (params) => request(`/reports/summary${qs(params)}`),
  muster: (params) => request(`/reports/muster${qs(params)}`),
};
