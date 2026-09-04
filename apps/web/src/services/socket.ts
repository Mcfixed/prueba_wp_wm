import { io, Socket } from 'socket.io-client';
import { getAccessToken } from './api';
import { useUIStore } from '../stores/uiStore';

let socket: Socket | null = null;

export function connectSocket(): Socket {
  if (socket?.connected) return socket;

  const token = getAccessToken();
  socket = io(window.location.origin, {
    path: '/ws',
    auth: { token },
    transports: ['websocket', 'polling'],
  });

  socket.on('connect', () => {
    console.log('WebSocket connected');
    useUIStore.getState().setConnection('online');
  });

  socket.on('disconnect', (reason) => {
    console.log('WebSocket disconnected:', reason);
    // Ignore manual disconnects (logout). socket.io auto-reconnects the rest.
    if (reason === 'io client disconnect') return;
    useUIStore.getState().setConnection('offline', 'Conexión en tiempo real perdida. Reconectando…');
  });

  socket.on('connect_error', (error) => {
    console.error('WebSocket connection error:', error.message);
    useUIStore.getState().setConnection('offline', 'Backend no disponible. Reconectando…');
  });

  // Backend notifies about transient errors it caught (kept alive, but degraded).
  socket.on('app:status', (data: any) => {
    if (data?.status === 'degraded') {
      console.warn('Backend degraded:', data);
      useUIStore.getState().setConnection(
        'degraded',
        data.message ? `Inestabilidad detectada: ${data.message}` : 'Inestabilidad detectada en el backend'
      );
    }
  });

  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket(): Socket | null {
  return socket;
}

export function subscribeToSession(sessionId: string): void {
  socket?.emit('subscribe:session', sessionId);
}

export function unsubscribeFromSession(sessionId: string): void {
  socket?.emit('unsubscribe:session', sessionId);
}
