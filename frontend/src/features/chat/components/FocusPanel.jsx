import { useEffect, useState, useCallback, memo } from 'react';
import useUIStore from '../../../stores/useUIStore';
import useChatStore from '../../../stores/useChatStore';
import MessageList from './MessageList';
import { get, post, postFormData } from '../../../services/api';

/**
 * FocusedChat encapsula el estado local y las operaciones de red para una sola conversación en el panel dual.
 * Esto evita saturar el store global y previene renderizados innecesarios.
 */
const FocusedChat = memo(({ conversationId, clientName }) => {
  const socket = useChatStore(s => s.socket);
  const [messages, setMessages] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const loadMessages = useCallback(async (cursor = null, signal = null) => {
    try {
      setIsLoadingMore(true);
      const url = `/chat/${conversationId}/messages?limit=50${cursor ? `&cursor=${cursor}` : ''}`;
      const res = await get(url, { signal });
      if (!res.ok) throw new Error('Error al cargar mensajes');
      const data = await res.json();
      
      setMessages(prev => {
        if (!cursor) return data.data || [];
        const existingIds = new Set(prev.map(m => m.id));
        const newMsgs = (data.data || []).filter(m => !existingIds.has(m.id));
        return [...newMsgs, ...prev];
      });
      setHasMore(data.meta?.hasMore || false);
      setNextCursor(data.meta?.nextCursor || null);
    } catch (e) {
      if (e.name !== 'AbortError') setErrorMsg(e.message);
    } finally {
      setIsLoadingMore(false);
    }
  }, [conversationId]);

  useEffect(() => {
    const controller = new AbortController();
    loadMessages(null, controller.signal);
    return () => controller.abort();
  }, [loadMessages]);

  useEffect(() => {
    if (!socket) return;
    
    const handleNewMessage = (msg) => {
      if (!msg || msg.conversationId !== conversationId) return;
      setMessages(prev => {
           if (prev.find(m => m.id === msg.id)) return prev;
           return [...prev, msg];
        });
      }
    };
    
    const handleMessageUpdated = (msg) => {
      if (!msg || msg.conversationId !== conversationId) return;
      setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, ...msg } : m));
    };

    socket.on('new_message', handleNewMessage);
    socket.on('message_updated', handleMessageUpdated);
    
    return () => {
      socket.off('new_message', handleNewMessage);
      socket.off('message_updated', handleMessageUpdated);
    };
  }, [socket, conversationId]);

  const handleSendMessage = async (text, isInternal = false) => {
     const tempId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + '-' + Math.random().toString(36).substring(2, 9);
     const tempMsg = { 
       id: tempId, 
       content: text, 
       senderType: 'SYSTEM', 
       status: 'SENDING', 
       isInternal,
       createdAt: new Date().toISOString() 
     };
     setMessages(prev => [...prev, tempMsg]);
     try {
       const res = await post(`/chat/${conversationId}/messages`, { content: text, isInternal });
       if (!res.ok) throw new Error('Fallo al enviar');
       const json = await res.json();
       if (!json.data) throw new Error('Respuesta inválida');
       setMessages(prev => prev.map(m => m.id === tempId ? json.data : m));
     } catch (e) {
       setMessages(prev => prev.map(m => m.id === tempId ? { ...m, status: 'FAILED' } : m));
       setErrorMsg('Error al enviar mensaje');
     }
  };

  const handleSendMedia = async (file, text, isInternal, signal) => {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        if (text) formData.append('caption', text);
        if (isInternal) formData.append('isInternal', 'true');
        const res = await postFormData(`/chat/${conversationId}/media`, formData, signal);
        if (!res.ok) throw new Error('Fallo al subir');
        const json = await res.json();
        setMessages(prev => [...prev, json.data]);
      } catch (e) {
        if (e.name !== 'AbortError') setErrorMsg('Error subiendo archivo');
      } finally {
        setIsUploading(false);
      }
  };

  return (
    <div className="flex flex-col relative flex-1 h-full min-w-[320px] max-w-full bg-sales-slate-900/50 border-r border-sales-slate-800 last:border-r-0">
       <MessageList 
         messages={messages}
         onSendMessage={handleSendMessage}
         onSendMedia={handleSendMedia}
         clientName={clientName}
         hasMore={hasMore}
         loadMoreMessages={() => loadMessages(nextCursor)}
         isLoadingMore={isLoadingMore}
         errorMsg={errorMsg}
         clearError={() => setErrorMsg(null)}
         isUploading={isUploading}
       />
       {/* Focus Header overlay for close button */}
       <div className="absolute top-3 right-4 z-10">
         <button 
           onClick={() => useUIStore.getState().toggleFocusedChat(conversationId)}
           className="w-8 h-8 rounded-full bg-sales-slate-800/80 text-sales-slate-400 hover:text-white hover:bg-sales-slate-700 flex items-center justify-center transition-colors shadow-md backdrop-blur-sm border border-sales-slate-700"
           title="Cerrar foco"
         >
           &times;
         </button>
       </div>
    </div>
  );
});

export default function FocusPanel() {
  const focusedChatIds = useUIStore(s => s.focusedChatIds);
  const conversations = useChatStore(s => s.conversations);

  if (!focusedChatIds || focusedChatIds.length === 0) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center bg-sales-slate-950 text-sales-slate-400 p-8 text-center">
        <div className="w-24 h-24 mb-6 rounded-full bg-sales-slate-900 flex items-center justify-center border border-sales-slate-800 shadow-xl">
          <span className="text-4xl text-sales-coral-500/50">💬</span>
        </div>
        <h3 className="text-2xl font-semibold text-sales-slate-200 mb-2">Modo Enfoque</h3>
        <p className="max-w-md text-sales-slate-500">
          Selecciona un chat para enfocar
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full overflow-x-auto divide-x divide-sales-slate-800">
      {focusedChatIds.map(id => {
        const conv = conversations.find(c => c.id === id);
        const name = conv ? (conv.client?.name || conv.client?.phoneNumber) : 'Chat';
        return <FocusedChat key={id} conversationId={id} clientName={name} />;
      })}
    </div>
  );
}
