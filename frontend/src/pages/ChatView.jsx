import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { ShoppingCart, CheckCircle2, ShieldAlert, MoreHorizontal, Clock, PauseCircle, Calendar, Ban, Play, Undo2, MessageSquare, X } from 'lucide-react';
import ChatList from '../features/chat/components/ChatList';
import MessageList from '../features/chat/components/MessageList';
import CommandPalette from '../features/chat/components/CommandPalette';
import CartViewer from '../features/chat/components/CartViewer';
import CatalogPanel from '../features/chat/components/CatalogPanel';
import ChatActionModals from '../features/chat/components/ChatActionModals';
import useChatStore from '../stores/useChatStore';
import useAuthStore from '../stores/useAuthStore';
import { toast } from '../stores/useToastStore.js';
import { Button, IconButton, Badge, Eyebrow, EmptyState } from '../components/ui/index.js';
import { getStatusMeta, isClosedStatus } from '../utils/conversationStatus.js';
import { getCartItems } from '../utils/cart.js';
import { cn } from '../utils/cn.js';

const ChatHeaderActions = ({ activeConv, setIsCartOpen, showCartButton }) => {
  const { updateChatStatus, isPatching } = useChatStore();
  const user = useAuthStore(s => s.user);

  const [activeModal, setActiveModal] = useState(null);
  const [modalError, setModalError] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const prevStatusRef = useRef(activeConv?.status);
  const prevLastMsgIdRef = useRef(activeConv?.messages?.at(-1)?.id);
  const modalConvIdRef = useRef(null);

  useEffect(() => {
    setActiveModal(null);
    setModalError(null);
  }, [activeConv?.id]);

  useEffect(() => {
    const currentStatus = activeConv?.status;
    const currentLastMsg = activeConv?.messages?.at(-1);

    if (prevStatusRef.current && prevStatusRef.current !== currentStatus) {
      if (activeModal && !isPatching) {
        toast.warning('El estado del chat cambió', { description: 'La acción pendiente fue cancelada.' });
        setActiveModal(null);
      }
    }

    if (
      currentLastMsg &&
      prevLastMsgIdRef.current !== currentLastMsg.id &&
      currentLastMsg.senderType === 'CUSTOMER' &&
      activeModal === 'SCHEDULED' &&
      !isPatching
    ) {
      toast.warning('El cliente envió un mensaje', { description: 'La programación fue cancelada.' });
      setActiveModal(null);
    }

    prevStatusRef.current = currentStatus;
    prevLastMsgIdRef.current = currentLastMsg?.id;
  }, [activeConv?.status, activeConv?.messages, activeModal, isPatching]);

  useEffect(() => {
    if (!isDropdownOpen) return;
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setIsDropdownOpen(false);
    };
    const handleEsc = (e) => e.key === 'Escape' && setIsDropdownOpen(false);
    document.addEventListener('pointerdown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('pointerdown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isDropdownOpen]);

  if (!activeConv) return null;

  const isSlaEnabled = user?.tenant?.isSlaEnabled ?? true;
  const status = activeConv.status;
  const showVendorActions = user?.id === activeConv.vendorId;
  const showAdvanced = isSlaEnabled && showVendorActions;
  const isEmpty = !activeConv?.messages || activeConv.messages.length === 0;
  const disabledTooltip = isEmpty ? 'Aún no hay mensajes' : 'El último mensaje debe ser tuyo';
  const isCoordinatorOrAdmin = ['COORDINATOR', 'ADMIN', 'SUPERADMIN'].includes(user?.role);
  const closed = isClosedStatus(status);
  const isVendorLast = activeConv?.messages?.at(-1)?.senderType === 'VENDOR';
  const cartCount = getCartItems(activeConv.client).length;

  const handleAction = async (payload) => {
    setActiveModal(null);
    setModalError(null);
    try {
      await updateChatStatus(activeConv.id, payload);
    } catch (e) {
      toast.error('No se pudo actualizar el chat', { description: e.message });
    }
  };

  const handleModalSubmit = async (payload) => {
    setModalError(null);
    try {
      if (payload.status) prevStatusRef.current = payload.status;
      await updateChatStatus(modalConvIdRef.current || activeConv.id, payload);
      setActiveModal(null);
    } catch (e) {
      setModalError('Error de API: ' + e.message);
    }
  };

  const openModal = (modalName) => {
    modalConvIdRef.current = activeConv.id;
    setActiveModal(modalName);
    setModalError(null);
  };

  const cartButton = showCartButton && (
    <div className="relative">
      <IconButton
        icon={ShoppingCart}
        label={closed ? 'Carrito deshabilitado en chats cerrados' : 'Ver carrito'}
        variant="outline"
        size="lg"
        onClick={() => setIsCartOpen(true)}
        disabled={isPatching || closed}
      />
      {cartCount > 0 && (
        <span className="tnum pointer-events-none absolute -right-1 -top-1 rounded-sm bg-accent px-1 font-mono text-[10px] font-semibold leading-4 text-accent-fg">{cartCount}</span>
      )}
    </div>
  );

  if (status === 'PENDING_ASSIGNMENT' || closed) {
    return <div className="flex items-center gap-2">{cartButton}</div>;
  }

  if (status === 'ESCALATED') {
    return (
      <div className="flex items-center gap-2">
        <Badge tone="solid-danger" dot>Escalado · esperando coordinador</Badge>
        {isCoordinatorOrAdmin && (
          <Button variant="success" size="sm" icon={Undo2} loading={isPatching} onClick={() => handleAction({ status: 'ACTIVE' })}>
            Devolver a vendedor
          </Button>
        )}
        {cartButton}
      </div>
    );
  }

  if (['ON_HOLD', 'WAITING_CUSTOMER', 'SCHEDULED'].includes(status)) {
    const meta = getStatusMeta(status);
    return (
      <div className="flex items-center gap-2">
        <Badge tone={meta.tone} dot>{meta.label}</Badge>
        {showVendorActions && (
          <Button variant="success" size="sm" icon={Play} loading={isPatching} disabled={isEmpty} title={isEmpty ? disabledTooltip : 'Reanudar'} onClick={() => handleAction({ status: 'ACTIVE' })}>
            Reanudar
          </Button>
        )}
        {cartButton}
      </div>
    );
  }

  const menuItem = 'flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-fg transition-colors hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <>
      <div className="flex items-center gap-2">
        {showVendorActions && (
          <>
            <Button variant="success" size="sm" icon={CheckCircle2} loading={isPatching} disabled={isEmpty} title={isEmpty ? disabledTooltip : 'Marcar como resuelto'} onClick={() => openModal('RESOLVE')}>
              Resolver
            </Button>
            <Button variant="danger" size="sm" icon={ShieldAlert} loading={isPatching} disabled={isEmpty} title={isEmpty ? disabledTooltip : 'Escalar a coordinador'} onClick={() => handleAction({ status: 'ESCALATED' })}>
              Escalar
            </Button>
          </>
        )}

        {showAdvanced && (
          <div className="relative" ref={dropdownRef}>
            <IconButton icon={MoreHorizontal} label="Más acciones" variant="outline" size="lg" onClick={() => setIsDropdownOpen(!isDropdownOpen)} disabled={isPatching} aria-expanded={isDropdownOpen} aria-haspopup="menu" />
            {isDropdownOpen && (
              <div role="menu" className="absolute right-0 z-[60] mt-2 w-60 overflow-hidden rounded-lg border border-border bg-surface py-1 shadow-2xl shadow-black/40">
                <button role="menuitem" className={menuItem} disabled={!isVendorLast || isPatching || isEmpty} title={!isVendorLast || isEmpty ? disabledTooltip : ''} onClick={() => { setIsDropdownOpen(false); handleAction({ status: 'WAITING_CUSTOMER' }); }}>
                  <Clock size={14} className="text-fg-muted" /> Esperando al cliente
                </button>
                <button role="menuitem" className={menuItem} disabled={isPatching || isEmpty} title={isEmpty ? disabledTooltip : ''} onClick={() => { setIsDropdownOpen(false); openModal('ON_HOLD'); }}>
                  <PauseCircle size={14} className="text-fg-muted" /> Poner en espera
                </button>
                <button role="menuitem" className={menuItem} disabled={!isVendorLast || isPatching || isEmpty} title={!isVendorLast || isEmpty ? disabledTooltip : ''} onClick={() => { setIsDropdownOpen(false); openModal('SCHEDULED'); }}>
                  <Calendar size={14} className="text-fg-muted" /> Agendar seguimiento
                </button>
                <div className="my-1 border-t border-border" />
                <button role="menuitem" className={cn(menuItem, 'text-danger hover:bg-danger/10')} disabled={isPatching || isEmpty} title={isEmpty ? disabledTooltip : ''} onClick={() => { setIsDropdownOpen(false); openModal('DISCARDED'); }}>
                  <Ban size={14} /> Descartar / spam
                </button>
              </div>
            )}
          </div>
        )}

        {cartButton}
      </div>
      <ChatActionModals
        activeModal={activeModal}
        onClose={() => { setActiveModal(null); setModalError(null); }}
        onSubmit={handleModalSubmit}
        isPatching={isPatching}
        apiError={modalError}
      />
    </>
  );
};

/**
 * ChatView - Vendor workspace: inbox, conversation and catalog rail.
 *
 * @component
 */
export default function ChatView() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const {
    conversations,
    currentConversationId,
    messages,
    fetchConversations,
    selectConversation,
    sendMessage,
    sendMedia,
    uploadingIds,
    errorMsg,
    clearError,
    hasMore,
    loadMoreMessages,
    isLoadingMore,
  } = useChatStore();
  const user = useAuthStore((s) => s.user);

  const location = useLocation();

  useEffect(() => {
    fetchConversations().then(() => {
      if (location.state?.conversationId) {
        selectConversation(location.state.conversationId);
        window.history.replaceState({}, document.title);
      } else if (location.state?.draftClient) {
        useChatStore.getState().setDraftConversation(location.state.draftClient);
        window.history.replaceState({}, document.title);
      }
    });
  }, [fetchConversations, location.state?.conversationId, location.state?.draftClient, selectConversation]);

  const activeConv = conversations.find(c => c.id === currentConversationId);
  const closed = isClosedStatus(activeConv?.status);
  const openCount = conversations.filter((c) => !isClosedStatus(c.status)).length;

  return (
    <>
      <CommandPalette />
      <div className="flex h-full w-full min-w-0 bg-bg">
        <aside className="flex h-full w-80 shrink-0 flex-col border-r border-border bg-surface">
          <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-4">
            <Eyebrow>Bandeja</Eyebrow>
            <span className="tnum font-mono text-[11px] text-fg-subtle">{openCount} {openCount === 1 ? 'abierto' : 'abiertos'}</span>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <ChatList conversations={conversations} currentConversationId={currentConversationId} onSelect={selectConversation} />
          </div>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {currentConversationId ? (
            <MessageList
              conversationId={currentConversationId}
              conversation={activeConv}
              messages={messages}
              onSendMessage={sendMessage}
              onSendMedia={sendMedia}
              isUploading={!!uploadingIds[currentConversationId]}
              errorMsg={errorMsg}
              clearError={clearError}
              clientName={activeConv?.client?.name || activeConv?.client?.phoneNumber}
              hasMore={hasMore[currentConversationId] || false}
              loadMoreMessages={() => loadMoreMessages(currentConversationId)}
              isLoadingMore={isLoadingMore}
              disabledInput={closed}
              conversationStatus={activeConv?.status}
              vendorName={activeConv?.vendorId === user?.id ? user?.name : undefined}
              headerActions={<ChatHeaderActions activeConv={activeConv} setIsCartOpen={setIsCartOpen} showCartButton />}
            />
          ) : (
            <div className="bg-grid flex h-full items-center justify-center">
              <EmptyState icon={MessageSquare} eyebrow="Bandeja de ventas" title="Selecciona una conversación" description="Elige un chat de la lista para ver el historial, el carrito y las acciones disponibles." />
            </div>
          )}
        </section>

        {activeConv?.client && (
          <aside className="hidden h-full w-72 shrink-0 border-l border-border xl:flex">
            <CatalogPanel client={activeConv.client} conversationId={activeConv.id !== 'draft' ? activeConv.id : null} disabled={closed} onOpenCart={() => setIsCartOpen(true)} />
          </aside>
        )}

        <div
          className={cn('fixed inset-0 z-40 bg-black/50 transition-opacity duration-200', isCartOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0')}
          onClick={() => setIsCartOpen(false)}
          aria-hidden
        />
        <div
          role="dialog"
          aria-label="Carrito"
          aria-hidden={!isCartOpen}
          className={cn('fixed right-0 top-0 z-50 flex h-full flex-col border-l border-border bg-surface shadow-2xl shadow-black/50 transition-transform duration-200 ease-out', isCartOpen ? 'translate-x-0' : 'translate-x-full')}
          style={{ width: 'min(90vw, 440px)' }}
        >
          {activeConv?.client && isCartOpen && (
            <CartViewer cartData={activeConv.client.cartData} client={activeConv.client} onClose={() => setIsCartOpen(false)} />
          )}
        </div>
      </div>
    </>
  );
}
