import { useEffect, useState } from 'react';
import useAuthStore from '../../../stores/useAuthStore';
import useChatStore from '../../../stores/useChatStore';
import useUIStore from '../../../stores/useUIStore';
import ChatList from './ChatList';
import FocusPanel from './FocusPanel';
import { motion } from 'framer-motion';
import { Users, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import * as api from '../../../services/api';

const StatCard = ({ title, value, icon: Icon, iconColor, filterType, activeFilter, setFilter }) => {
  const isActive = activeFilter === filterType;
  return (
    <div 
      onClick={() => setFilter(isActive ? 'ALL' : filterType)}
      className={`p-4 rounded-xl border cursor-pointer transition-all ${isActive ? 'bg-sales-slate-800 ring-1 ring-sales-cyan-500 shadow-md shadow-sales-cyan-500/10 border-sales-cyan-500' : 'bg-sales-slate-800/40 border-sales-slate-700/50 hover:bg-sales-slate-800/80'} flex items-center gap-4 relative overflow-hidden group`}
    >
      <div className={`p-3 rounded-lg ${iconColor} bg-sales-slate-900/80 flex-shrink-0 border border-sales-slate-700 shadow-inner group-hover:scale-110 transition-transform duration-300`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="z-10">
        <p className="text-[11px] text-sales-slate-400 font-bold uppercase tracking-wider">{title}</p>
        <h3 className="text-2xl font-bold text-white leading-none mt-1">{value}</h3>
      </div>
      {filterType === 'SLA' && value > 0 && (
        <div className="absolute top-0 right-0 w-1.5 h-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
      )}
    </div>
  )
};

export default function CoordinatorDashboard() {
  const user = useAuthStore(s => s.user);
  const { socket, conversations, fetchConversations, initializeSocket, disconnectSocket } = useChatStore();
  const coordinatorViewMode = useUIStore(s => s.coordinatorViewMode);
  const focusedChatIds = useUIStore(s => s.focusedChatIds);
  const toggleFocusedChat = useUIStore(s => s.toggleFocusedChat);

  const [filter, setFilter] = useState('ALL');
  const [vendorsMap, setVendorsMap] = useState({});

  useEffect(() => {
    initializeSocket();
    fetchConversations();
    
    // Fetch users (vendors directory)
    api.get('/users').then(res => res.json()).then(json => {
      const map = {};
      if (json.data) {
        json.data.forEach(u => {
          map[u.id] = u.name;
        });
      }
      setVendorsMap(map);
    }).catch(err => console.error("Error fetching users directory", err));

    return () => {
      disconnectSocket();
    };
  }, [initializeSocket, fetchConversations, disconnectSocket]);

  useEffect(() => {
    if (socket && user?.tenantId) {
      socket.emit('join:tenant_coordinators', user.tenantId);
      return () => {
        socket.emit('leave:tenant_coordinators', user.tenantId);
      };
    }
  }, [socket, user]);

  const todayStr = new Date().toDateString();
  
  const metrics = {
    total: conversations.filter(c => new Date(c.createdAt).toDateString() === todayStr || new Date(c.lastMessageAt).toDateString() === todayStr).length,
    pending: conversations.filter(c => c.status === 'PENDING_ASSIGNMENT').length,
    slaRisk: conversations.filter(c => c.isSlaBreached && c.status !== 'CLOSED').length,
    closed: conversations.filter(c => c.status === 'CLOSED').length,
  };

  const filteredConversations = conversations.filter(c => {
    if (filter === 'ALL') return true;
    if (filter === 'PENDING') return c.status === 'PENDING_ASSIGNMENT';
    if (filter === 'SLA') return c.isSlaBreached && c.status !== 'CLOSED';
    if (filter === 'CLOSED') return c.status === 'CLOSED';
    return true;
  });

  const shouldGroup = filter !== 'ALL' && filter !== 'PENDING';

  return (
    <div className="flex flex-col relative w-full h-full bg-sales-slate-900 text-sales-slate-100 rounded-lg border border-sales-slate-800 shadow-xl overflow-hidden">
      
      {/* KPI Command Center Ribbon */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 p-4 border-b border-sales-slate-800 bg-sales-slate-900/95 shrink-0 z-20 shadow-sm relative">
        <div className="absolute inset-0 bg-gradient-to-r from-sales-cyan-900/10 to-sales-blue-900/10 pointer-events-none" />
        <StatCard title="Activos Hoy" value={metrics.total} icon={Users} iconColor="text-sales-blue-400" filterType="ALL" activeFilter={filter} setFilter={setFilter} />
        <StatCard title="En Espera" value={metrics.pending} icon={Clock} iconColor="text-sales-cyan-400" filterType="PENDING" activeFilter={filter} setFilter={setFilter} />
        <StatCard title="SLA en Riesgo" value={metrics.slaRisk} icon={AlertTriangle} iconColor="text-red-500" filterType="SLA" activeFilter={filter} setFilter={setFilter} />
        <StatCard title="Cerrados" value={metrics.closed} icon={CheckCircle} iconColor="text-emerald-500" filterType="CLOSED" activeFilter={filter} setFilter={setFilter} />
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
                {filter === 'ALL' ? 'Vista Global' : 
                 filter === 'PENDING' ? 'Bolsa de Trabajo (En Espera)' :
                 filter === 'SLA' ? 'Tickets Críticos (Agrupados por Asesor)' : 'Tickets Archivados (Agrupados por Asesor)'}
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
