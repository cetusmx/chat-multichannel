import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { ShoppingCart, X, CheckCircle, ShieldAlert, EllipsisVertical, Clock, PauseCircle, Calendar, Ban } from 'lucide-react';
import ChatList from '../features/chat/components/ChatList';
import MessageList from '../features/chat/components/MessageList';
import ConfirmModal from '../components/ConfirmModal';
import useChatStore from '../stores/useChatStore';

import CommandPalette from '../features/chat/components/CommandPalette';
import CartViewer from '../features/chat/components/CartViewer';
import ChatActionModals from '../features/chat/components/ChatActionModals';
import useAuthStore from '../stores/useAuthStore';

const ChatHeaderActions = ({ activeConv, setConfirmClose, setIsCartOpen }) => {
  const { updateChatStatus, isPatching } = useChatStore();
  const user = useAuthStore(s => s.user);

  const [activeModal, setActiveModal] = useState(null);
  const [modalError, setModalError] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Track previous state for auto-close logic
  const prevStatusRef = useRef(activeConv?.status);
  const prevLastMsgIdRef = useRef(activeConv?.messages?.at(-1)?.id);

  const socket = useChatStore(s => s.socket);

  // Clear modal on conversation switch
  useEffect(() => {
    setActiveModal(null);
    setModalError(null);
  }, [activeConv?.id]);

  useEffect(() => {
    const currentStatus = activeConv?.status;
    const currentLastMsg = activeConv?.messages?.at(-1);

    // If status changed via WebSocket (or other means)
    if (prevStatusRef.current && prevStatusRef.current !== currentStatus) {
      if (activeModal && !isPatching) {
        window.alert("El estado del chat ha cambiado. La acción ha sido cancelada.");
        setActiveModal(null);
      }
    }

    // If a new message arrived from the customer while SCHEDULED modal is open
    if (
      currentLastMsg &&
      prevLastMsgIdRef.current !== currentLastMsg.id &&
      currentLastMsg.senderType === 'CUSTOMER' &&
      activeModal === 'SCHEDULED' &&
      !isPatching
    ) {
      window.alert("El cliente ha enviado un nuevo mensaje. La acción programada ha sido cancelada.");
      setActiveModal(null);
    }

    prevStatusRef.current = currentStatus;
    prevLastMsgIdRef.current = currentLastMsg?.id;
  }, [activeConv?.status, activeConv?.messages, activeModal]);

  const isPatchingRef = useRef(isPatching);
  const activeModalRef = useRef(activeModal);

  useEffect(() => {
    isPatchingRef.current = isPatching;
  }, [isPatching]);

  useEffect(() => {
    activeModalRef.current = activeModal;
  }, [activeModal]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    if (isDropdownOpen) {
      document.addEventListener('pointerdown', handleClickOutside);
    }
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, [isDropdownOpen]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') setIsDropdownOpen(false);
    };
    if (isDropdownOpen) document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isDropdownOpen]);

  const modalConvIdRef = useRef(null);

  if (!activeConv) return null;

  const isSlaEnabled = user?.tenant?.isSlaEnabled ?? true;
  const isAssignedToMe = user?.id === activeConv.vendorId;
  const status = activeConv.status;
  const showVendorActions = user?.id === activeConv.vendorId;
  const showAdvanced = isSlaEnabled && showVendorActions;
  const isEmpty = !activeConv?.messages || activeConv.messages.length === 0;
  const disabledTooltip = isEmpty ? 'Aún no hay mensajes' : 'El último mensaje debe ser tuyo';
  
  const isCoordinatorOrAdmin = user?.role === 'COORDINATOR' || user?.role === 'ADMIN' || user?.role === 'SUPERADMIN';

  const renderCartButton = () => (
    <button
      onClick={() => setIsCartOpen(true)}
      disabled={isPatching || ['CLOSED', 'CLOSED_INACTIVE', 'DISCARDED', 'CLOSED_WON'].includes(activeConv?.status)}
      className={`relative z-40 bg-gradient-to-r from-sales-cyan-600 to-sales-blue-600 text-white p-2 rounded-full shadow-[0_0_12px_rgba(6,182,212,0.6)] border border-sales-cyan-400/50 flex items-center justify-center ${
        isPatching || ['CLOSED', 'CLOSED_INACTIVE', 'DISCARDED', 'CLOSED_WON'].includes(activeConv?.status) 
        ? 'opacity-50 cursor-not-allowed' 
        : 'cursor-pointer hover:from-sales-cyan-500 hover:to-sales-blue-500 transition-all duration-300 hover:scale-110 active:scale-95'
      }`}
      title={['CLOSED', 'CLOSED_INACTIVE', 'DISCARDED', 'CLOSED_WON'].includes(activeConv?.status) ? "Carrito deshabilitado en chats cerrados" : "Ver Carrito"}
    >
      <ShoppingCart className="w-4 h-4" />
      {(() => {
        const cData = activeConv?.client?.cartData;
        const items = Array.isArray(cData) ? cData : (cData?.items || []);
        if (items.length > 0) {
          return (
            <span className="absolute -top-1 -right-1 bg-sales-coral-500 text-[9px] font-bold min-w-[14px] h-[14px] px-1 flex items-center justify-center rounded-full shadow-sm">
              {items.length}
            </span>
          );
        }
        return null;
      })()}
    </button>
  );

  const handleAction = async (payload) => {
    setActiveModal(null);
    setModalError(null);
    try {
      await updateChatStatus(activeConv.id, payload);
    } catch (e) {
      window.alert("Error de API: " + e.message);
    }
  };

  const handleModalSubmit = async (payload) => {
    setModalError(null);
    try {
      if (payload.status) {
        prevStatusRef.current = payload.status;
      }
      await updateChatStatus(modalConvIdRef.current || activeConv.id, payload);
      setActiveModal(null);
    } catch (e) {
       setModalError("Error de API: " + e.message);
    }
  };

  const openModal = (modalName) => {
    modalConvIdRef.current = activeConv.id;
    setActiveModal(modalName);
    setModalError(null);
  };

  if (status === 'PENDING_ASSIGNMENT') {
    return (
      <div className="flex items-center gap-2">
        {renderCartButton()}
      </div>
    );
  }

  if (status === 'ESCALATED') {
    return (
      <div className="flex items-center gap-2">
        <div className="bg-sales-coral-500/20 border border-sales-coral-500 text-sales-coral-400 px-4 py-2 rounded-lg font-bold text-sm shadow-sm flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-sales-coral-400 animate-pulse"></span>
          Escalado - Esperando al Coordinador
        </div>
        {isCoordinatorOrAdmin && (
          <button
            onClick={() => handleAction({ status: 'ACTIVE' })}
            disabled={isPatching}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium disabled:opacity-50 text-sm transition-colors"
          >
            Devolver a Vendedor
          </button>
        )}
        {renderCartButton()}
      </div>
    );
  }

  if (status === 'CLOSED' || status === 'CLOSED_INACTIVE' || status === 'DISCARDED' || status === 'CLOSED_WON') {
    return (
      <div className="flex items-center gap-2">
        {renderCartButton()}
      </div>
    );
  }

  const isVendorLast = activeConv?.messages?.at(-1)?.senderType === 'VENDOR';

  if (['ON_HOLD', 'WAITING_CUSTOMER', 'SCHEDULED'].includes(status)) {
    return (
      <div className="flex items-center gap-2">
        <div className="bg-sales-amber-500/20 border border-sales-amber-500 text-sales-amber-400 px-4 py-2 rounded-lg font-bold text-sm shadow-sm flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-sales-amber-400 animate-pulse"></span>
          Esperando al Cliente
        </div>
        {showVendorActions && (
          <button
            onClick={() => handleAction({ status: 'ACTIVE' })}
            disabled={isPatching || isEmpty}
            aria-disabled={isPatching || isEmpty ? "true" : "false"}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-medium disabled:opacity-50 flex items-center gap-2 text-sm"
            title={isEmpty ? disabledTooltip : 'Reanudar'}
          >
            {isPatching && <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />}
            Reanudar
          </button>
        )}
        {renderCartButton()}
      </div>
    );
  }



  return (
    <>
      <div className="flex items-center gap-2">
        {showVendorActions && (
          <>
            <button
              onClick={() => openModal('RESOLVE')}
              disabled={isPatching || isEmpty}
              aria-disabled={isPatching || isEmpty ? "true" : "false"}
              className="px-3 py-1.5 bg-sales-slate-800 hover:bg-emerald-600/90 text-emerald-500 hover:text-white rounded border border-emerald-500/30 hover:border-emerald-500 transition-colors flex items-center gap-1.5 disabled:opacity-50 text-sm"
              title={isEmpty ? disabledTooltip : "Resolver"}
            >
              {isPatching ? (
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-emerald-500"></span>
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              Resolver
            </button>

            <button
              onClick={() => handleAction({ status: 'ESCALATED' })}
              disabled={isPatching || isEmpty}
              aria-disabled={isPatching || isEmpty ? "true" : "false"}
              className="px-3 py-1.5 bg-sales-slate-800 hover:bg-sales-coral-600/90 text-sales-coral-500 hover:text-white rounded border border-sales-coral-500/30 hover:border-sales-coral-500 transition-colors flex items-center gap-1.5 disabled:opacity-50 text-sm"
              title={isEmpty ? disabledTooltip : "Escalar"}
            >
              {isPatching ? (
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-sales-coral-500"></span>
              ) : (
                <ShieldAlert className="w-4 h-4" />
              )}
              Escalar
            </button>
          </>
        )}

        {showAdvanced && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              disabled={isPatching}
              aria-expanded={isDropdownOpen}
              aria-haspopup="menu"
              className="px-3 py-1.5 bg-sales-slate-800 hover:bg-sales-slate-700 text-sales-slate-300 rounded border border-sales-slate-700 transition-colors disabled:opacity-50 flex items-center gap-1.5 text-sm"
            >
              Más acciones
              {isPatching ? (
                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-sales-slate-300"></span>
              ) : (
                <EllipsisVertical className="w-4 h-4" />
              )}
            </button>
            {isDropdownOpen && (
              <div role="menu" className="absolute right-0 mt-2 w-56 bg-sales-slate-800 border border-sales-slate-700 rounded shadow-xl z-[60] overflow-hidden">
                <button
                  role="menuitem"
                  disabled={!isVendorLast || isPatching || isEmpty}
                  aria-disabled={!isVendorLast || isPatching || isEmpty ? "true" : "false"}
                  onClick={() => { setIsDropdownOpen(false); handleAction({ status: 'WAITING_CUSTOMER' }); }}
                  className="w-full text-left px-4 py-2 hover:bg-sales-slate-700 text-sm text-sales-slate-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  title={!isVendorLast || isEmpty ? disabledTooltip : ''}
                >
                  <Clock className="w-4 h-4" />
                  Esperando al Cliente
                </button>
                <button
                  role="menuitem"
                  disabled={isPatching || isEmpty}
                  aria-disabled={isPatching || isEmpty ? "true" : "false"}
                  onClick={() => { setIsDropdownOpen(false); openModal('ON_HOLD'); }}
                  className="w-full text-left px-4 py-2 hover:bg-sales-slate-700 text-sm text-sales-slate-200 disabled:opacity-50 flex items-center gap-2"
                  title={isEmpty ? disabledTooltip : ''}
                >
                  <PauseCircle className="w-4 h-4" />
                  Poner en Espera
                </button>
                <button
                  role="menuitem"
                  disabled={!isVendorLast || isPatching || isEmpty}
                  aria-disabled={!isVendorLast || isPatching || isEmpty ? "true" : "false"}
                  onClick={() => { setIsDropdownOpen(false); openModal('SCHEDULED'); }}
                  className="w-full text-left px-4 py-2 hover:bg-sales-slate-700 text-sm text-sales-slate-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  title={!isVendorLast || isEmpty ? disabledTooltip : ''}
                >
                  <Calendar className="w-4 h-4" />
                  Programado
                </button>
                <div className="border-t border-sales-slate-700 my-1"></div>
                <button
                  role="menuitem"
                  disabled={isPatching || isEmpty}
                  aria-disabled={isPatching || isEmpty ? "true" : "false"}
                  onClick={() => { setIsDropdownOpen(false); openModal('DISCARDED'); }}
                  className="w-full text-left px-4 py-2 hover:bg-red-900/50 text-sm text-red-500 disabled:opacity-50 flex items-center gap-2"
                  title={isEmpty ? disabledTooltip : ''}
                >
                  <Ban className="w-4 h-4" />
                  Descartar / Spam
                </button>
              </div>
            )}
          </div>
        )}

        {renderCartButton()}
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
 * ChatView - Vista principal para la gestión de mensajería (WhatsApp MVP)
 *
 * @component
 */
export default function ChatView() {
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);
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
    initializeSocket,
    disconnectSocket,
    hasMore,
    loadMoreMessages,
    isLoadingMore,
    resolveConversation,
  } = useChatStore();

  const location = useLocation();

  useEffect(() => {
    // Solo recargar conversaciones al montar la vista de chat para tener datos frescos (opcional, App.jsx ya lo hace)
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

  return (
    <>
      <CommandPalette />
      <div className="flex h-full w-full min-w-0 bg-sales-slate-900 rounded-lg overflow-hidden border border-sales-slate-800 shadow-xl">
        {/* Columna Izquierda: Lista de Conversaciones */}
        <div className="flex flex-col shrink-0 z-10 w-80 h-full bg-sales-slate-900/40 border-r border-sales-slate-800 shadow-lg backdrop-blur-md">
        <div className="flex items-center justify-between p-4 bg-sales-slate-900/60 border-b border-sales-slate-800">
          <h2 className="text-xl font-bold text-sales-slate-100">Bandeja de Entrada</h2>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <ChatList
            conversations={conversations}
            currentConversationId={currentConversationId}
            onSelect={selectConversation}
          />
        </div>
      </div>

      {/* Columna Derecha: Mensajes Activos */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {currentConversationId ? (
          <div className="relative flex h-full w-full min-w-0 overflow-x-auto">
            <div className="flex flex-col relative flex-1 h-full max-w-full bg-sales-slate-900/50">
              <MessageList
                conversationId={currentConversationId}
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
                disabledInput={['CLOSED', 'CLOSED_INACTIVE', 'CLOSED_WON', 'DISCARDED'].includes(activeConv?.status)}
                headerActions={
                  <div className="flex items-center gap-3">
                    <ChatHeaderActions
                      activeConv={activeConv}
                      setConfirmClose={setConfirmClose}
                      setIsCartOpen={setIsCartOpen}
                    />
                  </div>
                }
              />
            </div>

            {/* Overlay Drawer para el Carrito */}
            <>
              {/* Backdrop oscuro */}
              <div
                className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 ${isCartOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsCartOpen(false)}
              />

              {/* Panel lateral */}
              <div
                className={`fixed top-0 right-0 h-full z-50 transform transition-transform duration-300 ease-in-out shadow-2xl flex flex-col ${isCartOpen ? 'translate-x-0' : 'translate-x-full'}`}
                style={{ width: 'min(90vw, 420px)' }}
              >
                <div className="flex-1 bg-sales-slate-800 flex flex-col overflow-hidden relative">
                  {activeConv?.client && (
                    <CartViewer
                      cartData={activeConv.client.cartData}
                      client={activeConv.client}
                      onClose={() => setIsCartOpen(false)}
                    />
                  )}
                </div>
              </div>
            </>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-sales-slate-900 text-sales-slate-500">
            Selecciona una conversación para comenzar
          </div>
        )}
      </div>
    </div>

    </>
  );
}
