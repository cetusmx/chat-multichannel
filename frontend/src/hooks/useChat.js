import { useEffect } from 'react';
import useChatStore from '../stores/useChatStore.js';
import { getChatSocket } from '../services/socket.js';

export default function useChat() {
  const { conversations, activeConversationId, messages, loading, setConversations, setActiveConversation, setMessages, addMessage } = useChatStore();

  useEffect(() => {
    const socket = getChatSocket();
    if (!socket) return;

    socket.on('message:new', (msg) => {
      addMessage(msg.conversationId, msg);
    });

    return () => {
      socket.off('message:new');
    };
  }, [addMessage]);

  function joinConversation(conversationId) {
    const socket = getChatSocket();
    if (socket) {
      socket.emit('join:conversation', conversationId);
    }
    setActiveConversation(conversationId);
  }

  function leaveConversation(conversationId) {
    const socket = getChatSocket();
    if (socket) {
      socket.emit('leave:conversation', conversationId);
    }
  }

  return {
    conversations,
    activeConversationId,
    messages,
    loading,
    setConversations,
    joinConversation,
    leaveConversation,
    setMessages,
  };
}
