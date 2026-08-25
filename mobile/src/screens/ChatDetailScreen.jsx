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
import { ShoppingCart, MoreVertical, CheckCircle, PauseCircle, Users, Ban, Image as ImageIcon, Sparkles, Calendar, ShieldAlert, Clock } from 'lucide-react-native';
import { get, post, postFormData } from '../services/api';
import { theme } from '../utils/theme';
import useChatStore from '@shared/stores/useChatStore';
import ChatInput from '../components/ChatInput';
import MessageItem from '../components/MessageItem';
import useMobileSocket from '../hooks/useMobileSocket';

const getStatusText = (status) => {
  const map = {
    PENDING_ASSIGNMENT: 'Sin Asignar',
    ACTIVE: 'Activo',
    CLOSED: 'Cierre Sin Venta',
    CLOSED_WON: 'Cierre Venta',
    ESCALATED: 'Escalado',
    WAITING_CUSTOMER: 'Esperando al Cliente',
    SCHEDULED: 'Agendado',
    ON_HOLD: 'Pausa',
    DISCARDED: 'Descartado / Spam',
    CLOSED_INACTIVE: 'Cerrado Inactivo'
  };
  return map[status] || status || 'Activo';
};

export default function ChatDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { chatId, clientName } = route.params || {};

  const chat = useChatStore((state) => state.conversations?.find(c => c.id === chatId) || {});
  const updateChatStatusInStore = useChatStore((state) => state.updateChatStatus);
  const clearUnreadCount = useChatStore((state) => state.clearUnreadCount);

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [statusMenuVisible, setStatusMenuVisible] = useState(false);
  const [resolveModalVisible, setResolveModalVisible] = useState(false);
  const chatInputRef = useRef(null);
  const isLoadingMoreRef = useRef(false);
  const aiAbortControllerRef = useRef(null);
  const prevStatusRef = useRef(chat?.status);

  useEffect(() => {
    if (chatId) {
      useChatStore.setState({ currentConversationId: chatId });
      clearUnreadCount(chatId);
    }
    return () => {
      useChatStore.setState({ currentConversationId: null });
    };
  }, [chatId, clearUnreadCount]);

  useEffect(() => {
    if (prevStatusRef.current === 'WAITING_CUSTOMER' && chat?.status === 'ACTIVE') {
      Toast.show({ type: 'info', text1: 'Nuevo Mensaje', text2: 'El SLA se ha reanudado automáticamente.' });
    }
    prevStatusRef.current = chat?.status;
  }, [chat?.status]);

  // Set Header Title
  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <View style={styles.headerTitleContainer}>
          <View style={styles.headerTitleRow}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{clientName ? clientName.charAt(0).toUpperCase() : 'C'}</Text>
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitleName} numberOfLines={1}>{clientName || 'Cliente'}</Text>
            </View>
          </View>
        </View>
      ),
        headerRight: () => {
          const isClosed = ['CLOSED', 'CLOSED_WON', 'CLOSED_INACTIVE', 'DISCARDED'].includes(chat?.status);
          return (
            <View style={styles.headerRightContainer}>
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>{getStatusText(chat?.status)}</Text>
              </View>
              {!isClosed && (
                <>
                  <TouchableOpacity style={styles.moreIcon} onPress={() => setStatusMenuVisible(true)}>
                    <MoreVertical size={24} color="#64748b" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.cartIconContainer}>
                    <ShoppingCart size={20} color="#334155" strokeWidth={2.5} />
                    <View style={styles.badge}><Text style={styles.badgeText}>0</Text></View>
                  </TouchableOpacity>
                </>
              )}
            </View>
          );
        }
    });
  }, [clientName, chat?.status, navigation]);

  // Hook to handle socket connection and new messages
  const handleNewMessage = useCallback((newMessage) => {
    if (newMessage.conversationId === chatId) {
      setMessages(prev => {
        if (prev.some(m => m.id === newMessage.id)) return prev;
        const newArr = [newMessage, ...prev];
        return newArr.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      });
    }
  }, [chatId]);

  useMobileSocket(chatId, handleNewMessage);

  const fetchMessages = async (cursor = null) => {
    if (isLoadingMoreRef.current) return;
    isLoadingMoreRef.current = true;
    if (cursor) setLoadingMore(true);

    try {
      const url = cursor 
        ? `/chat/${encodeURIComponent(chatId)}/messages?cursor=${encodeURIComponent(cursor)}`
        : `/chat/${encodeURIComponent(chatId)}/messages`;
      
      const res = await get(url);
      const data = await res.json();
      
      if (res.ok && data.data) {
        const sorted = data.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        if (cursor) {
          setMessages(prev => {
            const merged = [...prev, ...sorted];
            const unique = Array.from(new Map(merged.map(item => [item.id, item])).values());
            return unique.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          });
        } else {
          setMessages(sorted);
        }
        setNextCursor(data.meta?.nextCursor || null);
        setHasMore(!!data.meta?.nextCursor);
      }
    } catch (e) {
      console.error('fetchMessages error:', e);
      Toast.show({ type: 'error', text1: 'Error al cargar historial' });
    } finally {
      setLoading(false);
      setLoadingMore(false);
      isLoadingMoreRef.current = false;
    }
  };

  useEffect(() => {
    fetchMessages();
    return () => {
      if (aiAbortControllerRef.current) {
        aiAbortControllerRef.current.abort();
      }
    };
  }, [chatId]);

  const handleSendText = async (text, isWhisper = false) => {
    try {
      await post(`/chat/${encodeURIComponent(chatId)}/messages`, {
        content: text,
        isInternal: isWhisper
      });
    } catch (e) {
      Toast.show({ type: 'error', text1: 'Error al enviar mensaje' });
      throw e; // Let ChatInput restore state
    }
  };

  const handlePickImage = async () => {
    setActionMenuVisible(false);
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
    if (result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        type: asset.type,
        name: asset.fileName || 'upload.jpg'
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
    setResolveModalVisible(false);
    try {
      await updateChatStatusInStore(chatId, { status: newStatus });
      Toast.show({ type: 'success', text1: 'Estado actualizado' });
    } catch (e) {
      console.error("[DEBUG] updateChatStatus error:", e);
      Toast.show({ type: 'error', text1: 'Error al actualizar estado', text2: e.message || String(e) });
    }
  };

  const formatDateLabel = (dateString) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) return 'Hoy';
    if (date.toDateString() === yesterday.toDateString()) return 'Ayer';
    return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const renderItem = useCallback(({ item, index }) => {
    // Check if we need a date separator
    const currentMsgDate = new Date(item.createdAt);
    const prevMsg = messages[index + 1]; // Next item in list is the previous message in time
    const prevMsgDate = prevMsg ? new Date(prevMsg.createdAt) : null;
    
    let showDateLabel = false;
    if (!prevMsgDate || currentMsgDate.toDateString() !== prevMsgDate.toDateString()) {
      showDateLabel = true;
    }

    return (
      <View>
        {showDateLabel && (
          <View style={styles.dateHeaderContainer}>
            <Text style={styles.dateHeaderText}>{formatDateLabel(item.createdAt)}</Text>
          </View>
        )}
        <MessageItem message={item} />
      </View>
    );
  }, [messages]);

  const isVendorLast = messages.length > 0 && ['VENDOR', 'IA', 'SYSTEM', 'COORDINATOR', 'ADMIN'].includes(messages[0].senderType);
  const isPaused = ['WAITING_CUSTOMER', 'SCHEDULED', 'ON_HOLD'].includes(chat?.status);

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
        
        {isPaused ? (
          <View style={styles.pausedContainer}>
            <TouchableOpacity 
              style={styles.resumeButton}
              onPress={() => updateChatStatus('ACTIVE')}
            >
              <Text style={styles.resumeButtonText}>REANUDAR</Text>
            </TouchableOpacity>
          </View>
        ) : ['CLOSED', 'CLOSED_WON', 'CLOSED_INACTIVE', 'DISCARDED'].includes(chat?.status) ? (
          <View style={styles.closedContainer}>
            <Text style={styles.closedText}>Esta conversación ha finalizado.</Text>
          </View>
        ) : (
          <ChatInput 
            ref={chatInputRef}
            onSendText={handleSendText}
            onOpenActionMenu={() => setActionMenuVisible(true)}
            isAiLoading={isAiLoading}
          />
        )}
      </KeyboardAvoidingView>

      {/* Action Menu Bottom Sheet Modal */}
      <Modal visible={actionMenuVisible} transparent animationType="slide">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setActionMenuVisible(false)}>
          <View style={styles.bottomSheet}>
            <Text style={styles.sheetTitle}>Acciones</Text>
            
            <TouchableOpacity style={styles.sheetButton} onPress={handlePickImage}>
              <View style={styles.sheetIconWrapper}>
                <ImageIcon size={22} color="#f8fafc" strokeWidth={1.5} />
              </View>
              <Text style={styles.sheetButtonText}>Enviar Foto / Galería</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sheetButton} onPress={handleRequestAi}>
              <View style={styles.sheetIconWrapper}>
                <Sparkles size={22} color="#f8fafc" strokeWidth={1.5} />
              </View>
              <Text style={styles.sheetButtonText}>Sugerencia IA</Text>
            </TouchableOpacity>

          </View>
        </TouchableOpacity>
      </Modal>

      {/* Status Dropdown Menu Modal */}
      <Modal visible={statusMenuVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setStatusMenuVisible(false)}>
          <View style={styles.dropdownMenu}>
            <TouchableOpacity style={styles.dropdownItem} onPress={() => { setStatusMenuVisible(false); setResolveModalVisible(true); }}>
              <CheckCircle size={20} color="#f8fafc" strokeWidth={1.5} />
              <Text style={styles.dropdownItemText}>Resolver</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dropdownItem} onPress={() => Toast.show({type: 'info', text1: 'Próximamente', text2: 'Módulo en desarrollo'})}>
              <ShieldAlert size={20} color="#f8fafc" strokeWidth={1.5} />
              <Text style={styles.dropdownItemText}>Escalar</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.dropdownItem, !isVendorLast && { opacity: 0.5 }]} 
              disabled={!isVendorLast}
              onPress={() => {
                if (!isVendorLast) return;
                updateChatStatus('WAITING_CUSTOMER');
              }}
            >
              <Clock size={20} color="#f8fafc" strokeWidth={1.5} />
              <Text style={styles.dropdownItemText}>Esperando al Cliente</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dropdownItem} onPress={() => Toast.show({type: 'info', text1: 'Próximamente', text2: 'Módulo en desarrollo'})}>
              <PauseCircle size={20} color="#f8fafc" strokeWidth={1.5} />
              <Text style={styles.dropdownItemText}>Poner en Espera</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.dropdownItem, !isVendorLast && { opacity: 0.5 }]} 
              disabled={!isVendorLast}
              onPress={() => Toast.show({type: 'info', text1: 'Próximamente', text2: 'Módulo en desarrollo'})}
            >
              <Calendar size={20} color="#f8fafc" strokeWidth={1.5} />
              <Text style={styles.dropdownItemText}>Agendar</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.dropdownItem} onPress={() => updateChatStatus('DISCARDED')}>
              <Ban size={20} color="#ef4444" strokeWidth={1.5} />
              <Text style={[styles.dropdownItemText, { color: '#ef4444' }]}>Descartar / Spam</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Resolve Chat Modal */}
      <Modal visible={resolveModalVisible} transparent animationType="fade">
        <TouchableOpacity style={styles.resolveOverlay} onPress={() => setResolveModalVisible(false)}>
          <View style={styles.resolveModalBox} onStartShouldSetResponder={() => true}>
            <View style={styles.resolveModalHeader}>
              <Text style={styles.resolveModalTitle}>Finalizar Conversación</Text>
            </View>
            
            <View style={styles.resolveModalBody}>
              <TouchableOpacity 
                style={styles.resolveBtnWon} 
                onPress={() => updateChatStatus('CLOSED_WON')}
              >
                <Text style={styles.resolveBtnWonText}>Cierre con Venta</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.resolveBtnLost} 
                onPress={() => updateChatStatus('CLOSED')}
              >
                <Text style={styles.resolveBtnLostText}>Cierre sin Venta</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  dateHeaderContainer: {
    alignSelf: 'center',
    backgroundColor: 'rgba(30, 41, 59, 0.8)', // sales-slate-800/80 equivalent
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
    marginVertical: 12,
    borderColor: 'rgba(51, 65, 85, 0.5)',
    borderWidth: 1,
  },
  dateHeaderText: {
    color: '#cbd5e1', // sales-slate-300
    fontSize: 12,
    textTransform: 'uppercase',
    fontWeight: 'bold',
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center' },
  avatarPlaceholder: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: '#3b82f6',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 10
  },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 0,
    marginLeft: Platform.OS === 'ios' ? 0 : -15, // Native back button spacing
  },
  headerTextContainer: {
    justifyContent: 'center',
    alignItems: 'flex-start',
    maxWidth: 200,
  },
  headerTitleName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 5,
  },
  statusBadge: {
    backgroundColor: '#e6f4ea',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 10,
  },
  statusBadgeText: {
    fontSize: 10,
    color: '#137333',
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  moreIcon: {
    padding: 5,
    marginRight: 10,
  },
  cartIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    backgroundColor: '#f8fafc',
  },
  pausedContainer: {
    padding: 15,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  resumeButton: {
    backgroundColor: '#10b981', // Emerald 500
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 8,
    width: '100%',
    alignItems: 'center',
  },
  resumeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  closedContainer: {
    padding: 15,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closedText: {
    color: '#64748b',
    fontWeight: '500',
    fontSize: 14,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#fff',
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
  dropdownMenu: {
    position: 'absolute',
    top: 60,
    right: 15,
    backgroundColor: '#1e293b',
    borderRadius: 8,
    paddingVertical: 5,
    width: 220,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    borderWidth: 1,
    borderColor: '#334155',
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
  },
  dropdownItemText: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '400',
    marginLeft: 15,
  },
  resolveOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resolveModalBox: {
    width: '85%',
    backgroundColor: '#0f172a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  resolveModalHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    alignItems: 'center',
  },
  resolveModalTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resolveModalBody: {
    padding: 20,
    gap: 12,
  },
  resolveBtnWon: {
    backgroundColor: '#059669',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#34d399',
  },
  resolveBtnWonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  resolveBtnLost: {
    backgroundColor: '#334155',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  resolveBtnLostText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
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
  sheetIconWrapper: {
    width: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  sheetButtonText: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '400',
  }
});
