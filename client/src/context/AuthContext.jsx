import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/auth.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('opsflow_token'));
  const [demoUsers, setDemoUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Initialize auth state and load demo users
  useEffect(() => {
    async function initAuth() {
      try {
        // Fetch demo users for local dev demo switcher
        const demoRes = await authApi.getDemoUsers().catch(() => ({ users: [] }));
        setDemoUsers(demoRes?.users || []);

        const savedToken = localStorage.getItem('opsflow_token');
        if (savedToken) {
          try {
            const meRes = await authApi.getMe();
            setUser(meRes.user);
            setLoading(false);
            return;
          } catch (err) {
            localStorage.removeItem('opsflow_token');
            setToken(null);
          }
        }

        // If no active session, auto-login as the first demo user (Alice Admin) for seamless demo
        if (demoRes?.users?.length > 0) {
          const defaultUser = demoRes.users[0];
          const loginRes = await authApi.devLogin(defaultUser.id);
          localStorage.setItem('opsflow_token', loginRes.token);
          setToken(loginRes.token);
          setUser(loginRes.user);
        }
      } catch (err) {
        console.error('Failed to initialize auth', err);
      } finally {
        setLoading(false);
      }
    }

    initAuth();
  }, []);

  const switchUser = async (userId) => {
    setLoading(true);
    try {
      const res = await authApi.devLogin(userId);
      localStorage.setItem('opsflow_token', res.token);
      setToken(res.token);
      setUser(res.user);
      return res.user;
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await authApi.login(email, password);
      localStorage.setItem('opsflow_token', res.token);
      setToken(res.token);
      setUser(res.user);
      return res.user;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('opsflow_token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        demoUsers,
        loading,
        switchUser,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
