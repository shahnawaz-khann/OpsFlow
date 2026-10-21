import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { AppLayout } from './components/layout/AppLayout.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { WorkItemsPage } from './pages/WorkItemsPage.jsx';
import { WorkItemDetailsPage } from './pages/WorkItemDetailsPage.jsx';
import { MyWorkPage } from './pages/MyWorkPage.jsx';
import { ApprovalsPage } from './pages/ApprovalsPage.jsx';
import { TeamsPage } from './pages/TeamsPage.jsx';
import { LoginPage } from './pages/LoginPage.jsx';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
            <Route path="work-items" element={<WorkItemsPage />} />
            <Route path="work-items/:id" element={<WorkItemDetailsPage />} />
            <Route path="my-work" element={<MyWorkPage />} />
            <Route path="approvals" element={<ApprovalsPage />} />
            <Route path="teams" element={<TeamsPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
