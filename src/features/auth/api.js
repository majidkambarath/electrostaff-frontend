import { request, json } from '@/shared/api/http';

export const authApi = {
  status: () => request('/auth/status'),
  signup: (payload) => request('/auth/signup', json('POST', payload)),
  login: (payload) => request('/auth/login', json('POST', payload)),
  me: () => request('/auth/me'),
  changePassword: (payload) => request('/auth/change-password', json('POST', payload)),
};
