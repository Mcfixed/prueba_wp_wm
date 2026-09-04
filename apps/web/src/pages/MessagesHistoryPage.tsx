import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  RefreshCw,
  Search,
  Send,
  CheckCircle2,
  Clock,
  Loader2,
  XCircle,
  Inbox,
} from 'lucide-react';
import { messageApi, sessionApi, OutboxMessage, MessageStats } from '../services/api';
import { clsx } from 'clsx';

const LIMIT = 25;

type Status = OutboxMessage['status'];

function statusBadge(msg: OutboxMessage): { label: string; cls: string } {
  if (msg.status === 'SENT' && msg.deliveredAt) {
    return { label: 'Entregado', cls: 'badge-success' };
  }
  switch (msg.status) {
    case 'SENT':
      return { label: 'Enviado', cls: 'badge-info' };
    case 'PROCESSING':
      return { label: 'Enviando', cls: 'badge-info' };
    case 'PENDING':
      return { label: 'En cola', cls: 'badge-warning' };
    case 'FAILED':
      return { label: 'Fallido', cls: 'badge-error' };
    default:
      return { label: msg.status, cls: 'badge-neutral' };
  }
}

const statusOptions: { value: '' | Status; label: string }[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'PENDING', label: 'En cola' },
  { value: 'PROCESSING', label: 'Enviando' },
  { value: 'SENT', label: 'Enviado' },
  { value: 'FAILED', label: 'Fallido' },
];

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: any;
  label: string;
  value: number;
  tone: string;
}) {
  return (
    <div className="card flex items-center gap-3 p-4">
      <div className={clsx('w-10 h-10 rounded-lg flex items-center justify-center', tone)}>
        <Icon size={20} />
      </div>
      <div>
        <div className="text-2xl font-bold leading-none">{value}</div>
        <div className="text-xs text-gray-500 mt-1">{label}</div>
      </div>
    </div>
  );
}

export function MessagesHistoryPage() {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<'' | Status>('');
  const [sessionId, setSessionId] = useState('');
  const [q, setQ] = useState('');
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['messages-history', page, status, sessionId, search],
    queryFn: () =>
      messageApi.list({
        page,
        limit: LIMIT,
        ...(status && { status }),
        ...(sessionId && { sessionId }),
        ...(search && { q: search }),
      }),
    refetchInterval: 5000,
  });

  const { data: stats } = useQuery({
    queryKey: ['messages-stats'],
    queryFn: () => messageApi.stats(),
    refetchInterval: 5000,
  });

  // Sessions for the filter dropdown.
  const { data: sessionsData } = useQuery({
    queryKey: ['sessions-light'],
    queryFn: () => sessionApi.list(1, 100),
    staleTime: 30000,
  });

  const messages: OutboxMessage[] = data?.data || [];
  const s: MessageStats | undefined = stats;

  const applyFilters = () => {
    setSearch(q.trim());
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Historial de Mensajes</h1>
          <p className="text-sm text-gray-500 mt-1">
            Todos los mensajes encolados por la API (outbox) y su estado real de envío.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <Stat icon={Inbox} label="Total" value={s?.total ?? 0} tone="bg-gray-100 text-gray-600 dark:bg-gray-800" />
        <Stat icon={Clock} label="En cola" value={s?.pending ?? 0} tone="bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300" />
        <Stat icon={Loader2} label="Enviando" value={s?.processing ?? 0} tone="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" />
        <Stat icon={Send} label="Enviados" value={s?.sent ?? 0} tone="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" />
        <Stat icon={CheckCircle2} label="Entregados" value={s?.delivered ?? 0} tone="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" />
        <Stat icon={XCircle} label="Fallidos" value={s?.failed ?? 0} tone="bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" />
      </div>

      {/* Filters */}
      <div className="card flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px]">
          <label className="label">Buscar</label>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              className="input pl-9"
              placeholder="Texto o destinatario…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
            />
          </div>
        </div>
        <div>
          <label className="label">Estado</label>
          <select
            className="input w-auto"
            value={status}
            onChange={(e) => { setStatus(e.target.value as '' | Status); setPage(1); }}
          >
            {statusOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="label">Sesión</label>
          <select
            className="input w-auto"
            value={sessionId}
            onChange={(e) => { setSessionId(e.target.value); setPage(1); }}
          >
            <option value="">Todas las sesiones</option>
            {(sessionsData?.data || []).map((sess: any) => (
              <option key={sess.id} value={sess.id}>{sess.name}</option>
            ))}
          </select>
        </div>
        <button type="button" onClick={applyFilters} className="btn-primary">
          <Search size={16} /> Filtrar
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => { setStatus(''); setSessionId(''); setQ(''); setSearch(''); setPage(1); }}
        >
          Limpiar
        </button>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-200 dark:border-gray-800">
                <th className="px-4 py-3 font-medium">Fecha</th>
                <th className="px-4 py-3 font-medium">Sesión</th>
                <th className="px-4 py-3 font-medium">Destinatario</th>
                <th className="px-4 py-3 font-medium">Mensaje</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Intentos</th>
                <th className="px-4 py-3 font-medium">WhatsApp ID</th>
                <th className="px-4 py-3 font-medium">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {isLoading ? (
                <tr>
                  <td colSpan={8}>
                    <div className="flex items-center justify-center h-40">
                      <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                  </td>
                </tr>
              ) : messages.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className="text-center py-12 text-gray-500">
                      <Inbox className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                      <p>No hay mensajes que coincidan con los filtros.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                messages.map((msg) => {
                  const badge = statusBadge(msg);
                  return (
                    <tr key={msg.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 align-top">
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                        {new Date(msg.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">{msg.session?.name || '-'}</td>
                      <td className="px-4 py-3 whitespace-nowrap font-mono text-xs">{msg.to}</td>
                      <td className="px-4 py-3">
                        <div className="max-w-xs truncate" title={msg.text}>{msg.text}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={badge.cls}>{badge.label}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                        {msg.attempts}/{msg.maxAttempts}
                      </td>
                      <td className="px-4 py-3">
                        <div
                          className="max-w-[10rem] truncate font-mono text-xs text-gray-500"
                          title={msg.waMessageId || undefined}
                        >
                          {msg.waMessageId || '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3 max-w-[12rem]">
                        {msg.status === 'FAILED' && msg.lastError ? (
                          <span className="text-xs text-red-600" title={msg.lastError}>
                            {msg.lastError}
                          </span>
                        ) : msg.deliveredAt ? (
                          <span className="text-xs text-green-600">
                            {new Date(msg.deliveredAt).toLocaleString()}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-secondary"
          >
            Anterior
          </button>
          <span className="text-sm text-gray-500">
            Página {page} de {data.totalPages} · {data.total} mensajes
          </span>
          <button
            onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))}
            disabled={page === data.totalPages}
            className="btn-secondary"
          >
            Siguiente
          </button>
        </div>
      )}
    </div>
  );
}
