import { apiClient } from './client.js';

export const dashboardApi = {
  getSummary: () => apiClient('/dashboard/summary'),
};
