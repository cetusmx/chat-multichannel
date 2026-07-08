/**
 * ChatList - Muestra las conversaciones en el panel izquierdo o en un grid de vista previa
 * 
 * @component
 */
export default function ChatList({ conversations, currentConversationId, currentConversationIds = [], onSelect, layout = 'list' }) {
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

        return (
          <div 
            key={conv.id} 
            onClick={() => onSelect(conv.id)}
            className={`cursor-pointer transition-all ${
              isGrid 
                ? `p-4 rounded-xl border ${isSelected ? 'border-sales-coral-400 bg-sales-slate-800/80 shadow-md shadow-sales-coral-500/10' : 'border-sales-slate-700 bg-sales-slate-800/40'} backdrop-blur-md hover:bg-sales-slate-800/70`
                : `p-4 hover:bg-sales-slate-800 ${isSelected ? 'bg-sales-slate-800 border-l-4 border-sales-coral-400' : ''}`
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <span className="font-semibold text-sales-slate-100 pr-2 flex items-center gap-2 min-w-0">
                <span className="truncate">{conv.client?.name || conv.client?.phoneNumber}</span>
                {conv.status === 'ESCALATED' && (
                  <span 
                    className="flex-shrink-0 px-1.5 py-0.5 rounded bg-red-500 text-white shadow-sm shadow-red-500/20 text-[10px] font-bold uppercase tracking-wider"
                    aria-label="Chat escalado"
                    title="Este chat requiere atención de un coordinador"
                  >
                    Escalado
                  </span>
                )}
              </span>
              <span className="text-xs text-sales-slate-500 flex-shrink-0 pt-1">
                {new Date(conv.lastMessageAt || conv.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </span>
            </div>
            <p className={`text-sm text-sales-slate-400 ${isGrid ? 'line-clamp-2' : 'truncate'}`} title={lastMsg}>
              {lastMsg}
            </p>
          </div>
        );
      })}
    </div>
  );
}
