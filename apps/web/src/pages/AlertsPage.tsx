import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, RefreshCw, Bell } from 'lucide-react';
import { alertApi, sessionApi } from '../services/api';
import { AlertRule, Session, AlertEvent, AlertChannel } from '../types';

const EVENT_OPTIONS = [
  { value: AlertEvent.SESSION_DISCONNECTED, label: 'Desconexión' },
  { value: AlertEvent.SESSION_CONNECTED, label: 'Conexión exitosa' },
  { value: AlertEvent.AUTH_ERROR, label: 'Error de autenticación' },
  { value: AlertEvent.QR_GENERATED, label: 'QR generado' },
  { value: AlertEvent.QR_EXPIRED, label: 'QR expirado' },
  { value: AlertEvent.MESSAGE_RECEIVED, label: 'Mensaje recibido' },
  { value: AlertEvent.MESSAGE_FAILED, label: 'Mensaje fallido' },
  { value: AlertEvent.RETRIES_EXHAUSTED, label: 'Reintentos agotados' },
];

const CHANNEL_OPTIONS = [
  { value: AlertChannel.WEBHOOK, label: 'Webhook' },
  { value: AlertChannel.EMAIL, label: 'Email' },
  { value: AlertChannel.SOCKET, label: 'Socket.io' },
  { value: AlertChannel.INTERNAL_LOG, label: 'Log interno' },
];

export function AlertsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedEvent, setSelectedEvent] = useState('');
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const { data: rules } = useQuery({
    queryKey: ['alert-rules'],
    queryFn: () => alertApi.list(),
  });

  const { data: sessionsData } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => sessionApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      alertApi.create({
        sessionId: selectedSession,
        event: selectedEvent,
        channels: selectedChannels,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alert-rules'] });
      setShowCreate(false);
      resetForm();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => alertApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alert-rules'] }),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      alertApi.update(id, { enabled }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['alert-rules'] }),
  });

  function resetForm() {
    setSelectedSession('');
    setSelectedEvent('');
    setSelectedChannels([]);
  }

  const toggleChannel = (channel: string) => {
    setSelectedChannels((prev) =>
      prev.includes(channel) ? prev.filter((c) => c !== channel) : [...prev, channel]
    );
  };

  const sessions = sessionsData?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Centro de Alertas</h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus size={18} />
          Nueva Regla
        </button>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card w-full max-w-lg mx-4">
            <h2 className="text-lg font-semibold mb-4">Nueva Regla de Alerta</h2>
            <div className="space-y-4">
              <div>
                <label className="label">Sesión</label>
                <select
                  className="input"
                  value={selectedSession}
                  onChange={(e) => setSelectedSession(e.target.value)}
                >
                  <option value="">Seleccionar sesión</option>
                  {sessions.map((s: Session) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Evento</label>
                <select
                  className="input"
                  value={selectedEvent}
                  onChange={(e) => setSelectedEvent(e.target.value)}
                >
                  <option value="">Seleccionar evento</option>
                  {EVENT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Canales de notificación</label>
                <div className="space-y-2 mt-1">
                  {CHANNEL_OPTIONS.map((ch) => (
                    <label key={ch.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedChannels.includes(ch.value)}
                        onChange={() => toggleChannel(ch.value)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      <span className="text-sm">{ch.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 justify-end">
                <button onClick={() => { setShowCreate(false); resetForm(); }} className="btn-secondary">
                  Cancelar
                </button>
                <button
                  onClick={() => createMutation.mutate()}
                  className="btn-primary"
                  disabled={!selectedSession || !selectedEvent || selectedChannels.length === 0}
                >
                  {createMutation.isPending ? 'Creando...' : 'Crear'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Rules List */}
      <div className="card">
        {!rules || rules.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No hay reglas de alerta configuradas</p>
            <p className="text-sm">Crea una regla para recibir notificaciones</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rules.map((rule: AlertRule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{rule.session?.name || 'Unknown'}</span>
                    <span className="text-sm text-gray-500">{rule.event}</span>
                  </div>
                  <div className="flex gap-2 mt-1">
                    {rule.channels.map((ch) => (
                      <span key={ch} className="badge-neutral text-xs">
                        {ch}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rule.enabled}
                      onChange={() =>
                        toggleMutation.mutate({ id: rule.id, enabled: !rule.enabled })
                      }
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                  <button
                    onClick={() => deleteMutation.mutate(rule.id)}
                    className="btn-ghost p-2 text-red-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
