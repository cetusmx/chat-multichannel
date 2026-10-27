import { useEffect, useState } from 'react';
import { LayoutGrid, Focus } from 'lucide-react';
import useAuthStore from '../../../stores/useAuthStore';
import useChatStore from '../../../stores/useChatStore';
import useUIStore from '../../../stores/useUIStore';
import ChatList from './ChatList';
import FocusPanel from './FocusPanel';
import * as api from '../../../services/api';
import { Tabs, Eyebrow, Button, EmptyState } from '../../../components/ui/index.js';
import { FILTER_LABELS } from '../../../utils/conversationStatus.js';

const KANBAN_COLUMNS = {
  PENDING: [
    { title: 'Nuevos · sin asignar', statuses: ['PENDING_ASSIGNMENT'] },
    { title: 'Escalados · piden ayuda', statuses: ['ESCALATED'] },
  ],
  ON_HOLD: [
    { title: 'Esperando al cliente', statuses: ['WAITING_CUSTOMER'] },
    { title: 'Pausados · terceros', statuses: ['ON_HOLD'] },
  ],
  CLOSED: [
    { title: 'Ventas cerradas', statuses: ['CLOSED_WON'] },
    { title: 'Cerrados e inactivos', statuses: ['CLOSED', 'CLOSED_INACTIVE'] },
    { title: 'Descartados · spam', statuses: ['DISCARDED'] },
  ],
};

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
    onHold: conversations.filter(c => c.status === 'ON_HOLD' || c.status === 'WAITING_CUSTOMER').length,
    scheduled: conversations.filter(c => c.status === 'SCHEDULED').length,
    slaRisk: conversations.filter(c => c.isSlaBreached && !c.status?.startsWith('CLOSED')).length,
    closed: conversations.filter(c => c.status?.startsWith('CLOSED') || c.status === 'DISCARDED').length,
  };

  const filteredConversations = conversations.filter(c => {
    if (filter === 'ALL') return true;
    if (filter === 'PENDING') return c.status === 'PENDING_ASSIGNMENT' || c.status === 'ESCALATED';
    if (filter === 'ON_HOLD') return c.status === 'ON_HOLD' || c.status === 'WAITING_CUSTOMER';
    if (filter === 'SCHEDULED') return c.status === 'SCHEDULED';
    if (filter === 'SLA') return c.isSlaBreached && !c.status?.startsWith('CLOSED');
    if (filter === 'CLOSED') return c.status?.startsWith('CLOSED') || c.status === 'DISCARDED';
    if (filter === 'CLOSED_WON') return c.status === 'CLOSED_WON';
    return true;
  });

  const shouldGroup = isCoordinator;
  const isKanban = Object.prototype.hasOwnProperty.call(KANBAN_COLUMNS, filter);

  const tabs = [
    { id: 'ALL', label: 'Todos', count: metrics.total },
    { id: 'PENDING', label: 'Sin asignar', count: metrics.pending },
    { id: 'ON_HOLD', label: 'En seguimiento', count: metrics.onHold },
    { id: 'SCHEDULED', label: 'Agendados', count: metrics.scheduled },
    { id: 'SLA', label: 'SLA en riesgo', count: metrics.slaRisk },
    { id: 'CLOSED', label: 'Cerrados', count: metrics.closed },
  ];

  return (
    <div className="flex h-full w-full flex-col bg-bg">
      <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border bg-surface px-4">
        <Tabs items={tabs} value={filter} onChange={setFilter} className="border-b-0" />
        <div className="flex shrink-0 items-center gap-1">
          <Button variant={coordinatorViewMode === 'preview' ? 'secondary' : 'ghost'} size="sm" icon={LayoutGrid} onClick={() => useUIStore.getState().setCoordinatorViewMode('preview')} aria-pressed={coordinatorViewMode === 'preview'}>
            Vista previa
          </Button>
          <Button variant={coordinatorViewMode === 'focus' ? 'secondary' : 'ghost'} size="sm" icon={Focus} onClick={() => useUIStore.getState().setCoordinatorViewMode('focus')} aria-pressed={coordinatorViewMode === 'focus'} disabled={focusedChatIds.length === 0} title={focusedChatIds.length === 0 ? 'Selecciona un chat para enfocar' : 'Modo enfoque'}>
            Enfoque{focusedChatIds.length > 0 && ` · ${focusedChatIds.length}`}
          </Button>
        </div>
      </div>

      <div className="relative flex flex-1 overflow-hidden">
        {coordinatorViewMode === 'preview' ? (
          <div className="flex h-full w-full flex-col overflow-hidden">
            <div className="flex shrink-0 items-center justify-between px-6 pt-5 pb-3">
              <div>
                <Eyebrow tone="muted">{isCoordinator ? 'Vista global' : 'Mis tickets'}</Eyebrow>
                <h2 className="mt-1 text-lg font-semibold tracking-tight text-fg">{FILTER_LABELS[filter] || 'Conversaciones'}</h2>
              </div>
              <span className="tnum font-mono text-[11px] text-fg-subtle">
                {filteredConversations.length} {filteredConversations.length === 1 ? 'resultado' : 'resultados'}
              </span>
            </div>

            {isKanban ? (
              <div className="flex h-full w-full items-start gap-4 overflow-x-auto px-6 pb-4 custom-scrollbar">
                {KANBAN_COLUMNS[filter].map(col => {
                  const colChats = filteredConversations.filter(c => col.statuses.includes(c.status));
                  if (colChats.length === 0) return null;
                  return (
                    <div key={col.title} className="flex max-h-full min-w-[320px] max-w-[400px] flex-1 shrink-0 flex-col rounded-lg border border-border bg-surface/50">
                      <div className="flex shrink-0 items-center justify-between border-b border-border px-3.5 py-2.5">
                        <Eyebrow>{col.title}</Eyebrow>
                        <span className="tnum font-mono text-[11px] text-fg-subtle">{colChats.length}</span>
                      </div>
                      <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                        <ChatList conversations={colChats} currentConversationIds={focusedChatIds} onSelect={toggleFocusedChat} layout="kanban" groupByVendor={shouldGroup} vendorMap={vendorsMap} />
                      </div>
                    </div>
                  );
                })}
                {filteredConversations.length === 0 && (
                  <div className="flex w-full justify-center"><EmptyState icon={LayoutGrid} title="Nada por aquí" description="No hay conversaciones en esta categoría ahora mismo." /></div>
                )}
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto px-6 pb-6 custom-scrollbar">
                <ChatList conversations={filteredConversations} currentConversationIds={focusedChatIds} onSelect={toggleFocusedChat} layout="grid" groupByVendor={shouldGroup} vendorMap={vendorsMap} />
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-full w-full">
            <aside className="relative flex h-full w-80 shrink-0 flex-col border-r border-border bg-surface">
              <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
                <Eyebrow>{FILTER_LABELS[filter] || 'Chats'}</Eyebrow>
                <span className="tnum font-mono text-[11px] text-fg-subtle">{filteredConversations.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                <ChatList conversations={filteredConversations} currentConversationIds={focusedChatIds} onSelect={toggleFocusedChat} layout="list" groupByVendor={shouldGroup} vendorMap={vendorsMap} />
              </div>
            </aside>
            <div className="h-full min-w-0 flex-1 overflow-hidden">
              <FocusPanel vendorMap={vendorsMap} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
