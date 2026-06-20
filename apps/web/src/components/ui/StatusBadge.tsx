import { clsx } from 'clsx';
import { SessionState } from '../../types';

const statusConfig: Record<string, { class: string; label: string }> = {
  [SessionState.CONNECTED]: { class: 'badge-success', label: 'Conectado' },
  [SessionState.CONNECTING]: { class: 'badge-info', label: 'Conectando' },
  [SessionState.WAITING_QR]: { class: 'badge-warning', label: 'Esperando QR' },
  [SessionState.DISCONNECTED]: { class: 'badge-error', label: 'Desconectado' },
  [SessionState.RECONNECTING]: { class: 'badge-warning', label: 'Reconectando' },
  [SessionState.LOGGED_OUT]: { class: 'badge-neutral', label: 'Sesión cerrada' },
  [SessionState.ERROR]: { class: 'badge-error', label: 'Error' },
  [SessionState.CREATED]: { class: 'badge-neutral', label: 'Creada' },
};

interface StatusBadgeProps {
  state: SessionState | string;
}

export function StatusBadge({ state }: StatusBadgeProps) {
  const config = statusConfig[state] || { class: 'badge-neutral', label: state };
  return <span className={config.class}>{config.label}</span>;
}
