import { useEffect, useCallback } from 'react';
import { getSocket, connectSocket, disconnectSocket } from '../services/socket';

export function useSocket() {
  useEffect(() => {
    const socket = connectSocket();
    return () => {
      disconnectSocket();
    };
  }, []);

  const onEvent = useCallback((event: string, handler: (data: any) => void) => {
    const socket = getSocket();
    if (socket) {
      socket.on(event, handler);
      return () => {
        socket.off(event, handler);
      };
    }
    return () => {};
  }, []);

  return { onEvent, socket: getSocket() };
}
