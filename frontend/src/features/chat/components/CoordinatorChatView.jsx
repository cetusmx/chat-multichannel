import { useEffect, useState } from 'react';
import useAuthStore from '../../../stores/useAuthStore';
import useChatStore from '../../../stores/useChatStore';
import useUIStore from '../../../stores/useUIStore';
import ChatList from './ChatList';
import FocusPanel from './FocusPanel';
import { motion } from 'framer-motion';
import * as api from '../../../services/api';

const FilterButton = ({ label, count, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors border-b-2 ${
      isActive
        ? 'border-sales-cyan-500 text-sales-cyan-400 bg-sales-slate-800/50'
        : 'border-transparent text-sales-slate-400 hover:text-sales-slate-200 hover:bg-sales-slate-800/30'
    }`}
  >
    {label} <span className="ml-1 opacity-70 text-xs">({count})</span>
  </button>
);

export default function CoordinatorChatView() {
  const user = useAuthStore(s => s.user);
  const { socket, conversations, fetchConversations } = useChatStore();
  const coordinatorViewMode = useUIStore(s => s.coordinatorViewMode);
  const focusedChatIds = useUIStore(s => s.focusedChatIds);
  const toggleFocusedChat = useUIStore(s => s.toggleFocusedChat);

  const [filter, setFilter] = useState('ALL');
  const [vendorsMap, setVendorsMap] = useState({});

  useEffect(() => {
    fetchConversations();

    api.get('/users?limit=1000').then(res => res.json()).then(json => {
      const map = {};
      if (json.data) {
        json.data.forEach(u => {
          map[u.id] = u.name;
        });
      }
      setVendorsMap(map);
    }).catch(err => console.error('Error fetching users directory', err));
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
    onHold: conversations.filter(c => c.status === 'ON_HOLD' || c.status === 'SCHEDULED').length,
    slaRisk: conversations.filter(c => c.isSlaBreached && !c.status?.startsWith('CLOSED')).length,
    closed: conversations.filter(c => c.status?.startsWith('CLOSED')).length,
    sales: conversations.filter(c => c.status === 'CLOSED_WON').length,
  };

  const filteredConversations = conversations.filter(c => {
    if (filter === 'ALL') return true;
    if (filter === 'PENDING') return c.status === 'PENDING_ASSIGNMENT' || c.status === 'ESCALATED';
    if (filter === 'ON_HOLD') return c.status === 'ON_HOLD' || c.status === 'SCHEDULED';
    if (filter === 'SLA') return c.isSlaBreached && !c.status?.startsWith('CLOSED');
    if (filter === 'CLOSED') return c.status?.startsWith('CLOSED');
    if (filter === 'CLOSED_WON') return c.status === 'CLOSED_WON';
    return true;
  });

  const shouldGroup = isCoordinator;

  return (
    <div className="flex flex-col relative w-full h-full bg-sales-slate-900 text-sales-slate-100 rounded-lg border border-sales-slate-800 shadow-xl overflow-hidden">
      {/* Filters Ribbon */}
      <div className="flex px-4 pt-2 border-b border-sales-slate-800 bg-sales-slate-900/95 shrink-0 z-20 shadow-sm relative gap-2 overflow-x-auto custom-scrollbar">
        <FilterButton label="Todos" count={metrics.total} isActive={filter === 'ALL'} onClick={() => setFilter('ALL')} />
        <FilterButton label="Sin Asignar" count={metrics.pending} isActive={filter === 'PENDING'} onClick={() => setFilter('PENDING')} />
        <FilterButton label="En Seguimiento" count={metrics.onHold} isActive={filter === 'ON_HOLD'} onClick={() => setFilter('ON_HOLD')} />
        <FilterButton label="SLA en Riesgo" count={metrics.slaRisk} isActive={filter === 'SLA'} onClick={() => setFilter('SLA')} />
        <FilterButton label="Cerrados" count={metrics.closed} isActive={filter === 'CLOSED'} onClick={() => setFilter('CLOSED')} />
        <FilterButton label="Ventas" count={metrics.sales} isActive={filter === 'CLOSED_WON'} onClick={() => setFilter('CLOSED_WON')} />
      </div>

      {/* Main Work Area */}
      <div className="flex-1 flex overflow-hidden relative z-10">
        {coordinatorViewMode === 'preview' ? (
          <motion.div
            layout
            className="w-full h-full overflow-y-auto p-4 custom-scrollbar"
          >
            <div className="flex items-center justify-between mb-4 px-4">
              <h2 className="text-xl font-bold bg-gradient-to-r from-sales-slate-100 to-sales-slate-300 bg-clip-text text-transparent flex items-center gap-2">
                {filter === 'ALL' ? (isCoordinator ? 'Vista Global (Agrupada por Asesor)' : 'Mis Tickets Activos') :
                 filter === 'PENDING' ? 'Bolsa de Trabajo (En Espera)' :
                 filter === 'SLA' ? (isCoordinator ? 'Tickets Críticos (Agrupados por Asesor)' : 'Mis Tickets Críticos') :
                 filter === 'CLOSED_WON' ? (isCoordinator ? 'Ventas Cerradas (Agrupadas por Asesor)' : 'Mis Ventas Cerradas') :
                 (isCoordinator ? 'Tickets Archivados (Agrupados por Asesor)' : 'Mis Tickets Cerrados')}
              </h2>
              <div className="text-sm font-medium text-sales-slate-400 bg-sales-slate-800/50 px-3 py-1 rounded-full border border-sales-slate-700/50">
                {filteredConversations.length} {filteredConversations.length === 1 ? 'resultado' : 'resultados'}
              </div>
            </div>
            <ChatList
              conversations={filteredConversations}
              currentConversationIds={focusedChatIds}
              onSelect={toggleFocusedChat}
              layout="grid"
              groupByVendor={shouldGroup}
              vendorMap={vendorsMap}
            />
          </motion.div>
        ) : (
          <motion.div
            layout
            className="flex w-full h-full"
          >
            {/* Left panel: narrow list */}
            <div className="flex flex-col shrink-0 z-10 w-80 h-full bg-sales-slate-900/60 border-r border-sales-slate-800 shadow-xl backdrop-blur-xl relative">
              <div className="flex items-center justify-between p-4 bg-sales-slate-900/80 border-b border-sales-slate-800 shrink-0">
                <h2 className="text-sm font-bold text-sales-slate-200 uppercase tracking-wider">
                  {filter === 'ALL' ? 'Todos los Chats' : filter}
                </h2>
                <button
                  onClick={() => useUIStore.getState().setCoordinatorViewMode('preview')}
                  className="text-xs px-2.5 py-1.5 bg-sales-slate-800 text-sales-slate-300 rounded hover:text-white hover:bg-sales-slate-700 transition-colors shadow-sm border border-sales-slate-700/50"
                >
                  Ver Grid
                </button>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <ChatList
                  conversations={filteredConversations}
                  currentConversationIds={focusedChatIds}
                  onSelect={toggleFocusedChat}
                  layout="list"
                  groupByVendor={shouldGroup}
                  vendorMap={vendorsMap}
                />
              </div>
            </div>
            {/* Right panel: Focus Panel */}
            <div className="flex-1 h-full min-w-0 overflow-hidden bg-[#0A0F1A]">
              <FocusPanel />
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
