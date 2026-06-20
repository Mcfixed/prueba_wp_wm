import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Play, Square, RefreshCw, Trash2, Eye, QrCode, MessageSquare } from 'lucide-react';
import { sessionApi } from '../services/api';
import { getSocket, connectSocket } from '../services/socket';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Session, SessionState } from '../types';
import { useUIStore } from '../stores/uiStore';

export function SessionsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [viewingQr, setViewingQr] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: () => sessionApi.list(),
    refetchInterval: 5000,
  });

  // ── WebSocket: listen for real-time QR and state updates ──
  useEffect(() => {
    const socket = connectSocket();

    const handleQr = (data: { sessionId: string; qrCode: string }) => {
      setViewingQr(data.sessionId);
      setQrCode(data.qrCode);
    };

    const handleState = () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    };

    socket.on('session:qr', handleQr);
    socket.on('session:state', handleState);
    socket.on('session:connected', handleState);

    return () => {
      socket.off('session:qr', handleQr);
      socket.off('session:state', handleState);
      socket.off('session:connected', handleState);
    };
  }, [queryClient]);

  const createMutation = useMutation({
    mutationFn: () => sessionApi.create({ name: newName, description: newDesc || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
      setShowCreate(false);
      setNewName('');
      setNewDesc('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => sessionApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions'] }),
  });

  const [connectError, setConnectError] = useState<string | null>(null);

  const connectMutation = useMutation({
    mutationFn: (id: string) => sessionApi.connect(id),
    onSuccess: (data, id) => {
      setConnectError(null);
      if (data.qrCode) {
        setViewingQr(id);
        setQrCode(data.qrCode);
      }
      // Force immediate refresh so state changes from LOGGED_OUT to CREATED/CONNECTING
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
    onError: (err: any) => {
      setConnectError(err?.message || 'Error al conectar la sesión');
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: (id: string) => sessionApi.disconnect(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions'] }),
  });

  const restartMutation = useMutation({
    mutationFn: (id: string) => sessionApi.restart(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sessions'] }),
  });

  const handleViewQr = async (sessionId: string) => {
    try {
      const data = await sessionApi.qr(sessionId);
      setViewingQr(sessionId);
      setQrCode(data.qrCode);
    } catch {
      setViewingQr(sessionId);
      setQrCode(null);
    }
  };

  const sessions: Session[] = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Gestión de Sesiones</h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus size={18} />
          Nueva Sesión
        </button>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold mb-4">Nueva Sesión WhatsApp</h2>
            <div className="space-y-4">
              <div>
                <label className="label">Nombre</label>
                <input
                  className="input"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Sucursal Norte"
                />
              </div>
              <div>
                <label className="label">Descripción</label>
                <textarea
                  className="input"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Descripción opcional"
                  rows={3}
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowCreate(false)} className="btn-secondary">
                  Cancelar
                </button>
                <button
                  onClick={() => createMutation.mutate()}
                  className="btn-primary"
                  disabled={!newName || createMutation.isPending}
                >
                  {createMutation.isPending ? 'Creando...' : 'Crear'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {viewingQr && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card w-full max-w-sm mx-4 text-center">
            <h2 className="text-lg font-semibold mb-4">Código QR</h2>
            {qrCode ? (
              <div className="bg-white p-4 rounded-lg inline-block">
                <img src={qrCode} alt="WhatsApp QR" className="w-64 h-64" />
              </div>
            ) : (
              <p className="text-gray-500 py-8">No hay código QR disponible</p>
            )}
            <p className="text-sm text-gray-500 mt-3">
              Escanea con WhatsApp para conectar la sesión
            </p>
            <button
              onClick={() => { setViewingQr(null); setQrCode(null); }}
              className="btn-secondary mt-4"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Connection Error */}
      {connectError && (
        <div className="p-4 text-sm text-red-700 bg-red-50 dark:bg-red-950 dark:text-red-300 rounded-lg border border-red-200 dark:border-red-800">
          <strong>Error:</strong> {connectError}
          <button onClick={() => setConnectError(null)} className="ml-3 underline">Cerrar</button>
        </div>
      )}

      {/* Sessions Table */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No hay sesiones creadas</p>
            <p className="text-sm">Crea tu primera sesión para comenzar</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="text-left p-4 text-sm font-medium text-gray-500">Nombre</th>
                <th className="text-left p-4 text-sm font-medium text-gray-500">Estado</th>
                <th className="text-left p-4 text-sm font-medium text-gray-500">Última Actividad</th>
                <th className="text-left p-4 text-sm font-medium text-gray-500">Conexión</th>
                <th className="text-right p-4 text-sm font-medium text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => (
                <tr
                  key={session.id}
                  className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                >
                  <td className="p-4">
                    <div>
                      <p className="font-medium">{session.name}</p>
                      {session.description && (
                        <p className="text-sm text-gray-500">{session.description}</p>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <StatusBadge state={session.state} />
                  </td>
                  <td className="p-4 text-sm text-gray-500">
                    {session.lastActivityAt
                      ? new Date(session.lastActivityAt).toLocaleString()
                      : '—'}
                  </td>
                  <td className="p-4 text-sm text-gray-500">
                    {session.lastConnectionAt
                      ? new Date(session.lastConnectionAt).toLocaleString()
                      : '—'}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleViewQr(session.id)}
                        className="btn-ghost p-2"
                        title="Ver QR"
                      >
                        <QrCode size={16} />
                      </button>
                      <button
                        onClick={() => connectMutation.mutate(session.id)}
                        className="btn-ghost p-2 text-green-600"
                        title="Conectar"
                        disabled={session.state === SessionState.CONNECTED}
                      >
                        <Play size={16} />
                      </button>
                      <button
                        onClick={() => disconnectMutation.mutate(session.id)}
                        className="btn-ghost p-2 text-red-600"
                        title="Desconectar"
                        disabled={session.state !== SessionState.CONNECTED}
                      >
                        <Square size={16} />
                      </button>
                      <button
                        onClick={() => restartMutation.mutate(session.id)}
                        className="btn-ghost p-2"
                        title="Reiniciar"
                      >
                        <RefreshCw size={16} />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm('¿Eliminar esta sesión?')) {
                            deleteMutation.mutate(session.id);
                          }
                        }}
                        className="btn-ghost p-2 text-red-600"
                        title="Eliminar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
