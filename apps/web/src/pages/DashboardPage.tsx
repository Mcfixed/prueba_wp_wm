import { useQuery } from '@tanstack/react-query';
import {
  MessageSquare,
  Signal,
  Wifi,
  Send,
  Inbox,
  Activity,
  RefreshCw,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { StatCard } from '../components/ui/StatCard';
import { dashboardApi } from '../services/api';
import { DashboardStats } from '../types';

const COLORS = ['#22c55e', '#ef4444', '#f59e0b', '#6b7280', '#3b82f6'];

export function DashboardPage() {
  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboard-stats'],
    queryFn: () => dashboardApi.stats(),
    refetchInterval: 10000, // Refresh every 10s
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const pieData = [
    { name: 'Conectadas', value: stats?.connectedSessions || 0 },
    { name: 'Desconectadas', value: stats?.disconnectedSessions || 0 },
    {
      name: 'Otras',
      value: (stats?.totalSessions || 0) - (stats?.connectedSessions || 0) - (stats?.disconnectedSessions || 0),
    },
  ].filter((d) => d.value > 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Total Sesiones"
          value={stats?.totalSessions || 0}
          icon={MessageSquare}
          color="primary"
        />
        <StatCard
          title="Sesiones Conectadas"
          value={stats?.connectedSessions || 0}
          icon={Signal}
          color="green"
        />
        <StatCard
          title="Sesiones Desconectadas"
          value={stats?.disconnectedSessions || 0}
          icon={Wifi}
          color="red"
        />
        <StatCard
          title="Mensajes Enviados Hoy"
          value={stats?.messagesSentToday || 0}
          icon={Send}
          color="blue"
        />
        <StatCard
          title="Mensajes Recibidos Hoy"
          value={stats?.messagesReceivedToday || 0}
          icon={Inbox}
          color="yellow"
        />
        <StatCard
          title="Eventos Recientes"
          value={stats?.recentEvents || 0}
          icon={Activity}
          color="primary"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Estado de Sesiones</h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {pieData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-12">No hay sesiones disponibles</p>
          )}
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Actividad Reciente</h2>
          <div className="space-y-3">
            {stats && stats.recentEvents > 0 ? (
              <p className="text-gray-500">
                {stats.recentEvents} eventos registrados en las últimas 24 horas
              </p>
            ) : (
              <p className="text-gray-500 text-center py-12">Sin actividad reciente</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
