import { request, json, qs } from '@/shared/api/http';

export const requestsApi = {
  list: (params) => request(`/requests${qs(params)}`),
  decide: (id, payload) => request(`/requests/${id}`, json('PUT', payload)),
};
