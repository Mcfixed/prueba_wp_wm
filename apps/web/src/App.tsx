import { useState, useEffect, useCallback } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { SessionsPage } from './pages/SessionsPage';
import { AlertsPage } from './pages/AlertsPage';
import { WebhooksPage } from './pages/WebhooksPage';
import { EmailPage } from './pages/EmailPage';
import { LogsPage } from './pages/LogsPage';
import { MessagesPage } from './pages/MessagesPage';
import { ApiKeysPage } from './pages/ApiKeysPage';
import { useAuthStore } from './stores/authStore';
import { authApi, setAccessToken } from './services/api';

function useAuthCheck() {
  const { isAuthenticated, setUser } = useAuthStore();
  const token = localStorage.getItem('accessToken');
  const refreshToken = localStorage.getItem('refreshToken');
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');

  const tryRefresh = useCallback(async () => {
    if (!refreshToken) return false;
    try {
      const res = await fetch('/api/v1/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) return false;
      const data = await res.json();
      setAccessToken(data.accessToken);
      localStorage.setItem('refreshToken', data.refreshToken);
      return true;
    } catch {
      return false;
    }
  }, [refreshToken]);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (!token) {
        setStatus('unauthenticated');
        return;
      }

      try {
        const user = await authApi.me();
        if (!cancelled) {
          setUser(user);
          setStatus('authenticated');
        }
      } catch {
        // Token expired, try refresh
        const refreshed = await tryRefresh();
        if (refreshed) {
          try {
            const user = await authApi.me();
            if (!cancelled) {
              setUser(user);
              setStatus('authenticated');
              return;
            }
          } catch {
            // Refresh worked but /me still fails
          }
        }
        if (!cancelled) {
          setAccessToken(null);
          localStorage.removeItem('refreshToken');
          setStatus('unauthenticated');
        }
      }
    }

    // If already authenticated from store, skip check
    if (isAuthenticated) {
      setStatus('authenticated');
      return;
    }

    check();
    return () => { cancelled = true; };
  }, [token, isAuthenticated, setUser, tryRefresh]);

  return status;
}

export default function App() {
  const authStatus = useAuthCheck();

  // Show loading spinner while checking auth
  if (authStatus === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={
        authStatus === 'authenticated' ? <Navigate to="/" replace /> : <LoginPage />
      } />
      <Route
        element={
          authStatus === 'authenticated' ? <Layout /> : <Navigate to="/login" replace />
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="/sessions" element={<SessionsPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/webhooks" element={<WebhooksPage />} />
        <Route path="/email" element={<EmailPage />} />
        <Route path="/logs" element={<LogsPage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/api-keys" element={<ApiKeysPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
