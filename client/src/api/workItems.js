import { apiClient } from './client.js';

export const workItemsApi = {
  list: (params) => apiClient('/work-items', { query: params }),
  get: (id) => apiClient(`/work-items/${id}`),
  create: (data) => apiClient('/work-items', { method: 'POST', body: data }),
  update: (id, data) => apiClient(`/work-items/${id}`, { method: 'PATCH', body: data }),
  delete: (id) => apiClient(`/work-items/${id}`, { method: 'DELETE' }),
  claim: (id) => apiClient(`/work-items/${id}/claim`, { method: 'POST' }),
  assign: (id, data) => apiClient(`/work-items/${id}/assign`, { method: 'POST', body: data }),
  transition: (id, data) => apiClient(`/work-items/${id}/transition`, { method: 'POST', body: data }),
  decideApproval: (id, data) => apiClient(`/work-items/${id}/approval`, { method: 'POST', body: data }),
  getActivity: (id, params) => apiClient(`/work-items/${id}/activity`, { query: params }),
  addComment: (id, comment) => apiClient(`/work-items/${id}/comments`, { method: 'POST', body: { comment } }),
};

