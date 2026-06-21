import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Copy, Check, Key, RefreshCw, Eye, EyeOff } from 'lucide-react';

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

async function apiDelete(path: string): Promise<void> {
  const token = localStorage.getItem('accessToken');
  await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}

async function apiPatch(path: string): Promise<void> {
  const token = localStorage.getItem('accessToken');
  await fetch(`${API_BASE}${path}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
  });
}

interface ApiKey {
  id: string;
  name: string;
  key: string;
  enabled: boolean;
  lastUsedAt: string | null;
  createdAt: string;
  expiresAt: string | null;
}

export function ApiKeysPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [expiresDays, setExpiresDays] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [visibleKey, setVisibleKey] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: keys, isLoading } = useQuery({
    queryKey: ['api-keys'],
    queryFn: () => apiGet<ApiKey[]>('/api-keys'),
    refetchInterval: 10000,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      apiPost('/api-keys', {
        name: newName,
        expiresInDays: expiresDays ? parseInt(expiresDays) : null,
      }),
    onSuccess: (data: any) => {
      setCreatedKey(data.key);
      setShowCreate(false);
      queryClient.invalidateQueries({ queryKey: ['api-keys'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiDelete(`/api-keys/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['api-keys'] }),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => apiPatch(`/api-keys/${id}/toggle`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['api-keys'] }),
  });

  const copyKey = async (key: string) => {
    await navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">API Keys</h1>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus size={18} />
          Nueva API Key
        </button>
      </div>

      <div className="card bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
        <p className="text-sm text-blue-800 dark:text-blue-200">
          <strong>💡 Usa API Keys en Node-RED</strong> en lugar del token JWT.
          Las API Keys no expiran (a menos que configures expiración) y se pueden
          revocar individualmente.
        </p>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card w-full max-w-md mx-4">
            <h2 className="text-lg font-semibold mb-4">Nueva API Key</h2>
            <div className="space-y-4">
              <div>
                <label className="label">Nombre</label>
                <input
                  className="input"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Node-RED Producción"
                />
              </div>
              <div>
                <label className="label">Expira en (días, opcional)</label>
                <input
                  type="number"
                  className="input"
                  value={expiresDays}
                  onChange={(e) => setExpiresDays(e.target.value)}
                  placeholder="Dejar vacío = no expira"
                  min={1}
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

      {/* Show created key once */}
      {createdKey && (
        <div className="card border-yellow-400 bg-yellow-50 dark:bg-yellow-950">
          <h3 className="font-semibold mb-2">⚠️ API Key creada</h3>
          <p className="text-sm mb-2">Guarda esta clave ahora. No podrás volver a verla.</p>
          <div className="flex items-center gap-2 bg-white dark:bg-gray-900 p-3 rounded border">
            <code className="flex-1 text-sm font-mono break-all">{createdKey}</code>
            <button onClick={() => copyKey(createdKey)} className="btn-ghost p-2">
              {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
            </button>
          </div>
          <button onClick={() => setCreatedKey(null)} className="btn-secondary mt-3">
            Cerrar
          </button>
        </div>
      )}

      {/* Keys table */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center p-8">
            <RefreshCw className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : !keys || keys.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Key className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No hay API Keys</p>
            <p className="text-sm">Crea una para usarla desde Node-RED</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-800">
                <th className="text-left p-4 text-sm font-medium text-gray-500">Nombre</th>
                <th className="text-left p-4 text-sm font-medium text-gray-500">Key</th>
                <th className="text-left p-4 text-sm font-medium text-gray-500">Estado</th>
                <th className="text-left p-4 text-sm font-medium text-gray-500">Último uso</th>
                <th className="text-right p-4 text-sm font-medium text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {keys.map((apiKey) => (
                <tr key={apiKey.id} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="p-4 font-medium">{apiKey.name}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-mono text-gray-500">
                        {visibleKey === apiKey.id
                          ? apiKey.key
                          : `${apiKey.key.substring(0, 10)}...`}
                      </code>
                      <button
                        onClick={() => setVisibleKey(visibleKey === apiKey.id ? null : apiKey.id)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        {visibleKey === apiKey.id ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button
                        onClick={() => copyKey(apiKey.key)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <Copy size={14} />
                      </button>
                    </div>
                    {apiKey.expiresAt && (
                      <p className="text-xs text-gray-400 mt-1">
                        Expira: {new Date(apiKey.expiresAt).toLocaleDateString()}
                      </p>
                    )}
                  </td>
                  <td className="p-4">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={apiKey.enabled}
                        onChange={() => toggleMutation.mutate(apiKey.id)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-600 rounded-full"></div>
                    </label>
                  </td>
                  <td className="p-4 text-sm text-gray-400">
                    {apiKey.lastUsedAt
                      ? new Date(apiKey.lastUsedAt).toLocaleString()
                      : 'Nunca'}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => {
                        if (confirm('¿Eliminar esta API Key?')) deleteMutation.mutate(apiKey.id);
                      }}
                      className="btn-ghost p-2 text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
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
