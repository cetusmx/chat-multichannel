import SlaBadge from '../../metrics/SlaBadge';
import useChatStore from '../../../stores/useChatStore';

/**
 * ChatList - Muestra las conversaciones en el panel izquierdo o en un grid de vista previa
 *
 * @component
 */
export default function ChatList({ conversations, currentConversationId, currentConversationIds = [], onSelect, layout = 'list', groupByVendor = false, vendorMap = {} }) {
  const unreadCounts = useChatStore(state => state.unreadCounts);
  if (!conversations || conversations.length === 0) {
    return <div className="text-sales-slate-400 p-6 text-sm text-center">No hay conversaciones.</div>;
  }

  const selectedIds = currentConversationId ? [currentConversationId] : currentConversationIds;
  const isGrid = layout === 'grid';

  const renderConvItem = (conv) => {
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

    if (conv.status.startsWith('CLOSED')) {
      listStyles += ' opacity-75 grayscale-[0.2]';
      gridStyles += ' opacity-75 grayscale-[0.2]';
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
            {conv.status === 'PENDING_ASSIGNMENT' && (
              <span
                className="flex-shrink-0 px-1.5 py-0.5 rounded bg-sales-cyan-500/20 text-sales-cyan-400 border border-sales-cyan-500/30 text-[10px] font-bold uppercase tracking-wider"
                title="Nuevo chat sin asesor asignado"
              >
                Nuevo
              </span>
            )}
            {(conv.status === 'CLOSED' || conv.status === 'CLOSED_INACTIVE') && (
              <span
                className="flex-shrink-0 px-1.5 py-0.5 rounded bg-sales-slate-700/50 text-sales-slate-400 border border-sales-slate-600 text-[10px] font-bold uppercase tracking-wider"
                title="Chat finalizado sin venta"
              >
                Cerrado
              </span>
            )}
            {conv.status === 'CLOSED_WON' && (
              <span
                className="flex-shrink-0 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold uppercase tracking-wider"
                title="Venta concretada"
              >
                Cerrado (Venta)
              </span>
            )}
            {conv.status === 'DISCARDED' && (
              <span
                className="flex-shrink-0 px-1.5 py-0.5 rounded bg-sales-slate-800 text-sales-slate-500 border border-sales-slate-700 text-[10px] font-bold uppercase tracking-wider line-through"
                title="Chat descartado"
              >
                Descartado
              </span>
            )}
            {conv.status === 'ESCALATED' && (
              <span
                className="flex-shrink-0 px-1.5 py-0.5 rounded bg-red-500 text-white shadow-sm shadow-red-500/20 text-[10px] font-bold uppercase tracking-wider"
                title="Este chat requiere atención de un coordinador"
                aria-label="Chat escalado"
              >
                Escalado
              </span>
            )}
            {(conv.status === 'ON_HOLD' || conv.status === 'SCHEDULED' || conv.status === 'WAITING_CUSTOMER') && (
              <span
                className="flex-shrink-0 px-1.5 py-0.5 rounded bg-sales-amber-500/20 text-sales-amber-400 border border-sales-amber-500/30 text-[10px] font-bold uppercase tracking-wider"
                title="Esperando al cliente"
              >
                En Espera
              </span>
            )}
            {isSlaBreached && !conv.status.startsWith('CLOSED') && (
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
  };

  if (groupByVendor) {
    const groups = {};
    conversations.forEach(c => {
      const vName = c.vendorId ? (vendorMap[c.vendorId] || 'Asesor Desconocido') : 'Sin Asignar (Bolsa de Trabajo)';
      if (!groups[vName]) groups[vName] = [];
      groups[vName].push(c);
    });

    return (
      <div className="flex flex-col gap-6 p-2 pb-8">
        {Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)).map(([vendorName, chats]) => (
          <div key={vendorName} className="flex flex-col gap-2">
            <div className="flex items-center gap-2 border-b border-sales-slate-700 pb-2 px-2">
              <h3 className="text-[11px] font-bold text-sales-slate-300 uppercase tracking-wider">{vendorName}</h3>
              <span className="bg-sales-slate-800 text-sales-slate-400 px-2 py-0.5 rounded-full text-[10px] font-bold shadow-inner border border-sales-slate-700/50">{chats.length}</span>
            </div>
            <div className={isGrid ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4' : 'divide-y divide-sales-slate-800'}>
              {chats.map(renderConvItem)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={isGrid ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4 p-2' : 'divide-y divide-sales-slate-800'}>
      {conversations.map(renderConvItem)}
    </div>
  );
}
