import { useEffect } from 'react';
import ChatList from '../features/chat/components/ChatList';
import MessageList from '../features/chat/components/MessageList';
import useChatStore from '../stores/useChatStore';

import CommandPalette from '../features/chat/components/CommandPalette';

/**
 * ChatView - Vista principal para la gestión de mensajería (WhatsApp MVP)
 * 
 * @component
 */
export default function ChatView() {
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
      <div className="flex h-full bg-sales-slate-900 rounded-lg overflow-hidden border border-sales-slate-800 shadow-xl">
        {/* Columna Izquierda: Lista de Conversaciones */}
        <div className="w-1/3 min-w-0 bg-sales-slate-900 flex flex-col">
        <div className="p-4 border-b border-sales-slate-800 bg-sales-slate-900">
          <h2 className="text-xl font-bold text-sales-slate-100">Bandeja de Entrada</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ChatList 
            conversations={conversations} 
            currentConversationId={currentConversationId} 
            onSelect={selectConversation}
          />
        </div>
      </div>

      {/* Columna Derecha: Mensajes Activos */}
      <div className="flex-1 flex flex-col min-w-0">
        {currentConversationId ? (
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
          />
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
