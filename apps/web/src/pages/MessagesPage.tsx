import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Send, MessageSquare, RefreshCw, Phone, User } from 'lucide-react';
import { sessionApi } from '../services/api';
import { clsx } from 'clsx';

const API_BASE = '/api/v1';

async function apiGet<T>(path: string): Promise<T> {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Request failed');
  return res.json();
}

async function apiPost<T>(path: string, body: any): Promise<T> {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Request failed');
  return res.json();
}

interface ConnectedSession {
  id: string;
  name: string;
}

export function MessagesPage() {
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [messageText, setMessageText] = useState('');
  const [sendStatus, setSendStatus] = useState<string | null>(null);

  // Get connected sessions
  const { data: sessions, isLoading: loadingSessions } = useQuery({
    queryKey: ['connected-sessions'],
    queryFn: () => apiGet<ConnectedSession[]>('/messages/connected'),
    refetchInterval: 5000,
  });

  // Get contacts for selected session
  const { data: contacts } = useQuery({
    queryKey: ['session-contacts', selectedSession],
    queryFn: () => apiGet<any[]>(`/messages/${selectedSession}/contacts`),
    enabled: !!selectedSession,
    refetchInterval: 10000,
  });

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: () =>
      apiPost(`/messages/${selectedSession}/send`, {
        to: phoneNumber,
        text: messageText,
      }),
    onSuccess: () => {
      setSendStatus('✅ Mensaje enviado');
      setMessageText('');
      setTimeout(() => setSendStatus(null), 3000);
    },
    onError: (err: any) => {
      setSendStatus(`❌ Error: ${err.message}`);
      setTimeout(() => setSendStatus(null), 5000);
    },
  });

  return (
    <div className="flex h-[calc(100vh-3rem)] gap-4">
      {/* Left sidebar - Connected sessions */}
      <div className="w-72 flex-shrink-0 card overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <h2 className="font-semibold text-sm flex items-center gap-2">
            <MessageSquare size={16} />
            Sesiones Conectadas
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {loadingSessions ? (
            <div className="flex justify-center p-4">
              <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
            </div>
          ) : !sessions || sessions.length === 0 ? (
            <p className="text-sm text-gray-500 text-center p-4">
              No hay sesiones conectadas
            </p>
          ) : (
            sessions.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setSelectedSession(s.id);
                  setSendStatus(null);
                }}
                className={clsx(
                  'w-full text-left p-3 rounded-lg text-sm transition-colors',
                  selectedSession === s.id
                    ? 'bg-primary-50 text-primary-700 dark:bg-primary-950 dark:text-primary-300'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                )}
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                    <MessageSquare size={14} className="text-primary-600" />
                  </div>
                  <span className="font-medium truncate">{s.name}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right panel - Message composer */}
      <div className="flex-1 card flex flex-col">
        {!selectedSession ? (
          <div className="flex-1 flex items-center justify-center text-gray-500">
            <div className="text-center">
              <MessageSquare size={48} className="mx-auto mb-3 text-gray-300" />
              <p>Selecciona una sesión para enviar mensajes</p>
            </div>
          </div>
        ) : (
          <>
            <div className="p-4 border-b border-gray-200 dark:border-gray-800">
              <h2 className="font-semibold">
                Enviar mensaje desde{' '}
                <span className="text-primary-600">
                  {sessions?.find((s) => s.id === selectedSession)?.name}
                </span>
              </h2>
            </div>

            <div className="flex-1 p-4 space-y-4">
              {/* Quick contacts */}
              {contacts && contacts.length > 0 && (
                <div>
                  <label className="label">Contactos recientes</label>
                  <div className="flex flex-wrap gap-2">
                    {contacts.map((c: any) => (
                      <button
                        key={c.jid}
                        onClick={() => setPhoneNumber(c.jid.split('@')[0])}
                        className="btn-ghost text-xs border border-gray-200 dark:border-gray-700"
                      >
                        <User size={12} />
                        {c.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Phone input */}
              <div>
                <label className="label">Número de teléfono</label>
                <div className="flex items-center gap-2">
                  <Phone size={16} className="text-gray-400" />
                  <input
                    className="input"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="521234567890"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Código de país incluido, sin + ni espacios. Ej: 521234567890
                </p>
              </div>

              {/* Message text */}
              <div>
                <label className="label">Mensaje</label>
                <textarea
                  className="input"
                  rows={4}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  placeholder="Escribe tu mensaje aquí..."
                />
              </div>

              {/* Send button */}
              <button
                onClick={() => sendMutation.mutate()}
                className="btn-primary"
                disabled={!phoneNumber || !messageText || sendMutation.isPending}
              >
                <Send size={16} />
                {sendMutation.isPending ? 'Enviando...' : 'Enviar mensaje'}
              </button>

              {/* Status */}
              {sendStatus && (
                <div className="text-sm font-medium">{sendStatus}</div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
