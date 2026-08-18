import { useEffect, useState } from 'react';
import useAuthStore from '../../../stores/useAuthStore';
import useChatStore from '../../../stores/useChatStore';
import { Users, CheckCircle, Clock, ShoppingCart, Percent, Calendar } from 'lucide-react';
import * as api from '../../../services/api';

const CustomWarningIcon = (props) => (
  <svg viewBox="0 0 34.854 34.855" fill="currentColor" {...props}>
    <path d="M34.653,30.47L18.727,2.884c-0.269-0.464-0.764-0.75-1.299-0.75c-0.537,0-1.031,0.286-1.3,0.75L0.202,30.47c-0.269,0.464-0.269,1.036,0,1.5s0.763,0.75,1.299,0.75h31.853c0.535,0,1.031-0.286,1.3-0.75C34.921,31.506,34.921,30.934,34.653,30.47z M4.099,29.72L17.427,6.634L30.756,29.72H4.099z M15.427,11.677h4V23.51h-4V11.677z M15.427,25.507h4v2.919h-4V25.507z" />
  </svg>
);

const StatCard = ({ title, value, icon: Icon, iconColor }) => {
  return (
    <div className="p-6 rounded-xl border bg-sales-slate-800/40 border-sales-slate-700/50 flex items-center gap-4 relative overflow-hidden group">
      <div className={`p-4 rounded-lg ${iconColor} bg-sales-slate-900/80 flex-shrink-0 border border-sales-slate-700 shadow-inner`}>
        <Icon className="w-8 h-8" />
      </div>
      <div className="z-10">
        <p className="text-xs text-sales-slate-400 font-bold uppercase tracking-wider">{title}</p>
        <h3 className="text-4xl font-bold text-white leading-none mt-2">{value}</h3>
      </div>
      {title === 'SLA en Riesgo' && value > 0 && (
        <div className="absolute top-0 right-0 w-1.5 h-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
      )}
    </div>
  );
};

export default function CoordinatorDashboard() {
  const user = useAuthStore(s => s.user);
  const { socket, conversations, fetchConversations } = useChatStore();

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const isCoordinator = user?.role === 'ADMIN' || user?.role === 'COORDINATOR';

  useEffect(() => {
    if (isCoordinator && socket && user?.tenantId) {
      socket.emit('join:tenant_coordinators', user.tenantId);
      return () => {
        socket.emit('leave:tenant_coordinators', user.tenantId);
      };
    }
  }, [socket, user, isCoordinator]);

  const todayStr = new Date().toDateString();

  const metrics = {
    total: conversations.filter(c => new Date(c.createdAt).toDateString() === todayStr || new Date(c.lastMessageAt).toDateString() === todayStr).length,
    pending: conversations.filter(c => c.status === 'PENDING_ASSIGNMENT' || c.status === 'ESCALATED').length,
    onHold: conversations.filter(c => c.status === 'ON_HOLD' || c.status === 'WAITING_CUSTOMER').length,
    scheduled: conversations.filter(c => c.status === 'SCHEDULED').length,
    slaRisk: conversations.filter(c => c.isSlaBreached && !c.status?.startsWith('CLOSED')).length,
    closed: conversations.filter(c => c.status?.startsWith('CLOSED') || c.status === 'DISCARDED').length,
    sales: conversations.filter(c => c.status === 'CLOSED_WON').length,
  };
  metrics.conversionRate = metrics.closed > 0 ? Math.round((metrics.sales / metrics.closed) * 100) : 0;

  return (
    <div className="flex flex-col w-full h-full bg-sales-slate-900 text-sales-slate-100 rounded-lg border border-sales-slate-800 shadow-xl overflow-hidden p-8 gap-8">
      <h1 className="text-3xl font-bold text-white">Dashboard Global</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard title="Activos Hoy" value={metrics.total} icon={Users} iconColor="text-sales-blue-400" />
        <StatCard title="Sin Asignar" value={metrics.pending} icon={Clock} iconColor="text-sales-cyan-400" />
        <StatCard title="En Seguimiento" value={metrics.onHold} icon={Clock} iconColor="text-sales-amber-400" />
        <StatCard title="Agendados" value={metrics.scheduled} icon={Calendar} iconColor="text-purple-400" />
        <StatCard title="SLA en Riesgo" value={metrics.slaRisk} icon={CustomWarningIcon} iconColor="text-red-500" />
        <StatCard title="Cerrados" value={metrics.closed} icon={CheckCircle} iconColor="text-sales-slate-400" />
        <StatCard title="Ventas" value={metrics.sales} icon={ShoppingCart} iconColor="text-emerald-500" />
        <StatCard title="Conversión" value={`${metrics.conversionRate}%`} icon={Percent} iconColor="text-emerald-400" />
      </div>

      <div className="flex-1 border border-dashed border-sales-slate-700/50 rounded-xl flex items-center justify-center bg-sales-slate-800/20">
        <p className="text-sales-slate-500 font-medium">Próximamente: Gráficas y reportes detallados</p>
      </div>
    </div>
  );
}
