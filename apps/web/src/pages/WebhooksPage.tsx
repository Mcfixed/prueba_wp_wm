import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, RefreshCw, Webhook } from 'lucide-react';
import { webhookApi, sessionApi } from '../services/api';
import { WebhookConfig, Session } from '../types';

export function WebhooksPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState<string[]>(['SESSION_DISCONNECTED']);
  const [sessionIds, setSessionIds] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const { data: webhooks } = useQuery({
    queryKey: ['webhooks'],
    queryFn: () => webhookApi.list(),
  });

  const { data: sessionsData } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => sessionApi.list(),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      webhookApi.create({ name, url, events, sessionIds: sessionIds.length > 0 ? sessionIds : undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['webhooks'] });
      setShowCreate(false);
      setName('');
      setUrl('');
      setEvents(['SESSION_DISCONNECTED']);
      setSessionIds([]);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => webhookApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['webhooks'] }),
  });

  const sessions = sessionsData?.data || [];

  const toggleSession = (id: string) => {
    setSessionIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const EVENT_OPTIONS = [
    'SESSION_DISCONNECTED', 'SESSION_CONNECTED', 'AUTH_ERROR',
    'QR_GENERATED', 'QR_EXPIRED', 'MESSAGE_RECEIVED', 'MESSAGE_FAILED', 'RETRIES_EXHAUSTED',
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Webhooks</h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus size={18} />
          Nuevo Webhook
        </button>
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card w-full max-w-lg mx-4">
            <h2 className="text-lg font-semibold mb-4">Nuevo Webhook</h2>
            <div className="space-y-4">
              <div>
                <label className="label">Nombre</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Mi Webhook" />
              </div>
              <div>
                <label className="label">URL</label>
                <input className="input" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://ejemplo.com/webhook" />
              </div>
              <div>
                <label className="label">Eventos</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {EVENT_OPTIONS.map((evt) => (
                    <label key={evt} className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={events.includes(evt)}
                        onChange={() =>
                          setEvents((prev) =>
                            prev.includes(evt) ? prev.filter((e) => e !== evt) : [...prev, evt]
                          )
                        }
                        className="rounded border-gray-300 text-primary-600"
                      />
                      {evt}
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <label className="label">Sesiones (opcional)</label>
                <div className="grid grid-cols-2 gap-2 mt-1">
                  {sessions.map((s: Session) => (
                    <label key={s.id} className="flex items-center gap-2 cursor-pointer text-sm">
                      <input
                        type="checkbox"
                        checked={sessionIds.includes(s.id)}
                        onChange={() => toggleSession(s.id)}
                        className="rounded border-gray-300 text-primary-600"
                      />
                      {s.name}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancelar</button>
                <button onClick={() => createMutation.mutate()} className="btn-primary" disabled={!name || !url}>
                  {createMutation.isPending ? 'Creando...' : 'Crear'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        {!webhooks || webhooks.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Webhook className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No hay webhooks configurados</p>
          </div>
        ) : (
          <div className="space-y-3">
            {webhooks.map((wh: WebhookConfig) => (
              <div key={wh.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{wh.name}</span>
                    <code className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">{wh.url}</code>
                  </div>
                  <div className="flex gap-2 mt-1">
                    {wh.events.slice(0, 3).map((evt) => (
                      <span key={evt} className="badge-neutral text-xs">{evt}</span>
                    ))}
                    {wh.events.length > 3 && (
                      <span className="text-xs text-gray-500">+{wh.events.length - 3}</span>
                    )}
                  </div>
                </div>
                <button onClick={() => deleteMutation.mutate(wh.id)} className="btn-ghost p-2 text-red-600">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
