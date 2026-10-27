import { Inbox } from 'lucide-react';
import useChatStore from '../../../stores/useChatStore';
import { Badge, Eyebrow, EmptyState } from '../../../components/ui/index.js';
import { getStatusMeta, isClosedStatus } from '../../../utils/conversationStatus.js';
import { formatRelativeTime } from '../../../utils/formatDate.js';
import { getCartItems } from '../../../utils/cart.js';
import { cn } from '../../../utils/cn.js';

const TONE_TEXT = {
  neutral: 'text-fg-subtle',
  accent: 'text-accent',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  info: 'text-info',
};

/**
 * ChatList - Conversations in a vertical list, grid or kanban column.
 *
 * @component
 */
export default function ChatList({ conversations, currentConversationId, currentConversationIds = [], onSelect, layout = 'list', groupByVendor = false, vendorMap = {} }) {
  const unreadCounts = useChatStore((state) => state.unreadCounts);

  if (!conversations || conversations.length === 0) {
    return <EmptyState compact icon={Inbox} title="Sin conversaciones" description="Cuando lleguen mensajes aparecerán aquí." />;
  }

  const selectedIds = currentConversationId ? [currentConversationId] : currentConversationIds;
  const isGrid = layout === 'grid' || layout === 'kanban';

  const renderConvItem = (conv) => {
    const isSelected = selectedIds.includes(conv.id);
    const lastMsg = conv.messages?.[0]?.content || 'Sin mensajes';
    const unreadCount = unreadCounts?.[conv.id] || 0;
    const meta = getStatusMeta(conv.status);
    const closed = isClosedStatus(conv.status);
    const breached = conv.isSlaBreached && !closed;
    const firstResponseBreach = conv.breachType === 'firstResponse';
    const cartCount = getCartItems(conv.client).length;

    let statusLine = meta.label;
    if (conv.status === 'PENDING_ASSIGNMENT') statusLine = conv.aiPendingEscalation ? 'Transferido por IA' : 'IA atendiendo';
    if (conv.status === 'ACTIVE' && conv.vendorId && vendorMap[conv.vendorId]) statusLine = `Atiende ${vendorMap[conv.vendorId].split(' ')[0]}`;

    return (
      <div
        key={conv.id}
        role="button"
        tabIndex={0}
        aria-current={isSelected ? 'true' : undefined}
        onClick={() => {
          useChatStore.getState().clearUnreadCount(conv.id);
          onSelect(conv.id);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            useChatStore.getState().clearUnreadCount(conv.id);
            onSelect(conv.id);
          }
        }}
        className={cn(
          'group relative cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent',
          isGrid ? 'rounded-lg border bg-surface p-3.5 hover:bg-surface-2/70' : 'border-l-2 px-4 py-3 hover:bg-surface-2/60',
          isGrid
            ? isSelected ? 'border-accent/60 bg-accent/[0.06]' : breached ? (firstResponseBreach ? 'border-warning/60' : 'border-danger/60') : 'border-border'
            : isSelected ? 'border-accent bg-accent/[0.08]' : breached ? (firstResponseBreach ? 'border-warning' : 'border-danger') : 'border-transparent',
          closed && 'opacity-60',
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <span className="min-w-0 truncate text-sm font-semibold text-fg">{conv.client?.name || conv.client?.phoneNumber}</span>
          <span className="flex shrink-0 items-center gap-1.5 pt-0.5">
            {conv.lastMessageAt && <span className="tnum font-mono text-[10px] text-fg-subtle">{formatRelativeTime(conv.lastMessageAt)}</span>}
            {unreadCount > 0 && (
              <span className="flex h-2 w-2 rounded-full bg-accent" aria-label={`${unreadCount} mensajes sin leer`} title={`${unreadCount} sin leer`} />
            )}
          </span>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          {conv.status === 'ESCALATED' ? (
            <Badge tone="solid-danger" aria-label="Chat escalado" title={meta.description}>Escalado</Badge>
          ) : (
            <Eyebrow className={cn(TONE_TEXT[meta.tone] || TONE_TEXT.neutral)} title={meta.description}>{statusLine}</Eyebrow>
          )}
          {breached && (
            <Badge tone={firstResponseBreach ? 'warning' : 'danger'} dot title={firstResponseBreach ? 'Primera respuesta fuera de SLA' : 'SLA excedido'}>SLA</Badge>
          )}
        </div>

        <p className={cn('mt-1 text-[13px] text-fg-muted', isGrid ? 'line-clamp-2' : 'truncate')} title={lastMsg}>
          {cartCount > 0 && <span className="text-fg">Carrito listo · {cartCount} {cartCount === 1 ? 'partida' : 'partidas'} · </span>}
          {lastMsg}
        </p>
      </div>
    );
  };

  const gridClass = layout === 'kanban' ? 'flex flex-col gap-2' : isGrid ? 'grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4' : 'divide-y divide-border/70';

  if (groupByVendor) {
    const groups = {};
    conversations.forEach((c) => {
      const vName = c.vendorId ? vendorMap[c.vendorId] || 'Asesor desconocido' : 'Sin asignar';
      if (!groups[vName]) groups[vName] = [];
      groups[vName].push(c);
    });

    return (
      <div className="flex flex-col gap-5 pb-8">
        {Object.entries(groups).sort(([a], [b]) => a.localeCompare(b)).map(([vendorName, chats]) => (
          <section key={vendorName} className="flex flex-col gap-2">
            <div className={cn('flex items-center justify-between', isGrid ? 'px-1' : 'px-4 pt-2')}>
              <Eyebrow tone="muted">{vendorName}</Eyebrow>
              <span className="tnum font-mono text-[10px] text-fg-subtle">{chats.length}</span>
            </div>
            <div className={gridClass}>{chats.map(renderConvItem)}</div>
          </section>
        ))}
      </div>
    );
  }

  return <div className={gridClass}>{conversations.map(renderConvItem)}</div>;
}
