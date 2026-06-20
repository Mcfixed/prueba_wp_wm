const API_BASE = '/api/v1';

let accessToken: string | null = localStorage.getItem('accessToken');

export function setAccessToken(token: string | null) {
  accessToken = token;
  if (token) {
    localStorage.setItem('accessToken', token);
  } else {
    localStorage.removeItem('accessToken');
  }
}

export function getAccessToken(): string | null {
  return accessToken;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    // Try refresh token
    const refreshed = await tryRefresh();
    if (refreshed) {
      headers['Authorization'] = `Bearer ${accessToken}`;
      const retryResponse = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
      });
      if (!retryResponse.ok) {
        throw new ApiError('Request failed', retryResponse.status);
      }
      return retryResponse.json();
    }
    // Redirect to login
    setAccessToken(null);
    window.location.href = '/login';
    throw new ApiError('Unauthorized', 401);
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: { message: 'Request failed' } }));
    throw new ApiError(error.error?.message || 'Request failed', response.status);
  }

  return response.json();
}

async function tryRefresh(): Promise<boolean> {
  const refreshToken = localStorage.getItem('refreshToken');
  if (!refreshToken) return false;

  try {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });

    if (!response.ok) return false;

    const data = await response.json();
    setAccessToken(data.accessToken);
    localStorage.setItem('refreshToken', data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

// ── Auth ──
export const authApi = {
  login: (email: string, password: string) =>
    request<{ accessToken: string; refreshToken: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  logout: (refreshToken: string) =>
    request('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }),
  me: () => request<any>('/auth/me'),
};

// ── Sessions ──
export const sessionApi = {
  list: (page = 1, limit = 20) =>
    request<{ data: any[]; total: number; page: number; limit: number; totalPages: number }>(
      `/sessions?page=${page}&limit=${limit}`
    ),
  get: (id: string) => request<any>(`/sessions/${id}`),
  create: (data: { name: string; description?: string }) =>
    request<any>('/sessions', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { name?: string; description?: string }) =>
    request<any>(`/sessions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request(`/sessions/${id}`, { method: 'DELETE' }),
  connect: (id: string) =>
    request<{ qrCode: string }>(`/sessions/${id}/connect`, { method: 'POST' }),
  disconnect: (id: string) =>
    request(`/sessions/${id}/disconnect`, { method: 'POST' }),
  restart: (id: string) =>
    request(`/sessions/${id}/restart`, { method: 'POST' }),
  logs: (id: string, page = 1, limit = 50) =>
    request<any>(`/sessions/${id}/logs?page=${page}&limit=${limit}`),
  qr: (id: string) => request<{ qrCode: string | null }>(`/sessions/${id}/qr`),
};

// ── Alerts ──
export const alertApi = {
  list: () => request<any[]>('/alerts'),
  create: (data: { sessionId: string; event: string; channels: string[] }) =>
    request<any>('/alerts', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    request<any>(`/alerts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request(`/alerts/${id}`, { method: 'DELETE' }),
  history: (page = 1, limit = 20) =>
    request<any>(`/alerts/history?page=${page}&limit=${limit}`),
};

// ── Webhooks ──
export const webhookApi = {
  list: () => request<any[]>('/webhooks/config'),
  create: (data: any) =>
    request<any>('/webhooks/config', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    request<any>(`/webhooks/config/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => request(`/webhooks/config/${id}`, { method: 'DELETE' }),
};

// ── Email ──
export const emailApi = {
  get: () => request<any>('/email'),
  upsert: (data: any) =>
    request<any>('/email', { method: 'PUT', body: JSON.stringify(data) }),
  delete: () => request('/email', { method: 'DELETE' }),
};

// ── Logs ──
export const logApi = {
  list: (params?: Record<string, string | number>) => {
    const query = params
      ? '?' + new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString()
      : '';
    return request<any>(`/logs${query}`);
  },
};

// ── Dashboard ──
export const dashboardApi = {
  stats: () => request<any>('/dashboard/stats'),
};
