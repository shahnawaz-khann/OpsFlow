import { apiClient } from './client.js';

export const authApi = {
  login: (email, password) => apiClient('/auth/login', { method: 'POST', body: { email, password } }),
  devLogin: (userId) => apiClient('/auth/dev-login', { method: 'POST', body: { userId } }),
  getDemoUsers: () => apiClient('/auth/demo-users'),
  getUsers: () => apiClient('/auth/users'),
  getMe: () => apiClient('/auth/me'),
};

