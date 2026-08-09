import SlaBadge from '../../metrics/SlaBadge';
import useChatStore from '../../../stores/useChatStore';

/**
 * ChatList - Muestra las conversaciones en el panel izquierdo o en un grid de vista previa
 * 
 * @component
 */
export default function ChatList({ conversations, currentConversationId, currentConversationIds = [], onSelect, layout = 'list' }) {
  const unreadCounts = useChatStore(state => state.unreadCounts);
  if (!conversations || conversations.length === 0) {
    return <div className="text-sales-slate-400 p-6 text-sm text-center">No hay conversaciones activas.</div>;
  }

  const selectedIds = currentConversationId ? [currentConversationId] : currentConversationIds;
  const isGrid = layout === 'grid';

  return (
    <div className={isGrid ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 p-2" : "divide-y divide-sales-slate-800"}>
      {conversations.map((conv) => {
        const isSelected = selectedIds.includes(conv.id);
        const lastMsg = conv.messages?.[0]?.content || 'Sin mensajes...';
        const isSlaBreached = conv.isSlaBreached;
        const breachType = conv.breachType;
        const isFirstResponse = breachType === 'firstResponse';
        const unreadCount = unreadCounts[conv.id] || 0;

        let gridStyles = isSelected 
          ? 'border-sales-coral-400 bg-sales-slate-800/80 shadow-md shadow-sales-coral-500/10' 
          : 'border-sales-slate-700 bg-sales-slate-800/40';
        
        let listStyles = isSelected ? 'bg-sales-slate-800 border-l-4 border-sales-coral-400' : '';

        if (isSlaBreached) {
          const borderColor = isFirstResponse ? 'border-orange-500/60' : 'border-red-500/60';
          const shadowColor = isFirstResponse ? 'shadow-orange-500/10' : 'shadow-red-500/10';
          if (isGrid) {
             gridStyles = `${borderColor} bg-sales-slate-800/50 shadow-md ${shadowColor} ${isSelected ? 'ring-1 ring-sales-coral-400' : ''}`;
          } else {
             const borderList = isFirstResponse ? 'border-orange-500' : 'border-red-500';
             listStyles = `border-l-4 ${borderList} ${isSelected ? 'bg-sales-slate-800' : 'bg-sales-slate-800/30'}`;
          }
        }

        return (
          <div 
            key={conv.id} 
            onClick={() => {
              useChatStore.getState().clearUnreadCount(conv.id);
              onSelect(conv.id);
            }}
            className={`cursor-pointer transition-all ${
              isGrid 
                ? `p-4 rounded-xl border backdrop-blur-md hover:bg-sales-slate-800/70 ${gridStyles}`
                : `p-4 hover:bg-sales-slate-800 ${listStyles}`
            }`}
          >
            <div className="flex justify-between items-start mb-1">
              <span className="font-semibold text-sales-slate-100 pr-2 flex flex-wrap items-center gap-2 min-w-0">
                <span className="truncate">{conv.client?.name || conv.client?.phoneNumber}</span>
                {conv.status === 'ESCALATED' && (
                  <span 
                    className="flex-shrink-0 px-1.5 py-0.5 rounded bg-red-500 text-white shadow-sm shadow-red-500/20 text-[10px] font-bold uppercase tracking-wider"
                    title="Este chat requiere atención de un coordinador"
                    aria-label="Chat escalado"
                  >
                    Escalado
                  </span>
                )}
                {isSlaBreached && (
                  <SlaBadge isSlaBreached={isSlaBreached} breachType={breachType} />
                )}
              </span>
              <span className="text-xs text-sales-slate-500 flex-shrink-0 pt-1">
                {new Date(conv.lastMessageAt || conv.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            </div>
            <div className="flex justify-between items-center gap-2">
              <p className={`text-sm text-sales-slate-400 min-w-0 flex-1 ${isGrid ? 'line-clamp-2' : 'truncate'}`} title={lastMsg}>
                {lastMsg}
              </p>
              {unreadCount > 0 && (
                <span className="bg-emerald-500 text-white text-[10px] font-bold h-5 min-w-[20px] flex items-center justify-center rounded-full px-1.5 shadow-md shadow-emerald-500/30 flex-shrink-0">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
