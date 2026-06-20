import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Mail, Save, Trash2 } from 'lucide-react';
import { emailApi } from '../services/api';
import { EmailConfig } from '../types';

export function EmailPage() {
  const [form, setForm] = useState({
    host: '',
    port: 587,
    secure: false,
    user: '',
    password: '',
    recipients: '',
  });
  const queryClient = useQueryClient();

  const { data: config } = useQuery({
    queryKey: ['email-config'],
    queryFn: () => emailApi.get(),
  });

  useEffect(() => {
    if (config) {
      setForm({
        host: config.host || '',
        port: config.port || 587,
        secure: config.secure || false,
        user: config.username || '',
        password: '',
        recipients: (config.recipients || []).join(', '),
      });
    }
  }, [config]);

  const saveMutation = useMutation({
    mutationFn: () =>
      emailApi.upsert({
        host: form.host,
        port: form.port,
        secure: form.secure,
        user: form.user,
        password: form.password,
        recipients: form.recipients.split(',').map((r) => r.trim()).filter(Boolean),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-config'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => emailApi.delete(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-config'] });
      setForm({ host: '', port: 587, secure: false, user: '', password: '', recipients: '' });
    },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Configuración SMTP</h1>

      <div className="card max-w-2xl">
        {!config ? (
          <div className="text-center py-8 text-gray-500 mb-6">
            <Mail className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No hay configuración SMTP</p>
            <p className="text-sm">Configura un servidor SMTP para enviar correos</p>
          </div>
        ) : null}

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Host</label>
              <input
                className="input"
                value={form.host}
                onChange={(e) => setForm((f) => ({ ...f, host: e.target.value }))}
                placeholder="smtp.gmail.com"
              />
            </div>
            <div>
              <label className="label">Puerto</label>
              <input
                type="number"
                className="input"
                value={form.port}
                onChange={(e) => setForm((f) => ({ ...f, port: parseInt(e.target.value) || 587 }))}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="secure"
              checked={form.secure}
              onChange={(e) => setForm((f) => ({ ...f, secure: e.target.checked }))}
              className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            />
            <label htmlFor="secure" className="text-sm">SSL</label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Usuario</label>
              <input
                className="input"
                value={form.user}
                onChange={(e) => setForm((f) => ({ ...f, user: e.target.value }))}
                placeholder="tu@email.com"
              />
            </div>
            <div>
              <label className="label">Contraseña</label>
              <input
                type="password"
                className="input"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder={config ? '•••••••• (dejar vacío para mantener)' : ''}
              />
            </div>
          </div>

          <div>
            <label className="label">Destinatarios (separados por coma)</label>
            <input
              className="input"
              value={form.recipients}
              onChange={(e) => setForm((f) => ({ ...f, recipients: e.target.value }))}
              placeholder="soporte@empresa.com, operaciones@empresa.com"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => saveMutation.mutate()}
              className="btn-primary"
              disabled={saveMutation.isPending}
            >
              <Save size={16} />
              {saveMutation.isPending ? 'Guardando...' : 'Guardar'}
            </button>
            {config && (
              <button
                onClick={() => deleteMutation.mutate()}
                className="btn-danger"
                disabled={deleteMutation.isPending}
              >
                <Trash2 size={16} />
                Eliminar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
