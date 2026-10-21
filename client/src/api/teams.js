import { apiClient } from './client.js';

export const teamsApi = {
  list: () => apiClient('/teams'),
  getMembers: (teamId) => apiClient(`/teams/${teamId}/members`),
};
