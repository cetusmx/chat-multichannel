import { useEffect, useState, useCallback, memo } from 'react';
import useUIStore from '../../../stores/useUIStore';
import useChatStore from '../../../stores/useChatStore';
import MessageList from './MessageList';
import useAuthStore from '../../../stores/useAuthStore';
import { get, post, postFormData, patch } from '../../../services/api';

const VendorAssignmentSelect = ({ conversation }) => {
  const [vendors, setVendors] = useState([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const user = useAuthStore(s => s.user);

  useEffect(() => {
    if (user?.role === 'COORDINATOR' || user?.role === 'ADMIN') {
      get('/users?role=VENDOR')
        .then(res => res.json())
        .then(data => {
           if (data.data) setVendors(data.data);
        })
        .catch(console.error);
    }
  }, [user?.role]);

  if (user?.role !== 'COORDINATOR' && user?.role !== 'ADMIN') return null;
  if (!conversation?.id) return null;

  const handleAssign = async (e) => {
    const newVendorId = e.target.value;
    setIsAssigning(true);
    try {
       const res = await patch(`/chat/${conversation.id}/assign`, { vendorId: newVendorId });
       if (!res.ok) throw new Error('Error asignando');
       // Success feedback
       alert('Conversación reasignada exitosamente');
    } catch (err) {
       console.error(err);
       alert('Error reasignando conversación');
    } finally {
       setIsAssigning(false);
    }
  };

  return (
    <select 
      value={conversation?.vendorId || ''} 
      onChange={handleAssign}
      disabled={isAssigning}
      className="mr-8 px-2 py-1 bg-sales-slate-800 text-sales-slate-300 text-sm border border-sales-slate-700 rounded focus:outline-none focus:border-sales-cyan-500"
      title="Asignar Asesor"
    >
      <option value="">Sin Asignar</option>
      {vendors.map(v => (
        <option key={v.id} value={v.id}>{v.name || v.email}</option>
      ))}
    </select>
  );
};
const ClientBlockToggle = ({ conversation }) => {
  const [isBlocking, setIsBlocking] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const user = useAuthStore(s => s.user);

  if (user?.role !== 'COORDINATOR' && user?.role !== 'ADMIN') return null;
  if (!conversation?.client) return null;

  const isBlocked = conversation.client.isBlocked;

  const handleToggleBlock = async () => {
    setIsBlocking(true);
    setShowConfirm(false);
    try {
       const res = await patch(`/clients/${conversation.client.id}/block`, { isBlocked: !isBlocked });
       if (!res.ok) throw new Error('Error cambiando estado de bloqueo');
    } catch (err) {
       console.error(err);
       alert('Error al cambiar el estado de bloqueo del cliente.');
    } finally {
       setIsBlocking(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setShowConfirm(true)}
        disabled={isBlocking}
        className={`mr-2 px-3 py-1 border rounded transition-colors text-sm font-medium ${
          isBlocked 
            ? 'bg-sales-slate-800 border-sales-slate-700 hover:bg-sales-slate-700 text-sales-slate-300' 
            : 'bg-red-500/10 border-red-500/50 hover:bg-red-500/20 text-red-400'
        }`}
        title={isBlocked ? 'Desbloquear Cliente' : 'Bloquear Cliente'}
      >
        {isBlocked ? 'Desbloquear' : 'Bloquear'}
      </button>

      {showConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-sales-slate-950/80 backdrop-blur-sm">
          <div className="mx-4 p-6 w-full max-w-sm bg-sales-slate-900 border border-sales-slate-800 rounded-lg shadow-xl">
            <h3 className="mb-2 text-sales-slate-200 text-lg font-semibold">
              {isBlocked ? '¿Desbloquear cliente?' : '¿Bloquear cliente?'}
            </h3>
            <p className="mb-6 text-sales-slate-400 text-sm">
              {isBlocked 
                ? 'El cliente podrá volver a enviar mensajes y podrá ser atendido de nuevo.'
                : 'El cliente no podrá enviar nuevos mensajes y las conversaciones activas serán cerradas. ¿Estás seguro?'
              }
            </p>
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-sales-slate-400 hover:text-sales-slate-200 text-sm font-medium"
              >
                Cancelar
              </button>
              <button 
                onClick={handleToggleBlock}
                className={`px-4 py-2 rounded text-white text-sm font-medium ${
                  isBlocked ? 'bg-sales-cyan-600 hover:bg-sales-cyan-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {isBlocked ? 'Sí, Desbloquear' : 'Sí, Bloquear'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

/**
 * FocusedChat encapsula el estado local y las operaciones de red para una sola conversación en el panel dual.
 * Esto evita saturar el store global y previene renderizados innecesarios.
 */
const FocusedChat = memo(({ conversationId, clientName, conversation }) => {
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
           // Si ya llegó por socket, o si la UI local ya lo había agregado optimísticamente (deduplicación por ID o por temp text)
           if (prev.find(m => m.id === msg.id)) return prev;
           // Deduplicate optimistic messages that haven't received their real ID yet
           const isOptimisticDuplicate = prev.find(m => m.status === 'SENDING' && m.content === msg.content);
           if (isOptimisticDuplicate) {
             return prev.map(m => m.id === isOptimisticDuplicate.id ? msg : m);
           }
           return [...prev, msg];
        });
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
     const userRole = useAuthStore.getState().user?.role || 'VENDOR';
     const tempMsg = { 
       id: tempId, 
       content: text, 
       senderType: userRole, 
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
        setMessages(prev => prev.some(m => m.id === json.data.id) ? prev : [...prev, json.data]);
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
         headerActions={conversation ? (
           <>
             <ClientBlockToggle conversation={conversation} />
             <VendorAssignmentSelect conversation={conversation} />
           </>
         ) : null}
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
        return <FocusedChat key={id} conversationId={id} clientName={name} conversation={conv} />;
      })}
    </div>
  );
}
