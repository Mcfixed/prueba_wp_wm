import { create } from 'zustand';

export type BackendConnection = 'online' | 'offline' | 'degraded';

interface UIState {
  sidebarOpen: boolean;
  darkMode: boolean;
  /** Estado de conexión con el backend (online / caído / inestable) */
  connection: BackendConnection;
  /** Mensaje explicativo mostrado cuando no está online */
  connectionMessage: string | null;
  toggleSidebar: () => void;
  toggleDarkMode: () => void;
  setDarkMode: (value: boolean) => void;
  setConnection: (connection: BackendConnection, message?: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  darkMode: localStorage.getItem('darkMode') === 'true',
  connection: 'online',
  connectionMessage: null,
  toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  toggleDarkMode: () =>
    set((state) => {
      const newMode = !state.darkMode;
      localStorage.setItem('darkMode', String(newMode));
      return { darkMode: newMode };
    }),
  setDarkMode: (value) => {
    localStorage.setItem('darkMode', String(value));
    set({ darkMode: value });
  },
  setConnection: (connection, message = null) =>
    set({ connection, connectionMessage: message }),
}));
