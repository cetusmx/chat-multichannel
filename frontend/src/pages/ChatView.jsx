import { useEffect, useState } from 'react';
import { ShoppingCart, X } from 'lucide-react';
import ChatList from '../features/chat/components/ChatList';
import MessageList from '../features/chat/components/MessageList';
import useChatStore from '../stores/useChatStore';

import CommandPalette from '../features/chat/components/CommandPalette';
import CartViewer from '../features/chat/components/CartViewer';

/**
 * ChatView - Vista principal para la gestión de mensajería (WhatsApp MVP)
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
    initializeSocket,
    disconnectSocket,
    hasMore,
    loadMoreMessages,
    isLoadingMore
  } = useChatStore();

  useEffect(() => {
    // 1. Iniciar conexión Socket.io
    initializeSocket();
    // 2. Traer conversaciones iniciales
    fetchConversations();

    return () => {
      // Limpiar al desmontar
      disconnectSocket();
    };
  }, [initializeSocket, fetchConversations, disconnectSocket]);

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
                headerActions={
                  <button
                    onClick={() => setIsCartOpen(true)}
                    className="relative z-40 cursor-pointer bg-gradient-to-r from-sales-cyan-600 to-sales-blue-600 hover:from-sales-cyan-500 hover:to-sales-blue-500 text-white p-2.5 rounded-full shadow-[0_0_12px_rgba(6,182,212,0.6)] border border-sales-cyan-400/50 transition-all duration-300 hover:scale-110 active:scale-95 flex items-center justify-center"
                    title="Ver Carrito"
                  >
                    <ShoppingCart className="w-5 h-5" />
                    {(() => {
                      const cData = activeConv?.client?.cartData;
                      const items = Array.isArray(cData) ? cData : (cData?.items || []);
                      if (items.length > 0) {
                        return (
                          <span className="absolute top-1.5 right-1.5 bg-sales-coral-500 text-[9px] font-bold min-w-[14px] h-[14px] px-1 flex items-center justify-center rounded-full shadow-sm">
                            {items.length}
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </button>
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
                  <button 
                    onClick={() => setIsCartOpen(false)}
                    className="absolute top-4 left-4 z-10 p-2 bg-sales-slate-700/50 hover:bg-sales-slate-700 text-sales-slate-300 hover:text-white rounded-full transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                  {activeConv?.client && (
                    <CartViewer 
                      cartData={activeConv.client.cartData} 
                      client={activeConv.client}
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
