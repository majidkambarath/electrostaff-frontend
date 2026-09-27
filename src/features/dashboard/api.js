import { request } from '@/shared/api/http';

export const dashboardApi = {
  get: () => request('/dashboard'),
};
