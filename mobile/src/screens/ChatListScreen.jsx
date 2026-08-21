import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, TextInput, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import useChatStore from '@shared/stores/useChatStore';
import { theme } from '../utils/theme';

export default function ChatListScreen() {
  const navigation = useNavigation();
  const conversations = useChatStore((state) => state.conversations || []);
  const unreadCounts = useChatStore((state) => state.unreadCounts || {});
  const fetchConversations = useChatStore((state) => state.fetchConversations);
  
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Hide the default navigation header so we can build our own custom WhatsApp-style header
  useEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // Initial load
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchConversations();
    setRefreshing(false);
  }, [fetchConversations]);

  const navigateToChat = (chatId, clientName) => {
    if (!chatId) return;
    navigation.navigate('ChatDetail', { chatId, clientName });
  };

  // Filter conversations based on search
  const filteredConversations = conversations.filter(conv => {
    if (!searchQuery) return true;
    const clientName = (conv.client?.name || '').toLowerCase();
    const clientPhone = (conv.client?.phone || '').toLowerCase();
    const query = searchQuery.toLowerCase();
    return clientName.includes(query) || clientPhone.includes(query);
  });

  const renderItem = ({ item }) => {
    const clientName = item.client?.name || item.client?.phone || 'Unknown Client';
    
    // Fallback to local item logic if store doesn't have lastMessage text injected perfectly
    const lastMsgObj = item.messages?.[item.messages.length - 1] || item.lastMessageObj;
    let lastMessage = 'No messages yet';
    
    if (item.lastMessage) {
      lastMessage = item.lastMessage;
    } else if (lastMsgObj) {
      if (lastMsgObj.content) {
        lastMessage = lastMsgObj.content;
      } else if (lastMsgObj.attachments && lastMsgObj.attachments.length > 0) {
        lastMessage = '📷 [Media]';
      }
    }

    const unreadCount = unreadCounts[item.id] || item.unreadCount || 0;

    return (
      <TouchableOpacity 
        style={styles.chatItem} 
        onPress={() => navigateToChat(item.id, clientName)}
      >
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>{clientName.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.chatItemContent}>
          <Text style={styles.clientName}>{clientName}</Text>
          <Text style={styles.lastMessage} numberOfLines={1}>{lastMessage}</Text>
        </View>
        <View style={styles.rightInfo}>
          {unreadCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const ListEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>
        {searchQuery ? "No hay chats que coincidan con tu búsqueda." : "No tienes chats asignados."}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'right', 'bottom', 'left']}>
      {/* Custom WhatsApp-style Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>SalesFlow</Text>
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar..."
            placeholderTextColor="#64748b"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
          />
        </View>
      </View>

      <FlatList
        data={filteredConversations}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={filteredConversations.length === 0 ? styles.flexGrow : styles.listContent}
        ListEmptyComponent={ListEmptyComponent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a', // slate-900
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 10 : 20,
    paddingBottom: 10,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
    color: '#64748b',
  },
  searchInput: {
    flex: 1,
    color: '#f8fafc',
    fontSize: 16,
    height: 40,
  },
  flexGrow: {
    flexGrow: 1,
  },
  listContent: {
    paddingBottom: 20,
  },
  chatItem: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    alignItems: 'center',
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#334155',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  avatarText: {
    color: '#f8fafc',
    fontSize: 20,
    fontWeight: 'bold',
  },
  chatItemContent: {
    flex: 1,
    marginRight: 10,
  },
  clientName: {
    color: '#f1f5f9',
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 5,
  },
  lastMessage: {
    color: '#94a3b8',
    fontSize: 15,
  },
  rightInfo: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 30,
  },
  badge: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 16,
    textAlign: 'center',
  },
});
