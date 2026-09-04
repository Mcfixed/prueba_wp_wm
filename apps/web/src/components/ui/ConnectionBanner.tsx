import { useEffect } from 'react';
import { WifiOff, AlertTriangle } from 'lucide-react';
import { useUIStore } from '../../stores/uiStore';

const HEALTH_URL = '/api/v1/health';

/**
 * Banner global de conexión.
 *
 * - Sondea el health-check del backend cada 10s para detectar cuándo el backend
 *   se cae (frontend sin backend no funciona) o se recupera.
 * - Muestra una barra cuando el backend está caído ("offline") o inestable
 *   ("degraded", p. ej. avisado por el backend vía websocket `app:status`).
 *
 * Se monta en la raíz de la app para que también aparezca en la pantalla de
 * login (donde hoy "no se puede hacer nada" cuando el backend está caído).
 */
export function ConnectionBanner() {
  const { connection, connectionMessage, setConnection } = useUIStore();

  useEffect(() => {
    let active = true;

    async function checkHealth() {
      try {
        const res = await fetch(HEALTH_URL, { cache: 'no-store' });
        if (!active) return;
        if (res.ok) {
          setConnection('online');
        } else {
          // 503 = backend "degraded" (p. ej. base de datos caída)
          const body = await res.json().catch(() => null);
          setConnection(
            'degraded',
            body?.status === 'degraded'
              ? 'Backend degradado: base de datos no disponible. Reintentando…'
              : `Backend respondió con error (${res.status}). Reintentando…`
          );
        }
      } catch {
        if (!active) return;
        setConnection('offline', 'No se puede conectar con el backend. Reintentando…');
      }
    }

    checkHealth();
    const interval = setInterval(checkHealth, 10_000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [setConnection]);

  if (connection === 'online') {
    return null;
  }

  const isOffline = connection === 'offline';
  const message =
    connectionMessage ||
    (isOffline
      ? 'No se puede conectar con el backend. Reintentando…'
      : 'Inestabilidad detectada. El backend se está recuperando…');

  return (
    <div
      role="alert"
      className={
        'sticky top-0 z-50 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white shadow-md ' +
        (isOffline ? 'bg-red-600' : 'bg-amber-500')
      }
    >
      {isOffline ? (
        <WifiOff className="w-4 h-4 shrink-0" />
      ) : (
        <AlertTriangle className="w-4 h-4 shrink-0" />
      )}
      <span className="text-center">{message}</span>
    </div>
  );
}
