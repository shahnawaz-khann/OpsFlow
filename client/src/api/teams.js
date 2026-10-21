import { apiClient } from './client.js';

export const teamsApi = {
  list: () => apiClient('/teams'),
  create: (data) => apiClient('/teams', { method: 'POST', body: data }),
  update: (teamId, data) => apiClient(`/teams/${teamId}`, { method: 'PATCH', body: data }),
  getMembers: (teamId) => apiClient(`/teams/${teamId}/members`),
  addMember: (teamId, data) => apiClient(`/teams/${teamId}/members`, { method: 'POST', body: data }),
  updateMemberRole: (teamId, userId, role) =>
    apiClient(`/teams/${teamId}/members/${userId}`, { method: 'PATCH', body: { role } }),
  removeMember: (teamId, userId) =>
    apiClient(`/teams/${teamId}/members/${userId}`, { method: 'DELETE' }),
};

