import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Layout } from './components/layout/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { SessionsPage } from './pages/SessionsPage';
import { AlertsPage } from './pages/AlertsPage';
import { WebhooksPage } from './pages/WebhooksPage';
import { EmailPage } from './pages/EmailPage';
import { LogsPage } from './pages/LogsPage';
import { MessagesPage } from './pages/MessagesPage';
import { useAuthStore } from './stores/authStore';
import { authApi, setAccessToken } from './services/api';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function AuthGuard() {
  const { isAuthenticated, setUser } = useAuthStore();
  const token = localStorage.getItem('accessToken');
  const [authChecked, setAuthChecked] = useState(false);

  const { isLoading } = useQuery({
    queryKey: ['auth-me'],
    queryFn: async () => {
      const user = await authApi.me();
      setUser(user);
      return user;
    },
    enabled: !!token && !isAuthenticated,
    retry: false,
    meta: { errorMessage: null },
  });

  // Handle auth error
  useEffect(() => {
    if (!token) {
      setUser(null);
      setAuthChecked(true);
      return;
    }
    if (!isLoading && !isAuthenticated) {
      // Token might be expired
      setAccessToken(null);
      localStorage.removeItem('refreshToken');
      setAuthChecked(true);
    }
    if (isAuthenticated) {
      setAuthChecked(true);
    }
  }, [token, isLoading, isAuthenticated, setUser]);

  if ((isLoading || !authChecked) && token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return null;
}

export default function App() {
  return (
    <>
      <AuthGuard />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="/sessions" element={<SessionsPage />} />
          <Route path="/alerts" element={<AlertsPage />} />
          <Route path="/webhooks" element={<WebhooksPage />} />
          <Route path="/email" element={<EmailPage />} />
          <Route path="/logs" element={<LogsPage />} />
          <Route path="/messages" element={<MessagesPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
