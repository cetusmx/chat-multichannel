import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  FlatList, 
  KeyboardAvoidingView, 
  Platform,
  Text,
  ActivityIndicator,
  Keyboard
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { get, post, postFormData } from '../services/api';
import { theme } from '../utils/theme';
import ChatInput from '../components/ChatInput';
import MessageItem from '../components/MessageItem';
import useMobileSocket from '../hooks/useMobileSocket';

export default function ChatDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { chatId, clientName } = route.params || {};

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const chatInputRef = useRef(null);
  const isLoadingMoreRef = useRef(false);
  const aiAbortControllerRef = useRef(null);

  // Set Header Title
  useEffect(() => {
    if (clientName) {
      navigation.setOptions({ title: clientName });
    }
  }, [clientName, navigation]);

  // Hook to handle socket connection and new messages
  const handleNewMessage = useCallback((newMessage) => {
    if (!newMessage || !newMessage.id) return;
    if (newMessage.conversationId && newMessage.conversationId !== chatId) return;
    
    setMessages((prevMessages) => {
      if (prevMessages.some(m => m.id === newMessage.id)) {
        return prevMessages.map(m => m.id === newMessage.id ? { ...m, ...newMessage } : m);
      }
      const duplicateIndex = prevMessages.findIndex(m => m.status === 'sending' && m.content === newMessage.content);
      if (duplicateIndex >= 0) {
        const filtered = [...prevMessages];
        filtered.splice(duplicateIndex, 1);
        return [newMessage, ...filtered];
      }
      return [newMessage, ...prevMessages];
    });
  }, [chatId]);

  useMobileSocket(chatId, handleNewMessage);

  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    setMessages([]);
    setNextCursor(null);
    setHasMore(false);
    return () => {
      mounted.current = false;
      if (aiAbortControllerRef.current) {
        aiAbortControllerRef.current.abort();
      }
    };
  }, [chatId]);

  const fetchMessages = async (cursor = null) => {
    if (!chatId) {
      setLoading(false);
      return;
    }
    try {
      if (!cursor) {
        setLoading(true);
      } else {
        setLoadingMore(true);
        isLoadingMoreRef.current = true;
      }

      let url = `/chat/${encodeURIComponent(chatId)}/messages?limit=50`;
      if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`;

      const res = await get(url);
      const data = await res.json();

      if (res.ok && data.data) {
        if (!Array.isArray(data.data)) {
           Toast.show({ type: 'error', text1: 'Error', text2: 'Datos corruptos del servidor' });
           return;
        }
        const payload = data.data;
        
        setMessages((prev) => {
          if (!cursor) return payload.filter(item => item && item.id);
          const prevIds = new Set(prev.map(m => m.id));
          const newUnique = payload.filter(item => item && item.id && !prevIds.has(item.id));
          return [...prev, ...newUnique];
        });
        setHasMore(data.meta?.hasMore || false);
        setNextCursor(data.meta?.nextCursor || null);
      } else {
        Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudieron cargar los mensajes' });
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      Toast.show({ type: 'error', text1: 'Error de red', text2: 'Comprueba tu conexión' });
    } finally {
      setLoading(false);
      setLoadingMore(false);
      isLoadingMoreRef.current = false;
    }
  };

  useEffect(() => {
    fetchMessages();
  }, [chatId]);

  const handleEndReached = () => {
    if (hasMore && !isLoadingMoreRef.current && nextCursor) {
      fetchMessages(nextCursor);
    }
  };

  const handleSendText = async (text) => {
    if (!chatId || !text.trim()) return;
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    try {
      // Optimistic UI
      const tempMsg = {
        id: tempId,
        content: text,
        senderType: 'VENDOR',
        status: 'sending',
        createdAt: new Date().toISOString()
      };
      
      setMessages(prev => [tempMsg, ...prev]);

      const res = await post(`/chat/${encodeURIComponent(chatId)}/messages`, { content: text });
      const data = await res.json();

      if (res.ok && data.data) {
        // Update temp to real, or remove if socket beat us to it
        setMessages(prev => {
          if (prev.some(m => m.id === data.data.id)) {
            return prev.filter(m => m.id !== tempId);
          }
          return prev.map(m => m.id === tempId ? data.data : m);
        });
      } else {
        // Handle error, remove temp
        setMessages(prev => prev.filter(m => m.id !== tempId));
        Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo enviar el mensaje' });
        throw new Error('Backend rejection');
      }
    } catch (error) {
      console.error('Send message error', error);
      setMessages(prev => prev.filter(m => m.id !== tempId)); // Ensure it's removed on crash
      Toast.show({ type: 'error', text1: 'Error', text2: 'Error de red al enviar mensaje' });
      throw error;
    }
  };

  const handleSendMedia = async (file, caption = '') => {
    if (!chatId || !file?.uri) return;
    const tempId = `temp-media-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    try {
      // Optimistic UI for Media
      const tempMsg = {
        id: tempId,
        content: caption ? `[MEDIA] ${caption}` : '[MEDIA]',
        senderType: 'VENDOR',
        status: 'sending',
        createdAt: new Date().toISOString(),
        attachments: [{ type: 'IMAGE', url: file.uri }] // Local preview
      };
      setMessages(prev => [tempMsg, ...prev]);

      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        type: file.type || 'image/jpeg',
        name: file.fileName || `upload-${Date.now()}.jpg`
      });
      if (caption) {
        formData.append('caption', caption);
      }

      const res = await postFormData(`/chat/${encodeURIComponent(chatId)}/media`, formData);
      const data = await res.json();

      if (res.ok && data.data) {
        // Update temp to real, or remove if socket beat us to it
        setMessages(prev => {
          if (prev.some(m => m.id === data.data.id)) {
            return prev.filter(m => m.id !== tempId);
          }
          return prev.map(m => m.id === tempId ? data.data : m);
        });
      } else {
        setMessages(prev => prev.filter(m => m.id !== tempId));
        Toast.show({ type: 'error', text1: 'Error', text2: 'No se pudo subir la imagen' });
        throw new Error('Backend rejection');
      }
    } catch (error) {
      console.error('Send media error', error);
      setMessages(prev => prev.filter(m => m.id !== tempId));
      Toast.show({ type: 'error', text1: 'Error', text2: 'Error de red al subir imagen' });
      throw error;
    }
  };

  const handleRequestAi = async (prompt) => {
    if (!chatId) return;
    const cleanPrompt = prompt ? prompt.trim() : '';
    const controller = new AbortController();
    aiAbortControllerRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 seconds
    try {
      setIsAiLoading(true);
      const res = await post(`/conversations/${encodeURIComponent(chatId)}/ai-assist`, { prompt: cleanPrompt }, { signal: controller.signal });
      clearTimeout(timeoutId);
      const data = await res.json();

      if (res.ok && data.draft != null) {
        if (!mounted.current) return;
        if (chatInputRef.current && data.draft) {
          chatInputRef.current.injectText(data.draft);
        } else if (!data.draft) {
          Toast.show({ type: 'info', text1: 'IA', text2: 'No se generó ninguna sugerencia' });
        }
      } else {
        if (!mounted.current) return;
        const errMessage = typeof data.error === 'string' ? data.error : (data.error?.message || 'No se pudo obtener sugerencia');
        Toast.show({ type: 'error', text1: 'Error AI', text2: errMessage });
      }
    } catch (error) {
      clearTimeout(timeoutId);
      if (!mounted.current) return;
      console.error('AI Request Error:', error);
      const isTimeout = error.name === 'AbortError';
      Toast.show({ type: 'error', text1: 'Error AI', text2: isTimeout ? 'La petición tardó demasiado' : 'Fallo de red al contactar asistente' });
    } finally {
      if (mounted.current) setIsAiLoading(false);
    }
  };

  const renderItem = useCallback(({ item }) => {
    return <MessageItem message={item} />;
  }, []);

  const ListEmptyComponent = useCallback(() => (
    <View style={styles.emptyContainer}>
      {loading ? (
        <ActivityIndicator size="large" color={theme.colors.primary} />
      ) : (
        <Text style={styles.emptyText}>No hay mensajes en esta conversación.</Text>
      )}
    </View>
  ), [loading]);

  return (
    <SafeAreaView style={styles.container} edges={['right', 'bottom', 'left']}>
      <KeyboardAvoidingView 
        style={styles.keyboardView} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          inverted
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListEmptyComponent={ListEmptyComponent}
          contentContainerStyle={styles.flexGrow}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.5}
          initialNumToRender={20}
          maxToRenderPerBatch={10}
          windowSize={5}
        />
        <ChatInput 
          ref={chatInputRef}
          onSendText={handleSendText}
          onSendMedia={handleSendMedia}
          onRequestAi={handleRequestAi}
          isAiLoading={isAiLoading}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  flexGrow: {
    flexGrow: 1,
  },
  listContent: {
    padding: 10,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ scaleY: -1 }] // Because FlatList is inverted, we need to flip the empty component back
  },
  emptyText: {
    color: '#aaa',
    fontSize: 16,
  }
});
