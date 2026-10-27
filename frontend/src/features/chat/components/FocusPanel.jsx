import { useEffect, useState, useCallback, memo } from 'react';
import { X, Focus, Ban, ShieldOff } from 'lucide-react';
import useUIStore from '../../../stores/useUIStore';
import useChatStore from '../../../stores/useChatStore';
import MessageList from './MessageList';
import useAuthStore from '../../../stores/useAuthStore';
import { get, post, postFormData, patch } from '../../../services/api';
import ConfirmModal from '../../../components/ConfirmModal';
import { toast } from '../../../stores/useToastStore.js';
import { Select, Button, IconButton, EmptyState } from '../../../components/ui/index.js';

const VendorAssignmentSelect = ({ conversation }) => {
  const [vendors, setVendors] = useState([]);
  const [isAssigning, setIsAssigning] = useState(false);
  const [confirmVendor, setConfirmVendor] = useState(null);
  const user = useAuthStore(s => s.user);
  const fetchConversations = useChatStore(s => s.fetchConversations);

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

  const handleAssignClick = (e) => {
    const newVendorId = e.target.value;
    const vendor = vendors.find(v => v.id === newVendorId);
    setConfirmVendor(vendor || { id: '', name: 'Sin asignar' });
  };

  const executeAssign = async () => {
    if (!confirmVendor) return;
    setIsAssigning(true);
    try {
      const res = await patch(`/chat/${conversation.id}/assign`, { vendorId: confirmVendor.id });
      if (!res.ok) throw new Error('Error asignando');
      await fetchConversations();
      toast.success(confirmVendor.id ? `Asignado a ${confirmVendor.name}` : 'Conversación sin asignar');
    } catch (err) {
      console.error(err);
      toast.error('No se pudo reasignar la conversación');
    } finally {
      setIsAssigning(false);
      setConfirmVendor(null);
    }
  };

  return (
    <>
      <div className="w-44">
        <Select size="sm" value={conversation?.vendorId || ''} onChange={handleAssignClick} disabled={isAssigning} aria-label="Asignar asesor">
          <option value="">Sin asignar</option>
          {vendors.map(v => (
            <option key={v.id} value={v.id}>{v.name || v.email}</option>
          ))}
        </Select>
      </div>

      <ConfirmModal
        open={!!confirmVendor}
        title="Reasignar conversación"
        message={`¿Reasignar esta conversación a "${confirmVendor?.name || confirmVendor?.email}"?`}
        onConfirm={executeAssign}
        onCancel={() => setConfirmVendor(null)}
        confirmText="Asignar"
        confirmVariant="primary"
        loading={isAssigning}
      />
    </>
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
      toast.success(isBlocked ? 'Cliente desbloqueado' : 'Cliente bloqueado');
    } catch (err) {
      console.error(err);
      toast.error('No se pudo cambiar el estado de bloqueo');
    } finally {
      setIsBlocking(false);
    }
  };

  return (
    <>
      <Button
        variant={isBlocked ? 'secondary' : 'danger'}
        size="sm"
        icon={isBlocked ? ShieldOff : Ban}
        onClick={() => setShowConfirm(true)}
        loading={isBlocking}
        title={isBlocked ? 'Desbloquear cliente' : 'Bloquear cliente'}
      >
        {isBlocked ? 'Desbloquear' : 'Bloquear'}
      </Button>

      <ConfirmModal
        open={showConfirm}
        title={isBlocked ? '¿Desbloquear cliente?' : '¿Bloquear cliente?'}
        message={
          isBlocked
            ? 'El cliente podrá volver a enviar mensajes y ser atendido de nuevo.'
            : 'El cliente no podrá enviar nuevos mensajes y sus conversaciones activas se cerrarán.'
        }
        onConfirm={handleToggleBlock}
        onCancel={() => setShowConfirm(false)}
        confirmText={isBlocked ? 'Sí, desbloquear' : 'Sí, bloquear'}
        confirmVariant={isBlocked ? 'primary' : 'danger'}
      />
    </>
  );
};

/**
 * FocusedChat keeps per-conversation message state local so the dual panel
 * doesn't pollute the global store.
 */
const FocusedChat = memo(({ conversationId, clientName, conversation, vendorName }) => {
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
    const authUser = useAuthStore.getState().user;
    const tempMsg = {
      id: tempId,
      content: text,
      senderType: authUser?.role || 'VENDOR',
      sender: authUser ? { name: authUser.name, role: authUser.role } : undefined,
      status: 'SENDING',
      isInternal,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempMsg]);
    try {
      const res = await post(`/chat/${conversationId}/messages`, { content: text, isInternal });
      if (!res.ok) throw new Error('Fallo al enviar');
      const json = await res.json();
      if (!json.data) throw new Error('Respuesta inválida');
      setMessages(prev => prev.map(m => m.id === tempId ? json.data : m));
    } catch {
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
    <div className="relative flex h-full min-w-[360px] max-w-full flex-1 flex-col border-r border-border last:border-r-0">
      <MessageList
        conversationId={conversation?.id}
        conversation={conversation}
        messages={messages}
        onSendMessage={handleSendMessage}
        onSendMedia={handleSendMedia}
        clientName={clientName}
        vendorName={vendorName}
        hasMore={hasMore}
        loadMoreMessages={() => loadMessages(nextCursor)}
        isLoadingMore={isLoadingMore}
        errorMsg={errorMsg}
        clearError={() => setErrorMsg(null)}
        isUploading={isUploading}
        disabledInput={['CLOSED', 'CLOSED_INACTIVE', 'CLOSED_WON', 'DISCARDED'].includes(conversation?.status)}
        headerActions={conversation ? (
          <>
            <ClientBlockToggle conversation={conversation} />
            <VendorAssignmentSelect conversation={conversation} />
            <IconButton icon={X} label="Quitar del enfoque" size="lg" onClick={() => useUIStore.getState().toggleFocusedChat(conversationId)} />
          </>
        ) : null}
      />
    </div>
  );
});

export default function FocusPanel({ vendorMap = {} }) {
  const focusedChatIds = useUIStore(s => s.focusedChatIds);
  const conversations = useChatStore(s => s.conversations);

  if (!focusedChatIds || focusedChatIds.length === 0) {
    return (
      <div className="bg-grid flex h-full items-center justify-center">
        <EmptyState icon={Focus} eyebrow="Modo enfoque" title="Selecciona hasta dos chats" description="Elige conversaciones de la lista para seguirlas lado a lado e intervenir cuando haga falta." />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full min-w-0 overflow-x-auto">
      {focusedChatIds.map(id => {
        const conv = conversations.find(c => c.id === id);
        const name = conv ? (conv.client?.name || conv.client?.phoneNumber) : 'Chat';
        return <FocusedChat key={id} conversationId={id} clientName={name} conversation={conv} vendorName={conv?.vendorId ? vendorMap[conv.vendorId] : undefined} />;
      })}
    </div>
  );
}
