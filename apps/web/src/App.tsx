import { useState, useEffect, Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { LoginPage } from './pages/LoginPage';
import { useAuthStore } from './stores/authStore';
import { authApi, setAccessToken } from './services/api';
import { ConnectionBanner } from './components/ui/ConnectionBanner';

// Lazy loaded pages (named exports need .then())
const DashboardPage = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })));
const SessionsPage = lazy(() => import('./pages/SessionsPage').then(m => ({ default: m.SessionsPage })));
const AlertsPage = lazy(() => import('./pages/AlertsPage').then(m => ({ default: m.AlertsPage })));
const WebhooksPage = lazy(() => import('./pages/WebhooksPage').then(m => ({ default: m.WebhooksPage })));
const EmailPage = lazy(() => import('./pages/EmailPage').then(m => ({ default: m.EmailPage })));
const LogsPage = lazy(() => import('./pages/LogsPage').then(m => ({ default: m.LogsPage })));
const MessagesPage = lazy(() => import('./pages/MessagesPage').then(m => ({ default: m.MessagesPage })));
const MessagesHistoryPage = lazy(() => import('./pages/MessagesHistoryPage').then(m => ({ default: m.MessagesHistoryPage })));
const ApiKeysPage = lazy(() => import('./pages/ApiKeysPage').then(m => ({ default: m.ApiKeysPage })));

const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full" />
  </div>
);

function useAuthCheck() {
  const { isAuthenticated, setUser } = useAuthStore();
  const [status, setStatus] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const hasAccess = !!localStorage.getItem('accessToken');
      const hasRefresh = !!localStorage.getItem('refreshToken');
      if (!hasAccess && !hasRefresh) {
        setStatus('unauthenticated');
        return;
      }

      // 1) Validate the current access token (request() auto-refreshes once on
      //    401 using the single-flight refresh, so it survives expiry).
      try {
        const user = await authApi.me();
        if (!cancelled) {
          setUser(user);
          setStatus('authenticated');
        }
        return;
      } catch {
        // 2) Expired/invalid token or a transient failure → try a clean
        //    silent refresh (single-flight, shared with all requests).
      }

      const refreshed = await authApi.silentLogin();
      if (refreshed) {
        try {
          const user = await authApi.me();
          if (!cancelled) {
            setUser(user);
            setStatus('authenticated');
          }
          return;
        } catch {
          // Refresh worked but /me still failed.
        }
      }

      // Only a real failure (no valid refresh token) logs the user out, so a
      // returning user with a stored session stays logged in.
      if (!cancelled) {
        setAccessToken(null);
        localStorage.removeItem('refreshToken');
        setStatus('unauthenticated');
      }
    }

    // If already authenticated from store, skip check
    if (isAuthenticated) {
      setStatus('authenticated');
      return;
    }

    check();
    return () => { cancelled = true; };
  }, [isAuthenticated, setUser]);

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
    <>
      {/* Global connection banner: warns when the backend is down/degraded,
          including on the login screen. */}
      <ConnectionBanner />
      <Suspense fallback={<PageLoader />}>
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
          <Route path="/messages/history" element={<MessagesHistoryPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/api-keys" element={<ApiKeysPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </>
  );
}
