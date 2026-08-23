import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  View, 
  StyleSheet, 
  FlatList, 
  KeyboardAvoidingView, 
  Platform,
  Text,
  ActivityIndicator,
  Keyboard,
  Modal,
  TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { launchImageLibrary } from 'react-native-image-picker';
import Toast from 'react-native-toast-message';
import { get, post, postFormData } from '../services/api';
import { theme } from '../utils/theme';
import useChatStore from '@shared/stores/useChatStore';
import ChatInput from '../components/ChatInput';
import MessageItem from '../components/MessageItem';
import useMobileSocket from '../hooks/useMobileSocket';

export default function ChatDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { chatId, clientName } = route.params || {};

  const chat = useChatStore((state) => state.conversations?.find(c => c.id === chatId) || {});
  const updateChatStatusInStore = useChatStore((state) => state.updateChatStatus);

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [statusMenuVisible, setStatusMenuVisible] = useState(false);
  const chatInputRef = useRef(null);
  const isLoadingMoreRef = useRef(false);
  const aiAbortControllerRef = useRef(null);

  // Set Header Title
  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <TouchableOpacity style={styles.headerTitleContainer} onPress={() => setStatusMenuVisible(true)}>
          <View style={styles.headerTitleRow}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{clientName ? clientName.charAt(0).toUpperCase() : 'C'}</Text>
            </View>
            <View>
              <Text style={styles.headerTitleName} numberOfLines={1}>{clientName} ▾</Text>
              <Text style={styles.headerTitleStatus}>{chat?.status || 'OPEN'}</Text>
            </View>
          </View>
        </TouchableOpacity>
      ),
      headerRight: () => (
        <View style={styles.headerRightContainer}>
          <TouchableOpacity style={styles.headerIcon}>
            <Text style={{ fontSize: 20 }}>🛒</Text>
            <View style={styles.badge}><Text style={styles.badgeText}>0</Text></View>
          </TouchableOpacity>
        </View>
      )
    });
  }, [clientName, chat?.status, navigation]);

  // Hook to handle socket connection and new messages
  const handleNewMessage = useCallback((newMessage) => {
    if (!newMessage || !newMessage.id) return;
    if (newMessage.conversationId && newMessage.conversationId !== chatId) return;
    
    setMessages((prevMessages) => {
      if (prevMessages.some(m => m.id === newMessage.id)) {
        return prevMessages.map(m => m.id === newMessage.id ? { ...m, ...newMessage } : m);
      }
      return [newMessage, ...prevMessages];
    });
  }, [chatId]);

  useMobileSocket(chatId, handleNewMessage);

  useEffect(() => {
    if (chat.messages) {
      setMessages((prev) => {
        const prevIds = new Set(prev.map(m => m.id));
        const newMsgs = chat.messages.filter(m => !prevIds.has(m.id));
        if (newMsgs.length > 0) {
          const combined = [...newMsgs, ...prev];
          return combined.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }
        return prev;
      });
    }
  }, [chat.messages]);

  const fetchMessages = useCallback(async (cursor = null) => {
    if (isLoadingMoreRef.current) return;
    try {
      if (cursor) {
        setLoadingMore(true);
        isLoadingMoreRef.current = true;
      } else {
        setLoading(true);
      }
      const res = await get(`/chat/${encodeURIComponent(chatId)}/messages${cursor ? `?cursor=${cursor}` : ''}`);
      const data = await res.json();

      if (res.ok && data.data) {
        const payload = data.data;
        setMessages((prev) => {
          if (!cursor) return payload.filter(item => item && item.id);
          const prevIds = new Set(prev.map(m => m.id));
          const newUnique = payload.filter(item => item && item.id && !prevIds.has(item.id));
          return [...prev, ...newUnique];
        });
        setHasMore(data.meta?.hasMore || false);
        setNextCursor(data.meta?.nextCursor || null);
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      isLoadingMoreRef.current = false;
    }
  }, [chatId]);

  useEffect(() => {
    fetchMessages();
    const abortController = aiAbortControllerRef.current;
    return () => { 
      if (abortController) {
        abortController.abort();
      }
    };
  }, [chatId, fetchMessages]);

  const handleSendText = async (text) => {
    if (!chatId || !text.trim()) return;
    const tempId = `temp-${Date.now()}`;
    try {
      const isWhisper = text.startsWith('/whisper ');
      const content = isWhisper ? text.replace(/^\/whisper\s*/, '') : text;
      
      const tempMsg = {
        id: tempId,
        content: content,
        senderType: 'VENDOR',
        status: 'sending',
        metadata: isWhisper ? { isWhisper: true } : {},
        isInternal: isWhisper,
        createdAt: new Date().toISOString()
      };
      setMessages(prev => [tempMsg, ...prev]);

      const res = await post(`/chat/${encodeURIComponent(chatId)}/messages`, { content, isInternal: isWhisper });
      const data = await res.json();
      
      if (res.ok && data.data) {
        setMessages(prev => prev.map(m => m.id === tempId ? data.data : m));
      } else {
        setMessages(prev => prev.filter(m => m.id !== tempId));
      }
    } catch (error) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
    }
  };

  const handlePickImage = async () => {
    setActionMenuVisible(false);
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
    if (!result.didCancel && result.assets?.[0]) {
      const asset = result.assets[0];
      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        type: asset.type || 'image/jpeg',
        name: asset.fileName || `upload.jpg`
      });
      try {
        await postFormData(`/chat/${encodeURIComponent(chatId)}/media`, formData);
      } catch (e) {
        Toast.show({ type: 'error', text1: 'Error al subir imagen' });
      }
    }
  };

  const handleRequestAi = async () => {
    setActionMenuVisible(false);
    setIsAiLoading(true);
    Toast.show({ type: 'info', text1: 'Sugerencia AI', text2: 'Analizando conversación...' });
    // AI Mock Logic for MVP
    setTimeout(() => {
      if (chatInputRef.current) {
        chatInputRef.current.injectText("¡Hola! Claro que sí, ¿en qué más te puedo ayudar?");
      }
      setIsAiLoading(false);
    }, 1500);
  };

  const updateChatStatus = async (newStatus) => {
    setStatusMenuVisible(false);
    try {
      await updateChatStatusInStore(chatId, { status: newStatus });
      Toast.show({ type: 'success', text1: 'Estado actualizado' });
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error al actualizar estado' });
    }
  };

  const renderItem = useCallback(({ item }) => <MessageItem message={item} />, []);

  return (
    <SafeAreaView style={styles.container} edges={['right', 'bottom', 'left']}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior="padding"
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 90}
      >
        <FlatList
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          inverted
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          onEndReached={() => { if (hasMore && nextCursor) fetchMessages(nextCursor); }}
          onEndReachedThreshold={0.5}
        />
        
        <ChatInput 
          ref={chatInputRef}
          onSendText={handleSendText}
          onOpenActionMenu={() => setActionMenuVisible(true)}
          isAiLoading={isAiLoading}
        />
      </KeyboardAvoidingView>

      {/* Action Menu Bottom Sheet Modal */}
      <Modal visible={actionMenuVisible} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setActionMenuVisible(false)}>
          <View style={styles.bottomSheet}>
            <Text style={styles.sheetTitle}>Acciones</Text>
            
            <TouchableOpacity style={styles.sheetButton} onPress={handlePickImage}>
              <Text style={styles.sheetButtonIcon}>📷</Text>
              <Text style={styles.sheetButtonText}>Enviar Foto / Galería</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sheetButton} onPress={handleRequestAi}>
              <Text style={styles.sheetButtonIcon}>✨</Text>
              <Text style={styles.sheetButtonText}>Sugerencia IA</Text>
            </TouchableOpacity>

          </View>
        </TouchableOpacity>
      </Modal>

      {/* Status Menu Bottom Sheet Modal */}
      <Modal visible={statusMenuVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setStatusMenuVisible(false)}>
          <View style={styles.bottomSheet}>
            <Text style={styles.sheetTitle}>Estado de la Conversación</Text>
            
            <TouchableOpacity style={styles.sheetButton} onPress={() => updateChatStatus('CLOSED')}>
              <Text style={styles.sheetButtonIcon}>✅</Text>
              <Text style={styles.sheetButtonText}>Marcar como Resuelto</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sheetButton} onPress={() => updateChatStatus('ON_HOLD')}>
              <Text style={styles.sheetButtonIcon}>⏸️</Text>
              <Text style={styles.sheetButtonText}>Poner en Espera</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sheetButton} onPress={() => Toast.show({type: 'info', text1: 'Próximamente'})}>
              <Text style={styles.sheetButtonIcon}>🔄</Text>
              <Text style={styles.sheetButtonText}>Reasignar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sheetButton} onPress={() => updateChatStatus('SPAM')}>
              <Text style={styles.sheetButtonIcon}>🚫</Text>
              <Text style={[styles.sheetButtonText, { color: '#ef4444' }]}>Marcar como Spam</Text>
            </TouchableOpacity>

          </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center' },
  avatarPlaceholder: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#3b82f6',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 10
  },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  headerTitleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  headerTitleName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerTitleStatus: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 10,
  },
  headerIcon: {
    marginLeft: 15,
    padding: 5,
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -5,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#1e293b',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40, // Safe area bottom
  },
  sheetTitle: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  sheetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  sheetButtonIcon: {
    fontSize: 22,
    marginRight: 15,
    width: 30,
    textAlign: 'center',
  },
  sheetButtonText: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '500',
  }
});
