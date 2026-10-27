import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, CheckCircle2, Clock, ShoppingCart, Percent, Calendar, AlertTriangle, Inbox, ArrowRight, BarChart3 } from 'lucide-react';
import useAuthStore from '../../../stores/useAuthStore';
import useChatStore from '../../../stores/useChatStore';
import { Eyebrow, PageHeader, Panel, EmptyState, Button } from '../../../components/ui/index.js';
import { cn } from '../../../utils/cn.js';

const StatCard = ({ label, value, icon: Icon, tone = 'neutral', hint, onClick, highlight = false }) => {
  const toneText = { neutral: 'text-fg-muted', accent: 'text-accent', success: 'text-success', warning: 'text-warning', danger: 'text-danger', info: 'text-info' }[tone];
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      onClick={onClick}
      className={cn(
        'group relative flex flex-col gap-3 rounded-lg border bg-surface p-4 text-left transition-colors',
        highlight ? 'border-danger/50 bg-danger/[0.04]' : 'border-border',
        onClick && 'hover:border-border-strong hover:bg-surface-2/60',
      )}
    >
      <div className="flex items-center justify-between">
        <Eyebrow tone="muted">{label}</Eyebrow>
        <Icon size={14} className={toneText} aria-hidden />
      </div>
      <div className="tnum text-3xl font-semibold tracking-tight text-fg leading-none">{value}</div>
      {hint && <div className="text-xs text-fg-subtle">{hint}</div>}
      {onClick && <ArrowRight size={14} className="absolute bottom-4 right-4 text-fg-subtle opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />}
    </Comp>
  );
};

export default function CoordinatorDashboard() {
  const user = useAuthStore(s => s.user);
  const { socket, conversations, fetchConversations } = useChatStore();
  const navigate = useNavigate();

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
    escalated: conversations.filter(c => c.status === 'ESCALATED').length,
    onHold: conversations.filter(c => c.status === 'ON_HOLD' || c.status === 'WAITING_CUSTOMER').length,
    scheduled: conversations.filter(c => c.status === 'SCHEDULED').length,
    slaRisk: conversations.filter(c => c.isSlaBreached && !c.status?.startsWith('CLOSED')).length,
    closed: conversations.filter(c => c.status?.startsWith('CLOSED') || c.status === 'DISCARDED').length,
    sales: conversations.filter(c => c.status === 'CLOSED_WON').length,
  };
  metrics.conversionRate = metrics.closed > 0 ? Math.round((metrics.sales / metrics.closed) * 100) : 0;

  const needsAttention = metrics.slaRisk + metrics.escalated;
  const firstName = user?.name?.split(' ')[0];

  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader
        eyebrow={new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}
        title={firstName ? `Hola, ${firstName}` : 'Dashboard'}
        description={
          needsAttention > 0
            ? `${needsAttention} ${needsAttention === 1 ? 'conversación requiere' : 'conversaciones requieren'} tu atención ahora.`
            : 'Todo bajo control. No hay conversaciones en riesgo.'
        }
        actions={<Button variant="secondary" size="sm" icon={Inbox} onClick={() => navigate('/chat')}>Ir a la bandeja</Button>}
      />

      <section aria-label="Requieren atención" className="mb-6">
        <Eyebrow tone="muted" className="mb-3 block">Requieren atención</Eyebrow>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard label="SLA en riesgo" value={metrics.slaRisk} icon={AlertTriangle} tone="danger" highlight={metrics.slaRisk > 0} hint="Fuera del tiempo de respuesta" onClick={() => navigate('/chat')} />
          <StatCard label="Sin asignar" value={metrics.pending} icon={Clock} tone="info" hint={`${metrics.escalated} escalados`} onClick={() => navigate('/chat')} />
          <StatCard label="Activos hoy" value={metrics.total} icon={Users} tone="neutral" hint="Con actividad en las últimas 24 h" />
        </div>
      </section>

      <section aria-label="Pipeline" className="mb-6">
        <Eyebrow tone="muted" className="mb-3 block">Pipeline</Eyebrow>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <StatCard label="En seguimiento" value={metrics.onHold} icon={Clock} tone="warning" />
          <StatCard label="Agendados" value={metrics.scheduled} icon={Calendar} tone="info" />
          <StatCard label="Cerrados" value={metrics.closed} icon={CheckCircle2} tone="neutral" />
          <StatCard label="Ventas" value={metrics.sales} icon={ShoppingCart} tone="success" />
          <StatCard label="Conversión" value={`${metrics.conversionRate}%`} icon={Percent} tone="success" hint="Ventas / cerrados" />
        </div>
      </section>

      <Panel eyebrow="Próximamente" title="Tendencias y reportes" padded={false}>
        <EmptyState compact icon={BarChart3} description="Gráficas de volumen, tiempos de respuesta y conversión por asesor." />
      </Panel>
    </div>
  );
}
