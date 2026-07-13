import { create } from 'zustand';
import * as defaultApi from '../services/api';
import io from 'socket.io-client';
import useAuthStore from './useAuthStore';
import useUIStore from './useUIStore';

const config = {
  api: defaultApi,
  SOCKET_URL: typeof window !== 'undefined' && window.location
    ? (window.location.origin.includes('localhost') ? 'http://localhost:4000/chat' : '/chat')
    : null
};

export const configureChatStore = (customApi, customSocketUrl) => {
  if (customApi) config.api = customApi;
  if (customSocketUrl) config.SOCKET_URL = customSocketUrl;
  
  // Re-initialize socket if already connected to apply new URL
  const { socket, initializeSocket } = useChatStore.getState();
  if (socket) {
    initializeSocket();
  }
};

const useChatStore = create((set, get) => ({
  conversations: [],
  currentConversationId: null,
  messages: [],
  hasMore: {},
  nextCursor: {},
  isLoadingMore: false,
  socket: null,
  alertsSocket: null,
  uploadingIds: {},
  errorMsg: null,
  searchResults: [],
  isSearching: false,
  searchError: null,
  highlightedMessageId: null,
  
  clearError: () => set({ errorMsg: null }),
  setHighlightedMessageId: (id) => set({ highlightedMessageId: id }),
  clearSearchResults: () => set({ searchResults: [], searchError: null, isSearching: false }),

  searchMessages: async (query, signal = null) => {
    if (!query || query.trim().length === 0) {
      set({ searchResults: [], searchError: null, isSearching: false });
      return;
    }
    set({ isSearching: true, searchError: null });
    try {
      const options = signal ? { signal } : {};
      const res = await config.api.get(`/chat/search?q=${encodeURIComponent(query)}`, options);
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Search error ${res.status}: ${errText}`);
      }
      const data = await res.json();
      set({ searchResults: data?.data || [] });
    } catch (error) {
      if (error.name === 'AbortError') return; // Ignore aborts
      console.error('Error in searchMessages:', error);
      set({ searchError: error.message, searchResults: [] });
    } finally {
      if (signal && signal.aborted) return;
      set({ isSearching: false });
    }
  },

  fetchConversations: async () => {
    try {
      const [res, slaRes] = await Promise.all([
        config.api.get('/chat/conversations'),
        config.api.get('/metrics/sla').catch(() => null)
      ]);
      
      let slaConfig = { firstResponseMins: 15, resolutionMins: 60 };
      if (slaRes && slaRes.ok) {
        try {
          const slaData = await slaRes.json();
          if (slaData && slaData.data) slaConfig = { ...slaConfig, ...slaData.data };
        } catch (e) {
          console.error('SLA response is not JSON:', e);
        }
      }

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`HTTP Error ${res.status}: ${errText}`);
      }
      const data = await res.json();
      let convs = data?.data || [];
      const now = Date.now();

      convs = convs.map(c => {
        let isSlaBreached = false;
        let breachType = null;
        
        if (c.status === 'PENDING_ASSIGNMENT' && slaConfig.firstResponseMins) {
          const start = c.lastMessageAt || c.createdAt;
          const elapsedMins = (now - new Date(start).getTime()) / 60000;
          if (elapsedMins > slaConfig.firstResponseMins) {
            isSlaBreached = true;
            breachType = 'firstResponse';
          }
        } else if (c.status === 'ACTIVE' && slaConfig.resolutionMins) {
          const start = c.createdAt;
          const elapsedMins = (now - new Date(start).getTime()) / 60000;
          if (elapsedMins > slaConfig.resolutionMins) {
            isSlaBreached = true;
            breachType = 'resolution';
          }
        }
        return { ...c, isSlaBreached, breachType };
      });

      set({ conversations: convs, errorMsg: null });
    } catch (error) {
      console.error('Error al cargar conversaciones:', error);
      set({ errorMsg: 'Failed to load conversations' });
    }
  },

  selectConversation: async (id, aroundMessageId = null) => {
    if (!id) return;
    set({ currentConversationId: id, messages: [], errorMsg: null });
    const { socket } = get();
    
    // Join room
    if (socket) {
      socket.emit('join:conversation', id);
    }

    await get().fetchMessages(id, null, aroundMessageId);
  },

  fetchMessages: async (conversationId, cursor = null, aroundMessageId = null) => {
    try {
      let url = `/chat/${conversationId}/messages?limit=50`;
      if (aroundMessageId) url += `&aroundMessageId=${aroundMessageId}`;
      else if (cursor) url += `&cursor=${cursor}`;
      
      const res = await config.api.get(url);
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`HTTP Error ${res.status}: ${errText}`);
      }
      const data = await res.json();
      
      set((state) => {
        const fetchedMessages = data?.data || [];
        const newHasMore = { ...state.hasMore, [conversationId]: data?.meta?.hasMore || false };
        const newNextCursor = { ...state.nextCursor, [conversationId]: data?.meta?.nextCursor || null };
        
        // Prevent race conditions: only update messages array if still on same conversation
        if (state.currentConversationId === conversationId) {
          if (aroundMessageId) {
            return { 
              messages: fetchedMessages,
              hasMore: newHasMore,
              nextCursor: newNextCursor,
            };
          } else if (cursor) {
            const existingIds = new Set(state.messages.map(m => m.id));
            const uniqueFetched = fetchedMessages.filter(m => !existingIds.has(m.id));
            return { 
              messages: [...uniqueFetched, ...state.messages],
              hasMore: newHasMore,
              nextCursor: newNextCursor,
            };
          } else {
            const existingIds = new Set(fetchedMessages.map(m => m.id));
            const newSocketMessages = state.messages.filter(m => !existingIds.has(m.id));
            return { 
              messages: [...fetchedMessages, ...newSocketMessages],
              hasMore: newHasMore,
              nextCursor: newNextCursor
            };
          }
        }
        return { hasMore: newHasMore, nextCursor: newNextCursor };
      });
    } catch (error) {
      console.error('Error al cargar mensajes:', error);
      set({ errorMsg: 'Failed to load messages' });
    }
  },

  loadMoreMessages: async (conversationId) => {
    const { nextCursor, hasMore, isLoadingMore } = get();
    if (!conversationId || !hasMore[conversationId] || !nextCursor[conversationId] || isLoadingMore) return;

    set({ isLoadingMore: true, errorMsg: null });

    try {
      await get().fetchMessages(conversationId, nextCursor[conversationId]);
    } finally {
      set({ isLoadingMore: false });
    }
  },

  sendMessage: async (content, isInternal = false) => {
    if (!content || typeof content !== 'string' || !content.trim()) return;
    const { currentConversationId } = get();
    if (!currentConversationId) return;

    // Optimistic update
    const tempId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString() + '-' + Math.random().toString(36).substring(2);
    const userRole = useAuthStore.getState().user?.role || 'VENDOR';
    const tempMsg = { id: tempId, content, senderType: userRole, status: 'SENDING', isInternal, createdAt: new Date().toISOString() };
    set((state) => ({ messages: [...state.messages, tempMsg] }));

    try {
      const res = await config.api.post(`/chat/${currentConversationId}/messages`, { content, isInternal });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`HTTP Error ${res.status}: ${errText}`);
      }
      const newMsg = await res.json();
      
      // Replace optimistic temp message with actual response
      set((state) => {
        // Prevent race condition if we already navigated away
        if (state.currentConversationId !== currentConversationId) return state;
        const nextMessages = state.messages.map(m => m.id === tempId ? (newMsg?.data || m) : m);
        return { messages: nextMessages };
      });
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      set((state) => ({ 
        errorMsg: 'Failed to send message',
        // Revert the optimistic message on failure
        messages: state.messages.filter(m => m.id !== tempId)
      }));
    }
  },

  sendMedia: async (file, text = '', isInternal = false, signal = null) => {
    const { currentConversationId, uploadingIds } = get();
    if (!currentConversationId || !file) return;

    const lockKey = `${currentConversationId}_${file.name}_${file.size}`;
    if (uploadingIds[lockKey]) return; // Upload debouncing / lock

    set((state) => ({ uploadingIds: { ...state.uploadingIds, [lockKey]: true, [currentConversationId]: true }, errorMsg: null }));
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (text) formData.append('caption', text);
      if (isInternal) formData.append('isInternal', 'true');
      
      const res = await config.api.postFormData(`/chat/${currentConversationId}/media`, formData, signal);
      
      if (!res.ok) {
        let errorMessage = 'Fallo inesperado del servidor';
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          errorMessage = `HTTP Error ${res.status}: ${res.statusText || 'Parse failed'}`;
        }
        throw new Error(errorMessage);
      }
      
      const newMsg = await res.json();
      
      if (newMsg?.data) {
        set((state) => {
          if (state.currentConversationId === currentConversationId) {
            return { messages: [...state.messages, newMsg.data] };
          }
          return state;
        });
      }
    } catch (error) {
      console.error('Error enviando media:', error);
      set({ errorMsg: `Error subiendo archivo: ${error.message}` });
    } finally {
      set((state) => {
        const nextUploadIds = { ...state.uploadingIds };
        delete nextUploadIds[lockKey];
        const hasOthers = Object.keys(nextUploadIds).some(k => k.startsWith(currentConversationId + '_'));
        nextUploadIds[currentConversationId] = hasOthers;
        return { uploadingIds: nextUploadIds };
      });
    }
  },

  addTag: async (messageId, tag) => {
    if (!tag || !tag.trim()) return;
    const { currentConversationId } = get();
    if (!currentConversationId) return;

    const cleanTag = tag.trim();
    let originalMessage = null;

    set((state) => {
      if (state.currentConversationId !== currentConversationId) return state;
      const nextMessages = state.messages.map(m => {
        if (m.id === messageId) {
          originalMessage = m;
          const tags = m.tags || [];
          if (!tags.includes(cleanTag)) {
            return { ...m, tags: [...tags, cleanTag] };
          }
        }
        return m;
      });
      return { messages: nextMessages };
    });

    try {
      const res = await config.api.post(`/chat/${currentConversationId}/messages/${messageId}/tags`, { tag: cleanTag });
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`HTTP Error ${res.status}: ${errText}`);
      }
      const data = await res.json();
      
      set((state) => {
        if (state.currentConversationId !== currentConversationId) return state;
        const nextMessages = state.messages.map(m => m.id === messageId ? (data?.data || m) : m);
        return { messages: nextMessages };
      });
    } catch (error) {
      console.error('Error adding tag:', error);
      set((state) => {
        if (state.currentConversationId !== currentConversationId || !originalMessage) return { errorMsg: 'Failed to add tag' };
        const nextMessages = state.messages.map(m => m.id === messageId ? originalMessage : m);
        return { messages: nextMessages, errorMsg: 'Failed to add tag' };
      });
    }
  },

  removeTag: async (messageId, tag) => {
    if (!tag) return;
    const { currentConversationId } = get();
    if (!currentConversationId) return;

    let originalMessage = null;

    set((state) => {
      if (state.currentConversationId !== currentConversationId) return state;
      const nextMessages = state.messages.map(m => {
        if (m.id === messageId) {
          originalMessage = m;
          const tags = m.tags || [];
          return { ...m, tags: tags.filter(t => t !== tag) };
        }
        return m;
      });
      return { messages: nextMessages };
    });

    try {
      const res = await config.api.del(`/chat/${currentConversationId}/messages/${messageId}/tags/${encodeURIComponent(tag)}`);
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`HTTP Error ${res.status}: ${errText}`);
      }
      const data = await res.json();
      
      set((state) => {
        if (state.currentConversationId !== currentConversationId) return state;
        const nextMessages = state.messages.map(m => m.id === messageId ? (data?.data || m) : m);
        return { messages: nextMessages };
      });
    } catch (error) {
      console.error('Error removing tag:', error);
      set((state) => {
        if (state.currentConversationId !== currentConversationId || !originalMessage) return { errorMsg: 'Failed to remove tag' };
        const nextMessages = state.messages.map(m => m.id === messageId ? originalMessage : m);
        return { messages: nextMessages, errorMsg: 'Failed to remove tag' };
      });
    }
  },

  initializeSocket: () => {
    if (!config.SOCKET_URL) return; // Wait until injected via configureChatStore

    const { token } = useAuthStore.getState();
    const currentSocket = get().socket;
    if (currentSocket) currentSocket.disconnect();

    const currentAlertsSocket = get().alertsSocket;
    if (currentAlertsSocket) currentAlertsSocket.disconnect();

    const newSocket = io(config.SOCKET_URL, {
      auth: (cb) => cb({ token: useAuthStore.getState().token }),
      transports: ['websocket'],
    });

    const ALERTS_URL = config.SOCKET_URL.replace(/\/chat$/, '/alerts');
    const newAlertsSocket = io(ALERTS_URL, {
      auth: (cb) => cb({ token: useAuthStore.getState().token }),
      transports: ['websocket'],
    });

    newAlertsSocket.on('connect', () => {
      console.log('Alerts socket connected');
      const { user } = useAuthStore.getState();
      if (user?.tenantId) {
        newAlertsSocket.emit('join:tenant', user.tenantId);
      }
    });

    newAlertsSocket.on('alerts:breach', (data) => {
      if (data?.type === 'SLA_BREACH' && data?.payload) {
        const { conversationId, metric } = data.payload;
        set((state) => {
          const conv = state.conversations.find(c => c.id === conversationId);
          if (!conv || (conv.isSlaBreached === true && conv.breachType === metric)) return state;
          
          return {
            conversations: state.conversations.map(c => 
              c.id === conversationId ? { ...c, isSlaBreached: true, breachType: metric } : c
            )
          };
        });
      }
    });

    newSocket.on('connect', () => {
      console.log('Chat socket connected');
      const { user } = useAuthStore.getState();
      if (user?.role === 'VENDOR') {
        newSocket.emit('join:vendor', user.id);
      }
    });

    newSocket.on('disconnect', (reason) => {
      console.log('Chat socket disconnected:', reason);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Chat socket connection error:', error);
    });

    newSocket.on('new_message', (msg) => {
      set((state) => {
        let nextMessages = state.messages;
        let requiresFetch = false;
        
        // Solo lo agregamos si estamos en la conversacion activa
        if (state.currentConversationId === msg.conversationId) {
          // Evitar duplicados (por si entra por WS y por HTTP simultáneo o update optimista)
          // Look for an optimistic message with the same content sent very recently
          const isOptimisticDuplicate = state.messages.find(m => 
            m.status === 'SENDING' && m.content === msg.content && m.isInternal === msg.isInternal
          );
          
          if (isOptimisticDuplicate) {
            // Replace optimistic with real
            nextMessages = state.messages.map(m => m.id === isOptimisticDuplicate.id ? msg : m);
          } else {
            const exists = state.messages.find(m => m.id === msg.id);
            if (!exists) {
              nextMessages = [...state.messages, msg];
            }
          }
        }
        
        // Actualizar la lista de conversaciones (in-memory, sin DDoS)
        let found = false;
        const nextConversations = state.conversations.map(c => {
          if (c.id === msg.conversationId) {
            found = true;
            return {
              ...c,
              lastMessageAt: msg.createdAt || new Date().toISOString(),
              messages: [msg]
            };
          }
          return c;
        });
        
        if (!found) {
          requiresFetch = true;
        }

        // Sort by lastMessageAt desc
        nextConversations.sort((a, b) => new Date(b.lastMessageAt) - new Date(a.lastMessageAt));

        if (requiresFetch) {
          // Fire and forget fetch to update sidebar with new conversation details
          if (window._fetchConvTimeout) clearTimeout(window._fetchConvTimeout);
          window._fetchConvTimeout = setTimeout(() => get().fetchConversations(), 300);
        }

        return { messages: nextMessages, conversations: nextConversations };
      });
    });

    newSocket.on('message_updated', (updatedMsg) => {
      set((state) => {
        if (state.currentConversationId !== updatedMsg.conversationId) return state;
        const nextMessages = state.messages.map(m => m.id === updatedMsg.id ? { ...m, ...updatedMsg } : m);
        return { messages: nextMessages };
      });
    });

    newSocket.on('conversation_updated', (conversation) => {
      set((state) => ({
        conversations: state.conversations.map(c => c.id === conversation.id ? { ...c, ...conversation } : c)
      }));
    });

    newSocket.on('conversation_reassigned', (payload) => {
      set((state) => {
        const { action, conversationId, conversation } = payload;
        if (action === 'removed') {
          newSocket.emit('leave:conversation', conversationId);
          return {
            conversations: state.conversations.filter(c => c.id !== conversationId),
            currentConversationId: state.currentConversationId === conversationId ? null : state.currentConversationId,
            messages: state.currentConversationId === conversationId ? [] : state.messages
          };
        } else if (action === 'added' && conversation) {
          const exists = state.conversations.find(c => c.id === conversation.id);
          let nextConversations;
          if (exists) {
             nextConversations = state.conversations.map(c => c.id === conversation.id ? { ...c, ...conversation } : c);
          } else {
             nextConversations = [conversation, ...state.conversations];
          }
          // Sort by lastMessageAt desc
          nextConversations.sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0));
          return { conversations: nextConversations };
        }
        return state;
      });
    });

    newSocket.on('chat:escalated', (event) => {
      set((state) => {
        const conversationId = event?.payload?.conversationId;
        if (!conversationId) return state;
        return {
          conversations: state.conversations.map(c => 
            c.id === conversationId ? { ...c, status: 'ESCALATED' } : c
          )
        };
      });
    });

    const handleStatusChange = (defaultFallback) => (event) => {
      set((state) => {
        const conversationId = event?.payload?.conversationId || event?.conversationId;
        if (!conversationId) return state;
        const newStatus = event?.payload?.status || event?.status || defaultFallback;
        return {
          conversations: state.conversations.map(c => 
            c.id === conversationId ? { ...c, status: newStatus } : c
          )
        };
      });
    };

    newSocket.on('chat:assigned', handleStatusChange('ACTIVE'));
    newSocket.on('chat:resolved', handleStatusChange('CLOSED'));

    newSocket.on('client_blocked', (updatedClient) => {
      set((state) => {
        // Also remove any closed conversations from the store if the client is blocked
        const nextConversations = state.conversations.filter(c => {
           if (c.client?.id === updatedClient.id && updatedClient.isBlocked) {
             return false;
           }
           return true;
        });

        // Also clean up from useUIStore
        if (updatedClient.isBlocked) {
           const uiState = useUIStore.getState();
           const focusedChatsToClose = state.conversations
             .filter(c => c.client?.id === updatedClient.id)
             .map(c => c.id);
             
           focusedChatsToClose.forEach(id => {
             if (uiState.focusedChatIds.includes(id)) {
               uiState.toggleFocusedChat(id);
             }
           });
        }

        const activeConv = state.conversations.find(c => c.id === state.currentConversationId);
        let nextCurrentConversationId = state.currentConversationId;
        let nextMessages = state.messages;

        if (updatedClient.isBlocked && activeConv && activeConv.client?.id === updatedClient.id) {
           nextCurrentConversationId = null;
           nextMessages = [];
        }

        return {
          conversations: nextConversations,
          currentConversationId: nextCurrentConversationId,
          messages: nextMessages
        };
      });
    });

    set({ socket: newSocket, alertsSocket: newAlertsSocket });
  },
  
  disconnectSocket: () => {
    const currentSocket = get().socket;
    if (currentSocket) {
      currentSocket.disconnect();
    }
    const alertsSocket = get().alertsSocket;
    if (alertsSocket) {
      alertsSocket.disconnect();
    }
    set({ socket: null, alertsSocket: null });
  }
}));

export default useChatStore;
