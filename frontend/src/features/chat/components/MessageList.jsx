import React, { useEffect, useLayoutEffect, useRef, useState, useMemo } from 'react';
import { Download, MessageSquare, X } from 'lucide-react';
import useAuthStore from '../../../stores/useAuthStore';
import useChatStore from '../../../stores/useChatStore';
import { updateClientCart } from '../../../services/api';
import { toast } from '../../../stores/useToastStore.js';
import MessageBubble from './MessageBubble.jsx';
import ChatComposer from './ChatComposer.jsx';
import AgentSummaryCard from './AgentSummaryCard.jsx';
import { Eyebrow, Badge, Spinner, EmptyState } from '../../../components/ui/index.js';
import { formatDayLabel, formatRelativeTime } from '../../../utils/formatDate.js';
import { getConversationEyebrow } from '../../../utils/conversationStatus.js';
import { getCartItems, withAddedItem } from '../../../utils/cart.js';
import { cn } from '../../../utils/cn.js';

/**
 * MessageList - Conversation header, message timeline and composer.
 *
 * @component
 */
export default function MessageList({
  conversationId,
  conversation,
  messages,
  onSendMessage,
  onSendMedia,
  isUploading,
  errorMsg,
  clearError,
  clientName,
  hasMore,
  loadMoreMessages,
  isLoadingMore,
  headerActions,
  headerMeta,
  disabledInput = false,
  conversationStatus,
  vendorName,
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState(null);
  const user = useAuthStore((state) => state.user);
  const { highlightedMessageId, setHighlightedMessageId, addTag, removeTag, forwardMedia, uploadingIds } = useChatStore();

  const bottomRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const observerTargetRef = useRef(null);
  const highlightedRef = useRef(null);
  const composerRef = useRef(null);
  const previousScrollHeight = useRef(null);
  const scrollPositionRestored = useRef(true);
  const prevMessagesLength = useRef(messages.length);
  const prevFirstMessageId = useRef(messages.length > 0 ? messages[0].id : null);

  const status = conversationStatus ?? conversation?.status;

  useEffect(() => {
    const preventGlobal = (e) => {
      if (e.dataTransfer?.types?.includes('Files')) e.preventDefault();
    };
    window.addEventListener('dragover', preventGlobal);
    window.addEventListener('drop', preventGlobal);
    return () => {
      window.removeEventListener('dragover', preventGlobal);
      window.removeEventListener('drop', preventGlobal);
    };
  }, []);

  useEffect(() => {
    setLocalError(null);
  }, [conversationId]);

  useEffect(() => {
    if (messages.length > 0) {
      const isNewMessageAtEnd = messages.length > prevMessagesLength.current && messages[0].id === prevFirstMessageId.current;
      const isFirstLoad = prevMessagesLength.current === 0;

      let isNearBottom = true;
      if (scrollContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
        isNearBottom = scrollHeight - scrollTop - clientHeight < 150;
      }

      const lastMessage = messages[messages.length - 1];
      const isMyMessage = lastMessage && (lastMessage.senderType === 'VENDOR' || lastMessage.senderType === 'SYSTEM');

      if ((isFirstLoad || (isNewMessageAtEnd && (isNearBottom || isMyMessage))) && scrollPositionRestored.current && !highlightedMessageId) {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }

      prevMessagesLength.current = messages.length;
      prevFirstMessageId.current = messages[0].id;
    }
  }, [messages, highlightedMessageId]);

  useEffect(() => {
    if (highlightedMessageId && highlightedRef.current) {
      highlightedRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const timer = setTimeout(() => setHighlightedMessageId(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [highlightedMessageId, messages, setHighlightedMessageId]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore) {
          if (scrollContainerRef.current && messages.length > 0) {
            previousScrollHeight.current = scrollContainerRef.current.scrollHeight;
            scrollPositionRestored.current = false;
          }
          if (loadMoreMessages) loadMoreMessages();
        }
      },
      { threshold: 0.1 },
    );
    if (observerTargetRef.current) observer.observe(observerTargetRef.current);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, loadMoreMessages, messages]);

  useLayoutEffect(() => {
    if (!scrollPositionRestored.current && scrollContainerRef.current && previousScrollHeight.current) {
      if (messages.length > 0 && prevFirstMessageId.current && messages[0].id !== prevFirstMessageId.current) {
        const newScrollHeight = scrollContainerRef.current.scrollHeight;
        scrollContainerRef.current.scrollTop += newScrollHeight - previousScrollHeight.current;
        scrollPositionRestored.current = true;
      }
    }
  }, [messages]);

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;
    if (files.length > 1) {
      setLocalError('Solo puedes enviar un archivo a la vez.');
      return;
    }
    composerRef.current?.attachFile(files[0]);
  };

  const handleAddToCart = async (item) => {
    // Always read the latest cart from the store: the memoized timeline may hold a stale closure.
    const conv = useChatStore.getState().conversations.find((c) => c.id === conversationId) || conversation;
    if (!conv?.client) throw new Error('Sin cliente');
    try {
      const newCart = withAddedItem(conv.client.cartData || conv.client.cart, item);
      await updateClientCart(conv.client.id, newCart);
      toast.success('Añadido al pedido', { description: `${item.cantidad} × ${item.clave}` });
      useChatStore.getState().sendMessage(`¡Listo! He añadido ${item.cantidad} piezas de *${item.clave}* a tu cotización.`, false);
    } catch (err) {
      console.error('Error adding to cart', err);
      toast.error('No se pudo añadir al carrito', { description: err.message });
      throw err;
    }
  };

  const cartCount = getCartItems(conversation?.client).length;
  const eyebrow = headerMeta ?? [getConversationEyebrow(conversation, { vendorName }), conversation?.lastMessageAt && formatRelativeTime(conversation.lastMessageAt)].filter(Boolean).join(' · ');

  const timeline = useMemo(
    () =>
      messages.map((msg, index) => {
        const showDate = index === 0 || new Date(msg.createdAt).toDateString() !== new Date(messages[index - 1].createdAt).toDateString();
        return (
          <React.Fragment key={msg.id}>
            {showDate && (
              <div className="flex w-full justify-center py-1">
                <Eyebrow tone="muted" className="rounded-sm border border-border bg-surface px-2 py-1">{formatDayLabel(msg.createdAt)}</Eyebrow>
              </div>
            )}
            <MessageBubble
              msg={msg}
              user={user}
              highlighted={msg.id === highlightedMessageId}
              highlightRef={highlightedRef}
              onAddToCart={handleAddToCart}
              onForwardMedia={forwardMedia}
              forwardUploading={!!uploadingIds[msg.id]}
              onAddTag={addTag}
              onRemoveTag={removeTag}
            />
          </React.Fragment>
        );
      }),
    [messages, highlightedMessageId, uploadingIds, user],
  );

  return (
    <div
      className={cn('relative flex h-full w-full min-w-0 flex-col bg-bg', isDragging && 'ring-2 ring-inset ring-accent')}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
      onDrop={handleDrop}
    >
      {isUploading && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-bg/70 backdrop-blur-[1px]">
          <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-sm text-fg">
            <Spinner /> Enviando archivo…
          </div>
        </div>
      )}

      {isDragging && !isUploading && (
        <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-bg/85">
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-accent px-10 py-8 text-fg">
            <Download size={28} className="text-accent" aria-hidden />
            <span className="text-sm font-medium">Suelta el archivo para adjuntarlo</span>
          </div>
        </div>
      )}

      <header className="flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border bg-surface px-5 py-2.5">
        <div className="min-w-[200px] flex-1">
          <h2 className="truncate text-[15px] font-semibold leading-tight text-fg">{clientName || 'Conversación'}</h2>
          {eyebrow && <Eyebrow tone="info" className="mt-1 block truncate">{eyebrow}</Eyebrow>}
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          {cartCount > 0 && <Badge tone="success">Carrito listo · {cartCount}</Badge>}
          {headerActions}
        </div>
      </header>

      <div ref={scrollContainerRef} className="bg-grid flex-1 space-y-3 overflow-y-auto overflow-x-hidden px-5 py-4 custom-scrollbar">
        <div ref={observerTargetRef} className="h-px w-full" />
        {isLoadingMore && <div className="flex justify-center py-2"><Spinner /></div>}

        {(errorMsg || localError) && (
          <div role="alert" className="flex items-center justify-between gap-3 rounded-md border border-danger/40 bg-danger/10 px-3.5 py-2 text-sm text-danger">
            <span>{errorMsg || localError}</span>
            <button onClick={() => { clearError?.(); setLocalError(null); }} className="rounded-sm p-0.5 hover:bg-danger/20" aria-label="Cerrar error">
              <X size={14} />
            </button>
          </div>
        )}

        <AgentSummaryCard conversation={conversation} canGenerate={messages.length > 0} />

        {messages.length === 0 && !isLoadingMore && (
          <EmptyState compact icon={MessageSquare} title="Sin mensajes todavía" description="Escribe abajo para iniciar la conversación." />
        )}

        {timeline}
        <div ref={bottomRef} />
      </div>

      <ChatComposer
        ref={composerRef}
        conversationId={conversationId}
        clientName={clientName}
        onSendMessage={onSendMessage}
        onSendMedia={onSendMedia}
        isUploading={isUploading}
        disabledInput={disabledInput}
        conversationStatus={status}
        onError={setLocalError}
        isDraft={conversationId === 'draft'}
        onCancelDraft={() => useChatStore.getState().cancelDraftConversation()}
      />
    </div>
  );
}
